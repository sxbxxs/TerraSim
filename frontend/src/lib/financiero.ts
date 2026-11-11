import type { ResultadoLoteo } from "@/lib/lotes";
import type { EstadoAnio, ParametrosProgreso } from "@/lib/progreso";

// Referencias oficiales 2026 (verificar siempre la norma vigente)
export const SMMLV_2026 = 1_750_905; // Decreto 1469 de 2025
export const TOPE_VIS_SMMLV = 135; // regla general de la VIS (Ley 2294 de 2023)
export const TOPE_VIP_SMMLV = 90;
export const TOPE_VIS = TOPE_VIS_SMMLV * SMMLV_2026; // 236.372.175
export const TOPE_VIP = TOPE_VIP_SMMLV * SMMLV_2026; // 157.581.450

export type Estrategia = "invertir" | "lotear" | "construir";
export type Tres<T> = [T, T, T];

// Los porcentajes se escriben como número (12 = 12 %). null = dato que el usuario aún no ha puesto.
export type ParametrosFinancieros = {
  estrategia: Estrategia;
  horizonte: number; // años de análisis (1 a 20)
  tasaDescuentoPct: number; // rentabilidad mínima exigida; 0 = sin descontar
  precioTerreno: number | null; // COP, total, hoy
  gastosCompraPct: number; // escrituración y registro, % del precio de compra
  tenenciaPct: number; // predial y vigilancia, % anual del valor del terreno (estrategia invertir)
  gastosVentaPct: number; // comisiones y gastos de venta, % de lo vendido
  impuestoPct: number; // % sobre la utilidad antes de impuestos (0 = no se modela)
  urbanismoM2: number | null; // COP por m² de área bruta (vías, redes, parques)
  anosUrbanizacion: number; // años que dura la urbanización
  anosVenta: number; // años en que se vende todo (0 = al ritmo de construcción del escenario)
  indirectosPct: number; // diseños, licencias y gerencia, % de urbanismo + construcción
  inflacionCostosPct: number; // % anual con que suben los costos de obra
  descuentoSaldoPct: number; // descuento al liquidar al final los lotes sin vender
  indexarPrecios: boolean; // los precios suben o bajan con la valorización del escenario
  mezclaPct: [number, number]; // % de lotes en la zona 1 y en la zona 2 (la zona 3 es el resto)
  precioLote: Tres<number | null>; // COP por lote, hoy, según la zona
  precioCasa: Tres<number | null>; // COP por casa terminada (incluye el lote), hoy, según la zona
  costoCasa: Tres<number | null>; // COP que cuesta construir cada casa, según la zona
};

// Solo lo que dijiste (casas a 120, 80 y 40 millones). Todo lo demás se deja en blanco o en 0.
export const PARAMS_FINANCIEROS: ParametrosFinancieros = {
  estrategia: "lotear",
  horizonte: 10,
  tasaDescuentoPct: 0,
  precioTerreno: null,
  gastosCompraPct: 0,
  tenenciaPct: 0,
  gastosVentaPct: 0,
  impuestoPct: 0,
  urbanismoM2: null,
  anosUrbanizacion: 1,
  anosVenta: 0,
  indirectosPct: 0,
  inflacionCostosPct: 0,
  descuentoSaldoPct: 0,
  indexarPrecios: true,
  mezclaPct: [34, 33],
  precioLote: [null, null, null],
  precioCasa: [120_000_000, 80_000_000, 40_000_000],
  costoCasa: [null, null, null],
};

// Botón "Rellenar con valores de ejemplo": números inventados por TerraSim solo para probar.
export function valoresEjemplo(areaBruta: number): Partial<ParametrosFinancieros> {
  const redondear = (n: number) => Math.round(n / 1_000_000) * 1_000_000;
  return {
    horizonte: 10,
    tasaDescuentoPct: 12,
    precioTerreno: redondear(areaBruta * 40_000),
    gastosCompraPct: 3,
    tenenciaPct: 0.5,
    gastosVentaPct: 3,
    urbanismoM2: 90_000,
    anosUrbanizacion: 1,
    indirectosPct: 10,
    inflacionCostosPct: 5,
    descuentoSaldoPct: 10,
    precioLote: [42_000_000, 28_000_000, 14_000_000],
    costoCasa: [60_000_000, 40_000_000, 22_000_000],
  };
}

const mezcla = (f: ParametrosFinancieros): Tres<number> => {
  const p1 = Math.min(100, Math.max(0, f.mezclaPct[0]));
  const p2 = Math.min(100 - p1, Math.max(0, f.mezclaPct[1]));
  return [p1, p2, Math.max(0, 100 - p1 - p2)];
};
export const mezclaCompleta = mezcla;

