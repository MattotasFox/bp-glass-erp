import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/erp/AppShell";
import {
  Tarjeta,
  Buscador,
  BotonPrincipal,
  BotonSecundario,
  Campo,
  Entrada,
  Seleccion,
  AreaTexto,
  PanelLateral,
  EstadoMaquina,
  Pastilla,
  TituloSeccion,
  Vacio,
} from "@/components/erp/ui-bits";
import { useMaquinas, fetchPasosMaquina, type Maquina } from "@/lib/datos";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fecha, diasHasta, nivelMantencion } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/maquinaria/")({
  head: () => ({
    meta: [
      { title: "Maquinaria · BP Glass" },
      { name: "description", content: "Listado de maquinaria industrial con estado, próxima mantención y alertas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Maquinaria · BP Glass" },
      { property: "og:description", content: "Inventario de equipos, estado operativo y mantenciones." },
    ],
  }),
  component: Maquinaria,
});

const vacio = {
  nombre: "",
  codigo: "",
  marca: "",
  modelo: "",
  anio: "",
  estado: "operativa",
  periodicidad_dias: "30",
  fecha_ultima_mantencion: "",
  fecha_proxima_mantencion: "",
};

type PasoForm = { id: string; descripcion: string };
type PasosForm = { diaria: PasoForm[]; mensual: PasoForm[] };

const pasosVacios = (): PasosForm => ({ diaria: [], mensual: [] });
const nuevoPaso = (): PasoForm => ({ id: crypto.randomUUID(), descripcion: "" });

// Guarda los pasos de una máquina: inserta/actualiza los de la lista (con su posición)
// y elimina los que ya no están. Los pasos vacíos se ignoran.
async function guardarPasos(maquinaId: string, pasos: PasosForm) {
  const limpiar = (lista: PasoForm[]) =>
    lista.map((p) => ({ id: p.id, descripcion: p.descripcion.trim() })).filter((p) => p.descripcion);
  const filas = [
    ...limpiar(pasos.diaria).map((p, i) => ({
      id: p.id,
      maquina_id: maquinaId,
      frecuencia: "diaria" as const,
      posicion: i + 1,
      descripcion: p.descripcion,
    })),
    ...limpiar(pasos.mensual).map((p, i) => ({
      id: p.id,
      maquina_id: maquinaId,
      frecuencia: "mensual" as const,
      posicion: i + 1,
      descripcion: p.descripcion,
    })),
  ];
  if (filas.length) {
    const { error } = await supabase.from("maquina_pasos").upsert(filas, { onConflict: "id" });
    if (error) throw error;
  }
  let borrar = supabase.from("maquina_pasos").delete().eq("maquina_id", maquinaId);
  if (filas.length) borrar = borrar.not("id", "in", `(${filas.map((f) => f.id).join(",")})`);
  const { error } = await borrar;
  if (error) throw error;
}

