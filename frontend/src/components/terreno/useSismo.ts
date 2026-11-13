"use client";
import { useEffect, useMemo, useState } from "react";
import type { ResultadoLoteo } from "@/lib/lotes";
import type { Escenario } from "@/types";
import { EstadoAnio, EtapaLote, ParametrosProgreso, etapasLotes } from "@/lib/progreso";
import { ParametrosFinancieros } from "@/lib/financiero";
import { zonaDeLote } from "@/lib/detalle-lote";
import {
  Danio, Evaluacion, ParametrosSismo, PARAMS_SISMO, ProbabilidadesCasa,
  evaluarSismo, generarGrietas, muestrearDanos, probabilidadesCasa,
} from "@/lib/sismo";
import type { Punto } from "@/lib/geo";
import { guardarSismo, leerSismoGuardado } from "@/lib/sismo-guardado";

export type EventoSismo = { anio: number; pga: number; semilla: number; nombre: string };

type Entrada = {
  loteo: ResultadoLoteo | null;
  series: Record<Escenario, EstadoAnio[]>;
  escenario: Escenario;
  anio: number;
  pp: ParametrosProgreso;
  fin: ParametrosFinancieros;
  anchoCalle: number;
};

export type EstadoSismo = {
  params: ParametrosSismo;
  setParams: (f: (p: ParametrosSismo) => ParametrosSismo) => void;
  evento: EventoSismo | null;
  simular: (pga: number, nombre: string) => void;
  resortear: () => void;
  quitar: () => void;
  visible: boolean; // el año que se está viendo ya es el del sismo o posterior
  danos: Danio[] | undefined;
  grietas: Punto[][] | undefined;
  casasEnEvento: number;
  probCasa: ProbabilidadesCasa | null;
  evaluacion: Evaluacion | null;
  tramos: number;
  tramosDanados: number;
  metrosDanados: number;
  etapasEvento: EtapaLote[];
};

const semillaNueva = () => Math.floor(Math.random() * 1_000_000);

export function useSismo({ loteo, series, escenario, anio, pp, fin, anchoCalle }: Entrada): EstadoSismo {
  const [params, setParamsEstado] = useState<ParametrosSismo>(PARAMS_SISMO);
  const [evento, setEvento] = useState<EventoSismo | null>(null);

  // los supuestos del sismo se guardan, y son los mismos que usan Configuración y el informe
  const [paramsListos, setParamsListos] = useState(false);
  useEffect(() => {
    setParamsEstado(leerSismoGuardado());
    setParamsListos(true);
  }, []);
  useEffect(() => {
    if (paramsListos) guardarSismo(params);
  }, [paramsListos, params]);  

  const calculo = useMemo(() => {
    if (!evento || !loteo) return null;
    const serie = series[escenario];
    const est = serie[Math.min(Math.max(0, evento.anio), serie.length - 1)];
    const etapasEvento = etapasLotes(loteo.lotes, est);
    const danos = muestrearDanos(etapasEvento, evento.pga, params, evento.semilla);
    const gr = generarGrietas(loteo.calles, evento.pga, params, evento.semilla, anchoCalle);

    const nV = loteo.nLotes;
    const idx = fin.indexarPrecios && pp.valorInicial > 0 ? est.valorM2 / pp.valorInicial : 1;
    const infl = Math.pow(1 + fin.inflacionCostosPct / 100, evento.anio);
    let k = 0;
    const precioCasa: (number | null)[] = [];
    const costoCasa: (number | null)[] = [];
    const valorLote: number[] = [];
    const esVerde: boolean[] = [];
    for (const l of loteo.lotes) {
      esVerde.push(l.tipo === "verde");
      valorLote.push(est.valorM2 * l.areaM2);
      if (l.tipo === "verde") {
        precioCasa.push(null);
        costoCasa.push(null);
        continue;
      }
      const z = zonaDeLote(k++, nV, fin);
      const pc = fin.precioCasa[z];
      const cc = fin.costoCasa[z];
      precioCasa.push(pc === null ? null : pc * idx);
      costoCasa.push(cc === null ? null : cc * infl);
    }
    const evaluacion = evaluarSismo({ etapas: etapasEvento, esVerde, danos, valorLote, precioCasa, costoCasa }, params);
    return { etapasEvento, danos, gr, evaluacion };
  }, [evento, loteo, series, escenario, params, fin, pp.valorInicial, anchoCalle]);

  const visible = !!evento && anio >= evento.anio;
  const casasEnEvento = calculo ? calculo.evaluacion.casas : 0;

  return {
    params,
    setParams: (f) => setParamsEstado((p) => f(p)),
    evento,
    simular: (pga, nombre) => setEvento({ anio, pga, semilla: semillaNueva(), nombre }),
    resortear: () => setEvento((e) => (e ? { ...e, semilla: semillaNueva() } : e)),
    quitar: () => setEvento(null),
    visible,
    danos: visible && calculo ? calculo.danos : undefined,
    grietas: visible && calculo ? calculo.gr.grietas : undefined,
    casasEnEvento,
    probCasa: evento ? probabilidadesCasa(evento.pga, params) : null,
    evaluacion: calculo ? calculo.evaluacion : null,
    tramos: calculo ? calculo.gr.tramos : 0,
    tramosDanados: calculo ? calculo.gr.danados : 0,
    metrosDanados: calculo ? calculo.gr.metros : 0,
    etapasEvento: calculo ? calculo.etapasEvento : [],
  };
}