// Datos que el usuario todavía debe poner para poder calcular
export function faltantes(f: ParametrosFinancieros): string[] {
  const out: string[] = [];
  const m = mezcla(f);
  if (f.precioTerreno === null || f.precioTerreno <= 0) out.push("Precio de compra del terreno");
  if (f.estrategia !== "invertir" && f.urbanismoM2 === null) out.push("Costo de urbanización por m²");
  for (let z = 0; z < 3; z++) {
    if (m[z] <= 0) continue;
    if (f.estrategia === "lotear" && f.precioLote[z] === null) out.push(`Precio de venta de un lote (zona ${z + 1})`);
    if (f.estrategia === "construir") {
      if (f.precioCasa[z] === null) out.push(`Precio de venta de la casa (zona ${z + 1})`);
      if (f.costoCasa[z] === null) out.push(`Costo de construir la casa (zona ${z + 1})`);
    }
  }
  return out;
}

export type FlujoAnio = {
  anio: number;
  ingresos: number;
  compra: number;
  tenencia: number;
  urbanismo: number;
  construccion: number;
  indirectos: number;
  ventas: number;
  impuesto: number;
  neto: number;
  acumulado: number;
  lotesVendidos: number;
};

export type ResultadoFinanciero = {
  flujos: FlujoAnio[];
  ingresosTotales: number;
  costosTotales: number; // sin impuesto
  utilidadAntes: number;
  impuesto: number;
  utilidadNeta: number;
  margen: number; // utilidad neta / ingresos (fracción)
  rentabilidadCostos: number; // utilidad neta / costos (fracción)
  tir: number | null; // fracción anual
  vpn: number;
  exposicionMaxima: number; // máximo dinero puesto antes de recuperarlo
  anioRecuperacion: number | null;
  factorEquilibrio: number | null; // por cuánto hay que multiplicar los precios para que la utilidad sea 0
  lotesVendidos: number; // lotes (o casas) vendidos dentro del horizonte
  lotesSinVender: number;
  utilidadPorLote: number;
};

// Tasa interna de retorno por bisección (null si el flujo no cambia de signo)
export function tir(flujos: number[]): number | null {
  const g = (r: number) => flujos.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0);
  let lo = -0.99;
  let hi = 10;
  let glo = g(lo);
  const ghi = g(hi);
  if (!Number.isFinite(glo) || !Number.isFinite(ghi) || glo * ghi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const gm = g(mid);
    if (glo * gm <= 0) {
      hi = mid;
    } else {
      lo = mid;
      glo = gm;
    }
  }
  return (lo + hi) / 2;
}

