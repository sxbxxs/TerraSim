"use client";
import {
  createContext, useContext, useEffect, useMemo, useState,
  Dispatch, SetStateAction, ReactNode,
} from "react";
import type { Punto } from "@/lib/geo";
import { generarLoteo, ParametrosLoteo, ResultadoLoteo } from "@/lib/lotes";
import type { Escenario } from "@/types";
import {
  simularProgreso, etapasLotes, conteoLotes,
  HITOS_POR_DEFECTO, PARAMS_PROGRESO,
  EstadoAnio, EtapaLote, Hito, ParametrosProgreso,
} from "@/lib/progreso";
import type { Foco } from "@/components/map/MapaSelector";

export const PARAMS_LOTEO_INICIALES: ParametrosLoteo = {
  frente: 7,
  fondo: 15,
  anchoVia: 8,
  anchoViaExistente: 10,
  cesionVerdePct: 10,
  ladoVia: 0,
  ajustar: true,
  lotesPorManzana: 12,
};

const CLAVE = "terrasim_estudio";
const ESCENARIOS: Escenario[] = ["pesimista", "base", "optimista"];

type Conteo = { total: number; casas: number; enConstruccion: number; vacios: number };

type Valor = {
  puntos: Punto[]; setPuntos: Dispatch<SetStateAction<Punto[]>>;
  params: ParametrosLoteo; setParams: Dispatch<SetStateAction<ParametrosLoteo>>;
  anio: number; setAnio: Dispatch<SetStateAction<number>>;
  escenario: Escenario; setEscenario: Dispatch<SetStateAction<Escenario>>;
  pp: ParametrosProgreso; setPp: Dispatch<SetStateAction<ParametrosProgreso>>;
  hitos: Record<Escenario, Hito>; setHitos: Dispatch<SetStateAction<Record<Escenario, Hito>>>;
  hidratado: boolean;
  loteo: ResultadoLoteo | null;
  series: Record<Escenario, EstadoAnio[]>;
  estado: EstadoAnio;
  etapas: EtapaLote[];
  conteo: Conteo | null;
};

type Guardado = {
  puntos: unknown;
  params: Partial<ParametrosLoteo>;
  anio: unknown;
  escenario: unknown;
  pp: Partial<ParametrosProgreso>;
  hitos: Partial<Record<Escenario, Partial<Hito>>>;
};

const esNumero = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const esPunto = (q: unknown): q is Punto =>
  typeof q === "object" && q !== null && esNumero((q as Punto).lat) && esNumero((q as Punto).lng);

// Centra el mapa en el terreno con un zoom que lo deje a buen tamaño
export function focoDePuntos(puntos: Punto[]): Foco | null {
  if (puntos.length < 3) return null;
  const lats = puntos.map((q) => q.lat);
  const lngs = puntos.map((q) => q.lng);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const cos = Math.cos((lat * Math.PI) / 180);
  const spanLat = (Math.max(...lats) - Math.min(...lats)) * 111320;
  const spanLng = (Math.max(...lngs) - Math.min(...lngs)) * 111320 * cos;
  const span = Math.max(spanLat, spanLng, 30);
  const zoom = Math.floor(Math.log2((156543.03 * cos * 450) / span));
  return { lat, lng, zoom: Math.min(20, Math.max(15, zoom)) };
}

const Contexto = createContext<Valor | null>(null);

export function useEstudio(): Valor {
  const v = useContext(Contexto);
  if (!v) throw new Error("useEstudio debe usarse dentro de <EstudioProvider>");
  return v;
}

export function EstudioProvider({ children }: { children: ReactNode }) {
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [params, setParams] = useState<ParametrosLoteo>(PARAMS_LOTEO_INICIALES);
  const [anio, setAnio] = useState(0);
  const [escenario, setEscenario] = useState<Escenario>("base");
  const [pp, setPp] = useState<ParametrosProgreso>(PARAMS_PROGRESO);
  const [hitos, setHitos] = useState<Record<Escenario, Hito>>(HITOS_POR_DEFECTO);
  const [hidratado, setHidratado] = useState(false);

  // Recupera el estudio guardado en este navegador
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLAVE);
      if (raw) {
        const d = JSON.parse(raw) as Partial<Guardado>;
        if (Array.isArray(d.puntos)) setPuntos(d.puntos.filter(esPunto));
        if (d.params) setParams({ ...PARAMS_LOTEO_INICIALES, ...d.params });
        if (d.pp) setPp({ ...PARAMS_PROGRESO, ...d.pp });
        if (typeof d.escenario === "string" && ESCENARIOS.includes(d.escenario as Escenario)) {
          setEscenario(d.escenario as Escenario);
        }
        if (esNumero(d.anio)) setAnio(Math.min(Math.max(0, Math.round(d.anio)), PARAMS_PROGRESO.horizonte));
        if (d.hitos) {
          setHitos({
            pesimista: { ...HITOS_POR_DEFECTO.pesimista, ...d.hitos.pesimista },
            base: { ...HITOS_POR_DEFECTO.base, ...d.hitos.base },
            optimista: { ...HITOS_POR_DEFECTO.optimista, ...d.hitos.optimista },
          });
        }
      }
    } catch {
      // si el dato guardado está dañado, se empieza de cero
    }
    setHidratado(true);
  }, []);

  // Guarda cada cambio (solo después de haber recuperado lo anterior)
  useEffect(() => {
    if (!hidratado) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ puntos, params, anio, escenario, pp, hitos }));
    } catch {
      // almacenamiento lleno o bloqueado: la app sigue funcionando sin guardar
    }
  }, [hidratado, puntos, params, anio, escenario, pp, hitos]);

  const loteo = useMemo(() => generarLoteo(puntos, params), [puntos, params]);

  const series = useMemo(
    () => ({
      pesimista: simularProgreso(pp, hitos.pesimista),
      base: simularProgreso(pp, hitos.base),
      optimista: simularProgreso(pp, hitos.optimista),
    }),
    [pp, hitos]
  );

  const serieActiva = series[escenario];
  const estado = serieActiva[Math.min(Math.max(0, Math.round(anio)), serieActiva.length - 1)];

  const etapas = useMemo(() => (loteo ? etapasLotes(loteo.lotes, estado) : []), [loteo, estado]);
  const conteo = useMemo(() => (loteo ? conteoLotes(loteo.lotes, etapas) : null), [loteo, etapas]);

  const valor: Valor = {
    puntos, setPuntos, params, setParams, anio, setAnio, escenario, setEscenario,
    pp, setPp, hitos, setHitos, hidratado, loteo, series, estado, etapas, conteo,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}