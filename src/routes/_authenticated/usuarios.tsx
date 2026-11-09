import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/erp/AppShell";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Tarjeta, TituloSeccion, Seleccion, Vacio, Pastilla, PanelLateral, Campo, Entrada, BotonPrincipal, BotonSecundario } from "@/components/erp/ui-bits";
import { crearCuenta } from "@/lib/cuentas.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, etiquetaRol, type Rol } from "@/hooks/useAuth";
import { fecha } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios y permisos · BP Glass" },
      { name: "description", content: "Administra los roles de acceso del equipo: administrador, técnico y RRHH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Usuarios y permisos · BP Glass" },
      { property: "og:description", content: "Gestión de roles y permisos del sistema." },
    ],
  }),
  component: Usuarios,
});

function Usuarios() {
  const { esAdmin, sesion } = useAuth();
  const qc = useQueryClient();
  const crearFn = useServerFn(crearCuenta);
  const vacio = { nombre: "", usuario: "", email: "", clave: "", rol: "tecnico" as Rol };
  const [panel, setPanel] = useState(false);
  const [form, setForm] = useState(vacio);
  const crear = useMutation({
    mutationFn: () => crearFn({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Cuenta creada");
      setPanel(false);
      setForm(vacio);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["usuarios"],
    enabled: esAdmin,
    queryFn: async () => {
      const [{ data: perfiles, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
        supabase.from("perfiles").select("*").order("creado_en"),
        supabase.from("user_roles").select("*"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return (perfiles ?? []).map((p) => ({
        ...p,
        rol: (roles ?? []).find((r) => r.user_id === p.id)?.role as Rol | undefined,
      }));
    },
  });

  const cambiarRol = useMutation({
    mutationFn: async ({ userId, rol }: { userId: string; rol: Rol }) => {
      const { error: e1 } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("user_roles").insert({ user_id: userId, role: rol });
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      qc.invalidateQueries({ queryKey: ["sesion"] });
      toast.success("Rol actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!esAdmin) {
    return (
      <AppShell titulo="Usuarios">
        <Tarjeta className="p-6">
          <Vacio mensaje="Solo el administrador puede gestionar usuarios y permisos." />
        </Tarjeta>
      </AppShell>
    );
  }

  return (
    <AppShell titulo="Usuarios y permisos" subtitulo={`${usuarios.length} cuentas con acceso al sistema`}
      acciones={<BotonPrincipal onClick={() => setPanel(true)}>+ Crear cuenta</BotonPrincipal>}
    >
      <PanelLateral
        abierto={panel}
        titulo="Crear cuenta"
        subtitulo="La persona podrá entrar con su usuario o correo."
        onCerrar={() => setPanel(false)}
        pie={
          <>
            <BotonSecundario onClick={() => setPanel(false)}>Cancelar</BotonSecundario>
            <BotonPrincipal type="submit" disabled={crear.isPending} onClick={() => crear.mutate()}>
              {crear.isPending ? "Creando…" : "Crear cuenta"}
            </BotonPrincipal>
          </>
        }
      >
        <div className="space-y-4">
          <Campo label="Nombre completo">
            <Entrada value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </Campo>
          <Campo label="Nombre de usuario">
            <Entrada value={form.usuario} placeholder="ej: jperez" onChange={(e) => setForm({ ...form, usuario: e.target.value })} />
          </Campo>
          <Campo label="Correo">
            <Entrada type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Campo>
          <Campo label="Contraseña">
            <Entrada type="text" value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} />
          </Campo>
          <Campo label="Rol">
            <Seleccion value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}>
              <option value="admin">Administrador</option>
              <option value="tecnico">Técnico</option>
              <option value="rrhh">RRHH / Administrativo</option>
            </Seleccion>
          </Campo>
        </div>
      </PanelLateral>
      <Tarjeta className="overflow-x-auto">
        <div className="border-b border-line px-5 py-4">
          <TituloSeccion>Cuentas registradas</TituloSeccion>
          <p className="mt-1 text-xs text-muted-foreground">
            El rol define qué módulos ve cada persona. Los permisos también se aplican en la base de datos.
          </p>
        </div>
        <table className="w-full min-w-[650px] text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-5 py-3 font-normal">Persona</th>
              <th className="px-5 py-3 font-normal">Alta</th>
              <th className="px-5 py-3 font-normal">Rol actual</th>
              <th className="px-5 py-3 font-normal">Cambiar rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-base/60">
                <td className="px-5 py-3">
                  <div className="font-medium">
                    {u.nombre} {u.id === sesion?.userId ? <span className="text-[11px] text-muted-foreground">(tú)</span> : null}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{u.usuario ? `@${u.usuario} · ` : ""}{u.email}</div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{fecha(u.creado_en.slice(0, 10))}</td>
                <td className="px-5 py-3">
                  <Pastilla tono={u.rol === "admin" ? "clay" : u.rol === "rrhh" ? "amber" : "ok"}>
                    {etiquetaRol(u.rol)}
                  </Pastilla>
                </td>
                <td className="px-5 py-3">
                  <Seleccion
                    value={u.rol ?? ""}
                    className="h-9 w-56"
                    onChange={(e) => cambiarRol.mutate({ userId: u.id, rol: e.target.value as Rol })}
                  >
                    <option value="" disabled>Sin rol</option>
                    <option value="admin">Administrador</option>
                    <option value="tecnico">Técnico</option>
                    <option value="rrhh">RRHH / Administrativo</option>
                  </Seleccion>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && usuarios.length === 0 ? <Vacio mensaje="Aún no hay cuentas registradas." /> : null}
      </Tarjeta>
    </AppShell>
  );
}
