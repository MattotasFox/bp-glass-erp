import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { BotonPrincipal, Campo, Entrada } from "@/components/erp/ui-bits";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceso · BP Glass Mantenimiento" },
      {
        name: "description",
        content:
          "Ingresa al sistema BP Glass para gestionar maquinaria industrial, mantenciones, inventario y costos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Acceso · BP Glass Mantenimiento" },
      {
        property: "og:description",
        content: "Sistema de gestión de maquinaria industrial y mantenimiento.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: clave });
        if (error) throw error;
        queryClient.removeQueries({ queryKey: ["sesion"] });
        navigate({ to: "/panel", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: clave,
          options: {
            data: { nombre },
            emailRedirectTo: `${window.location.origin}/panel`,
          },
        });
        if (error) throw error;
        if (data.session) {
          queryClient.removeQueries({ queryKey: ["sesion"] });
          navigate({ to: "/panel", replace: true });
        }
        else setAviso("Cuenta creada. Revisa tu correo para confirmarla y luego ingresa.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la operación");
    } finally {
      setCargando(false);
    }
  }

  async function google() {
    setError(null);
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar con Google");
    }
  }

  return (
    <div className="grid min-h-screen bg-base font-sans text-ink antialiased md:grid-cols-[1.1fr_1fr]">
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-clay text-sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.4 5.4l2.1 2.1M16.5 16.5l2.1 2.1M18.6 5.4l-2.1 2.1M7.5 16.5l-2.1 2.1" />
            </svg>
          </div>
          <div className="text-sm font-semibold tracking-tight text-surface">BP Glass</div>
        </div>
        <div>
          <h2 className="max-w-sm font-serif text-4xl leading-tight text-surface">
            Mantenimiento industrial, ordenado y al día.
          </h2>
          <p className="mt-4 max-w-sm text-sm text-sidebar-foreground/60">
            Maquinaria, repuestos, órdenes de trabajo y costos en un solo lugar.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-sidebar-foreground/40">
          Acceso restringido al personal autorizado
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl tracking-tight">
            {modo === "entrar" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {modo === "entrar"
              ? "Ingresa con tu correo corporativo."
              : "El primer usuario del sistema queda como administrador."}
          </p>

          <form onSubmit={enviar} className="mt-6 space-y-4">
            {modo === "crear" ? (
              <Campo label="Nombre completo">
                <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </Campo>
            ) : null}
            <Campo label="Correo">
              <Entrada
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Campo>
            <Campo label="Contraseña">
              <Entrada
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
                minLength={6}
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              />
            </Campo>

            {error ? <p className="text-xs text-red">{error}</p> : null}
            {aviso ? <p className="text-xs text-ok">{aviso}</p> : null}

            <BotonPrincipal type="submit" disabled={cargando} className="w-full">
              {cargando ? "Procesando…" : modo === "entrar" ? "Entrar" : "Crear cuenta"}
            </BotonPrincipal>
          </form>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
          </div>

          <button
            onClick={google}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-surface text-sm font-medium ring-1 ring-line hover:bg-base"
          >
            Continuar con Google
          </button>

          <button
            onClick={() => {
              setModo(modo === "entrar" ? "crear" : "entrar");
              setError(null);
              setAviso(null);
            }}
            className="mt-6 w-full text-center text-xs text-muted-foreground hover:text-ink"
          >
            {modo === "entrar" ? "¿No tienes cuenta? Crear una" : "Ya tengo cuenta, iniciar sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