export function calcularFinanzas(
  loteo: ResultadoLoteo,
  serie: EstadoAnio[],
  pp: ParametrosProgreso,
  f: ParametrosFinancieros
): ResultadoFinanciero {
  const H = Math.min(Math.max(1, Math.round(f.horizonte)), serie.length - 1);
  const d = Math.min(Math.max(1, Math.round(f.anosUrbanizacion)), Math.max(1, H - 1));
  const N = loteo.nLotes;
  const bruta = loteo.areaBruta;
  const v0 = pp.valorInicial > 0 ? pp.valorInicial : 1;

  const pct = (x: number) => x / 100;
  const infl = (t: number) => Math.pow(1 + pct(f.inflacionCostosPct), t);
  const idx = (t: number) => (f.indexarPrecios ? serie[t].valorM2 / v0 : 1);
  const ocup = (t: number) => (t <= 0 ? 0 : serie[Math.min(t, serie.length - 1)].ocupacion);
  // fracción de lotes vendidos: empieza cuando termina la urbanización; o sigue al escenario,
  // o se reparte en partes iguales en los años de venta que el usuario indique
  const absorbido = (t: number) => {
    if (t - d <= 0) return 0;
    if (f.anosVenta > 0) return Math.min(1, (t - d) / f.anosVenta);
    return ocup(t - d);
  };

  // Zonas por ubicación: los primeros lotes en venderse son los más cercanos a la vía (zona 1)
  const m = mezcla(f);
  const limites: [number, number][] = [
    [0, (m[0] / 100) * N],
    [(m[0] / 100) * N, ((m[0] + m[1]) / 100) * N],
    [((m[0] + m[1]) / 100) * N, N],
  ];
  // cuántos lotes de cada zona hay entre el lote a y el lote b (en orden de venta)
  const porZona = (a: number, b: number): Tres<number> => {
    const c = (z: number) => Math.max(0, Math.min(b, limites[z][1]) - Math.max(a, limites[z][0]));
    return [c(0), c(1), c(2)];
  };
  const val = (x: number | null) => x ?? 0;

  const n = H + 1;
  const z = () => new Array<number>(n).fill(0);
  const compra = z(), tenencia = z(), urbanismo = z(), construccion = z(), indirectos = z();
  const ingEsc = z(); // ingresos que escalan con los precios de venta
  const ingFijo = z(); // ingresos que no dependen de ellos (saldo de lotes en la estrategia construir)
  const lotesVend = z();

  const precioTerreno = val(f.precioTerreno);
  compra[0] = precioTerreno * (1 + pct(f.gastosCompraPct));

  let lotesSinVender = 0;

  if (f.estrategia === "invertir") {
    for (let t = 1; t <= H; t++) tenencia[t] = pct(f.tenenciaPct) * precioTerreno * idx(t);
    ingEsc[H] = precioTerreno * idx(H);
  } else {
    for (let t = 1; t <= d; t++) urbanismo[t] = ((val(f.urbanismoM2) * bruta) / d) * infl(t);

    for (let t = 1; t <= H; t++) {
      const a = N * absorbido(t - 1);
      const b = N * absorbido(t);
      const cuenta = porZona(a, b);
      lotesVend[t] = b - a;
      for (let k = 0; k < 3; k++) {
        if (f.estrategia === "lotear") {
          ingEsc[t] += cuenta[k] * val(f.precioLote[k]) * idx(t);
        } else {
          ingEsc[t] += cuenta[k] * val(f.precioCasa[k]) * idx(t);
          // la obra se paga el año anterior a la venta
          construccion[t - 1] += cuenta[k] * val(f.costoCasa[k]) * infl(t - 1);
        }
      }
    }

    // lotes que no alcanzaron a venderse: se liquidan al final como lotes, con descuento
    const aFinal = N * absorbido(H);
    lotesSinVender = N - aFinal;
    const resto = porZona(aFinal, N);
    let saldo = 0;
    for (let k = 0; k < 3; k++) {
      saldo += resto[k] * val(f.precioLote[k]) * idx(H) * (1 - pct(f.descuentoSaldoPct));
    }
    if (f.estrategia === "lotear") ingEsc[H] += saldo;
    else ingFijo[H] += saldo;

    for (let t = 0; t <= H; t++) indirectos[t] = pct(f.indirectosPct) * (urbanismo[t] + construccion[t]);
  }

  const ingresos = ingEsc.map((x, t) => x + ingFijo[t]);
  const ventas = ingresos.map((x) => pct(f.gastosVentaPct) * x);

  const antesImp = ingresos.reduce(
    (s, x, t) => s + x - compra[t] - tenencia[t] - urbanismo[t] - construccion[t] - indirectos[t] - ventas[t],
    0
  );
  const impuestoTotal = Math.max(0, antesImp) * pct(f.impuestoPct);

  const flujos: FlujoAnio[] = [];
  let acum = 0;
  for (let t = 0; t <= H; t++) {
    const imp = t === H ? impuestoTotal : 0;
    const neto = ingresos[t] - compra[t] - tenencia[t] - urbanismo[t] - construccion[t] - indirectos[t] - ventas[t] - imp;
    acum += neto;
    flujos.push({
      anio: t, ingresos: ingresos[t], compra: compra[t], tenencia: tenencia[t], urbanismo: urbanismo[t],
      construccion: construccion[t], indirectos: indirectos[t], ventas: ventas[t], impuesto: imp,
      neto, acumulado: acum, lotesVendidos: lotesVend[t],
    });
  }

  const ingresosTotales = ingresos.reduce((s, x) => s + x, 0);
  const costosTotales = flujos.reduce(
    (s, x) => s + x.compra + x.tenencia + x.urbanismo + x.construccion + x.indirectos + x.ventas,
    0
  );
  const utilidadNeta = antesImp - impuestoTotal;

  const r = pct(f.tasaDescuentoPct);
  const df = (t: number) => 1 / Math.pow(1 + r, t);
  const vpn = flujos.reduce((s, x) => s + x.neto * df(x.anio), 0);

  const exposicionMaxima = Math.max(0, -Math.min(...flujos.map((x) => x.acumulado)));

  let anioRecuperacion: number | null = null;
  let hubo = false;
  for (const x of flujos) {
    if (x.acumulado < 0) hubo = true;
    else if (hubo) {
      anioRecuperacion = x.anio;
      break;
    }
  }

  // Equilibrio: factor s que multiplica todos los precios de venta para que el VPN antes de impuestos sea 0
  const gv = pct(f.gastosVentaPct);
  const pvEsc = ingEsc.reduce((s, x, t) => s + x * (1 - gv) * df(t), 0);
  const pvFijo = ingFijo.reduce((s, x, t) => s + x * (1 - gv) * df(t), 0);
  const pvCostos = flujos.reduce(
    (s, x) => s + (x.compra + x.tenencia + x.urbanismo + x.construccion + x.indirectos) * df(x.anio),
    0
  );
  const factorEquilibrio = pvEsc > 0 ? (pvCostos - pvFijo) / pvEsc : null;

  const vendidos = lotesVend.reduce((s, x) => s + x, 0);
  const base = f.estrategia === "invertir" ? 1 : Math.max(1, N);

  return {
    flujos,
    ingresosTotales,
    costosTotales,
    utilidadAntes: antesImp,
    impuesto: impuestoTotal,
    utilidadNeta,
    margen: ingresosTotales > 0 ? utilidadNeta / ingresosTotales : 0,
    rentabilidadCostos: costosTotales > 0 ? utilidadNeta / costosTotales : 0,
    tir: tir(flujos.map((x) => x.neto)),
    vpn,
    exposicionMaxima,
    anioRecuperacion,
    factorEquilibrio,
    lotesVendidos: vendidos,
    lotesSinVender,
    utilidadPorLote: utilidadNeta / base,
  };
}