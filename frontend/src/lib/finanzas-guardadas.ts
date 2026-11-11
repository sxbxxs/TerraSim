import { useEffect, useState } from "react";
import { PARAMS_FINANCIEROS, ParametrosFinancieros, Estrategia, Tres } from "@/lib/financiero";

// Lee los datos de «Análisis financiero» guardados en este navegador (precios de casas, costos, etc.)
const CLAVE = "terrasim_financiero";
const esNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const nul = (x: unknown): number | null => (esNum(x) ? x : null);
const tresNul = (x: unknown, def: Tres<number | null>): Tres<number | null> =>
  Array.isArray(x) && x.length === 3 ? [nul(x[0]), nul(x[1]), nul(x[2])] : def;

export function leerFinanzasGuardadas(): ParametrosFinancieros {
  const b = PARAMS_FINANCIEROS;
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return b;
    const d = JSON.parse(raw) as Partial<Record<keyof ParametrosFinancieros, unknown>>;
    const n = (x: unknown, def: number) => (esNum(x) ? x : def);
    const estrategia: Estrategia =
      d.estrategia === "invertir" || d.estrategia === "lotear" || d.estrategia === "construir" ? d.estrategia : b.estrategia;
    const mz = d.mezclaPct;
    return {
      ...b,
      estrategia,
      precioTerreno: nul(d.precioTerreno),
      urbanismoM2: nul(d.urbanismoM2),
      indirectosPct: n(d.indirectosPct, b.indirectosPct),
      inflacionCostosPct: n(d.inflacionCostosPct, b.inflacionCostosPct),
      gastosVentaPct: n(d.gastosVentaPct, b.gastosVentaPct),
      indexarPrecios: typeof d.indexarPrecios === "boolean" ? d.indexarPrecios : b.indexarPrecios,
      mezclaPct: Array.isArray(mz) && mz.length === 2 && esNum(mz[0]) && esNum(mz[1]) ? [mz[0], mz[1]] : b.mezclaPct,
      precioLote: tresNul(d.precioLote, b.precioLote),
      precioCasa: tresNul(d.precioCasa, b.precioCasa),
      costoCasa: tresNul(d.costoCasa, b.costoCasa),
    };
  } catch {
    return b;
  }
}

export function useFinanzasGuardadas(): ParametrosFinancieros {
  const [fin, setFin] = useState<ParametrosFinancieros>(PARAMS_FINANCIEROS);
  useEffect(() => {
    setFin(leerFinanzasGuardadas());
  }, []);
  return fin;
}