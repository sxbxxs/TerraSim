import type { Punto } from "@/lib/geo";
import type { Calle } from "@/lib/lotes";
import type { EtapaLote } from "@/lib/progreso";

// Modelo de riesgo sísmico sencillo y transparente:
//  - Amenaza: probabilidad de que ocurra un sismo igual o mayor al de diseño en N años (proceso de Poisson).
//  - Vulnerabilidad: curvas de fragilidad lognormales, P(daño | aceleración) = Φ( ln(PGA / mediana) / β ).
// Los valores por defecto son SUPUESTOS para calibrar con un estudio de vulnerabilidad local.

export type TipoConstruccion = "formal" | "informal";

export type ParametrosSismo = {
  aa: number; // g: aceleración pico del sismo de diseño en el sitio (NSR-10, Apéndice A-4)
  periodoRetorno: number; // años del sismo de diseño (475 = 10 % de excedencia en 50 años)
  tipo: TipoConstruccion;
  medianaColapso: Record<TipoConstruccion, number>; // g: con esta aceleración colapsa la mitad de las casas
  dispersion: number; // β de las curvas de fragilidad
  razonDano: number; // mediana de daño / mediana de colapso
  medianaVia: number; // g: con esta aceleración se agrieta la mitad de los tramos de calle
  perdidaDanoPct: number; // % del valor de la casa que se pierde si queda dañada sin colapsar
  caidaSueloPct: number; // % que pierde el valor del lote después del sismo
};

// Aa = 0,10 es el valor de Valledupar (zona de amenaza baja); el de Aguachica debe consultarse en la NSR-10.
export const PARAMS_SISMO: ParametrosSismo = {
  aa: 0.1,
  periodoRetorno: 475,
  tipo: "formal",
  medianaColapso: { formal: 0.8, informal: 0.45 },
  dispersion: 0.6,
  razonDano: 0.5,
  medianaVia: 0.5,
  perdidaDanoPct: 30,
  caidaSueloPct: 0,
};

export const ESCENARIOS_SISMO = [
  { id: "diseno", nombre: "Sismo de diseño", hipotetico: false },
  { id: "fuerte", nombre: "Fuerte (hipotético)", hipotetico: true, pga: 0.3 },
  { id: "severo", nombre: "Severo (hipotético)", hipotetico: true, pga: 0.5 },
] as const;

export type Danio = "ok" | "danada" | "destruida";

// Función de distribución normal estándar (aproximación de Abramowitz y Stegun)
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function fragilidad(pga: number, mediana: number, beta: number): number {
  if (pga <= 0) return 0;
  return normalCdf(Math.log(pga / mediana) / beta);
}

// Probabilidad de que ocurra al menos un sismo de diseño en `anios` años
export function probabilidadEnAnios(periodoRetorno: number, anios: number): number {
  return 1 - Math.exp(-anios / periodoRetorno);
}

export type ProbabilidadesCasa = { colapso: number; soloDano: number; sinDano: number };

export function probabilidadesCasa(pga: number, p: ParametrosSismo): ProbabilidadesCasa {
  const tc = p.medianaColapso[p.tipo];
  const colapso = fragilidad(pga, tc, p.dispersion);
  const dano = Math.max(colapso, fragilidad(pga, tc * p.razonDano, p.dispersion));
  return { colapso, soloDano: dano - colapso, sinDano: 1 - dano };
}

export function probabilidadVia(pga: number, p: ParametrosSismo): number {
  return fragilidad(pga, p.medianaVia, p.dispersion);
}

