import { useEffect, useMemo, useState } from "react";
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
  EstadoOrden,
  Pastilla,
  Vacio,
  TituloSeccion,
} from "@/components/erp/ui-bits";
import {
  useMaquinas,
  useEmpleados,
  useInventario,
  insumosParaMaquina,
  useOrdenes,
  usePasosMaquina,
  costoOrden,
  type OrdenCompleta,
} from "@/lib/datos";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fecha, money, hoyISO, etiquetaTipoOrden, tonoTipoOrden, calcularHoras, fechaDDMMAAAA } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type TipoOrden = Database["public"]["Enums"]["tipo_orden"];

function manianaISO() {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

export const Route = createFileRoute("/_authenticated/ordenes")({
  head: () => ({
    meta: [
      { title: "Órdenes de trabajo · BP Glass" },
      { name: "description", content: "Crea, programa y cierra órdenes de mantención con consumo de repuestos y horas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Órdenes de trabajo · BP Glass" },
      { property: "og:description", content: "Mantenciones preventivas y correctivas con costos por orden." },
    ],
  }),
  component: Ordenes,
});

// Hoja de mantención para imprimir al iniciar una orden. Solo se ve al imprimir
// (ver estilos @media print más abajo); en pantalla permanece oculta.
function HojaImpresion({
  orden,
  pasos,
}: {
  orden: OrdenCompleta;
  pasos: { posicion: number; descripcion: string }[];
}) {
  const tieneDetalle = pasos.length > 0;

  return (
    <div id="hoja-impresion-orden">
      <style>{`
        @media screen {
          #hoja-impresion-orden { display: none; }
        }
        @media print {
          @page { margin: 16mm; }
          body * { visibility: hidden; }
          #hoja-impresion-orden, #hoja-impresion-orden * { visibility: visible; }
          #hoja-impresion-orden {
            display: block;
            position: absolute;
            inset: 0;
            font-family: "Times New Roman", Georgia, serif;
            color: #000;
            background: #fff;
          }
          #hoja-impresion-orden .hi-fecha { text-align: right; font-size: 11pt; }
          #hoja-impresion-orden h1 { font-size: 22pt; font-weight: normal; margin: 4pt 0 2pt; }
          #hoja-impresion-orden .hi-subtitulo { font-size: 13pt; margin: 0 0 16pt; }
          #hoja-impresion-orden .hi-campo { font-size: 12pt; margin: 10pt 0; }
          #hoja-impresion-orden .hi-linea {
            display: inline-block;
            min-width: 260pt;
            border-bottom: 1pt solid #000;
            padding-bottom: 1pt;
          }
          #hoja-impresion-orden .hi-linea-corta {
            display: inline-block;
            min-width: 140pt;
            border-bottom: 1pt solid #000;
            padding-bottom: 1pt;
          }
          #hoja-impresion-orden h2 { font-size: 14pt; font-weight: normal; margin: 18pt 0 10pt; }
          #hoja-impresion-orden ol { list-style: none; margin: 0; padding: 0; }
          #hoja-impresion-orden ol li {
            display: flex;
            align-items: baseline;
            gap: 10pt;
            font-size: 12pt;
            margin: 9pt 0;
          }
          #hoja-impresion-orden .hi-texto-paso { flex: 1; }
          #hoja-impresion-orden .hi-casillero {
            width: 13pt;
            height: 13pt;
            border: 1.3pt solid #000;
            flex-shrink: 0;
          }
          #hoja-impresion-orden .hi-caja {
            border: 1.3pt solid #000;
            min-height: 110pt;
            margin-top: 6pt;
          }
          #hoja-impresion-orden .hi-caja-grande { min-height: 260pt; }
          #hoja-impresion-orden .hi-firma {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 200pt;
            text-align: center;
          }
          #hoja-impresion-orden .hi-firma-linea {
            border-bottom: 1pt solid #000;
            height: 0;
            margin-bottom: 4pt;
          }
          #hoja-impresion-orden .hi-firma-texto { font-size: 11pt; }
        }
      `}</style>

      <div className="hi-fecha">FECHA {fechaDDMMAAAA()}</div>
      <h1>{orden.maquinas?.nombre ?? "Máquina"}</h1>
      <div className="hi-subtitulo">
        {etiquetaTipoOrden(orden.tipo)} · Orden #{orden.folio}
      </div>

      <div className="hi-campo">Nombre: {orden.empleados?.nombre ?? ""}</div>
      <div className="hi-campo">
        Hora Inicio: <span className="hi-linea-corta"></span>
        {"   "}Hora Termino: <span className="hi-linea-corta"></span>
      </div>

      {tieneDetalle ? (
        <>
          <h2>Detalle:</h2>
          <ol>
            {pasos.map((p) => (
              <li key={p.posicion}>
                <span className="hi-texto-paso">{p.posicion}. {p.descripcion}</span>
                <span className="hi-casillero" />
              </li>
            ))}
          </ol>
          <h2>Observaciones:</h2>
          <div className="hi-caja" />
          <h2>Repuestos:</h2>
          <div className="hi-caja" />
        </>
      ) : (
        <>
          <h2>Detalles:</h2>
          <div className="hi-caja hi-caja-grande" />
          <h2>Repuestos:</h2>
          <div className="hi-caja" />
        </>
      )}

      <div className="hi-firma">
        <div className="hi-firma-linea" />
        <div className="hi-firma-texto">Firma</div>
      </div>
    </div>
  );
}

const nuevaVacia = {
  maquina_id: "",
  tipo: "preventiva_diaria" as TipoOrden,
  fecha_programada: hoyISO(),
  tecnico_id: "",
  descripcion: "",
};

function Ordenes() {
  const { esAdmin, esTecnico } = useAuth();
  const puedeCrear = esAdmin;
  const puedeEditar = esAdmin || esTecnico;
  const { data: ordenes = [], isLoading } = useOrdenes();
  const { data: maquinas = [] } = useMaquinas();
  const { data: empleados = [] } = useEmpleados();
  const { data: insumos = [] } = useInventario();
  const qc = useQueryClient();

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [nueva, setNueva] = useState<typeof nuevaVacia | null>(null);
  const [cierre, setCierre] = useState<OrdenCompleta | null>(null);

  // Al cerrar una orden solo se pueden declarar repuestos generales o asociados a su máquina.
  const insumosDisponibles = useMemo(() => insumosParaMaquina(insumos, cierre?.maquina_id), [insumos, cierre]);

  // Hoja para imprimir al iniciar una orden: se cargan los pasos que correspondan
  // a su frecuencia (diaria/mensual); las correctivas no tienen pasos que cargar.
  const [imprimir, setImprimir] = useState<OrdenCompleta | null>(null);
  const frecuenciaImprimir =
    imprimir?.tipo === "preventiva_diaria" ? "diaria" : imprimir?.tipo === "preventiva_mensual" ? "mensual" : null;
  const { data: pasosMaquinaImprimir = [], isLoading: cargandoPasosImprimir } = usePasosMaquina(
    frecuenciaImprimir ? imprimir?.maquina_id : undefined,
  );
  const pasosImprimir = useMemo(
    () =>
      pasosMaquinaImprimir
        .filter((p) => p.frecuencia === frecuenciaImprimir)
        .sort((a, b) => a.posicion - b.posicion),
    [pasosMaquinaImprimir, frecuenciaImprimir],
  );

  useEffect(() => {
    if (!imprimir) return;
    if (frecuenciaImprimir && cargandoPasosImprimir) return; // esperando a que carguen los pasos
    window.print();
    const limpiar = () => setImprimir(null);
    window.addEventListener("afterprint", limpiar);
    return () => window.removeEventListener("afterprint", limpiar);
  }, [imprimir, frecuenciaImprimir, cargandoPasosImprimir]);

  function iniciarOrden(o: OrdenCompleta) {
    cambiarEstado.mutate({ id: o.id, estado: "en_proceso" });
    setImprimir(o);
  }
  const [cierreForm, setCierreForm] = useState({
    fecha_ejecucion: hoyISO(),
    hora_inicio: "",
    hora_termino: "",
    observaciones: "",
  });
  const [consumos, setConsumos] = useState<{ insumo_id: string; cantidad: string }[]>([]);
  const [pasosMarcados, setPasosMarcados] = useState<string[]>([]);
  const [reprogramar, setReprogramar] = useState<{
    orden: OrdenCompleta;
    fechaNueva: string;
    motivo: string;
    pendientes: string[];
  } | null>(null);

  // Pasos de mantención según el tipo de la orden: diaria → pasos diarios, mensual → pasos
  // mensuales. Las correctivas (y las órdenes antiguas "preventiva") no llevan pasos.
  const frecuenciaCierre =
    cierre?.tipo === "preventiva_diaria" ? "diaria" : cierre?.tipo === "preventiva_mensual" ? "mensual" : null;
  const {
    data: pasosMaquina = [],
    isLoading: cargandoPasos,
    isError: errorPasos,
  } = usePasosMaquina(frecuenciaCierre ? cierre?.maquina_id : undefined);
  const pasosCierre = useMemo(
    () => pasosMaquina.filter((p) => p.frecuencia === frecuenciaCierre).sort((a, b) => a.posicion - b.posicion),
    [pasosMaquina, frecuenciaCierre],
  );
  const pasosPendientes = pasosCierre.filter((p) => !pasosMarcados.includes(p.id));
  const pasosOk = frecuenciaCierre === null || (!cargandoPasos && !errorPasos && pasosPendientes.length === 0);

  const lista = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return ordenes.filter(
      (o) =>
        (filtro === "todas" || o.estado === filtro) &&
        (!t ||
          String(o.folio).includes(t) ||
          (o.maquinas?.nombre ?? "").toLowerCase().includes(t) ||
          (o.empleados?.nombre ?? "").toLowerCase().includes(t)),
    );
  }, [ordenes, busqueda, filtro]);

  const crear = useMutation({
    mutationFn: async () => {
      if (!nueva) return;
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("ordenes_trabajo").insert({
        maquina_id: nueva.maquina_id,
        tipo: nueva.tipo,
        fecha_programada: nueva.fecha_programada,
        tecnico_id: nueva.tecnico_id || null,
        descripcion: nueva.descripcion || null,
        creado_por: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordenes"] });
      setNueva(null);
      toast.success("Orden creada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: "en_proceso" | "pendiente" }) => {
      const { error } = await supabase.from("ordenes_trabajo").update({ estado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordenes"] });
      qc.invalidateQueries({ queryKey: ["maquinas"] });
      toast.success("Orden actualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("ordenes_trabajo")
        .delete()
        .eq("id", id)
        .eq("estado", "completada")
        .select("id");
      if (error) throw error;
      // Con RLS, un borrado no permitido no da error: simplemente afecta 0 filas.
      if (!data?.length) throw new Error("No se pudo eliminar la orden (sin permisos o ya no está completada)");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordenes"] });
      toast.success("Orden eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function confirmarEliminar(o: OrdenCompleta) {
    const ok = window.confirm(
      `¿Eliminar la orden #${o.folio} de ${o.maquinas?.nombre ?? "la máquina"}?\n\n` +
        "Se borrará también su detalle de repuestos y horas. El stock ya descontado no se devuelve. Esta acción no se puede deshacer.",
    );
    if (ok) eliminar.mutate(o.id);
  }

  const cerrarOrden = useMutation({
    mutationFn: async () => {
      if (!cierre) return;
      if (!cierreForm.hora_inicio || !cierreForm.hora_termino) {
        throw new Error("Ingresa la hora de inicio y término");
      }
      if (hayErroresConsumos) {
        throw new Error("Revisa las cantidades de repuestos: hay valores inválidos");
      }
      if (!pasosOk) {
        throw new Error("Debes marcar todos los pasos de mantención para cerrar la orden");
      }
      if (pasosCierre.length) {
        // Se guarda una copia de los pasos realizados (el texto queda fijo aunque luego se edite la máquina).
        const { error } = await supabase.from("orden_trabajo_pasos").upsert(
          pasosCierre.map((p) => ({ orden_id: cierre.id, posicion: p.posicion, descripcion: p.descripcion })),
          { onConflict: "orden_id,posicion", ignoreDuplicates: true },
        );
        if (error) throw error;
      }
      const filas = consumos
        .filter((c) => c.insumo_id && Number(c.cantidad) > 0)
        .map((c) => ({ orden_id: cierre.id, insumo_id: c.insumo_id, cantidad_usada: Number(c.cantidad) }));
      if (filas.length) {
        const { error } = await supabase.from("orden_trabajo_insumos").insert(filas);
        if (error) throw error;
      }
      const { error } = await supabase
        .from("ordenes_trabajo")
        .update({
          estado: "completada",
          fecha_ejecucion: cierreForm.fecha_ejecucion,
          hora_inicio: cierreForm.hora_inicio,
          hora_termino: cierreForm.hora_termino,
          observaciones: cierreForm.observaciones || null,
        })
        .eq("id", cierre.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordenes"] });
      qc.invalidateQueries({ queryKey: ["maquinas"] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      setCierre(null);
      setPasosMarcados([]);
      toast.success("Orden cerrada: stock y fechas de mantención actualizados");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reprogramarOrden = useMutation({
    mutationFn: async () => {
      if (!reprogramar) return;
      const { orden, fechaNueva, motivo, pendientes } = reprogramar;
      if (!fechaNueva || fechaNueva < hoyISO()) throw new Error("Elige una nueva fecha desde hoy en adelante");
      // El detalle de la reprogramación queda registrado en las observaciones de la orden.
      const detalle = [`[${fecha(hoyISO())}] Reprogramada: ${fecha(orden.fecha_programada)} → ${fecha(fechaNueva)}.`];
      if (pendientes.length) detalle.push(`Pasos sin realizar: ${pendientes.join("; ")}.`);
      if (motivo.trim()) detalle.push(`Motivo: ${motivo.trim()}`);
      const observaciones = [orden.observaciones, detalle.join(" ")].filter(Boolean).join("\n");
      const { data, error } = await supabase
        .from("ordenes_trabajo")
        .update({ estado: "reprogramada", fecha_programada: fechaNueva, observaciones })
        .eq("id", orden.id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No se pudo reprogramar la orden (sin permisos)");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordenes"] });
      setReprogramar(null);
      setCierre(null);
      setPasosMarcados([]);
      toast.success("Orden reprogramada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function abrirCierre(o: OrdenCompleta) {
    setCierre(o);
    setCierreForm({
      fecha_ejecucion: hoyISO(),
      hora_inicio: o.hora_inicio ?? "",
      hora_termino: o.hora_termino ?? "",
      observaciones: o.observaciones ?? "",
    });
    setConsumos([]);
    setPasosMarcados([]);
  }

  const horasCierre = calcularHoras(cierreForm.hora_inicio, cierreForm.hora_termino);

  // Repuestos que exceden el stock disponible o tienen cantidad inválida (sumando
  // repeticiones del mismo repuesto en la lista de consumos).
  const erroresConsumos = useMemo(() => {
    const totalesPorInsumo = new Map<string, number>();
    for (const c of consumos) {
      if (!c.insumo_id) continue;
      totalesPorInsumo.set(c.insumo_id, (totalesPorInsumo.get(c.insumo_id) ?? 0) + Number(c.cantidad || 0));
    }
    return consumos.map((c) => {
      if (!c.insumo_id) return null;
      const cantidad = Number(c.cantidad || 0);
      if (!Number.isFinite(cantidad) || cantidad <= 0) return "La cantidad debe ser mayor a cero";
      const disponible = Number(insumos.find((i) => i.id === c.insumo_id)?.stock_actual ?? 0);
      if ((totalesPorInsumo.get(c.insumo_id) ?? 0) > disponible) return `Supera el stock disponible (${disponible})`;
      return null;
    });
  }, [consumos, insumos]);

  const hayErroresConsumos = erroresConsumos.some((e) => e !== null);

  const totalCierre =
    consumos.reduce((s, c) => {
      const ins = insumos.find((i) => i.id === c.insumo_id);
      return s + Number(c.cantidad || 0) * Number(ins?.costo_unitario ?? 0);
    }, 0) +
    horasCierre * Number(empleados.find((e) => e.id === cierre?.tecnico_id)?.tarifa_hora ?? 0);

  return (
    <>
    <AppShell
      titulo="Órdenes de trabajo"
      subtitulo={`${ordenes.filter((o) => o.estado === "pendiente" || o.estado === "reprogramada").length} pendientes de ejecución`}
      acciones={
        <>
          <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Folio, equipo o técnico…" />
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="h-8 rounded-lg bg-base px-2 text-xs ring-1 ring-line focus:outline-none"
          >
            <option value="todas">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="completada">Completada</option>
            <option value="reprogramada">Reprogramada</option>
          </select>
          {puedeCrear ? <BotonPrincipal onClick={() => setNueva({ ...nuevaVacia })}>Nueva orden</BotonPrincipal> : null}
        </>
      }
    >
      <Tarjeta className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-5 py-3 font-normal">Folio</th>
              <th className="px-5 py-3 font-normal">Equipo</th>
              <th className="px-5 py-3 font-normal">Tipo</th>
              <th className="px-5 py-3 font-normal">Programada</th>
              <th className="px-5 py-3 font-normal">Técnico</th>
              <th className="px-5 py-3 font-normal">Estado</th>
              <th className="px-5 py-3 font-normal">Costo</th>
              <th className="px-5 py-3 font-normal" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lista.map((o) => (
              <tr key={o.id} className="hover:bg-base/60">
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                  <Link to="/ordenes/$id" params={{ id: o.id }} className="hover:underline">#{o.folio}</Link>
                </td>
                <td className="px-5 py-3">
                  <Link to="/ordenes/$id" params={{ id: o.id }} className="block">
                    <div className="font-medium">{o.maquinas?.nombre ?? "—"}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{o.maquinas?.codigo ?? ""}</div>
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <Pastilla tono={tonoTipoOrden(o.tipo)}>{etiquetaTipoOrden(o.tipo)}</Pastilla>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{fecha(o.fecha_programada)}</td>
                <td className="px-5 py-3 text-muted-foreground">{o.empleados?.nombre ?? "Sin asignar"}</td>
                <td className="px-5 py-3"><EstadoOrden estado={o.estado} /></td>
                <td className="px-5 py-3">{money(costoOrden(o).total)}</td>
                <td className="px-5 py-3 text-right">
                  {puedeEditar && o.estado !== "completada" ? (
                    <div className="flex justify-end gap-3">
                      {o.estado === "pendiente" || o.estado === "reprogramada" ? (
                        <button
                          onClick={() => iniciarOrden(o)}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          Iniciar
                        </button>
                      ) : null}
                      <button onClick={() => abrirCierre(o)} className="text-xs text-accent hover:underline">
                        Cerrar
                      </button>
                    </div>
                  ) : null}
                  {esAdmin && o.estado === "completada" ? (
                    <button
                      onClick={() => confirmarEliminar(o)}
                      disabled={eliminar.isPending}
                      className="text-xs text-red hover:underline disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && lista.length === 0 ? <Vacio mensaje="Sin órdenes para este filtro." /> : null}
      </Tarjeta>

      <PanelLateral
        abierto={nueva !== null}
        titulo="Nueva orden de trabajo"
        subtitulo="Programación de mantención"
        onCerrar={() => setNueva(null)}
        pie={
          <BotonPrincipal
            className="w-full"
            disabled={crear.isPending || !nueva?.maquina_id}
            onClick={() => crear.mutate()}
          >
            Crear orden
          </BotonPrincipal>
        }
      >
        {nueva ? (
          <>
            <Campo label="Máquina">
              <Seleccion value={nueva.maquina_id} onChange={(e) => setNueva({ ...nueva, maquina_id: e.target.value })}>
                <option value="">Selecciona un equipo</option>
                {maquinas.map((m) => (
                  <option key={m.id} value={m.id}>{m.codigo} · {m.nombre}</option>
                ))}
              </Seleccion>
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Tipo">
                <Seleccion
                  value={nueva.tipo}
                  onChange={(e) => setNueva({ ...nueva, tipo: e.target.value as TipoOrden })}
                >
                  <option value="preventiva_diaria">Preventiva diaria</option>
                  <option value="preventiva_mensual">Preventiva mensual</option>
                  <option value="correctiva">Correctiva</option>
                </Seleccion>
              </Campo>
              <Campo label="Fecha programada">
                <Entrada
                  type="date"
                  value={nueva.fecha_programada}
                  onChange={(e) => setNueva({ ...nueva, fecha_programada: e.target.value })}
                />
              </Campo>
            </div>
            <Campo label="Técnico asignado">
              <Seleccion value={nueva.tecnico_id} onChange={(e) => setNueva({ ...nueva, tecnico_id: e.target.value })}>
                <option value="">Sin asignar</option>
                {empleados
                  .filter((e) => e.es_tecnico)
                  .map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre} — {e.cargo ?? "—"}</option>
                  ))}
              </Seleccion>
            </Campo>
            <Campo label="Descripción del trabajo">
              <AreaTexto rows={4} value={nueva.descripcion} onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })} />
            </Campo>
          </>
        ) : null}
      </PanelLateral>

      <PanelLateral
        abierto={cierre !== null && reprogramar === null}
        titulo={cierre ? `Cerrar orden #${cierre.folio}` : ""}
        subtitulo={cierre?.maquinas?.nombre ?? ""}
        onCerrar={() => setCierre(null)}
        pie={
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Costo estimado</span>
              <span className="font-medium">{money(totalCierre)}</span>
            </div>
            <div className="flex gap-2">
              <BotonPrincipal
                className="flex-1"
                disabled={
                  cerrarOrden.isPending ||
                  !cierreForm.hora_inicio ||
                  !cierreForm.hora_termino ||
                  hayErroresConsumos ||
                  !pasosOk
                }
                onClick={() => cerrarOrden.mutate()}
              >
                Cerrar orden
              </BotonPrincipal>
              {cierre ? (
                <BotonSecundario
                  onClick={() =>
                    setReprogramar({
                      orden: cierre,
                      fechaNueva: manianaISO(),
                      motivo: "",
                      pendientes: pasosPendientes.map((p) => `${pasosCierre.indexOf(p) + 1}. ${p.descripcion}`),
                    })
                  }
                >
                  Reprogramar
                </BotonSecundario>
              ) : null}
            </div>
          </div>
        }
      >
        <Campo label="Fecha de ejecución">
          <Entrada
            type="date"
            value={cierreForm.fecha_ejecucion}
            onChange={(e) => setCierreForm({ ...cierreForm, fecha_ejecucion: e.target.value })}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Hora de inicio">
            <Entrada
              type="time"
              value={cierreForm.hora_inicio}
              onChange={(e) => setCierreForm({ ...cierreForm, hora_inicio: e.target.value })}
            />
          </Campo>
          <Campo label="Hora de término">
            <Entrada
              type="time"
              value={cierreForm.hora_termino}
              onChange={(e) => setCierreForm({ ...cierreForm, hora_termino: e.target.value })}
            />
          </Campo>
        </div>

        {cierreForm.hora_inicio && cierreForm.hora_termino ? (
          <p className="text-xs text-muted-foreground">
            Horas de mano de obra calculadas: <span className="font-medium text-ink">{horasCierre} h</span>
          </p>
        ) : null}

        <div>
          <TituloSeccion>Repuestos utilizados</TituloSeccion>
          <p className="mt-1 text-[11px] text-muted-foreground">Se descuentan del stock al cerrar la orden.</p>
          <div className="mt-3 space-y-2">
            {consumos.map((c, idx) => {
              const stockDisponible = insumos.find((i) => i.id === c.insumo_id)?.stock_actual;
              const error = erroresConsumos[idx];
              return (
                <div key={idx}>
                  <div className="flex gap-2">
                    <Seleccion
                      value={c.insumo_id}
                      onChange={(e) => {
                        const copia = [...consumos];
                        copia[idx] = { ...c, insumo_id: e.target.value };
                        setConsumos(copia);
                      }}
                      className="flex-1"
                    >
                      <option value="">Selecciona repuesto</option>
                      {insumosDisponibles.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.codigo} · {i.nombre} ({Number(i.stock_actual)} {i.unidad})
                        </option>
                      ))}
                    </Seleccion>
                    <Entrada
                      type="number"
                      className="w-24"
                      min={1}
                      max={stockDisponible !== undefined ? Number(stockDisponible) : undefined}
                      value={c.cantidad}
                      onChange={(e) => {
                        const copia = [...consumos];
                        copia[idx] = { ...c, cantidad: e.target.value };
                        setConsumos(copia);
                      }}
                    />
                    <button
                      onClick={() => setConsumos(consumos.filter((_, i) => i !== idx))}
                      className="shrink-0 px-1 text-xs text-muted-foreground hover:text-red"
                      aria-label="Quitar repuesto"
                    >
                      ✕
                    </button>
                  </div>
                  {error ? <p className="mt-1 text-[11px] text-red">{error}</p> : null}
                </div>
              );
            })}
            <BotonSecundario onClick={() => setConsumos([...consumos, { insumo_id: "", cantidad: "1" }])}>
              Agregar repuesto
            </BotonSecundario>
          </div>
        </div>

        <Campo label="Observaciones">
          <AreaTexto
            rows={4}
            value={cierreForm.observaciones}
            onChange={(e) => setCierreForm({ ...cierreForm, observaciones: e.target.value })}
          />
        </Campo>

        {frecuenciaCierre ? (
          <div>
            <TituloSeccion>Pasos de mantención {frecuenciaCierre}</TituloSeccion>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Marca cada paso realizado. Para cerrar la orden deben estar todos marcados; si falta alguno, reprograma la orden.
            </p>
            {cargandoPasos ? (
              <p className="mt-3 text-xs text-muted-foreground">Cargando pasos…</p>
            ) : errorPasos ? (
              <p className="mt-3 text-xs text-red">No se pudieron cargar los pasos. Cierra este panel y vuelve a abrirlo.</p>
            ) : pasosCierre.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Esta máquina no tiene pasos de mantención {frecuenciaCierre} definidos.
              </p>
            ) : (
              <>
                <ol className="mt-3 space-y-2">
                  {pasosCierre.map((p, idx) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-base px-3 py-2.5 ring-1 ring-line">
                        <input
                          type="checkbox"
                          checked={pasosMarcados.includes(p.id)}
                          onChange={(e) =>
                            setPasosMarcados(
                              e.target.checked ? [...pasosMarcados, p.id] : pasosMarcados.filter((id) => id !== p.id),
                            )
                          }
                          className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                        />
                        <span className="text-sm">
                          <span className="mr-1.5 font-mono text-xs text-muted-foreground">{idx + 1}.</span>
                          {p.descripcion}
                        </span>
                      </label>
                    </li>
                  ))}
                </ol>
                <p className={`mt-2 text-xs ${pasosPendientes.length ? "text-amber" : "text-ok"}`}>
                  {pasosCierre.length - pasosPendientes.length} de {pasosCierre.length} pasos realizados
                  {pasosPendientes.length
                    ? ` · faltan ${pasosPendientes.length}: no se puede cerrar la orden, usa «Reprogramar».`
                    : " · listo para cerrar."}
                </p>
              </>
            )}
          </div>
        ) : null}
      </PanelLateral>

      <PanelLateral
        abierto={reprogramar !== null}
        titulo={reprogramar ? `Reprogramar orden #${reprogramar.orden.folio}` : ""}
        subtitulo={reprogramar?.orden.maquinas?.nombre ?? ""}
        onCerrar={() => setReprogramar(null)}
        pie={
          <BotonPrincipal
            className="w-full"
            disabled={
              reprogramarOrden.isPending || !reprogramar?.fechaNueva || (reprogramar?.fechaNueva ?? "") < hoyISO()
            }
            onClick={() => reprogramarOrden.mutate()}
          >
            Reprogramar orden
          </BotonPrincipal>
        }
      >
        {reprogramar ? (
          <>
            <p className="text-xs text-muted-foreground">
              Fecha programada actual:{" "}
              <span className="font-medium text-ink">{fecha(reprogramar.orden.fecha_programada)}</span>. La orden quedará
              en estado «Reprogramada» y podrá iniciarse o cerrarse en la nueva fecha.
            </p>
            {reprogramar.pendientes.length ? (
              <div className="rounded-xl bg-amber-soft px-3 py-2.5 text-xs text-amber">
                <div className="font-medium">Pasos sin realizar</div>
                <ul className="mt-1 space-y-0.5">
                  {reprogramar.pendientes.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Campo label="Nueva fecha programada">
              <Entrada
                type="date"
                min={hoyISO()}
                value={reprogramar.fechaNueva}
                onChange={(e) => setReprogramar({ ...reprogramar, fechaNueva: e.target.value })}
              />
            </Campo>
            <Campo label="Motivo (opcional)">
              <AreaTexto
                rows={3}
                value={reprogramar.motivo}
                onChange={(e) => setReprogramar({ ...reprogramar, motivo: e.target.value })}
              />
            </Campo>
          </>
        ) : null}
      </PanelLateral>
    </AppShell>
    {imprimir ? <HojaImpresion orden={imprimir} pasos={pasosImprimir} /> : null}
    </>
  );
}
