import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/erp/AppShell";
import {
  Tarjeta,
  TituloSeccion,
  EstadoOrden,
  Pastilla,
  Vacio,
  PanelLateral,
  Campo,
  Entrada,
  Seleccion,
  AreaTexto,
  BotonPrincipal,
  BotonSecundario,
} from "@/components/erp/ui-bits";
import {
  useOrdenes,
  useInventario,
  insumosParaMaquina,
  usePasosMaquina,
  costoOrden,
  type OrdenCompleta,
} from "@/lib/datos";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fecha, money, hoyISO, etiquetaTipoOrden, tonoTipoOrden, calcularHoras, fechaDDMMAAAA } from "@/lib/format";

function manianaISO() {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{etiqueta}</div>
      <div className="mt-1 text-sm">{valor}</div>
    </div>
  );
}

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

export const Route = createFileRoute("/_authenticated/ordenes/id")({
  head: () => ({
    meta: [
      { title: "Orden de trabajo · BP Glass" },
      { name: "description", content: "Detalle, pasos, repuestos y acciones de una orden de trabajo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Orden de trabajo · BP Glass" },
      { property: "og:description", content: "Ficha completa de una orden de mantención." },
    ],
  }),
  component: FichaOrden,
});

function FichaOrden() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { esAdmin, esTecnico } = useAuth();
  const puedeEditar = esAdmin || esTecnico;
  const qc = useQueryClient();
  const { data: ordenes = [], isLoading } = useOrdenes();
  const { data: insumos = [] } = useInventario();
  const orden = ordenes.find((o) => o.id === id) ?? null;

  const insumosDisponibles = useMemo(
    () => insumosParaMaquina(insumos, orden?.maquina_id),
    [insumos, orden],
  );

  // --- Imprimir al iniciar ---
  const [imprimir, setImprimir] = useState(false);
  const frecuenciaImprimir =
    orden?.tipo === "preventiva_diaria" ? "diaria" : orden?.tipo === "preventiva_mensual" ? "mensual" : null;
  const { data: pasosMaquinaImprimir = [], isLoading: cargandoPasosImprimir } = usePasosMaquina(
    imprimir && frecuenciaImprimir ? orden?.maquina_id : undefined,
  );
  const pasosImprimir = useMemo(
    () =>
      pasosMaquinaImprimir
        .filter((p) => p.frecuencia === frecuenciaImprimir)
        .sort((a, b) => a.posicion - b.posicion),
    [pasosMaquinaImprimir, frecuenciaImprimir],
  );

  useEffect(() => {
    if (!imprimir || !orden) return;
    if (frecuenciaImprimir && cargandoPasosImprimir) return;
    window.print();
    const limpiar = () => setImprimir(false);
    window.addEventListener("afterprint", limpiar);
    return () => window.removeEventListener("afterprint", limpiar);
  }, [imprimir, orden, frecuenciaImprimir, cargandoPasosImprimir]);

  const cambiarEstado = useMutation({
    mutationFn: async (estado: "en_proceso" | "pendiente") => {
      if (!orden) return;
      const { error } = await supabase.from("ordenes_trabajo").update({ estado }).eq("id", orden.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordenes"] });
      qc.invalidateQueries({ queryKey: ["maquinas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function iniciarOrden() {
    cambiarEstado.mutate("en_proceso");
    setImprimir(true);
  }

  // --- Cerrar orden ---
  const [cierreAbierto, setCierreAbierto] = useState(false);
  const [cierreForm, setCierreForm] = useState({
    fecha_ejecucion: hoyISO(),
    hora_inicio: "",
    hora_termino: "",
    observaciones: "",
  });
  const [consumos, setConsumos] = useState<{ insumo_id: string; cantidad: string }[]>([]);
  const [pasosMarcados, setPasosMarcados] = useState<string[]>([]);

  function abrirCierre() {
    if (!orden) return;
    setCierreForm({
      fecha_ejecucion: hoyISO(),
      hora_inicio: orden.hora_inicio ?? "",
      hora_termino: orden.hora_termino ?? "",
      observaciones: orden.observaciones ?? "",
    });
    setConsumos([]);
    setPasosMarcados([]);
    setCierreAbierto(true);
  }

  const frecuenciaCierre =
    orden?.tipo === "preventiva_diaria" ? "diaria" : orden?.tipo === "preventiva_mensual" ? "mensual" : null;
  const {
    data: pasosMaquina = [],
    isLoading: cargandoPasos,
    isError: errorPasos,
  } = usePasosMaquina(cierreAbierto && frecuenciaCierre ? orden?.maquina_id : undefined);
  const pasosCierre = useMemo(
    () => pasosMaquina.filter((p) => p.frecuencia === frecuenciaCierre).sort((a, b) => a.posicion - b.posicion),
    [pasosMaquina, frecuenciaCierre],
  );
  const pasosPendientes = pasosCierre.filter((p) => !pasosMarcados.includes(p.id));
  const pasosOk = frecuenciaCierre === null || (!cargandoPasos && !errorPasos && pasosPendientes.length === 0);

  const horasCierre = calcularHoras(cierreForm.hora_inicio, cierreForm.hora_termino);

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
    }, 0) + horasCierre * Number(orden?.empleados?.tarifa_hora ?? 0);

  const cerrarOrden = useMutation({
    mutationFn: async () => {
      if (!orden) return;
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
        const { error } = await supabase.from("orden_trabajo_pasos").upsert(
          pasosCierre.map((p) => ({ orden_id: orden.id, posicion: p.posicion, descripcion: p.descripcion })),
          { onConflict: "orden_id,posicion", ignoreDuplicates: true },
        );
        if (error) throw error;
      }
      const filas = consumos
        .filter((c) => c.insumo_id && Number(c.cantidad) > 0)
        .map((c) => ({ orden_id: orden.id, insumo_id: c.insumo_id, cantidad_usada: Number(c.cantidad) }));
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
        .eq("id", orden.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordenes"] });
      qc.invalidateQueries({ queryKey: ["maquinas"] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      setCierreAbierto(false);
      setPasosMarcados([]);
      toast.success("Orden cerrada: stock y fechas de mantención actualizados");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Reprogramar ---
  const [reprogramarAbierto, setReprogramarAbierto] = useState(false);
  const [reprogramarForm, setReprogramarForm] = useState({ fechaNueva: manianaISO(), motivo: "" });

  function abrirReprogramar() {
    setReprogramarForm({ fechaNueva: manianaISO(), motivo: "" });
    setReprogramarAbierto(true);
  }

  const reprogramarOrden = useMutation({
    mutationFn: async () => {
      if (!orden) return;
      const { fechaNueva, motivo } = reprogramarForm;
      if (!fechaNueva || fechaNueva < hoyISO()) throw new Error("Elige una nueva fecha desde hoy en adelante");
      const detalle = [`[${fecha(hoyISO())}] Reprogramada: ${fecha(orden.fecha_programada)} → ${fecha(fechaNueva)}.`];
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
      setReprogramarAbierto(false);
      setCierreAbierto(false);
      setPasosMarcados([]);
      toast.success("Orden reprogramada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Eliminar (solo admin, solo si la orden está completada, con confirmación) ---
  const eliminar = useMutation({
    mutationFn: async () => {
      if (!orden) return;
      const { data, error } = await supabase
        .from("ordenes_trabajo")
        .delete()
        .eq("id", orden.id)
        .eq("estado", "completada")
        .select("id");
      if (error) throw error;
      // Con RLS, un borrado no permitido no da error: simplemente afecta 0 filas.
      if (!data?.length) throw new Error("No se pudo eliminar la orden (sin permisos o ya no está completada)");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordenes"] });
      toast.success("Orden eliminada");
      navigate({ to: "/ordenes", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function confirmarEliminar() {
    if (!orden) return;
    const ok = window.confirm(
      `¿Eliminar la orden #${orden.folio} de ${orden.maquinas?.nombre ?? "la máquina"}?\n\n` +
        "Se borrará también su detalle de repuestos y horas. El stock ya descontado no se devuelve. Esta acción no se puede deshacer.",
    );
    if (ok) eliminar.mutate();
  }

  if (isLoading) return <AppShell titulo="Cargando…"><div /></AppShell>;
  if (!orden)
    return (
      <AppShell titulo="Orden no encontrada">
        <Tarjeta className="p-6">
          <Vacio mensaje="Esta orden no existe o fue eliminada." />
          <div className="text-center">
            <Link to="/ordenes" className="text-sm text-accent underline">Volver a órdenes</Link>
          </div>
        </Tarjeta>
      </AppShell>
    );

  const c = costoOrden(orden);

  return (
    <>
    <AppShell
      titulo={`Orden #${orden.folio}`}
      subtitulo={orden.maquinas?.nombre ?? ""}
      acciones={
        <>
          <Link to="/maquinaria/$id" params={{ id: orden.maquina_id }} className="text-xs text-muted-foreground hover:text-ink">
            Ver máquina
          </Link>
          <Link to="/ordenes" className="text-xs text-muted-foreground hover:text-ink">← Volver</Link>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Tarjeta className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Pastilla tono={tonoTipoOrden(orden.tipo)}>{etiquetaTipoOrden(orden.tipo)}</Pastilla>
            <EstadoOrden estado={orden.estado} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Dato etiqueta="Máquina" valor={`${orden.maquinas?.codigo ?? ""} · ${orden.maquinas?.nombre ?? "—"}`} />
            <Dato etiqueta="Técnico" valor={orden.empleados?.nombre ?? "Sin asignar"} />
            <Dato etiqueta="Programada" valor={fecha(orden.fecha_programada)} />
            <Dato etiqueta="Ejecutada" valor={orden.fecha_ejecucion ? fecha(orden.fecha_ejecucion) : "—"} />
            <Dato
              etiqueta="Horario"
              valor={orden.hora_inicio && orden.hora_termino ? `${orden.hora_inicio} – ${orden.hora_termino}` : "—"}
            />
            <Dato etiqueta="Horas mano de obra" valor={`${Number(orden.horas_mano_obra ?? 0)} h`} />
          </div>
          {orden.descripcion ? (
            <div className="mt-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Descripción del trabajo</div>
              <p className="mt-1 text-sm">{orden.descripcion}</p>
            </div>
          ) : null}
          {orden.observaciones ? (
            <div className="mt-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Observaciones</div>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{orden.observaciones}</p>
            </div>
          ) : null}
        </Tarjeta>

        <Tarjeta className="p-5">
          <TituloSeccion>Costos</TituloSeccion>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Repuestos</span>
              <span>{money(c.insumos)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Mano de obra</span>
              <span>{money(c.manoObra)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2 font-medium">
              <span>Total</span>
              <span>{money(c.total)}</span>
            </div>
          </div>
        </Tarjeta>
      </div>

      {orden.orden_trabajo_pasos?.length ? (
        <Tarjeta className="mt-4 p-5">
          <TituloSeccion>Pasos realizados</TituloSeccion>
          <ol className="mt-3 space-y-1.5 text-sm">
            {[...orden.orden_trabajo_pasos]
              .sort((a, b) => a.posicion - b.posicion)
              .map((p) => (
                <li key={p.id}>✓ {p.posicion}. {p.descripcion}</li>
              ))}
          </ol>
        </Tarjeta>
      ) : null}

      {orden.orden_trabajo_insumos?.length ? (
        <Tarjeta className="mt-4 p-5">
          <TituloSeccion>Repuestos utilizados</TituloSeccion>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {orden.orden_trabajo_insumos.map((i) => (
              <li key={i.id}>
                · {i.inventario?.nombre ?? "Insumo"} × {Number(i.cantidad_usada)} {i.inventario?.unidad ?? ""}
              </li>
            ))}
          </ul>
        </Tarjeta>
      ) : null}

      <Tarjeta className="mt-4 p-5">
        <TituloSeccion>Acciones</TituloSeccion>
        <div className="mt-3 flex flex-wrap gap-2">
          {puedeEditar && (orden.estado === "pendiente" || orden.estado === "reprogramada") ? (
            <BotonPrincipal onClick={iniciarOrden} disabled={cambiarEstado.isPending}>
              Iniciar
            </BotonPrincipal>
          ) : null}
          {puedeEditar && orden.estado !== "completada" ? (
            <BotonSecundario onClick={abrirCierre}>Cerrar orden</BotonSecundario>
          ) : null}
          {puedeEditar && orden.estado !== "completada" ? (
            <BotonSecundario onClick={abrirReprogramar}>Reprogramar</BotonSecundario>
          ) : null}
          {esAdmin && orden.estado === "completada" ? (
            <BotonSecundario
              onClick={confirmarEliminar}
              disabled={eliminar.isPending}
              className="ml-auto !bg-red-soft !text-red hover:!bg-red-soft/80"
            >
              {eliminar.isPending ? "Eliminando…" : "Eliminar orden"}
            </BotonSecundario>
          ) : null}
        </div>
      </Tarjeta>

      <PanelLateral
        abierto={cierreAbierto}
        titulo={`Cerrar orden #${orden.folio}`}
        subtitulo={orden.maquinas?.nombre ?? ""}
        onCerrar={() => setCierreAbierto(false)}
        pie={
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Costo estimado</span>
              <span className="font-medium">{money(totalCierre)}</span>
            </div>
            <BotonPrincipal
              className="w-full"
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
            {consumos.map((c2, idx) => {
              const stockDisponible = insumos.find((i) => i.id === c2.insumo_id)?.stock_actual;
              const error = erroresConsumos[idx];
              return (
                <div key={idx}>
                  <div className="flex gap-2">
                    <Seleccion
                      value={c2.insumo_id}
                      onChange={(e) => {
                        const copia = [...consumos];
                        copia[idx] = { ...c2, insumo_id: e.target.value };
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
                      value={c2.cantidad}
                      onChange={(e) => {
                        const copia = [...consumos];
                        copia[idx] = { ...c2, cantidad: e.target.value };
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
        abierto={reprogramarAbierto}
        titulo={`Reprogramar orden #${orden.folio}`}
        subtitulo={orden.maquinas?.nombre ?? ""}
        onCerrar={() => setReprogramarAbierto(false)}
        pie={
          <BotonPrincipal
            className="w-full"
            disabled={
              reprogramarOrden.isPending || !reprogramarForm.fechaNueva || reprogramarForm.fechaNueva < hoyISO()
            }
            onClick={() => reprogramarOrden.mutate()}
          >
            Reprogramar orden
          </BotonPrincipal>
        }
      >
        <p className="text-xs text-muted-foreground">
          Fecha programada actual: <span className="font-medium text-ink">{fecha(orden.fecha_programada)}</span>. La
          orden quedará en estado «Reprogramada» y podrá iniciarse o cerrarse en la nueva fecha.
        </p>
        <Campo label="Nueva fecha programada">
          <Entrada
            type="date"
            min={hoyISO()}
            value={reprogramarForm.fechaNueva}
            onChange={(e) => setReprogramarForm({ ...reprogramarForm, fechaNueva: e.target.value })}
          />
        </Campo>
        <Campo label="Motivo (opcional)">
          <AreaTexto
            rows={3}
            value={reprogramarForm.motivo}
            onChange={(e) => setReprogramarForm({ ...reprogramarForm, motivo: e.target.value })}
          />
        </Campo>
      </PanelLateral>
    </AppShell>
    {imprimir ? <HojaImpresion orden={orden} pasos={pasosImprimir} /> : null}
    </>
  );
}
