import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/erp/AppShell";
import { Tarjeta, TituloSeccion, BotonSecundario, Campo, Entrada, Vacio } from "@/components/erp/ui-bits";
import { useOrdenes, useEmpleados, useMaquinas, useRemuneraciones, costoOrden } from "@/lib/datos";
import { useAuth } from "@/hooks/useAuth";
import { money, fecha, descargarCSV, etiquetaTipoOrden } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes y costos · BP Glass" },
      { name: "description", content: "Costos por orden, por máquina y por período, con gráfico mensual y exportación CSV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Reportes y costos · BP Glass" },
      { property: "og:description", content: "Análisis de costos de mantención y remuneraciones por período." },
    ],
  }),
  component: Reportes,
});

function inicioAnio() {
  return `${new Date().getFullYear()}-01-01`;
}

function Reportes() {
  const { esAdmin, esRRHH } = useAuth();
  const verSueldos = esAdmin || esRRHH;
  const { data: ordenes = [] } = useOrdenes();
  const { data: maquinas = [] } = useMaquinas();
  const { data: empleados = [] } = useEmpleados();
  const { data: remuneraciones = [] } = useRemuneraciones(verSueldos);

  const [desde, setDesde] = useState(inicioAnio());
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));

  const enRango = useMemo(
    () =>
      ordenes.filter((o) => {
        const f = o.fecha_ejecucion ?? o.fecha_programada;
        return f >= desde && f <= hasta && o.estado === "completada";
      }),
    [ordenes, desde, hasta],
  );

  const totales = enRango.reduce(
    (acc, o) => {
      const c = costoOrden(o);
      acc.insumos += c.insumos;
      acc.manoObra += c.manoObra;
      acc.total += c.total;
      return acc;
    },
    { insumos: 0, manoObra: 0, total: 0 },
  );

  const porMaquina = maquinas
    .map((m) => ({
      maquina: m,
      total: enRango.filter((o) => o.maquina_id === m.id).reduce((s, o) => s + costoOrden(o).total, 0),
      ordenes: enRango.filter((o) => o.maquina_id === m.id).length,
    }))
    .filter((r) => r.ordenes > 0)
    .sort((a, b) => b.total - a.total);

  const porMes = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const o of enRango) {
      const mes = (o.fecha_ejecucion ?? o.fecha_programada).slice(0, 7);
      mapa.set(mes, (mapa.get(mes) ?? 0) + costoOrden(o).total);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [enRango]);

  const maxMes = Math.max(1, ...porMes.map(([, v]) => v));
  const sueldosMensuales = remuneraciones.reduce((s, r) => s + Number(r.sueldo_base), 0);
  const mesesRango = Math.max(1, porMes.length);

  function exportarOrdenes() {
    descargarCSV(
      `costos_ordenes_${desde}_${hasta}.csv`,
      enRango.map((o) => {
        const c = costoOrden(o);
        return {
          folio: o.folio,
          maquina: o.maquinas?.nombre ?? "",
          codigo: o.maquinas?.codigo ?? "",
          tipo: etiquetaTipoOrden(o.tipo),
          fecha_ejecucion: o.fecha_ejecucion ?? "",
          tecnico: o.empleados?.nombre ?? "",
          horas: Number(o.horas_mano_obra),
          costo_insumos: Math.round(c.insumos),
          costo_mano_obra: Math.round(c.manoObra),
          costo_total: Math.round(c.total),
        };
      }),
    );
  }

  return (
    <AppShell
      titulo="Reportes y costos"
      subtitulo="Costos de mantención por orden, máquina y período"
      acciones={
        <>
           <Campo label=""><Entrada type="date" aria-label="Desde" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-9 w-36 text-xs" /></Campo>
           <Campo label=""><Entrada type="date" aria-label="Hasta" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-9 w-36 text-xs" /></Campo>
          <BotonSecundario onClick={exportarOrdenes}>Exportar CSV</BotonSecundario>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Tarjeta className="p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Insumos</div>
          <div className="mt-2 font-serif text-2xl">{money(totales.insumos)}</div>
        </Tarjeta>
        <Tarjeta className="p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Mano de obra</div>
          <div className="mt-2 font-serif text-2xl">{money(totales.manoObra)}</div>
        </Tarjeta>
        <Tarjeta className="p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Costo total del período</div>
          <div className="mt-2 font-serif text-2xl">{money(totales.total)}</div>
        </Tarjeta>
      </div>

      <Tarjeta className="mt-4 p-5">
        <TituloSeccion>Costo mensual de mantención</TituloSeccion>
        {porMes.length === 0 ? <Vacio mensaje="Sin órdenes completadas en el período." /> : null}
        <div className="mt-6 flex h-52 items-end gap-3 overflow-x-auto">
          {porMes.map(([mes, valor]) => (
            <div key={mes} className="flex min-w-20 flex-1 flex-col items-center gap-2">
              <div className="text-[10px] text-muted-foreground">{money(valor)}</div>
              <div
                className="w-full rounded-t-lg bg-accent"
                style={{ height: `${Math.max(4, (valor / maxMes) * 150)}px` }}
              />
              <div className="font-mono text-[10px] text-muted-foreground">{mes}</div>
            </div>
          ))}
        </div>
      </Tarjeta>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Tarjeta className="p-5">
          <TituloSeccion>Costo por máquina</TituloSeccion>
          <div className="mt-3 divide-y divide-line">
            {porMaquina.length === 0 ? <Vacio mensaje="Sin datos en el período." /> : null}
            {porMaquina.map((r) => (
               <div key={r.maquina.id} className="flex items-center justify-between gap-3 py-2.5">
                 <div className="min-w-0">
                  <div className="text-sm font-medium">{r.maquina.nombre}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {r.maquina.codigo} · {r.ordenes} órdenes
                  </div>
                </div>
                 <div className="shrink-0 text-sm font-medium">{money(r.total)}</div>
              </div>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta className="p-5">
          <TituloSeccion>Detalle por orden</TituloSeccion>
          <div className="mt-3 max-h-80 divide-y divide-line overflow-y-auto">
            {enRango.length === 0 ? <Vacio mensaje="Sin órdenes completadas." /> : null}
            {enRango.map((o) => {
              const c = costoOrden(o);
              return (
                 <div key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                   <div className="min-w-0">
                    <div className="text-sm font-medium">#{o.folio} · {o.maquinas?.nombre ?? "—"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {fecha(o.fecha_ejecucion)} · insumos {money(c.insumos)} · obra {money(c.manoObra)}
                    </div>
                  </div>
                   <div className="shrink-0 text-sm font-medium">{money(c.total)}</div>
                </div>
              );
            })}
          </div>
        </Tarjeta>
      </div>

      {verSueldos ? (
        <Tarjeta className="mt-4 p-5">
          <TituloSeccion>Remuneraciones</TituloSeccion>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Sueldos mensuales</div>
              <div className="mt-1 font-serif text-2xl">{money(sueldosMensuales)}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Estimado del período ({mesesRango} meses)
              </div>
              <div className="mt-1 font-serif text-2xl">{money(sueldosMensuales * mesesRango)}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Personas</div>
              <div className="mt-1 font-serif text-2xl">{empleados.length}</div>
            </div>
          </div>
          <div className="mt-4">
            <BotonSecundario
              onClick={() =>
                descargarCSV(
                  "sueldos.csv",
                  empleados.map((e) => ({
                    nombre: e.nombre,
                    cargo: e.cargo ?? "",
                    area: e.area ?? "",
                    tarifa_hora: Number(e.tarifa_hora),
                    sueldo_base: Number(remuneraciones.find((r) => r.empleado_id === e.id)?.sueldo_base ?? 0),
                  })),
                )
              }
            >
              Exportar sueldos CSV
            </BotonSecundario>
          </div>
        </Tarjeta>
      ) : null}
    </AppShell>
  );
}
