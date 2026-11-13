import type { Punto } from "@/lib/geo";
import { areaM2, perimetroM } from "@/lib/geo";
import type { ParametrosLoteo, ResultadoLoteo } from "@/lib/lotes";
import type { Candidato } from "@/lib/candidatos";
import type { DatosInforme } from "@/lib/perfil";
import { Evaluado, Recomendacion, evaluarTerreno, recomendar } from "@/lib/comparador";
import { ANIO_BASE, EstadoAnio, Hito, ParametrosProgreso, conteoLotes, etapasLotes } from "@/lib/progreso";
import {
  Estrategia, ParametrosFinancieros, ResultadoFinanciero,
  calcularFinanzas, faltantes, mezclaCompleta,
} from "@/lib/financiero";
import { Comparable, Estimacion, distanciaCentroKm, estimarPrecioM2 } from "@/lib/ubicacion";
import { ESCENARIOS_SISMO, ParametrosSismo, probabilidadEnAnios, probabilidadesCasa } from "@/lib/sismo";
import { zonaDeLote } from "@/lib/detalle-lote";
import type { Escenario } from "@/types";

export const ESCENARIOS: Escenario[] = ["pesimista", "base", "optimista"];
export const ETIQUETA_ESCENARIO: Record<Escenario, string> = {
  pesimista: "Pesimista",
  base: "Base",
  optimista: "Optimista",
};
export const ETIQUETA_ESTRATEGIA: Record<Estrategia, string> = {
  invertir: "Comprar y esperar (inversionista)",
  lotear: "Lotear y vender lotes (inversionista)",
  construir: "Lotear, construir y vender casas (constructora)",
};

export type Entrada = {
  puntos: Punto[];
  loteo: ResultadoLoteo;
  series: Record<Escenario, EstadoAnio[]>;
  pp: ParametrosProgreso;
  hitos: Record<Escenario, Hito>;
  escenario: Escenario;
  anio: number;
  fin: ParametrosFinancieros;
  comparables: Comparable[];
  costoConstruccionM2?: number | null;
  sismo: ParametrosSismo;
  candidatos?: Candidato[]; // los terrenos de «Comparar terrenos»
  datosInforme?: DatosInforme; // proyecto, cliente y quién prepara el informe
  paramsLoteo?: ParametrosLoteo;
  fecha?: Date;
};

export type DatosReporte = {
  fecha: string;
  datosInforme: DatosInforme | null;
  escenario: Escenario;
  anio: number;
  anioCalendario: number;
  terreno: { areaM2: number; hectareas: number; perimetroM: number; vertices: number; distanciaCentroKm: number };
  loteo: {
    nLotes: number; nVerdes: number; nManzanas: number; areaVendible: number; areaVerde: number; areaVias: number;
    eficiencia: number; anchoMin: number; anchoMax: number; largoMin: number; largoMax: number; areaPromedio: number;
    proporcional: boolean; extremos: number; conectados: number;
  };
  estado: {
    casas: number; enObra: number; vacios: number; ocupacionPct: number; viaPavimentada: boolean; parque: boolean;
    valorM2: number; plusvaliaPct: number; valorTerreno: number; valorLotes: number;
  };
  escenarios: {
    id: Escenario;
    filas: { anio: number; valorM2: number; ocupacionPct: number }[];
    valorFinal: number; plusvaliaPct: number; tasaAnualPct: number;
  }[];
  curvas: Record<Escenario, number[]>; // valor del suelo por m² en cada año (0 a 20)
  hitos: Record<Escenario, Hito>;
  financiero: {
    estrategia: Estrategia;
    faltan: string[];
    esEjemplo: boolean;
    resultados: Record<Escenario, ResultadoFinanciero> | null;
    matriz: { id: Estrategia; celdas: ResultadoFinanciero[] | null }[];
    entradas: { etiqueta: string; valor: string }[];
    horizonte: number;
  };
  referencia: Estimacion | null;
  comparacion: {
    terrenos: { id: string; nombre: string; puntos: Punto[] }[];
    evals: Evaluado[];
    inversionista: Recomendacion;
    constructora: Recomendacion;
  } | null;
  sismo: {
    params: ParametrosSismo;
    prob: { a5: number; a10: number; a20: number };
    casas: number;
    escenarios: {
      nombre: string; pga: number; hipotetico: boolean; pColapso: number; pDano: number;
      destruidas: number; danadas: number; perdida: number; perdidaPct: number; pAlMenosUna: number;
    }[];
  };
};

const num = (n: number, d = 0) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(n);
const pesos = (n: number) => `$${num(n)}`;

