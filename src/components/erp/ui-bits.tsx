import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tarjeta({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl bg-surface shadow-clay ring-1 ring-line/80", className)}>
      {children}
    </div>
  );
}

export function TituloSeccion({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-semibold tracking-tight">{children}</h2>;
}

type Tono = "ok" | "amber" | "red" | "neutro" | "clay";

const tonos: Record<Tono, string> = {
  ok: "bg-ok-soft text-ok",
  amber: "bg-amber-soft text-amber",
  red: "bg-red-soft text-red",
  clay: "bg-clay-soft text-clay",
  neutro: "bg-base text-muted-foreground",
};

export function Pastilla({ tono = "neutro", children }: { tono?: Tono; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tonos[tono],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function EstadoMaquina({ estado }: { estado: string }) {
  if (estado === "operativa") return <Pastilla tono="ok">Operativa</Pastilla>;
  if (estado === "en_mantencion") return <Pastilla tono="amber">En mantención</Pastilla>;
  return <Pastilla tono="red">Fuera de servicio</Pastilla>;
}

export function EstadoOrden({ estado }: { estado: string }) {
  if (estado === "completada") return <Pastilla tono="ok">Completada</Pastilla>;
  if (estado === "en_proceso") return <Pastilla tono="amber">En proceso</Pastilla>;
  if (estado === "reprogramada") return <Pastilla tono="neutro">Reprogramada</Pastilla>;
  return <Pastilla tono="clay">Pendiente</Pastilla>;
}

export function Buscador({
  valor,
  onChange,
  placeholder = "Buscar…",
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative min-w-0 basis-full sm:basis-auto">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3-3" />
      </svg>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full min-w-0 rounded-lg bg-base pl-8 pr-2 text-xs text-ink ring-1 ring-line placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent/40 sm:w-48"
      />
    </div>
  );
}

export function BotonPrincipal({
  children,
  onClick,
  type = "button",
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-accent-foreground shadow-clay-sm transition-transform hover:-translate-y-px disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function BotonSecundario({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-xl bg-surface px-3 text-sm font-medium text-ink ring-1 ring-line transition-colors hover:bg-base",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputCls =
  "h-10 w-full rounded-xl bg-base px-3 text-sm text-ink ring-1 ring-line placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent/40";

export function Entrada(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function Seleccion(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, props.className)} />;
}

export function AreaTexto(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full resize-none rounded-xl bg-base px-3 py-2.5 text-sm text-ink ring-1 ring-line placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent/40",
        props.className,
      )}
    />
  );
}

export function PanelLateral({
  abierto,
  titulo,
  subtitulo,
  onCerrar,
  children,
  pie,
}: {
  abierto: boolean;
  titulo: string;
  subtitulo?: string;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
}) {
  if (!abierto) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20" onClick={onCerrar} />
      <aside className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[420px] flex-col bg-surface shadow-clay ring-1 ring-line">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="font-serif text-lg leading-none tracking-tight">{titulo}</div>
            {subtitulo ? (
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {subtitulo}
              </div>
            ) : null}
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground ring-1 ring-line hover:bg-base"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        {pie ? <div className="border-t border-line px-5 py-4">{pie}</div> : null}
      </aside>
    </>
  );
}

export function Vacio({ mensaje }: { mensaje: string }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{mensaje}</div>;
}
