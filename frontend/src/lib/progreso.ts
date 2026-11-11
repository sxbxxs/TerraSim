import type { Escenario } from "@/types";
import type { LoteGen } from "@/lib/lotes";

export const ANIO_BASE = 2026;

// Año (contado desde hoy) en que llega cada mejora. 99 = no llega en el horizonte.
export type Hito = { via: number; servicios: number; parque: number; usoSuelo: number };

// SUPUESTOS de ejemplo: reemplazar con información real (planes de la alcaldía, obras proyectadas).
export const HITOS_POR_DEFECTO: Record<Escenario, Hito> = {
  pesimista: { via: 12, servicios: 14, parque: 99, usoSuelo: 10 },
  base: { via: 5, servicios: 6, parque: 10, usoSuelo: 4 },
  optimista: { via: 2, servicios: 3, parque: 5, usoSuelo: 2 },
};

export type ParametrosProgreso = {
  valorInicial: number; // COP/m²
  tasaBase: number; // 0.02 = 2% anual
  pesoInfra: number; // efecto de vía + servicios sobre la tasa
  pesoUso: number; // efecto del uso del suelo
  pesoCarac: number; // efecto del parque / entorno
  kappa: number; // velocidad de construcción (supuesto)
  horizonte: number; // años
};

// SUPUESTOS de ejemplo: calibrar con datos históricos reales.
export const PARAMS_PROGRESO: ParametrosProgreso = {
  valorInicial: 828000,
  tasaBase: 0.02,
  pesoInfra: 0.04,
  pesoUso: 0.03,
  pesoCarac: 0.02,
  kappa: 2,
  horizonte: 20,
};

export type EstadoAnio = {
  anio: number;
  tasa: number;
  valorM2: number;
  ocupacion: number; // 0 a 1: fracción de lotes con casa
  via: boolean;
  servicios: boolean;
  parque: boolean;
  usoSuelo: boolean;
};

const PASOS_POR_ANIO = 20; // paso de 0.05 años, igual que MaxStep en MATLAB

function factores(h: Hito, t: number) {
  return {
    via: t >= h.via,
    servicios: t >= h.servicios,
    parque: t >= h.parque,
    usoSuelo: t >= h.usoSuelo,
  };
}

// Misma estructura del Simulink: tasa = base + Σ peso·factor(t)
export function tasaProgreso(p: ParametrosProgreso, h: Hito, t: number): number {
  const f = factores(h, t);
  const infra = ((f.via ? 1 : 0) + (f.servicios ? 1 : 0)) / 2;
  return p.tasaBase + p.pesoInfra * infra + p.pesoUso * (f.usoSuelo ? 1 : 0) + p.pesoCarac * (f.parque ? 1 : 0);
}

// dV/dt = tasa·V           (valor del suelo, como en el Simulink)
// dO/dt = kappa·tasa·(1−O) (ocupación)
// La tasa es constante por tramos, así que cada paso se resuelve con la fórmula exacta.
export function simularProgreso(p: ParametrosProgreso, h: Hito): EstadoAnio[] {
  const dt = 1 / PASOS_POR_ANIO;
  const serie: EstadoAnio[] = [];
  let valor = p.valorInicial;
  let ocup = 0;

  for (let i = 0; i <= p.horizonte * PASOS_POR_ANIO; i++) {
    const t = i / PASOS_POR_ANIO;
    const tasa = tasaProgreso(p, h, t);
    if (i % PASOS_POR_ANIO === 0) {
      serie.push({ anio: t, tasa, valorM2: valor, ocupacion: ocup, ...factores(h, t) });
    }
    valor *= Math.exp(tasa * dt);
    ocup = 1 - (1 - ocup) * Math.exp(-p.kappa * tasa * dt);
  }
  return serie;
}

export type EstiloLote = { fill: string; opacity: number };

// Los lotes se construyen en orden: primero los más cercanos a la vía
export function estilosLotes(lotes: LoteGen[], e: EstadoAnio): EstiloLote[] {
  const nVend = lotes.filter((l) => l.tipo === "lote").length;
  const construidos = e.ocupacion * nVend;
  let k = 0;
  return lotes.map((l) => {
    if (l.tipo === "verde") {
      return e.parque ? { fill: "#22c55e", opacity: 0.7 } : { fill: "#86efac", opacity: 0.2 };
    }
    const i = k++;
    if (construidos >= i + 1) return { fill: "#ef4444", opacity: 0.75 }; // casa terminada
    if (e.ocupacion > 0.001 && construidos > i - 3) return { fill: "#fbbf24", opacity: 0.75 }; // en construcción
    return { fill: "#e2e8f0", opacity: 0.3 }; // lote vacío
  });
}

export function conteoLotes(lotes: LoteGen[], e: EstadoAnio) {
  const nVend = lotes.filter((l) => l.tipo === "lote").length;
  const casas = Math.min(nVend, Math.floor(e.ocupacion * nVend + 1e-9));
  const enConstruccion = e.ocupacion > 0.001 ? Math.min(3, nVend - casas) : 0;
  return { total: nVend, casas, enConstruccion, vacios: nVend - casas - enConstruccion };
}