export function armarReporte(e: Entrada): DatosReporte {
  const { loteo, series, pp, escenario, fin } = e;
  const anio = Math.min(Math.max(0, Math.round(e.anio)), series[escenario].length - 1);
  const est = series[escenario][anio];
  const etapas = etapasLotes(loteo.lotes, est);
  const conteo = conteoLotes(loteo.lotes, etapas);

  // --- Terreno ---
  const area = areaM2(e.puntos);
  const lat = e.puntos.reduce((s, q) => s + q.lat, 0) / e.puntos.length;
  const lng = e.puntos.reduce((s, q) => s + q.lng, 0) / e.puntos.length;

  // --- Evolución en el tiempo ---
  const marcas = [0, 5, 10, 15, 20].filter((a) => a < series[escenario].length);
  const escenarios = ESCENARIOS.map((id) => {
    const s = series[id];
    const ult = s[s.length - 1];
    const razon = ult.valorM2 / pp.valorInicial;
    return {
      id,
      filas: marcas.map((a) => ({ anio: a, valorM2: s[a].valorM2, ocupacionPct: s[a].ocupacion * 100 })),
      valorFinal: ult.valorM2,
      plusvaliaPct: (razon - 1) * 100,
      tasaAnualPct: (Math.pow(razon, 1 / Math.max(1, s.length - 1)) - 1) * 100,
    };
  });

  // --- Financiero ---
  const faltan = faltantes(fin);
  const mezcla = mezclaCompleta(fin);
  const resultados = faltan.length === 0
    ? ({
        pesimista: calcularFinanzas(loteo, series.pesimista, pp, fin),
        base: calcularFinanzas(loteo, series.base, pp, fin),
        optimista: calcularFinanzas(loteo, series.optimista, pp, fin),
      } as Record<Escenario, ResultadoFinanciero>)
    : null;
  const matriz = (["invertir", "lotear", "construir"] as Estrategia[]).map((id) => {
    const f = { ...fin, estrategia: id };
    return { id, celdas: faltantes(f).length === 0 ? ESCENARIOS.map((sc) => calcularFinanzas(loteo, series[sc], pp, f)) : null };
  });

  const entradas: { etiqueta: string; valor: string }[] = [];
  const dato = (etiqueta: string, valor: number | null, formato: (n: number) => string = (n) => pesos(n)) => {
    if (valor !== null) entradas.push({ etiqueta, valor: formato(valor) });
  };
  const pctTxt = (n: number) => `${num(n, 1)} %`;
  dato("Precio de compra del terreno", fin.precioTerreno);
  if (fin.estrategia !== "invertir") {
    dato("Urbanización (por m² del terreno)", fin.urbanismoM2);
    entradas.push({
      etiqueta: "Urbanización y venta",
      valor: `${fin.anosUrbanizacion} ${fin.anosUrbanizacion === 1 ? "año" : "años"} · ${fin.anosVenta > 0 ? `venta en ${fin.anosVenta} años` : "venta al ritmo del escenario"}`,
    });
    entradas.push({ etiqueta: "Lotes por zona (1 / 2 / 3)", valor: `${num(mezcla[0])} / ${num(mezcla[1])} / ${num(mezcla[2])} %` });
    [0, 1, 2].forEach((z) => {
      if (mezcla[z] <= 0) return;
      if (fin.estrategia === "lotear" && fin.precioLote[z] !== null) {
        entradas.push({ etiqueta: `Zona ${z + 1}: precio del lote`, valor: pesos(fin.precioLote[z] as number) });
      }
      if (fin.estrategia === "construir" && fin.precioCasa[z] !== null && fin.costoCasa[z] !== null) {
        entradas.push({ etiqueta: `Zona ${z + 1}: casa · costo de construirla`, valor: `${pesos(fin.precioCasa[z] as number)} · ${pesos(fin.costoCasa[z] as number)}` });
      }
    });
    entradas.push({ etiqueta: "Costos indirectos · inflación de costos", valor: `${pctTxt(fin.indirectosPct)} · ${pctTxt(fin.inflacionCostosPct)} anual` });
  }
  entradas.push({ etiqueta: "Gastos de compra · de venta", valor: `${pctTxt(fin.gastosCompraPct)} · ${pctTxt(fin.gastosVentaPct)}` });
  entradas.push({ etiqueta: "Impuesto · rentabilidad mínima", valor: `${pctTxt(fin.impuestoPct)} · ${fin.tasaDescuentoPct > 0 ? `${pctTxt(fin.tasaDescuentoPct)} anual` : "sin descontar"}` });
  entradas.push({ etiqueta: "Precios", valor: fin.indexarPrecios ? "siguen la valorización" : "constantes" });

  // Detecta los valores de ejemplo de TerraSim para avisar que no son datos reales
  const esEjemplo = fin.urbanismoM2 === 90_000 && fin.costoCasa[0] === 60_000_000 && fin.precioLote[0] === 42_000_000;

  // --- Referencia de precios por ubicación ---
  const referencia = e.comparables.length ? estimarPrecioM2(e.comparables, { lat, lng }, e.costoConstruccionM2 ?? null) : null;

  // --- Riesgo sísmico (valores esperados, sin sorteo) ---
  const idx = fin.indexarPrecios && pp.valorInicial > 0 ? est.valorM2 / pp.valorInicial : 1;
  const infl = Math.pow(1 + fin.inflacionCostosPct / 100, anio);
  let k = 0;
  let valorAntes = 0;
  let sumaUnidad = 0;
  let suelo = 0;
  loteo.lotes.forEach((l, i) => {
    if (l.tipo === "verde") return;
    const valorLote = est.valorM2 * l.areaM2;
    suelo += valorLote;
    const z = zonaDeLote(k++, loteo.nLotes, fin);
    const pc = fin.precioCasa[z];
    const cc = fin.costoCasa[z];
    const precio = pc === null ? null : pc * idx;
    const costo = cc === null ? null : cc * infl;
    const construida = etapas[i] === "casa";
    valorAntes += construida && precio !== null ? precio : valorLote;
    if (construida) sumaUnidad += costo ?? (precio !== null ? Math.max(0, precio - valorLote) : 0);
  });
  const escSismo = ESCENARIOS_SISMO.map((s) => {
    const pga = "pga" in s ? s.pga : e.sismo.aa;
    const pr = probabilidadesCasa(pga, e.sismo);
    const perdida = sumaUnidad * (pr.colapso + (pr.soloDano * e.sismo.perdidaDanoPct) / 100) + (suelo * e.sismo.caidaSueloPct) / 100;
    return {
      nombre: s.nombre, pga, hipotetico: s.hipotetico, pColapso: pr.colapso, pDano: pr.soloDano,
      destruidas: conteo.casas * pr.colapso, danadas: conteo.casas * pr.soloDano,
      perdida, perdidaPct: valorAntes > 0 ? (perdida / valorAntes) * 100 : 0,
      pAlMenosUna: conteo.casas > 0 ? 1 - Math.pow(1 - pr.colapso, conteo.casas) : 0,
    };
  });

  // --- Comparación de terrenos (solo si hay al menos dos dibujados) ---
  let comparacion: DatosReporte["comparacion"] = null;
  if (e.candidatos && e.paramsLoteo) {
    const ctx = { params: e.paramsLoteo, pp, hitos: e.hitos, fin, comparables: e.comparables, costoConstruccionM2: e.costoConstruccionM2 ?? null };
    const evals = e.candidatos.map((c) => evaluarTerreno(c, ctx)).filter((x): x is Evaluado => x !== null);
    if (evals.length >= 2) {
      comparacion = {
        terrenos: e.candidatos.filter((c) => c.puntos.length >= 3).map((c) => ({ id: c.id, nombre: c.nombre, puntos: c.puntos })),
        evals,
        inversionista: recomendar(evals, "inversionista"),
        constructora: recomendar(evals, "constructora"),
      };
    }
  }  
  const fecha = (e.fecha ?? new Date()).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

  return {
     fecha, datosInforme: e.datosInforme ?? null, escenario, anio, anioCalendario: ANIO_BASE + anio,
    terreno: { areaM2: area, hectareas: area / 10000, perimetroM: perimetroM(e.puntos), vertices: e.puntos.length, distanciaCentroKm: distanciaCentroKm({ lat, lng }) },
    loteo: {
      nLotes: loteo.nLotes, nVerdes: loteo.nVerdes, nManzanas: loteo.nManzanas, areaVendible: loteo.areaVendible,
      areaVerde: loteo.areaVerde, areaVias: loteo.areaVias, eficiencia: loteo.eficiencia, anchoMin: loteo.anchoMin,
      anchoMax: loteo.anchoMax, largoMin: loteo.largoMin, largoMax: loteo.largoMax, areaPromedio: loteo.areaPromedio,
      proporcional: loteo.proporcional, extremos: loteo.extremos, conectados: loteo.conectados,
    },
    estado: {
      casas: conteo.casas, enObra: conteo.enConstruccion, vacios: conteo.vacios, ocupacionPct: est.ocupacion * 100,
      viaPavimentada: est.via, parque: est.parque, valorM2: est.valorM2,
      plusvaliaPct: (est.valorM2 / pp.valorInicial - 1) * 100,
      valorTerreno: est.valorM2 * loteo.areaBruta, valorLotes: est.valorM2 * loteo.areaVendible,
    },
    escenarios,
    curvas: {
      pesimista: series.pesimista.map((x) => x.valorM2),
      base: series.base.map((x) => x.valorM2),
      optimista: series.optimista.map((x) => x.valorM2),
    },
    hitos: e.hitos,
    financiero: { estrategia: fin.estrategia, faltan, esEjemplo, resultados, matriz, entradas, horizonte: fin.horizonte },
    referencia,
    comparacion,
    sismo: {
      params: e.sismo,
      prob: {
        a5: probabilidadEnAnios(e.sismo.periodoRetorno, 5),
        a10: probabilidadEnAnios(e.sismo.periodoRetorno, 10),
        a20: probabilidadEnAnios(e.sismo.periodoRetorno, 20),
      },
      casas: conteo.casas,
      escenarios: escSismo,
    },
  };
}