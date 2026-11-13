import { CENTRO_AGUACHICA, Punto, distanciaM, parsearCoordenadas } from "@/lib/geo";

export type TipoReferencia = "lote" | "casa";

// Una referencia de precio: un anuncio o una venta real, de un lote o de una casa
export type Comparable = {
  id: string;
  nombre: string;
  coordenadas: string; // "8.3084, -73.6162" (opcional)
  precio: number | null; // COP, precio total
  area: number | null; // m² del lote
  tipo?: TipoReferencia; // si falta, es un lote
  habitaciones?: number | null; // solo casas
  banos?: number | null;
  areaConstruida?: number | null; // m² construidos (para separar el valor del suelo)
};

export type UsadoEnEstimacion = {
  nombre: string;
  precioM2: number;
  distanciaKm: number | null; // al terreno estudiado
  pesoPct: number;
  residual?: boolean; // valor del suelo sacado de una casa descontando la construcción
};

export type Estimacion = {
  precioM2: number | null;
  metodo: "ponderado" | "promedio" | "ninguno";
  usados: UsadoEnEstimacion[];
  minM2: number | null;
  maxM2: number | null;
  avisos: string[];
  ignorados: string[]; // lotes a los que les falta precio o área
  soloReferencia: string[]; // casas que no entran al precio del suelo (falta área construida o costo por m²)
};

// Datos de partida: los anuncios y ventas que el usuario ha encontrado (sin coordenadas todavía)
export const COMPARABLES_INICIALES: Comparable[] = [
  { id: "c1", nombre: "Avenida Cielo (anuncio, lote de 6×20)", coordenadas: "", precio: 85_000_000, area: 120, tipo: "lote" },
  {
    id: "c2", nombre: "Casa Calle 13 #30A-11 (8×18)", coordenadas: "", precio: 270_000_000, area: 144,
    tipo: "casa", habitaciones: 3, banos: 2, areaConstruida: null,
  },
];

const esNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const nul = (x: unknown): number | null => (esNum(x) ? x : null);

export function limpiarComparables(raw: unknown): Comparable[] {
  if (!Array.isArray(raw)) return COMPARABLES_INICIALES;
  return raw
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c, i) => ({
      id: typeof c.id === "string" ? c.id : `c${i}`,
      nombre: typeof c.nombre === "string" ? c.nombre : "",
      coordenadas: typeof c.coordenadas === "string" ? c.coordenadas : "",
      precio: nul(c.precio),
      area: nul(c.area),
      tipo: c.tipo === "casa" ? ("casa" as const) : ("lote" as const),
      habitaciones: nul(c.habitaciones),
      banos: nul(c.banos),
      areaConstruida: nul(c.areaConstruida),
    }));
}

const CLAVE = "terrasim_comparables";
const CLAVE_VERSION = "terrasim_comparables_v";
const VERSION = "2";
const CLAVE_COSTO = "terrasim_costo_construccion_m2";

// Lee las referencias guardadas. Una sola vez agrega las referencias nuevas que trae TerraSim
// (por ejemplo, la casa de la calle 13) sin tocar las que el usuario ya tenía.
export function leerComparablesGuardados(): Comparable[] {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return COMPARABLES_INICIALES;
    let lista = limpiarComparables(JSON.parse(raw));
    if (localStorage.getItem(CLAVE_VERSION) !== VERSION) {
      for (const c of COMPARABLES_INICIALES) if (!lista.some((x) => x.id === c.id)) lista = [...lista, c];
      localStorage.setItem(CLAVE, JSON.stringify(lista));
      localStorage.setItem(CLAVE_VERSION, VERSION);
    }
    return lista;
  } catch {
    return COMPARABLES_INICIALES;
  }
}

