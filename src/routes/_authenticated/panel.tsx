import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/erp/AppShell";
import { Tarjeta, TituloSeccion, Pastilla, EstadoOrden, Vacio } from "@/components/erp/ui-bits";
import { useMaquinas, useInventario, useOrdenes, costoOrden } from "@/lib/datos";
import { money, fecha, diasHasta, nivelMantencion, etiquetaTipoOrden } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Inicio · BP Glass Mantenimiento" },
      { name: "description", content: "Resumen de maquinaria operativa, mantenciones próximas, stock bajo y costos del mes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Inicio · BP Glass Mantenimiento" },
      { property: "og:description", content: "Resumen operativo de maquinaria, mantenciones y costos." },
    ],
  }),
  component: Panel,
});

function Kpi({ etiqueta, valor, detalle, tono }: { etiqueta: string; valor: string; detalle: string; tono: "ok" | "amber" | "red" | "clay" }) {
  const barras = { ok: "bg-ok", amber: "bg-amber", red: "bg-red", clay: "bg-clay" };
  return (
    <Tarjeta className="relative overflow-hidden p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${barras[tono]}`} />
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{etiqueta}</div>
      <div className="mt-2 font-serif text-3xl tracking-tight">{valor}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detalle}</div>
    </Tarjeta>
  );
}

function Panel() {
  const { data: maquinas = [] } = useMaquinas();
  const { data: insumos = [] } = useInventario();
  const { data: ordenes = [] } = useOrdenes();

  const operativas = maquinas.filter((m) => m.estado === "operativa").length;
  const porVencer = maquinas.filter((m) => {
    const n = nivelMantencion(m.fecha_proxima_mantencion);
    return n === "proxima" || n === "vencida";
  });
  const bajoStock = insumos.filter((i) => Number(i.stock_actual) <= Number(i.stock_minimo));

  const mes = new Date().toISOString().slice(0, 7);
  const costoMes = ordenes
    .filter((o) => (o.fecha_ejecucion ?? "").startsWith(mes))
    .reduce((s, o) => s + costoOrden(o).total, 0);

  const proximas = ordenes
    .filter((o) => o.estado === "pendiente" || o.estado === "en_proceso" || o.estado === "reprogramada")
    .sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada))
    .slice(0, 6);

  return (
    <AppShell titulo="Panel general" subtitulo="Estado operativo de la planta al día de hoy">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Máquinas operativas" valor={`${operativas}/${maquinas.length}`} detalle="Equipos disponibles" tono="ok" />
        <Kpi etiqueta="Mantenciones por vencer" valor={String(porVencer.length)} detalle="Vencidas o en menos de 7 días" tono="amber" />
        <Kpi etiqueta="Repuestos bajo mínimo" valor={String(bajoStock.length)} detalle="Requieren reposición" tono="red" />
        <Kpi etiqueta="Costo del mes" valor={money(costoMes)} detalle="Insumos + mano de obra" tono="clay" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Tarjeta className="p-5">
          <TituloSeccion>Alertas de mantención</TituloSeccion>
          <div className="mt-3 divide-y divide-line">
            {porVencer.length === 0 ? <Vacio mensaje="Todo al día. Sin mantenciones vencidas." /> : null}
            {porVencer.map((m) => {
              const d = diasHasta(m.fecha_proxima_mantencion);
              const vencida = (d ?? 0) < 0;
              return (
                <Link
                  key={m.id}
                  to="/maquinaria/$id"
                  params={{ id: m.id }}
                  className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{m.nombre}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {m.codigo} · {fecha(m.fecha_proxima_mantencion)}
                    </div>
                  </div>
                  <Pastilla tono={vencida ? "red" : "amber"}>
                    {vencida ? `Vencida hace ${Math.abs(d ?? 0)} d` : `En ${d} d`}
                  </Pastilla>
                </Link>
              );
            })}
          </div>
        </Tarjeta>

        <Tarjeta className="p-5">
          <TituloSeccion>Stock bajo mínimo</TituloSeccion>
          <div className="mt-3 divide-y divide-line">
            {bajoStock.length === 0 ? <Vacio mensaje="Inventario sobre el mínimo." /> : null}
            {bajoStock.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{i.nombre}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{i.codigo}</div>
                </div>
                <Pastilla tono="red">
                  {Number(i.stock_actual)} / mín {Number(i.stock_minimo)} {i.unidad}
                </Pastilla>
              </div>
            ))}
          </div>
        </Tarjeta>
      </div>

      <Tarjeta className="mt-4 p-5">
        <TituloSeccion>Próximas mantenciones programadas</TituloSeccion>
        <div className="mt-3 divide-y divide-line">
          {proximas.length === 0 ? <Vacio mensaje="No hay órdenes pendientes." /> : null}
          {proximas.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  #{o.folio} · {o.maquinas?.nombre ?? "—"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {etiquetaTipoOrden(o.tipo)} · {fecha(o.fecha_programada)} ·{" "}
                  {o.empleados?.nombre ?? "Sin técnico"}
                </div>
              </div>
              <EstadoOrden estado={o.estado} />
            </div>
          ))}
        </div>
      </Tarjeta>
    </AppShell>
  );
}