// Generador pseudoaleatorio con semilla: el mismo sismo se ve igual cada vez que se dibuja
function aleatorio(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Solo pueden dañarse las casas terminadas; el resto del terreno no tiene qué perder
export function muestrearDanos(etapas: EtapaLote[], pga: number, p: ParametrosSismo, semilla: number): Danio[] {
  const pr = probabilidadesCasa(pga, p);
  return etapas.map((e, i) => {
    if (e !== "casa") return "ok";
    const u = aleatorio(Math.imul(semilla + 1, 1000003) ^ Math.imul(i + 1, 7919))();
    if (u < pr.colapso) return "destruida";
    if (u < pr.colapso + pr.soloDano) return "danada";
    return "ok";
  });
}

export type ResultadoGrietas = { grietas: Punto[][]; tramos: number; danados: number; metros: number };

const TRAMO_M = 25; // largo de cada tramo de calle que puede agrietarse

// Marca tramos de calle agrietados y devuelve una línea quebrada (grieta) que cruza cada tramo dañado
export function generarGrietas(
  calles: Calle[],
  pga: number,
  p: ParametrosSismo,
  semilla: number,
  anchoCalle: number
): ResultadoGrietas {
  const pv = probabilidadVia(pga, p);
  const rnd = aleatorio(Math.imul(semilla + 7, 2654435761));
  const grietas: Punto[][] = [];
  let tramos = 0;
  let danados = 0;
  for (const c of calles) {
    for (const eje of c.ejes) {
      const A = eje[0];
      const B = eje[eje.length - 1];
      const kx = 111320 * Math.cos((A.lat * Math.PI) / 180);
      const dx = (B.lng - A.lng) * kx;
      const dy = (B.lat - A.lat) * 111320;
      const L = Math.hypot(dx, dy);
      if (L < 3) continue;
      const ux = dx / L;
      const uy = dy / L;
      const n = Math.max(1, Math.round(L / TRAMO_M));
      for (let i = 0; i < n; i++) {
        tramos++;
        if (rnd() >= pv) continue;
        danados++;
        const centro = ((i + 0.5) / n) * L;
        const mitad = anchoCalle / 2;
        const puntos: Punto[] = [];
        for (let s = 0; s <= 4; s++) {
          const across = -mitad + (s * anchoCalle) / 4; // cruza la calle
          const along = centro + (s % 2 === 0 ? -0.8 : 0.8); // en zigzag
          const x = ux * along - uy * across;
          const y = uy * along + ux * across;
          puntos.push({ lat: A.lat + y / 111320, lng: A.lng + x / kx });
        }
        grietas.push(puntos);
      }
    }
  }
  return { grietas, tramos, danados, metros: danados * TRAMO_M };
}

export type EntradaEvaluacion = {
  etapas: EtapaLote[];
  esVerde: boolean[]; // por lote
  danos: Danio[];
  valorLote: number[]; // COP, valor del suelo de cada lote en el año del sismo
  precioCasa: (number | null)[]; // COP, precio de venta de la casa de cada lote
  costoCasa: (number | null)[]; // COP, costo de construir la casa de cada lote
};

export type Evaluacion = {
  casas: number;
  destruidas: number;
  danadas: number;
  valorAntes: number;
  perdidaCasas: number;
  perdidaSuelo: number;
  valorDespues: number;
  perdidaPct: number;
};

// Valor del proyecto antes y después: una casa terminada vale su precio; un lote sin casa, su suelo.
// Si la casa se destruye se pierde lo que costó construirla (o, si no hay costo, precio − lote).
export function evaluarSismo(e: EntradaEvaluacion, p: ParametrosSismo): Evaluacion {
  let casas = 0, destruidas = 0, danadas = 0;
  let valorAntes = 0, perdidaCasas = 0, suelo = 0;
  e.etapas.forEach((etapa, i) => {
    if (e.esVerde[i]) return;
    const lote = e.valorLote[i];
    suelo += lote;
    const construida = etapa === "casa";
    const precio = e.precioCasa[i];
    valorAntes += construida && precio !== null ? precio : lote;
    if (!construida) return;
    casas++;
    const unidad = e.costoCasa[i] ?? (precio !== null ? Math.max(0, precio - lote) : 0);
    if (e.danos[i] === "destruida") {
      destruidas++;
      perdidaCasas += unidad;
    } else if (e.danos[i] === "danada") {
      danadas++;
      perdidaCasas += unidad * (p.perdidaDanoPct / 100);
    }
  });
  const perdidaSuelo = suelo * (p.caidaSueloPct / 100);
  const valorDespues = valorAntes - perdidaCasas - perdidaSuelo;
  return {
    casas, destruidas, danadas, valorAntes, perdidaCasas, perdidaSuelo, valorDespues,
    perdidaPct: valorAntes > 0 ? ((valorAntes - valorDespues) / valorAntes) * 100 : 0,
  };
}