export function leerCostoConstruccionM2(): number | null {
  try {
    const v = Number(localStorage.getItem(CLAVE_COSTO));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function guardarCostoConstruccionM2(v: number | null) {
  try {
    if (v && v > 0) localStorage.setItem(CLAVE_COSTO, String(v));
    else localStorage.removeItem(CLAVE_COSTO);
  } catch {
    // almacenamiento lleno o bloqueado
  }
}

export function precioPorM2(c: Comparable): number | null {
  return c.precio !== null && c.precio > 0 && c.area !== null && c.area > 0 ? c.precio / c.area : null;
}

export function distanciaCentroKm(p: Punto): number {
  return distanciaM(p, CENTRO_AGUACHICA) / 1000;
}

const DISTANCIA_MINIMA_M = 100; // evita que una referencia pegada al terreno pese infinito

// Estima el precio del SUELO por m² en el terreno con las referencias del usuario.
// - Un lote aporta su precio por m².
// - Una casa solo aporta si se conoce su área construida y el costo de construir por m²:
//   valor del suelo = precio de la casa − área construida × costo por m² (método residual).
// Con coordenadas en todas: promedio ponderado por 1/distancia² (lo cercano pesa más).
// Si no, promedio simple. No inventa ninguna fórmula de precios.
export function estimarPrecioM2(comps: Comparable[], terreno: Punto | null, costoConstruccionM2: number | null = null): Estimacion {
  const validos: { nombre: string; pm2: number; pos: Punto | null; residual: boolean }[] = [];
  const ignorados: string[] = [];
  const soloReferencia: string[] = [];
  const avisos: string[] = [];

  for (const c of comps) {
    const nombre = c.nombre || "Sin nombre";
    if ((c.tipo ?? "lote") === "lote") {
      const pm2 = precioPorM2(c);
      if (pm2 === null) ignorados.push(nombre);
      else validos.push({ nombre, pm2, pos: parsearCoordenadas(c.coordenadas), residual: false });
      continue;
    }
    // casa
    if (!(c.precio && c.precio > 0 && c.area && c.area > 0)) {
      ignorados.push(nombre);
      continue;
    }
    if (costoConstruccionM2 && costoConstruccionM2 > 0 && c.areaConstruida && c.areaConstruida > 0) {
      const suelo = c.precio - c.areaConstruida * costoConstruccionM2;
      if (suelo > 0) validos.push({ nombre, pm2: suelo / c.area, pos: parsearCoordenadas(c.coordenadas), residual: true });
      else avisos.push(`La casa «${nombre}» vale menos que su construcción al costo indicado: no se usó para el suelo.`);
    } else {
      soloReferencia.push(nombre);
    }
  }

  const vacio: Estimacion = {
    precioM2: null, metodo: "ninguno", usados: [], minM2: null, maxM2: null,
    avisos: [...avisos, "Agrega al menos un lote con precio y área (o una casa con área construida y el costo de construir por m²)."],
    ignorados, soloReferencia,
  };
  if (!validos.length) return vacio;

  const todasConPos = validos.every((v) => v.pos !== null);
  const ponderar = terreno !== null && todasConPos;
  let usados: UsadoEnEstimacion[];

  if (ponderar && terreno) {
    const pesos = validos.map((v) => {
      const d = distanciaM(v.pos as Punto, terreno);
      return { v, d, w: 1 / Math.pow(Math.max(d, DISTANCIA_MINIMA_M), 2) };
    });
    const total = pesos.reduce((s, x) => s + x.w, 0);
    usados = pesos
      .map((x) => ({ nombre: x.v.nombre, precioM2: x.v.pm2, distanciaKm: x.d / 1000, pesoPct: (x.w / total) * 100, residual: x.v.residual }))
      .sort((a, b) => b.pesoPct - a.pesoPct);

    const masCerca = Math.min(...usados.map((u) => u.distanciaKm ?? Infinity));
    if (masCerca > 3) avisos.push(`La referencia más cercana está a ${masCerca.toFixed(1)} km de tu terreno: el estimado es poco confiable.`);

    // la regla del usuario: más cerca del centro, más caro; más lejos, más barato
    const dcTerreno = distanciaCentroKm(terreno);
    const dcRefs = validos.map((v) => distanciaCentroKm(v.pos as Punto));
    if (dcTerreno < Math.min(...dcRefs) - 0.1) {
      avisos.push("Tu terreno está más cerca del centro que todas tus referencias: el precio real podría ser mayor. Agrega una referencia del centro.");
    } else if (dcTerreno > Math.max(...dcRefs) + 0.1) {
      avisos.push("Tu terreno está más lejos del centro que todas tus referencias: el precio real podría ser menor.");
    }
  } else {
    usados = validos.map((v) => ({
      nombre: v.nombre, precioM2: v.pm2,
      distanciaKm: terreno && v.pos ? distanciaM(v.pos, terreno) / 1000 : null,
      pesoPct: 100 / validos.length, residual: v.residual,
    }));
    if (!terreno) avisos.push("Dibuja un terreno para que las referencias más cercanas pesen más.");
    else if (!todasConPos) avisos.push("Para ponderar por distancia, pega las coordenadas de todas las referencias. Mientras tanto se usa el promedio simple.");
  }

  if (validos.length < 3) avisos.push(`Con ${validos.length} referencia${validos.length === 1 ? "" : "s"} el estimado es poco confiable; mientras más agregues, mejor.`);

  const precio = ponderar
    ? usados.reduce((s, u) => s + (u.precioM2 * u.pesoPct) / 100, 0)
    : validos.reduce((s, v) => s + v.pm2, 0) / validos.length;
  const ms = validos.map((v) => v.pm2);

  return {
    precioM2: precio,
    metodo: ponderar ? "ponderado" : "promedio",
    usados, minM2: Math.min(...ms), maxM2: Math.max(...ms), avisos, ignorados, soloReferencia,
  };
}

export type EstimacionCasa = {
  precioM2: number | null; // COP por m² de lote, con la casa incluida
  usadas: { nombre: string; precio: number; areaLote: number; precioM2: number; distanciaKm: number | null; pesoPct: number }[];
};

// Cuánto se paga por m² de lote con casa en la zona (la casa completa, no solo el suelo)
export function estimarCasaM2(comps: Comparable[], terreno: Punto | null): EstimacionCasa {
  const casas = comps
    .filter((c) => c.tipo === "casa" && c.precio && c.precio > 0 && c.area && c.area > 0)
    .map((c) => ({ nombre: c.nombre || "Sin nombre", precio: c.precio as number, areaLote: c.area as number, pos: parsearCoordenadas(c.coordenadas) }));
  if (!casas.length) return { precioM2: null, usadas: [] };
  const ponderar = terreno !== null && casas.every((c) => c.pos !== null);
  const pesos = casas.map((c) => {
    const d = terreno && c.pos ? distanciaM(c.pos, terreno) : null;
    return { c, d, w: ponderar && d !== null ? 1 / Math.pow(Math.max(d, DISTANCIA_MINIMA_M), 2) : 1 };
  });
  const total = pesos.reduce((s, x) => s + x.w, 0);
  const usadas = pesos.map((x) => ({
    nombre: x.c.nombre, precio: x.c.precio, areaLote: x.c.areaLote, precioM2: x.c.precio / x.c.areaLote,
    distanciaKm: x.d === null ? null : x.d / 1000, pesoPct: (x.w / total) * 100,
  }));
  return { precioM2: usadas.reduce((s, u) => s + (u.precioM2 * u.pesoPct) / 100, 0), usadas };
}