function EditorPasos({
  titulo,
  ayuda,
  pasos,
  onChange,
}: {
  titulo: string;
  ayuda: string;
  pasos: PasoForm[];
  onChange: (pasos: PasoForm[]) => void;
}) {
  function mover(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= pasos.length) return;
    const copia = [...pasos];
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
    onChange(copia);
  }

  return (
    <div>
      <TituloSeccion>{titulo}</TituloSeccion>
      <p className="mt-1 text-[11px] text-muted-foreground">{ayuda}</p>
      <ol className="mt-3 space-y-2">
        {pasos.map((p, i) => (
          <li key={p.id} className="flex items-start gap-2">
            <span className="mt-2.5 w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">{i + 1}.</span>
            <AreaTexto
              rows={2}
              value={p.descripcion}
              placeholder="Describe el paso"
              onChange={(e) => onChange(pasos.map((x, k) => (k === i ? { ...x, descripcion: e.target.value } : x)))}
              className="min-w-0 flex-1"
            />
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => mover(i, -1)}
                disabled={i === 0}
                aria-label="Subir paso"
                className="grid h-5 w-6 place-items-center text-[10px] text-muted-foreground hover:text-ink disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => mover(i, 1)}
                disabled={i === pasos.length - 1}
                aria-label="Bajar paso"
                className="grid h-5 w-6 place-items-center text-[10px] text-muted-foreground hover:text-ink disabled:opacity-30"
              >
                ▼
              </button>
            </div>
            <button
              type="button"
              onClick={() => onChange(pasos.filter((_, k) => k !== i))}
              aria-label="Quitar paso"
              className="mt-2 shrink-0 px-1 text-xs text-muted-foreground hover:text-red"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-2">
        <BotonSecundario onClick={() => onChange([...pasos, nuevoPaso()])}>Agregar paso</BotonSecundario>
      </div>
    </div>
  );
}

export function AvisoMantencion({ fechaProxima }: { fechaProxima: string | null }) {
  const nivel = nivelMantencion(fechaProxima);
  const d = diasHasta(fechaProxima);
  if (nivel === "sin_fecha") return <Pastilla tono="neutro">Sin programar</Pastilla>;
  if (nivel === "vencida") return <Pastilla tono="red">Vencida hace {Math.abs(d ?? 0)} d</Pastilla>;
  if (nivel === "proxima") return <Pastilla tono="amber">En {d} d</Pastilla>;
  return <Pastilla tono="ok">Al día</Pastilla>;
}

function Maquinaria() {
  const { esAdmin } = useAuth();
  const { data: maquinas = [], isLoading } = useMaquinas();
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Maquina | null>(null);
  const [form, setForm] = useState({ ...vacio });
  const [pasos, setPasos] = useState<PasosForm>(pasosVacios());

  function abrirNuevo() {
    setEditando(null);
    setForm({ ...vacio });
    setPasos(pasosVacios());
    setAbierto(true);
  }

  async function abrirEdicion(m: Maquina) {
    // Se cargan primero los pasos: si fallara y se abriera vacío, al guardar se borrarían.
    try {
      const existentes = await fetchPasosMaquina(m.id);
      setPasos({
        diaria: existentes.filter((p) => p.frecuencia === "diaria").map((p) => ({ id: p.id, descripcion: p.descripcion })),
        mensual: existentes.filter((p) => p.frecuencia === "mensual").map((p) => ({ id: p.id, descripcion: p.descripcion })),
      });
    } catch {
      toast.error("No se pudieron cargar los pasos de mantención. Intenta de nuevo.");
      return;
    }
    setEditando(m);
    setForm({
      nombre: m.nombre,
      codigo: m.codigo,
      marca: m.marca ?? "",
      modelo: m.modelo ?? "",
      anio: m.anio ? String(m.anio) : "",
      estado: m.estado,
      periodicidad_dias: String(m.periodicidad_dias),
      fecha_ultima_mantencion: m.fecha_ultima_mantencion ?? "",
      fecha_proxima_mantencion: m.fecha_proxima_mantencion ?? "",
    });
    setAbierto(true);
  }

  // Si la máquina tiene una periodicidad fuera de las opciones estándar, se conserva.
  const opcionesPeriodicidad = [30, 60, 90, 180];
  const periodicidadActual = Number(form.periodicidad_dias);
  if (periodicidadActual && !opcionesPeriodicidad.includes(periodicidadActual)) {
    opcionesPeriodicidad.push(periodicidadActual);
    opcionesPeriodicidad.sort((a, b) => a - b);
  }

  const lista = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return maquinas.filter(
      (m) =>
        (filtro === "todas" || m.estado === filtro) &&
        (!t || m.nombre.toLowerCase().includes(t) || m.codigo.toLowerCase().includes(t)),
    );
  }, [maquinas, busqueda, filtro]);

  const guardar = useMutation({
    mutationFn: async () => {
      const fila = {
        nombre: form.nombre,
        codigo: form.codigo,
        marca: form.marca || null,
        modelo: form.modelo || null,
        anio: form.anio ? Number(form.anio) : null,
        estado: form.estado as Maquina["estado"],
        periodicidad_dias: Number(form.periodicidad_dias || 30),
        fecha_ultima_mantencion: form.fecha_ultima_mantencion || null,
        fecha_proxima_mantencion: form.fecha_proxima_mantencion || null,
      };
      let maquinaId = editando?.id ?? "";
      if (editando) {
        const { data, error } = await supabase.from("maquinas").update(fila).eq("id", editando.id).select("id");
        if (error) throw error;
        // Con RLS, una edición no permitida no da error: afecta 0 filas.
        if (!data?.length) throw new Error("No se pudo actualizar la máquina (sin permisos)");
      } else {
        const { data, error } = await supabase.from("maquinas").insert(fila).select("id").single();
        if (error) throw error;
        maquinaId = data.id;
      }
      try {
        await guardarPasos(maquinaId, pasos);
      } catch {
        // La máquina ya quedó guardada: se cierra el panel para no duplicarla al reintentar.
        qc.invalidateQueries({ queryKey: ["maquinas"] });
        setAbierto(false);
        setEditando(null);
        setForm({ ...vacio });
        setPasos(pasosVacios());
        throw new Error("La máquina se guardó, pero no se pudieron guardar los pasos. Ábrela con «Editar» para reintentarlo.");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maquinas"] });
      qc.invalidateQueries({ queryKey: ["maquina"] });
      qc.invalidateQueries({ queryKey: ["maquina_pasos"] });
      setAbierto(false);
      setForm({ ...vacio });
      setPasos(pasosVacios());
      toast.success(editando ? "Máquina actualizada" : "Máquina registrada");
      setEditando(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("maquinas").delete().eq("id", id).select("id");
      if (error) {
        if (error.code === "23503") {
          throw new Error("No se puede eliminar: la máquina tiene órdenes de trabajo registradas");
        }
        throw error;
      }
      if (!data?.length) throw new Error("No se pudo eliminar la máquina (sin permisos)");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maquinas"] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      setAbierto(false);
      setEditando(null);
      toast.success("Máquina eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function confirmarEliminar(m: Maquina) {
    const ok = window.confirm(
      `¿Eliminar la máquina ${m.codigo} · ${m.nombre}?\n\nLos repuestos asociados quedarán sin equipo. Esta acción no se puede deshacer.`,
    );
    if (ok) eliminar.mutate(m.id);
  }

  return (
    <AppShell
      titulo="Maquinaria"
      subtitulo={`${maquinas.length} equipos registrados`}
      acciones={
        <>
          <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Nombre o código…" />
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="h-8 rounded-lg bg-base px-2 text-xs ring-1 ring-line focus:outline-none"
          >
            <option value="todas">Todos los estados</option>
            <option value="operativa">Operativa</option>
            <option value="en_mantencion">En mantención</option>
            <option value="fuera_de_servicio">Fuera de servicio</option>
          </select>
          {esAdmin ? <BotonPrincipal onClick={abrirNuevo}>Nueva máquina</BotonPrincipal> : null}
        </>
      }
    >
      <Tarjeta className="overflow-x-auto">
        <table className="w-full min-w-[740px] text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-5 py-3 font-normal">Equipo</th>
              <th className="px-5 py-3 font-normal">Estado</th>
              <th className="px-5 py-3 font-normal">Última</th>
              <th className="px-5 py-3 font-normal">Próxima</th>
              <th className="px-5 py-3 font-normal">Alerta</th>
              {esAdmin ? <th className="px-5 py-3 font-normal" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lista.map((m) => (
              <tr key={m.id} className="hover:bg-base/60">
                <td className="px-5 py-3">
                  <Link to="/maquinaria/$id" params={{ id: m.id }} className="block">
                    <div className="font-medium">{m.nombre}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {m.codigo} · {m.marca ?? "—"} {m.modelo ?? ""}
                    </div>
                  </Link>
                </td>
                <td className="px-5 py-3"><EstadoMaquina estado={m.estado} /></td>
                <td className="px-5 py-3 text-muted-foreground">{fecha(m.fecha_ultima_mantencion)}</td>
                <td className="px-5 py-3 text-muted-foreground">{fecha(m.fecha_proxima_mantencion)}</td>
                <td className="px-5 py-3"><AvisoMantencion fechaProxima={m.fecha_proxima_mantencion} /></td>
                {esAdmin ? (
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => abrirEdicion(m)} className="text-xs text-accent hover:underline">
                      Editar
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && lista.length === 0 ? <Vacio mensaje="Sin máquinas para este filtro." /> : null}
      </Tarjeta>

      <PanelLateral
        abierto={abierto}
        titulo={editando ? "Editar máquina" : "Nueva máquina"}
        subtitulo="Ficha de equipo"
        onCerrar={() => setAbierto(false)}
        pie={
          <div className="flex gap-2">
            <BotonPrincipal
              className="flex-1"
              disabled={guardar.isPending || !form.nombre || !form.codigo}
              onClick={() => guardar.mutate()}
            >
              Guardar máquina
            </BotonPrincipal>
            {editando ? (
              <BotonSecundario onClick={() => confirmarEliminar(editando)}>Eliminar</BotonSecundario>
            ) : null}
          </div>
        }
      >
        <Campo label="Nombre"><Entrada value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Campo>
        <Campo label="Código interno"><Entrada value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Marca"><Entrada value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></Campo>
          <Campo label="Modelo"><Entrada value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></Campo>
        </div>
        <Campo label="Año"><Entrada type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Estado">
            <Seleccion value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="operativa">Operativa</option>
              <option value="en_mantencion">En mantención</option>
              <option value="fuera_de_servicio">Fuera de servicio</option>
            </Seleccion>
          </Campo>
          <Campo label="Periodicidad (días)">
            <Seleccion value={form.periodicidad_dias} onChange={(e) => setForm({ ...form, periodicidad_dias: e.target.value })}>
              {opcionesPeriodicidad.map((d) => (
                <option key={d} value={String(d)}>{d} días</option>
              ))}
            </Seleccion>
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Última mantención">
            <Entrada type="date" value={form.fecha_ultima_mantencion} onChange={(e) => setForm({ ...form, fecha_ultima_mantencion: e.target.value })} />
          </Campo>
          <Campo label="Próxima mantención">
            <Entrada type="date" value={form.fecha_proxima_mantencion} onChange={(e) => setForm({ ...form, fecha_proxima_mantencion: e.target.value })} />
          </Campo>
        </div>

        <div className="border-t border-line pt-4">
          <EditorPasos
            titulo="Pasos de mantención diaria"
            ayuda="Se muestran, en este orden, al cerrar una orden preventiva diaria de esta máquina."
            pasos={pasos.diaria}
            onChange={(diaria) => setPasos({ ...pasos, diaria })}
          />
        </div>
        <div className="border-t border-line pt-4">
          <EditorPasos
            titulo="Pasos de mantención mensual"
            ayuda="Se muestran, en este orden, al cerrar una orden preventiva mensual de esta máquina."
            pasos={pasos.mensual}
            onChange={(mensual) => setPasos({ ...pasos, mensual })}
          />
        </div>
      </PanelLateral>
    </AppShell>
  );
}
