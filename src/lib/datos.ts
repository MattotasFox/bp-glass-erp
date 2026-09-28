import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Maquina = Tables<"maquinas">;
export type Insumo = Tables<"inventario">;
export type Empleado = Tables<"empleados">;
export type Orden = Tables<"ordenes_trabajo">;
export type OrdenInsumo = Tables<"orden_trabajo_insumos">;
export type PasoMaquina = Tables<"maquina_pasos">;
export type PasoOrden = Tables<"orden_trabajo_pasos">;

export function useMaquinas() {
  return useQuery({
    queryKey: ["maquinas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("maquinas").select("*").order("nombre");
      if (error) throw error;
      return data as Maquina[];
    },
  });
}

export function useMaquina(id: string) {
  return useQuery({
    queryKey: ["maquina", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("maquinas").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Maquina | null;
    },
  });
}

export function useInventario() {
  return useQuery({
    queryKey: ["inventario"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventario").select("*").order("nombre");
      if (error) throw error;
      return data as Insumo[];
    },
  });
}

export function useEmpleados() {
  return useQuery({
    queryKey: ["empleados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empleados").select("*").order("nombre");
      if (error) throw error;
      return data as Empleado[];
    },
  });
}

export type OrdenCompleta = Orden & {
  maquinas: Pick<Maquina, "id" | "nombre" | "codigo"> | null;
  empleados: Pick<Empleado, "id" | "nombre" | "tarifa_hora"> | null;
  orden_trabajo_insumos: (OrdenInsumo & { inventario: Pick<Insumo, "nombre" | "codigo" | "unidad"> | null })[];
  orden_trabajo_pasos: PasoOrden[];
};

const seleccionOrden =
  "*, maquinas(id, nombre, codigo), empleados(id, nombre, tarifa_hora), orden_trabajo_insumos(*, inventario(nombre, codigo, unidad)), orden_trabajo_pasos(*)";

export function useOrdenes() {
  return useQuery({
    queryKey: ["ordenes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordenes_trabajo")
        .select(seleccionOrden)
        .order("fecha_programada", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OrdenCompleta[];
    },
  });
}

export function costoOrden(o: OrdenCompleta) {
  const insumos = (o.orden_trabajo_insumos ?? []).reduce(
    (s, i) => s + Number(i.cantidad_usada) * Number(i.costo_al_momento),
    0,
  );
  const manoObra = Number(o.horas_mano_obra ?? 0) * Number(o.empleados?.tarifa_hora ?? 0);
  return { insumos, manoObra, total: insumos + manoObra };
}

export async function fetchPasosMaquina(maquinaId: string) {
  const { data, error } = await supabase
    .from("maquina_pasos")
    .select("*")
    .eq("maquina_id", maquinaId)
    .order("frecuencia")
    .order("posicion");
  if (error) throw error;
  return data as PasoMaquina[];
}

export function usePasosMaquina(maquinaId: string | undefined) {
  return useQuery({
    queryKey: ["maquina_pasos", maquinaId],
    enabled: !!maquinaId,
    queryFn: () => fetchPasosMaquina(maquinaId!),
  });
}

export function useRemuneraciones(habilitado: boolean) {
  return useQuery({
    queryKey: ["remuneraciones"],
    enabled: habilitado,
    queryFn: async () => {
      const { data, error } = await supabase.from("empleado_remuneraciones").select("*");
      if (error) throw error;
      return data as Tables<"empleado_remuneraciones">[];
    },
  });
}
