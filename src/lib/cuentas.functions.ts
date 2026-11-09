import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "tecnico", "rrhh"] as const;
type Rol = (typeof ROLES)[number];

export const normalizarUsuario = (u: string) => u.trim().toLowerCase();

// Inicia sesión con nombre de usuario o correo. El correo se resuelve en el servidor
// para no exponer la lista de correos a visitantes anónimos.
export const iniciarSesion = createServerFn({ method: "POST" })
  .inputValidator((d: { identificador: string; clave: string }) => {
    if (!d?.identificador?.trim() || !d?.clave) throw new Error("Completa usuario y contraseña");
    return { identificador: d.identificador.trim(), clave: d.clave };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let email = data.identificador;
    if (!email.includes("@")) {
      const { data: p } = await supabaseAdmin
        .from("perfiles")
        .select("email")
        .ilike("usuario", normalizarUsuario(email).replace(/[%_\\]/g, "\\$&"))
        .maybeSingle();
      if (!p?.email) throw new Error("Usuario o contraseña incorrectos");
      email = p.email;
    }
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const cliente = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: s, error } = await cliente.auth.signInWithPassword({ email, password: data.clave });
    if (error || !s.session) throw new Error("Usuario o contraseña incorrectos");
    return { access_token: s.session.access_token, refresh_token: s.session.refresh_token };
  });

export const crearCuenta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { nombre: string; usuario: string; email: string; clave: string; rol: Rol }) => {
    const usuario = normalizarUsuario(d?.usuario ?? "");
    if (!d?.nombre?.trim()) throw new Error("Falta el nombre");
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario))
      throw new Error("Usuario: 3 a 30 caracteres, solo letras, números, punto, guion o guion bajo");
    if (!/^\S+@\S+\.\S+$/.test(d.email ?? "")) throw new Error("Correo no válido");
    if (!d.clave || d.clave.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
    if (!ROLES.includes(d.rol)) throw new Error("Rol no válido");
    return { nombre: d.nombre.trim(), usuario, email: d.email.trim().toLowerCase(), clave: d.clave, rol: d.rol };
  })
  .handler(async ({ data, context }) => {
    const { data: esAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!esAdmin) throw new Error("Solo un administrador puede crear cuentas");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existe } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .ilike("usuario", data.usuario.replace(/[%_\\]/g, "\\$&"))
      .maybeSingle();
    if (existe) throw new Error("Ese nombre de usuario ya existe");
    const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.clave,
      email_confirm: true,
      user_metadata: { nombre: data.nombre, usuario: data.usuario },
    });
    if (error || !creado.user) throw new Error(error?.message ?? "No se pudo crear la cuenta");
    const id = creado.user.id;
    await supabaseAdmin.from("perfiles").update({ usuario: data.usuario, nombre: data.nombre }).eq("id", id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    const { error: e2 } = await supabaseAdmin.from("user_roles").insert({ user_id: id, role: data.rol });
    if (e2) throw new Error(e2.message);
    return { id };
  });
