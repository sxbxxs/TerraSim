import { areaM2 } from "@/lib/geo";
import { ParametrosLoteo, generarLoteo } from "@/lib/lotes";
import { Hito, ParametrosProgreso, simularProgreso } from "@/lib/progreso";
import { ParametrosFinancieros, ResultadoFinanciero, calcularFinanzas, faltantes } from "@/lib/financiero";
import { Comparable, distanciaCentroKm, estimarPrecioM2 } from "@/lib/ubicacion";
import { Candidato, IdCandidato, Mejoras, MEJORAS_NOMBRE } from "@/lib/candidatos";
import type { Escenario } from "@/types";

export const ESC: Escenario[] = ["pesimista", "base", "optimista"];
export type PorEscenario<T> = Record<Escenario, T>;

export type Contexto = {
  params: ParametrosLoteo;
  pp: ParametrosProgreso;
  hitos: PorEscenario<Hito>;
  fin: ParametrosFinancieros;
  comparables: Comparable[];
  costoConstruccionM2: number | null;
};

export type Evaluado = {
  id: IdCandidato;
  nombre: string;
  area: number;
  distanciaKm: number;
  nLotes: number;
  eficiencia: number;
  areaPromedio: number;
  valorM2: number; // valor de referencia del suelo en este lugar (COP/m²)
  usaReferencias: boolean; // false = no hay referencias y se usó el valor inicial del modelo
  avisosPrecio: string[];
  precioCompra: number | null;
  precioCompraM2: number | null;
  spread: number | null; // cuántas veces el lote urbanizado de la zona supera el costo del terreno por m² (contexto, no un descuento)
  pendientes: string[]; // mejoras que le faltan al sector
  yaExisten: string[];
  plusvaliaPct: PorEscenario<number>; // valorización del suelo a 20 años
  invertir: PorEscenario<ResultadoFinanciero> | null;
  faltaInvertir: string[];
  construir: PorEscenario<ResultadoFinanciero> | null;
  faltaConstruir: string[];
  mercado: 0 | 1 | 2;
  precioCasa: number | null;
};

const MEZCLA_MERCADO: [number, number][] = [[100, 0], [0, 100], [0, 0]];

export function evaluarTerreno(c: Candidato, ctx: Contexto): Evaluado | null {
  if (c.puntos.length < 3) return null;
  const loteo = generarLoteo(c.puntos, ctx.params);
  if (!loteo) return null;

  const area = areaM2(c.puntos);
  const centro = {
    lat: c.puntos.reduce((s, q) => s + q.lat, 0) / c.puntos.length,
    lng: c.puntos.reduce((s, q) => s + q.lng, 0) / c.puntos.length,
  };
  const est = ctx.comparables.length ? estimarPrecioM2(ctx.comparables, centro, ctx.costoConstruccionM2) : null;
  const usaReferencias = !!est && est.precioM2 !== null;
  const valorM2 = usaReferencias ? (est!.precioM2 as number) : ctx.pp.valorInicial;
  const ppT: ParametrosProgreso = { ...ctx.pp, valorInicial: valorM2 };

  // Lo que el sector ya tiene se activa desde el año 0; lo que falta llega en el año del escenario
  const hitosT = (sc: Escenario): Hito => ({
    via: c.yaExiste.via ? 0 : ctx.hitos[sc].via,
    servicios: c.yaExiste.servicios ? 0 : ctx.hitos[sc].servicios,
    parque: c.yaExiste.parque ? 0 : ctx.hitos[sc].parque,
    usoSuelo: c.yaExiste.usoSuelo ? 0 : ctx.hitos[sc].usoSuelo,
  });
  const series = {} as PorEscenario<ReturnType<typeof simularProgreso>>;
  const plusvaliaPct = {} as PorEscenario<number>;
  for (const sc of ESC) {
    series[sc] = simularProgreso(ppT, hitosT(sc));
    plusvaliaPct[sc] = (series[sc][series[sc].length - 1].valorM2 / valorM2 - 1) * 100;
  }

  const finI: ParametrosFinancieros = { ...ctx.fin, estrategia: "invertir", precioTerreno: c.precioCompra };
  const finC: ParametrosFinancieros = { ...ctx.fin, estrategia: "construir", precioTerreno: c.precioCompra, mezclaPct: MEZCLA_MERCADO[c.mercado] };
  const faltaInvertir = faltantes(finI);
  const faltaConstruir = faltantes(finC);
  const calc = (f: ParametrosFinancieros) =>
    Object.fromEntries(ESC.map((sc) => [sc, calcularFinanzas(loteo, series[sc], ppT, f)])) as PorEscenario<ResultadoFinanciero>;

  const mejoras = Object.keys(MEJORAS_NOMBRE) as (keyof Mejoras)[];
  const precioCompraM2 = c.precioCompra !== null ? c.precioCompra / area : null;

  return {
    id: c.id, nombre: c.nombre, area, distanciaKm: distanciaCentroKm(centro),
    nLotes: loteo.nLotes, eficiencia: loteo.eficiencia, areaPromedio: loteo.areaPromedio,
    valorM2, usaReferencias, avisosPrecio: est ? est.avisos : [],
    precioCompra: c.precioCompra, precioCompraM2,
    spread: precioCompraM2 === null || precioCompraM2 <= 0 ? null : valorM2 / precioCompraM2,
    pendientes: mejoras.filter((k) => !c.yaExiste[k]).map((k) => MEJORAS_NOMBRE[k]),
    yaExisten: mejoras.filter((k) => c.yaExiste[k]).map((k) => MEJORAS_NOMBRE[k]),
    plusvaliaPct,
    invertir: faltaInvertir.length === 0 ? calc(finI) : null, faltaInvertir,
    construir: faltaConstruir.length === 0 ? calc(finC) : null, faltaConstruir,
    mercado: c.mercado, precioCasa: ctx.fin.precioCasa[c.mercado],
  };
}

