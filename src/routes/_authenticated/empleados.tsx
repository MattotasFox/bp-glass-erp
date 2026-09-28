import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/erp/AppShell";
import {
  Tarjeta,
  Buscador,
  BotonPrincipal,
  Campo,
  Entrada,
  PanelLateral,
  Pastilla,
  Vacio,
} from "@/components/erp/ui-bits";
import { useEmpleados, useRemuneraciones, useOrdenes, type Empleado } from "@/lib/datos";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { money, fecha } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/empleados")({
  head: () => ({
    meta: [
      { title: "Empleados · BP Glass" },
      { name: "description", content: "Fichas de personal, tarifa por hora y sueldo base para Admin y RRHH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Empleados · BP Glass" },
      { property: "og:description", content: "Personal técnico y administrativo con tarifas y sueldos." },
    ],
  }),
  component: Empleados,
});

const vacio = {
  nombre: "",
  cargo: "",
  area: "",
  fecha_ingreso: "",
  tarifa_hora: "0",
  sueldo_base: "0",
  es_tecnico: false,
};

function Empleados() {
  const { esAdmin, esRRHH } = useAuth();
  const puedeEditar = esAdmin || esRRHH;
  const { data: empleados = [], isLoading } = useEmpleados();
  const { data: remuneraciones = [] } = useRemuneraciones(puedeEditar);
  const { data: ordenes = [] } = useOrdenes();
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Empleado | null>(null);
  const [form, setForm] = useState({ ...vacio });

  const lista = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return empleados.filter((e) => !t || e.nombre.toLowerCase().includes(t) || (e.cargo ?? "").toLowerCase().includes(t));
  }, [empleados, busqueda]);

  function abrirNuevo() {
    setEditando(null);
    setForm({ ...vacio });
    setAbierto(true);
  }

  function abrirEdicion(e: Empleado) {
    const rem = remuneraciones.find((r) => r.empleado_id === e.id);
    setEditando(e);
    setForm({
      nombre: e.nombre,
      cargo: e.cargo ?? "",
      area: e.area ?? "",
      fecha_ingreso: e.fecha_ingreso ?? "",
      tarifa_hora: String(e.tarifa_hora),
      sueldo_base: String(rem?.sueldo_base ?? 0),
      es_tecnico: e.es_tecnico,
    });
    setAbierto(true);
  }

  const guardar = useMutation({
    mutationFn: async () => {
      const fila = {
        nombre: form.nombre,
        cargo: form.cargo || null,
        area: form.area || null,
        fecha_ingreso: form.fecha_ingreso || null,
        tarifa_hora: Number(form.tarifa_hora || 0),
        es_tecnico: form.es_tecnico,
      };
      let empleadoId = editando?.id;
      if (editando) {
        const { error } = await supabase.from("empleados").update(fila).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("empleados").insert(fila).select("id").single();
        if (error) throw error;
        empleadoId = data.id;
      }
      if (empleadoId) {
        const { error } = await supabase
          .from("empleado_remuneraciones")
          .upsert(
            { empleado_id: empleadoId, sueldo_base: Number(form.sueldo_base || 0), actualizado_en: new Date().toISOString() },
            { onConflict: "empleado_id" },
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["empleados"] });
      qc.invalidateQueries({ queryKey: ["remuneraciones"] });
      setAbierto(false);
      toast.success(editando ? "Ficha actualizada" : "Empleado registrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      titulo="Empleados"
      subtitulo={`${empleados.length} personas en el equipo`}
      acciones={
        <>
          <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Nombre o cargo…" />
          {puedeEditar ? <BotonPrincipal onClick={abrirNuevo}>Nuevo empleado</BotonPrincipal> : null}
        </>
      }
    >
      <Tarjeta className="overflow-x-auto">
        <table className="w-full min-w-[740px] text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-5 py-3 font-normal">Persona</th>
              <th className="px-5 py-3 font-normal">Área</th>
              <th className="px-5 py-3 font-normal">Ingreso</th>
              <th className="px-5 py-3 font-normal">Tarifa / hora</th>
              {puedeEditar ? <th className="px-5 py-3 font-normal">Sueldo base</th> : null}
              <th className="px-5 py-3 font-normal">Órdenes</th>
              {puedeEditar ? <th className="px-5 py-3 font-normal" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lista.map((e) => {
              const rem = remuneraciones.find((r) => r.empleado_id === e.id);
              const cuenta = ordenes.filter((o) => o.tecnico_id === e.id).length;
              return (
                <tr key={e.id} className="hover:bg-base/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{e.nombre}</span>
                      {e.es_tecnico ? <Pastilla tono="clay">Técnico</Pastilla> : null}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{e.cargo ?? "—"}</div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{e.area ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{fecha(e.fecha_ingreso)}</td>
                  <td className="px-5 py-3">{money(e.tarifa_hora)}</td>
                  {puedeEditar ? <td className="px-5 py-3">{money(rem?.sueldo_base ?? 0)}</td> : null}
                  <td className="px-5 py-3 text-muted-foreground">{cuenta}</td>
                  {puedeEditar ? (
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => abrirEdicion(e)} className="text-xs text-accent hover:underline">
                        Editar
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!isLoading && lista.length === 0 ? <Vacio mensaje="Sin empleados registrados." /> : null}
      </Tarjeta>

      <PanelLateral
        abierto={abierto}
        titulo={editando ? "Editar empleado" : "Nuevo empleado"}
        subtitulo="Ficha de personal"
        onCerrar={() => setAbierto(false)}
        pie={
          <BotonPrincipal className="w-full" disabled={guardar.isPending || !form.nombre} onClick={() => guardar.mutate()}>
            Guardar ficha
          </BotonPrincipal>
        }
      >
        <Campo label="Nombre"><Entrada value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Cargo"><Entrada value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></Campo>
          <Campo label="Área"><Entrada value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></Campo>
        </div>
        <Campo label="Fecha de ingreso">
          <Entrada type="date" value={form.fecha_ingreso} onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Tarifa por hora (CLP)">
            <Entrada type="number" value={form.tarifa_hora} onChange={(e) => setForm({ ...form, tarifa_hora: e.target.value })} />
          </Campo>
          <Campo label="Sueldo base (CLP)">
            <Entrada type="number" value={form.sueldo_base} onChange={(e) => setForm({ ...form, sueldo_base: e.target.value })} />
          </Campo>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.es_tecnico}
            onChange={(e) => setForm({ ...form, es_tecnico: e.target.checked })}
            className="size-4 accent-[var(--accent)]"
          />
          Es técnico (puede asignarse a órdenes de trabajo)
        </label>
        <p className="text-[11px] text-muted-foreground">
          El sueldo base solo es visible para Administración y RRHH.
        </p>
      </PanelLateral>
    </AppShell>
  );
}
