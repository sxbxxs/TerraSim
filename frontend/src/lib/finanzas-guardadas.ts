import { useEffect, useState } from "react";
import { PARAMS_FINANCIEROS, ParametrosFinancieros, Estrategia, Tres } from "@/lib/financiero";

// Lee los datos de «Análisis financiero» guardados en este navegador y valida cada uno
const CLAVE = "terrasim_financiero";
const esNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const nul = (x: unknown): number | null => (esNum(x) ? x : null);
const tresNul = (x: unknown, def: Tres<number | null>): Tres<number | null> =>
  Array.isArray(x) && x.length === 3 ? [nul(x[0]), nul(x[1]), nul(x[2])] : def;

export function limpiarFinancieros(d: Partial<Record<keyof ParametrosFinancieros, unknown>>): ParametrosFinancieros {
  const b = PARAMS_FINANCIEROS;
  const n = (x: unknown, def: number) => (esNum(x) ? x : def);
  const estrategia: Estrategia =
    d.estrategia === "invertir" || d.estrategia === "lotear" || d.estrategia === "construir" ? d.estrategia : b.estrategia;
  const mz = d.mezclaPct;
  return {
    estrategia,
    horizonte: Math.min(20, Math.max(1, Math.round(n(d.horizonte, b.horizonte)))),
    tasaDescuentoPct: n(d.tasaDescuentoPct, b.tasaDescuentoPct),
    precioTerreno: nul(d.precioTerreno),
    gastosCompraPct: n(d.gastosCompraPct, b.gastosCompraPct),
    tenenciaPct: n(d.tenenciaPct, b.tenenciaPct),
    gastosVentaPct: n(d.gastosVentaPct, b.gastosVentaPct),
    impuestoPct: n(d.impuestoPct, b.impuestoPct),
    urbanismoM2: nul(d.urbanismoM2),
    anosUrbanizacion: Math.max(1, Math.round(n(d.anosUrbanizacion, b.anosUrbanizacion))),
    anosVenta: Math.max(0, Math.round(n(d.anosVenta, b.anosVenta))),
    indirectosPct: n(d.indirectosPct, b.indirectosPct),
    inflacionCostosPct: n(d.inflacionCostosPct, b.inflacionCostosPct),
    descuentoSaldoPct: n(d.descuentoSaldoPct, b.descuentoSaldoPct),
    indexarPrecios: typeof d.indexarPrecios === "boolean" ? d.indexarPrecios : b.indexarPrecios,
    mezclaPct: Array.isArray(mz) && mz.length === 2 && esNum(mz[0]) && esNum(mz[1]) ? [mz[0], mz[1]] : b.mezclaPct,
    precioLote: tresNul(d.precioLote, b.precioLote),
    precioCasa: tresNul(d.precioCasa, b.precioCasa),
    costoCasa: tresNul(d.costoCasa, b.costoCasa),
  };
}

export function leerFinanzasGuardadas(): ParametrosFinancieros {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? limpiarFinancieros(JSON.parse(raw)) : PARAMS_FINANCIEROS;
  } catch {
    return PARAMS_FINANCIEROS;
  }
}

export function useFinanzasGuardadas(): ParametrosFinancieros {
  const [fin, setFin] = useState<ParametrosFinancieros>(PARAMS_FINANCIEROS);
  useEffect(() => {
    setFin(leerFinanzasGuardadas());
  }, []);
  return fin;
}