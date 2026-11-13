// Copia de seguridad de lo que TerraSim guarda en este navegador.
// Solo se incluyen los datos de trabajo: nunca la sesión ni las cuentas de usuario.

export type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type Grupo = { id: string; nombre: string; descripcion: string; claves: string[] };

export const GRUPOS: Grupo[] = [
  { id: "estudio", nombre: "Terreno y simulación", descripcion: "El terreno dibujado, los parámetros del loteo, el año y el escenario.", claves: ["terrasim_estudio"] },
  { id: "financiero", nombre: "Análisis financiero", descripcion: "Precios, costos y supuestos financieros.", claves: ["terrasim_financiero"] },
  { id: "referencias", nombre: "Referencias de precios", descripcion: "Lotes y casas de referencia y el costo de construir por m².", claves: ["terrasim_comparables", "terrasim_comparables_v", "terrasim_costo_construccion_m2"] },
  { id: "terrenos", nombre: "Terrenos comparados", descripcion: "Los terrenos A, B y C de «Comparar terrenos».", claves: ["terrasim_candidatos"] },
  { id: "sismo", nombre: "Riesgo sísmico", descripcion: "Aceleración de diseño y curvas de daño.", claves: ["terrasim_sismo"] },
  { id: "informe", nombre: "Datos del informe", descripcion: "Proyecto, cliente y quién prepara el informe.", claves: ["terrasim_perfil"] },
];

export const TODAS_LAS_CLAVES = GRUPOS.flatMap((g) => g.claves);
const TEXTO_PLANO = new Set(["terrasim_comparables_v", "terrasim_costo_construccion_m2"]);
const MAX_CARACTERES = 5_000_000;

export type Respaldo = { app: "TerraSim"; version: 1; fecha: string; datos: Record<string, string> };

export function armarRespaldo(a: Almacen, fecha: Date = new Date()): Respaldo {
  const datos: Record<string, string> = {};
  for (const k of TODAS_LAS_CLAVES) {
    const v = a.getItem(k);
    if (v !== null) datos[k] = v;
  }
  return { app: "TerraSim", version: 1, fecha: fecha.toISOString(), datos };
}

export type ResumenGrupo = { id: string; nombre: string; descripcion: string; guardado: boolean; caracteres: number };

export function resumenGrupos(a: Almacen): ResumenGrupo[] {
  return GRUPOS.map((g) => {
    const valores = g.claves.map((k) => a.getItem(k)).filter((v): v is string => v !== null);
    return { id: g.id, nombre: g.nombre, descripcion: g.descripcion, guardado: valores.length > 0, caracteres: valores.reduce((s, v) => s + v.length, 0) };
  });
}

export type ResultadoValidacion = { ok: true; respaldo: Respaldo; ignoradas: string[] } | { ok: false; error: string };

export function validarRespaldo(texto: string): ResultadoValidacion {
  let obj: unknown;
  try {
    obj = JSON.parse(texto);
  } catch {
    return { ok: false, error: "El archivo no es una copia de TerraSim: no se puede leer." };
  }
  const o = obj as Partial<Respaldo> | null;
  if (!o || typeof o !== "object" || o.app !== "TerraSim" || !o.datos || typeof o.datos !== "object") {
    return { ok: false, error: "El archivo no es una copia de TerraSim." };
  }
  const datos: Record<string, string> = {};
  const ignoradas: string[] = [];
  for (const [k, v] of Object.entries(o.datos)) {
    if (!TODAS_LAS_CLAVES.includes(k)) {
      ignoradas.push(k);
      continue;
    }
    if (typeof v !== "string" || v.length > MAX_CARACTERES) return { ok: false, error: `El dato «${k}» de la copia está dañado.` };
    if (!TEXTO_PLANO.has(k)) {
      try {
        JSON.parse(v);
      } catch {
        return { ok: false, error: `El dato «${k}» de la copia está dañado.` };
      }
    }
    datos[k] = v;
  }
  if (Object.keys(datos).length === 0) return { ok: false, error: "La copia no contiene datos de TerraSim para restaurar." };
  return { ok: true, respaldo: { app: "TerraSim", version: 1, fecha: typeof o.fecha === "string" ? o.fecha : "", datos }, ignoradas };
}

// Reemplaza los datos de trabajo actuales por los de la copia (no toca la sesión ni las cuentas)
export function aplicarRespaldo(a: Almacen, r: Respaldo): number {
  for (const k of TODAS_LAS_CLAVES) a.removeItem(k);
  for (const [k, v] of Object.entries(r.datos)) if (TODAS_LAS_CLAVES.includes(k)) a.setItem(k, v);
  return GRUPOS.filter((g) => g.claves.some((k) => k in r.datos)).length;
}

export function borrarGrupo(a: Almacen, id: string) {
  const g = GRUPOS.find((x) => x.id === id);
  if (g) for (const k of g.claves) a.removeItem(k);
}

export function borrarTodo(a: Almacen) {
  for (const k of TODAS_LAS_CLAVES) a.removeItem(k);
}