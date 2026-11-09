import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { iniciarSesion } from "@/lib/cuentas.functions";
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
  const [identificador, setIdentificador] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const tokens = await iniciarSesion({ data: { identificador, clave } });
      const { error } = await supabase.auth.setSession(tokens);
      if (error) throw error;
      queryClient.removeQueries({ queryKey: ["sesion"] });
      navigate({ to: "/panel", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-base font-sans text-ink antialiased md:grid-cols-[1.1fr_1fr]">
      <div className="hidden flex-col items-center justify-center gap-8 bg-sidebar p-10 md:flex">
        <div className="w-full max-w-sm rounded-3xl bg-surface p-3 shadow-clay">
          <img src="/assets/logo.png" alt="BP Glass" className="w-full rounded-2xl" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-sidebar-foreground/40">
          {"\n"}
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl tracking-tight">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {"\n"}
          </p>

          <form onSubmit={enviar} className="mt-6 space-y-4">
            <Campo label="Usuario o correo">
              <Entrada
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                required
                autoComplete="username"
              />
            </Campo>
            <Campo label="Contraseña">
              <Entrada
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
                autoComplete="current-password"
              />
            </Campo>

            {error ? <p className="text-xs text-red">{error}</p> : null}

            <BotonPrincipal type="submit" disabled={cargando} className="w-full">
              {cargando ? "Procesando…" : "Entrar"}
            </BotonPrincipal>
          </form>
        </div>
      </div>
    </div>
  );
}
