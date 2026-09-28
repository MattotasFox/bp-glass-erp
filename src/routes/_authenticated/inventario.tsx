import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  PanelLateral,
  Pastilla,
  Vacio,
} from "@/components/erp/ui-bits";
import { useInventario, useMaquinas, type Insumo } from "@/lib/datos";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario de repuestos · BP Glass" },
      { name: "description", content: "Stock de repuestos e insumos, mínimos, costo unitario y proveedor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Inventario de repuestos · BP Glass" },
      { property: "og:description", content: "Control de stock de repuestos con alertas bajo mínimo." },
    ],
  }),
  component: Inventario,
});

const vacio = {
  nombre: "",
  codigo: "",
  stock_actual: "0",
  stock_minimo: "0",
  unidad: "u",
  costo_unitario: "0",
  proveedor: "",
  maquina_id: "",
};

function Inventario() {
  const { esAdmin } = useAuth();
  const { data: insumos = [], isLoading } = useInventario();
  const { data: maquinas = [] } = useMaquinas();
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [soloBajos, setSoloBajos] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Insumo | null>(null);
  const [form, setForm] = useState({ ...vacio });

  // Stock, mínimo y costo no pueden ser negativos ni valores no numéricos.
  const valoresInvalidos = [form.stock_actual, form.stock_minimo, form.costo_unitario].some((v) => {
    const n = Number(v || 0);
    return Number.isNaN(n) || n < 0;
  });

  const lista = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return insumos.filter(
      (i) =>
        (!soloBajos || Number(i.stock_actual) <= Number(i.stock_minimo)) &&
        (!t || i.nombre.toLowerCase().includes(t) || i.codigo.toLowerCase().includes(t)),
    );
  }, [insumos, busqueda, soloBajos]);

  function abrirNuevo() {
    setEditando(null);
    setForm({ ...vacio });
    setAbierto(true);
  }

  function abrirEdicion(i: Insumo) {
    setEditando(i);
    setForm({
      nombre: i.nombre,
      codigo: i.codigo,
      stock_actual: String(i.stock_actual),
      stock_minimo: String(i.stock_minimo),
      unidad: i.unidad,
      costo_unitario: String(i.costo_unitario),
      proveedor: i.proveedor ?? "",
      maquina_id: i.maquina_id ?? "",
    });
    setAbierto(true);
  }

  const guardar = useMutation({
    mutationFn: async () => {
      if (valoresInvalidos) throw new Error("Stock, mínimo y costo no pueden ser negativos");
      const fila = {
        nombre: form.nombre,
        codigo: form.codigo,
        stock_actual: Number(form.stock_actual || 0),
        stock_minimo: Number(form.stock_minimo || 0),
        unidad: form.unidad || "u",
        costo_unitario: Number(form.costo_unitario || 0),
        proveedor: form.proveedor || null,
        maquina_id: form.maquina_id || null,
      };
      const { error } = editando
        ? await supabase.from("inventario").update(fila).eq("id", editando.id)
        : await supabase.from("inventario").insert(fila);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventario"] });
      setAbierto(false);
      toast.success(editando ? "Repuesto actualizado" : "Repuesto creado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventario").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventario"] });
      setAbierto(false);
      toast.success("Repuesto eliminado");
    },
    onError: () => toast.error("No se puede eliminar: el repuesto tiene consumos registrados"),
  });

  return (
    <AppShell
      titulo="Inventario y repuestos"
      subtitulo={`${insumos.length} referencias en bodega`}
      acciones={
        <>
          <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Nombre o código…" />
          <BotonSecundario onClick={() => setSoloBajos(!soloBajos)} className={soloBajos ? "ring-2 ring-red/40" : ""}>
            Bajo mínimo
          </BotonSecundario>
          {esAdmin ? <BotonPrincipal onClick={abrirNuevo}>Nuevo repuesto</BotonPrincipal> : null}
        </>
      }
    >
      <Tarjeta className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-5 py-3 font-normal">Repuesto</th>
              <th className="px-5 py-3 font-normal">Stock</th>
              <th className="px-5 py-3 font-normal">Mínimo</th>
              <th className="px-5 py-3 font-normal">Costo unit.</th>
              <th className="px-5 py-3 font-normal">Proveedor</th>
              <th className="px-5 py-3 font-normal">Equipo</th>
              {esAdmin ? <th className="px-5 py-3 font-normal" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lista.map((i) => {
              const bajo = Number(i.stock_actual) <= Number(i.stock_minimo);
              const maquina = maquinas.find((m) => m.id === i.maquina_id);
              return (
                <tr key={i.id} className="hover:bg-base/60">
                  <td className="px-5 py-3">
                    <div className="font-medium">{i.nombre}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{i.codigo}</div>
                  </td>
                  <td className="px-5 py-3">
                    {bajo ? (
                      <Pastilla tono="red">{Number(i.stock_actual)} {i.unidad}</Pastilla>
                    ) : (
                      <Pastilla tono="ok">{Number(i.stock_actual)} {i.unidad}</Pastilla>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{Number(i.stock_minimo)} {i.unidad}</td>
                  <td className="px-5 py-3">{money(i.costo_unitario)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{i.proveedor ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{maquina?.codigo ?? "—"}</td>
                  {esAdmin ? (
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => abrirEdicion(i)} className="text-xs text-accent hover:underline">
                        Editar
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!isLoading && lista.length === 0 ? <Vacio mensaje="Sin repuestos para este filtro." /> : null}
      </Tarjeta>

      <PanelLateral
        abierto={abierto}
        titulo={editando ? "Editar repuesto" : "Nuevo repuesto"}
        subtitulo="Ficha de inventario"
        onCerrar={() => setAbierto(false)}
        pie={
          <div className="flex gap-2">
            <BotonPrincipal
              className="flex-1"
              disabled={guardar.isPending || !form.nombre || !form.codigo || valoresInvalidos}
              onClick={() => guardar.mutate()}
            >
              Guardar
            </BotonPrincipal>
            {editando ? (
              <BotonSecundario onClick={() => eliminar.mutate(editando.id)}>Eliminar</BotonSecundario>
            ) : null}
          </div>
        }
      >
        <Campo label="Nombre"><Entrada value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Campo>
        <Campo label="Código"><Entrada value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></Campo>
        <div className="grid grid-cols-3 gap-3">
          <Campo label="Stock"><Entrada type="number" min={0} value={form.stock_actual} onChange={(e) => setForm({ ...form, stock_actual: e.target.value })} /></Campo>
          <Campo label="Mínimo"><Entrada type="number" min={0} value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} /></Campo>
          <Campo label="Unidad"><Entrada value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} /></Campo>
        </div>
        <Campo label="Costo unitario (CLP)">
          <Entrada type="number" min={0} value={form.costo_unitario} onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })} />
        </Campo>
        {valoresInvalidos ? (
          <p className="text-[11px] text-red">Stock, mínimo y costo deben ser números iguales o mayores a cero.</p>
        ) : null}
        <Campo label="Proveedor"><Entrada value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} /></Campo>
        <Campo label="Equipo asociado">
          <Seleccion value={form.maquina_id} onChange={(e) => setForm({ ...form, maquina_id: e.target.value })}>
            <option value="">Sin asociar</option>
            {maquinas.map((m) => (
              <option key={m.id} value={m.id}>{m.codigo} · {m.nombre}</option>
            ))}
          </Seleccion>
        </Campo>
      </PanelLateral>
    </AppShell>
  );
}
