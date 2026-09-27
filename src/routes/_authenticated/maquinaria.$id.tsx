import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/erp/AppShell";
import { Tarjeta, TituloSeccion, EstadoMaquina, EstadoOrden, Vacio, Pastilla } from "@/components/erp/ui-bits";
import { useMaquina, useOrdenes, costoOrden } from "@/lib/datos";
import { fecha, money, diasHasta, nivelMantencion, etiquetaTipoOrden } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/maquinaria/$id")({
  head: () => ({
    meta: [
      { title: "Ficha de máquina · BP Glass" },
      { name: "description", content: "Datos generales, estado de mantención e historial cronológico del equipo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Ficha de máquina · BP Glass" },
      { property: "og:description", content: "Detalle del equipo y su historial de mantenciones." },
    ],
  }),
  component: FichaMaquina,
});

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{etiqueta}</div>
      <div className="mt-1 text-sm">{valor}</div>
    </div>
  );
}

function FichaMaquina() {
  const { id } = Route.useParams();
  const { data: maquina, isLoading } = useMaquina(id);
  const { data: ordenes = [] } = useOrdenes();
  const historial = ordenes
    .filter((o) => o.maquina_id === id)
    .sort((a, b) => (b.fecha_ejecucion ?? b.fecha_programada).localeCompare(a.fecha_ejecucion ?? a.fecha_programada));

  if (isLoading) return <AppShell titulo="Cargando…"><div /></AppShell>;
  if (!maquina)
    return (
      <AppShell titulo="Máquina no encontrada">
        <Tarjeta className="p-6">
          <Vacio mensaje="Este equipo no existe o fue eliminado." />
          <div className="text-center">
            <Link to="/maquinaria" className="text-sm text-accent underline">Volver a maquinaria</Link>
          </div>
        </Tarjeta>
      </AppShell>
    );

  const nivel = nivelMantencion(maquina.fecha_proxima_mantencion);
  const d = diasHasta(maquina.fecha_proxima_mantencion);

  return (
    <AppShell
      titulo={maquina.nombre}
      subtitulo={`${maquina.codigo} · ${maquina.marca ?? ""} ${maquina.modelo ?? ""}`}
      acciones={<Link to="/maquinaria" className="text-xs text-muted-foreground hover:text-ink">← Volver</Link>}
    >
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Tarjeta className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="h-32 w-full shrink-0 overflow-hidden rounded-xl bg-base ring-1 ring-line sm:w-40">
              {maquina.foto_url ? (
                <img src={maquina.foto_url} alt={`Fotografía de ${maquina.nombre}`} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-full place-items-center text-[10px] uppercase tracking-widest text-muted-foreground">Sin foto</div>
              )}
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-3 gap-4">
              <Dato etiqueta="Año" valor={maquina.anio ? String(maquina.anio) : "—"} />
              <Dato etiqueta="Periodicidad" valor={`${maquina.periodicidad_dias} días`} />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Estado</div>
                <div className="mt-1"><EstadoMaquina estado={maquina.estado} /></div>
              </div>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta className="p-5">
          <TituloSeccion>Mantención</TituloSeccion>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Dato etiqueta="Última" valor={fecha(maquina.fecha_ultima_mantencion)} />
            <Dato etiqueta="Próxima" valor={fecha(maquina.fecha_proxima_mantencion)} />
          </div>
          <div className="mt-4">
            {nivel === "vencida" ? (
              <Pastilla tono="red">Mantención vencida hace {Math.abs(d ?? 0)} días</Pastilla>
            ) : nivel === "proxima" ? (
              <Pastilla tono="amber">Vence en {d} días</Pastilla>
            ) : nivel === "al_dia" ? (
              <Pastilla tono="ok">Al día ({d} días restantes)</Pastilla>
            ) : (
              <Pastilla tono="neutro">Sin fecha programada</Pastilla>
            )}
          </div>
        </Tarjeta>
      </div>

      <Tarjeta className="mt-4 p-5">
        <TituloSeccion>Historial de mantenciones</TituloSeccion>
        {historial.length === 0 ? <Vacio mensaje="Este equipo aún no tiene órdenes de trabajo." /> : null}
        <ol className="mt-4 space-y-4 border-l border-line pl-5">
          {historial.map((o) => {
            const c = costoOrden(o);
            return (
              <li key={o.id} className="relative">
                <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-accent ring-4 ring-surface" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">#{o.folio}</span>
                  <span className="text-sm font-medium">{etiquetaTipoOrden(o.tipo)}</span>
                  <EstadoOrden estado={o.estado} />
                  <span className="text-xs text-muted-foreground">
                    {fecha(o.fecha_ejecucion ?? o.fecha_programada)} · {o.empleados?.nombre ?? "Sin técnico"}
                  </span>
                </div>
                {o.descripcion ? <p className="mt-1 text-sm text-muted-foreground">{o.descripcion}</p> : null}
                {o.observaciones ? <p className="mt-1 text-xs italic text-muted-foreground">{o.observaciones}</p> : null}
                <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span>Insumos {money(c.insumos)}</span>
                  <span>Mano de obra {money(c.manoObra)} ({Number(o.horas_mano_obra)} h)</span>
                  <span className="font-medium text-ink">Total {money(c.total)}</span>
                </div>
                {o.orden_trabajo_insumos?.length ? (
                  <ul className="mt-1.5 text-[11px] text-muted-foreground">
                    {o.orden_trabajo_insumos.map((i) => (
                      <li key={i.id}>
                        · {i.inventario?.nombre ?? "Insumo"} × {Number(i.cantidad_usada)} {i.inventario?.unidad ?? ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      </Tarjeta>
    </AppShell>
  );
}
