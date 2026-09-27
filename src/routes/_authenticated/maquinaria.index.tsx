import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/erp/AppShell";
import {
  Tarjeta,
  Buscador,
  BotonPrincipal,
  Campo,
  Entrada,
  Seleccion,
  PanelLateral,
  EstadoMaquina,
  Pastilla,
  Vacio,
} from "@/components/erp/ui-bits";
import { useMaquinas } from "@/lib/datos";
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
  foto_url: "",
  estado: "operativa",
  periodicidad_dias: "30",
  fecha_ultima_mantencion: "",
  fecha_proxima_mantencion: "",
};

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
  const [form, setForm] = useState({ ...vacio });

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
      const { error } = await supabase.from("maquinas").insert({
        nombre: form.nombre,
        codigo: form.codigo,
        marca: form.marca || null,
        modelo: form.modelo || null,
        anio: form.anio ? Number(form.anio) : null,
        foto_url: form.foto_url || null,
        estado: form.estado as "operativa",
        periodicidad_dias: Number(form.periodicidad_dias || 30),
        fecha_ultima_mantencion: form.fecha_ultima_mantencion || null,
        fecha_proxima_mantencion: form.fecha_proxima_mantencion || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maquinas"] });
      setAbierto(false);
      setForm({ ...vacio });
      toast.success("Máquina registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
          {esAdmin ? <BotonPrincipal onClick={() => setAbierto(true)}>Nueva máquina</BotonPrincipal> : null}
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
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && lista.length === 0 ? <Vacio mensaje="Sin máquinas para este filtro." /> : null}
      </Tarjeta>

      <PanelLateral
        abierto={abierto}
        titulo="Nueva máquina"
        subtitulo="Ficha de equipo"
        onCerrar={() => setAbierto(false)}
        pie={
          <BotonPrincipal
            className="w-full"
            disabled={guardar.isPending || !form.nombre || !form.codigo}
            onClick={() => guardar.mutate()}
          >
            Guardar máquina
          </BotonPrincipal>
        }
      >
        <Campo label="Nombre"><Entrada value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Campo>
        <Campo label="Código interno"><Entrada value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Marca"><Entrada value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></Campo>
          <Campo label="Modelo"><Entrada value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></Campo>
        </div>
        <Campo label="Año"><Entrada type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} /></Campo>
        <Campo label="Foto (URL)"><Entrada value={form.foto_url} onChange={(e) => setForm({ ...form, foto_url: e.target.value })} /></Campo>
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
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
              <option value="180">180 días</option>
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
      </PanelLateral>
    </AppShell>
  );
}