// ---------- Recomendación ----------
export type Perfil = "inversionista" | "constructora";

export type Recomendacion = {
  perfil: Perfil;
  ganadorId: IdCandidato | null;
  criterio: string; // con qué se comparó
  ranking: { id: IdCandidato; nombre: string; tir: number | null; utilidad: number | null }[];
  razones: string[];
  avisos: string[];
};

const num = (n: number, d = 0) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(n);
const pct = (f: number | null) => (f === null ? "no aplica" : `${num(f * 100, 1)} %`);
const mm = (n: number) => {
  const a = Math.abs(n);
  const t = a >= 1e9 ? `$${num(a / 1e9, 2)} mil millones` : `$${num(a / 1e6, a >= 1e8 ? 0 : 1)} M`;
  return n < 0 ? `−${t}` : t;
};

const EMPATE = 0.0005; // diferencia de TIR por debajo de la cual se considera empate

export function recomendar(evals: Evaluado[], perfil: Perfil): Recomendacion {
  const res = (e: Evaluado) => (perfil === "inversionista" ? e.invertir : e.construir);
  const falta = (e: Evaluado) => (perfil === "inversionista" ? e.faltaInvertir : e.faltaConstruir);
  const conDatos = evals.filter((e) => res(e) !== null);
  const avisos: string[] = [];

  if (evals.length < 2) {
    return { perfil, ganadorId: null, criterio: "", ranking: [], razones: [], avisos: ["Dibuja al menos dos terrenos para poder compararlos."] };
  }

  const tirBase = (e: Evaluado) => (res(e) as PorEscenario<ResultadoFinanciero>).base.tir;
  const utilBase = (e: Evaluado) => (res(e) as PorEscenario<ResultadoFinanciero>).base.utilidadNeta;
  const con = conDatos.length >= 2;

  let orden: Evaluado[];
  let criterio: string;
  if (con) {
    // primero la rentabilidad; si empatan, el terreno más barato frente a los lotes de la zona
    orden = [...conDatos].sort((a, b) => {
      const ta = tirBase(a) ?? -Infinity;
      const tb = tirBase(b) ?? -Infinity;
      if (Math.abs(ta - tb) > EMPATE) return tb - ta;
      return (b.spread ?? 0) - (a.spread ?? 0) || utilBase(b) - utilBase(a);
    });
    criterio = "rentabilidad (TIR) en el escenario base";
    for (const e of evals.filter((x) => res(x) === null)) avisos.push(`${e.nombre} no entró en la comparación: falta ${falta(e).join(", ").toLowerCase()}.`);
    if (perfil === "inversionista") {
      avisos.push("El retorno del inversionista supone que el terreno se vende al precio de compra ajustado por la valorización de la zona; no depende de si lo compras barato o caro frente a otros.");
    }
  } else {
    // sin precio de compra no hay rentabilidad: se compara por lo que sí se sabe
    orden = [...evals].sort((a, b) =>
      perfil === "inversionista" ? b.plusvaliaPct.base - a.plusvaliaPct.base : b.nLotes - a.nLotes || b.eficiencia - a.eficiencia
    );
    criterio = perfil === "inversionista" ? "valorización del suelo a 20 años (escenario base)" : "lotes que caben y aprovechamiento del terreno";
    avisos.push(
      `No se puede comparar la rentabilidad porque faltan datos (${[...new Set(evals.flatMap((e) => falta(e)))].join(", ").toLowerCase()}). Con ellos la recomendación será por rentabilidad real.`
    );
  }

  const g = orden[0];
  const otros = orden.slice(1);
  const razones: string[] = [];

  if (con) {
    const r = res(g) as PorEscenario<ResultadoFinanciero>;
    const empata = otros.find((o) => res(o) && Math.abs((tirBase(o) ?? -9) - (tirBase(g) ?? -9)) <= EMPATE);
    razones.push(
      `Rentabilidad en el escenario base: TIR de ${pct(tirBase(g))} y utilidad de ${mm(r.base.utilidadNeta)}` +
        (otros.length ? ` (${otros.filter((o) => res(o)).map((o) => `${o.nombre}: ${pct(tirBase(o))}`).join(", ")}).` : ".")
    );
    if (empata && g.spread !== null) {
      razones.push(`Empata en rentabilidad con ${empata.nombre}; se desempata porque es el terreno más barato frente a los lotes de la zona (${num(g.spread, 1)} veces).`);
    }
    const iguales = Math.abs(r.pesimista.utilidadNeta - r.optimista.utilidadNeta) < 1;
    razones.push(
      iguales
        ? "Como ya tiene todas las mejoras, los tres escenarios dan el mismo resultado: no depende de cuándo lleguen las obras."
        : r.pesimista.utilidadNeta >= 0
          ? `Aun en el escenario pesimista no pierde dinero: utilidad de ${mm(r.pesimista.utilidadNeta)} (TIR ${pct(r.pesimista.tir)}).`
          : `En el escenario pesimista perdería ${mm(-r.pesimista.utilidadNeta)}; en el optimista ganaría ${mm(r.optimista.utilidadNeta)}.`
    );
  } else {
    razones.push(
      perfil === "inversionista"
        ? `Es el que más se valoriza a 20 años en el escenario base: +${num(g.plusvaliaPct.base, 0)} %.`
        : `Es el que más lotes da: ${g.nLotes} lotes con ${num(g.eficiencia, 1)} % de aprovechamiento.`
    );
  }

  if (perfil === "inversionista") {
    razones.push(
      g.pendientes.length
        ? `Le faltan ${g.pendientes.join(", ")}: hasta que lleguen crece más despacio y al llegar se acelera (+${num(g.plusvaliaPct.base, 0)} % a 20 años en el escenario base).`
        : `Ya tiene todas las mejoras, así que se valoriza a la tasa completa desde hoy (+${num(g.plusvaliaPct.base, 0)} % a 20 años).`
    );
  } else {
    razones.push(`Caben ${g.nLotes} lotes de ${num(g.areaPromedio)} m² (${otros.map((o) => `${o.nombre}: ${o.nLotes}`).join(", ")}) con ${num(g.eficiencia, 1)} % de aprovechamiento.`);
    if (g.precioCompraM2 !== null) {
      razones.push(
        `El terreno cuesta $${num(g.precioCompraM2)} por m²${g.precioCompra !== null && g.nLotes > 0 ? ` ($${num(g.precioCompra / g.nLotes)} por lote)` : ""} y los lotes de la zona se ofrecen a $${num(g.valorM2)} por m² (${num(g.spread ?? 0, 1)} veces).`
      );
    }
    if (g.precioCasa !== null) razones.push(`Casas del mercado ${["alto", "medio", "económico"][g.mercado]}: se venden en ${mm(g.precioCasa)}.`);
  }
  razones.push(`Está a ${num(g.distanciaKm, 1)} km del centro${g.usaReferencias ? "" : " (sin referencias de precios de la zona: se usó el valor inicial del modelo)"}.`);

  if (!g.usaReferencias) avisos.push(`Para ${g.nombre} no hay referencias de precios cercanas; agrega lotes y casas de esa zona para mejorar la comparación.`);
  for (const a of g.avisosPrecio.filter((x) => x.includes("poco confiable"))) avisos.push(`${g.nombre}: ${a}`);

  return {
    perfil, ganadorId: g.id, criterio,
    ranking: orden.map((e) => ({ id: e.id, nombre: e.nombre, tir: res(e) ? tirBase(e) : null, utilidad: res(e) ? utilBase(e) : null })),
    razones, avisos,
  };
}