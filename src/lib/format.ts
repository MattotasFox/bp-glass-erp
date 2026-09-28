export function money(valor: number | null | undefined) {
  const n = Number(valor ?? 0);
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

export function fecha(valor: string | null | undefined) {
  if (!valor) return "—";
  const d = new Date(`${valor}T00:00:00`);
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export function fechaCorta(valor: string | null | undefined) {
  if (!valor) return "—";
  const d = new Date(`${valor}T00:00:00`);
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

export function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export function diasHasta(valor: string | null | undefined) {
  if (!valor) return null;
  const objetivo = new Date(`${valor}T00:00:00`).getTime();
  const hoy = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();
  return Math.round((objetivo - hoy) / 86_400_000);
}

export type NivelMantencion = "al_dia" | "proxima" | "vencida" | "sin_fecha";

export function nivelMantencion(fechaProxima: string | null | undefined): NivelMantencion {
  const d = diasHasta(fechaProxima);
  if (d === null) return "sin_fecha";
  if (d < 0) return "vencida";
  if (d <= 7) return "proxima";
  return "al_dia";
}

export function etiquetaTipoOrden(tipo: string) {
  if (tipo === "preventiva_diaria") return "Preventiva diaria";
  if (tipo === "preventiva_mensual") return "Preventiva mensual";
  if (tipo === "correctiva") return "Correctiva";
  // "preventiva" es el valor heredado de órdenes creadas antes de este cambio.
  return "Preventiva";
}

export function tonoTipoOrden(tipo: string): "ok" | "clay" {
  return tipo === "correctiva" ? "clay" : "ok";
}

// Calcula horas trabajadas a partir de hora de inicio y término ("HH:MM").
// Si el término es menor al inicio, se asume que cruzó la medianoche.
export function calcularHoras(inicio: string, termino: string): number {
  if (!inicio || !termino) return 0;
  const [hi = NaN, mi = NaN] = inicio.split(":").map(Number);
  const [ht = NaN, mt = NaN] = termino.split(":").map(Number);
  if ([hi, mi, ht, mt].some((n) => Number.isNaN(n))) return 0;
  let minutos = ht * 60 + mt - (hi * 60 + mi);
  if (minutos <= 0) minutos += 24 * 60;
  return Math.round((minutos / 60) * 100) / 100;
}

export function descargarCSV(nombreArchivo: string, filas: Record<string, unknown>[]) {
  if (!filas.length) return;
  const columnas = Object.keys(filas[0]!);
  const escapar = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    columnas.join(";"),
    ...filas.map((f) => columnas.map((c) => escapar(f[c])).join(";")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
