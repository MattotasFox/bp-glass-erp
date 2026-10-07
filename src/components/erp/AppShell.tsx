import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, iniciales, etiquetaRol } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Item = { to: string; label: string; icono: ReactNode; ver: (r: Permisos) => boolean };
type Permisos = { admin: boolean; tecnico: boolean; rrhh: boolean };

const ico = (d: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4 shrink-0"
  >
    {d}
  </svg>
);

const items: Item[] = [
  {
    to: "/panel",
    label: "Inicio",
    icono: ico(
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </>,
    ),
    ver: () => true,
  },
  {
    to: "/maquinaria",
    label: "Maquinaria",
    icono: ico(
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
      </>,
    ),
    ver: (r) => r.admin || r.tecnico,
  },
  {
    to: "/inventario",
    label: "Inventario",
    icono: ico(
      <>
        <path d="M12 3 4 7v10l8 4 8-4V7z" />
        <path d="M4 7l8 4 8-4M12 11v10" />
      </>,
    ),
    ver: (r) => r.admin || r.tecnico,
  },
  {
    to: "/ordenes",
    label: "Órdenes de trabajo",
    icono: ico(
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V3h6v1M9 11l2 2 4-4" />
      </>,
    ),
    ver: (r) => r.admin || r.tecnico,
  },
  {
    to: "/empleados",
    label: "Empleados",
    icono: ico(
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
        <path d="M16 5.5a3 3 0 0 1 0 5.5M17 20c0-2.2-.7-3.8-2-4.6" />
      </>,
    ),
    ver: (r) => r.admin || r.rrhh,
  },
  {
    to: "/reportes",
    label: "Reportes",
    icono: ico(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
    ver: (r) => r.admin || r.rrhh,
  },
  {
    to: "/usuarios",
    label: "Usuarios",
    icono: ico(
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M4.5 20c0-3.6 3.4-5.5 7.5-5.5s7.5 1.9 7.5 5.5" />
      </>,
    ),
    ver: (r) => r.admin,
  },
];

export function AppShell({
  titulo,
  subtitulo,
  acciones,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  const { sesion, cargando, esAdmin, esTecnico, esRRHH } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuAbierto, setMenuAbierto] = useState(false);
  useEffect(() => {
    if (!menuAbierto) return;
    const cerrarConEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAbierto(false);
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [menuAbierto]);
  const permisos: Permisos = { admin: esAdmin, tecnico: esTecnico, rrhh: esRRHH };
  const rolPrincipal = esAdmin ? "admin" : esRRHH ? "rrhh" : esTecnico ? "tecnico" : undefined;

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-base font-sans text-ink antialiased">
      {menuAbierto ? (
        <div className="fixed inset-0 z-40 bg-ink/50 md:hidden" onClick={() => setMenuAbierto(false)} aria-hidden="true" />
      ) : null}
      <aside
        id="navegacion-principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:z-auto md:translate-x-0",
          menuAbierto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
          <img src="/favicon-256.png" alt="BP Glass" className="size-9 shrink-0 object-contain" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-surface">BP Glass</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
              Mantenimiento
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Cerrar menú" className="ml-auto min-h-11 min-w-11 text-sidebar-foreground hover:bg-surface/10 hover:text-surface md:hidden" onClick={() => setMenuAbierto(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </Button>
        </div>

        <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto px-3">
          <div className="px-2 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-widest text-sidebar-foreground/40">
            Módulos
          </div>
          {items
            .filter((i) => i.ver(permisos))
            .map((i) => {
              const activo = pathname === i.to || pathname.startsWith(i.to + "/");
              return (
                <Link
                  key={i.to}
                  to={i.to}
                  onClick={() => setMenuAbierto(false)}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                    activo
                      ? "bg-surface/10 font-medium text-surface shadow-clay-sm"
                      : "text-sidebar-foreground/70 hover:bg-surface/5 hover:text-surface",
                  )}
                >
                  {i.icono}
                  <span>{i.label}</span>
                </Link>
              );
            })}
        </nav>

        <div className="px-3 pb-3">
          <div className="rounded-xl bg-surface/5 p-3">
            <div className="text-[11px] font-medium text-sidebar-foreground/60">Sesión activa</div>
            <div className="mt-2 flex items-center gap-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {iniciales(sesion?.nombre ?? "U")}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-xs font-medium text-surface">{sesion?.nombre}</div>
                <div className="text-[10px] text-sidebar-foreground/50">{cargando ? "Cargando…" : etiquetaRol(rolPrincipal)}</div>
              </div>
            </div>
            <Button
              onClick={cerrarSesion}
              variant="ghost"
              className="mt-3 w-full bg-surface/10 text-xs text-surface hover:bg-surface/20 hover:text-surface"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line bg-surface/80 px-4 py-3 md:flex md:items-center md:justify-between md:gap-4 md:px-6 md:py-3.5">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 md:block">
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11 md:hidden" aria-label="Abrir menú" aria-expanded={menuAbierto} aria-controls="navegacion-principal" onClick={() => setMenuAbierto(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </Button>
            <div className="min-w-0">
            <h1 className="truncate font-serif text-xl leading-tight md:text-2xl">{titulo}</h1>
            {subtitulo ? <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p> : null}
            </div>
          </div>
          {acciones ? <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 md:mt-0 md:justify-end">{acciones}</div> : null}
        </header>
        <div className="min-w-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">{children}</div>
      </main>
    </div>
  );
}
