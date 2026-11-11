"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Users, Home, DollarSign, TrendingUp, MapPin } from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import MapaSelector, { Foco } from "@/components/map/MapaSelector";
import ControlesTimeLapse from "@/components/terreno/ControlesTimeLapse";
import {
  ResumenEstudio, SelectorEscenario, DistribucionTerreno,
  GraficaEscenarios, AlertasEstudio, num, cop, copM,
} from "@/components/dashboard/PanelesEstudio";
import { useEstudio, focoDePuntos } from "@/lib/estudio-contexto";
import { poblacionEn } from "@/data/poblacion";
import { ANIO_BASE } from "@/lib/progreso";
import { CENTRO_AGUACHICA } from "@/lib/geo";

const ETIQUETA = { pesimista: "pesimista", base: "base", optimista: "optimista" } as const;

export default function VistaGeneral() {
  const {
    puntos, params, anio, setAnio, escenario, setEscenario,
    pp, loteo, estado, etapas, conteo,
  } = useEstudio();

  const foco: Foco = useMemo(
    () => focoDePuntos(puntos) ?? { ...CENTRO_AGUACHICA, zoom: 13 },
    [puntos]
  );

  const anioSim = ANIO_BASE + anio;
  const pob = poblacionEn(anioSim);
  const pobAntes = poblacionEn(anioSim - 1).valor;
  const crecPob = (pob.valor / pobAntes - 1) * 100;
  const plusvalia = (estado.valorM2 / pp.valorInicial - 1) * 100;
  const n = puntos.length;
  const ladoSel = n >= 3 ? params.ladoVia % n : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Población de Aguachica ${anioSim}${pob.estimado ? " (est.)" : ""}`}
          value={num(pob.valor)}
          delta={`+${num(crecPob, 2)} % anual`}
          icon={Users}
        />
        <KpiCard
          title="Lotes vendibles"
          value={loteo ? num(loteo.nLotes) : "—"}
          delta={conteo ? `${conteo.casas} casas construidas` : "Dibuja un terreno"}
          positive={!!loteo}
          icon={Home}
        />
        <KpiCard
          title={`Valor por m² (${ETIQUETA[escenario]})`}
          value={cop(estado.valorM2)}
          delta={`Plusvalía ${plusvalia >= 0 ? "+" : ""}${num(plusvalia, 1)} %`}
          icon={DollarSign}
        />
        <KpiCard
          title="Valor de los lotes"
          value={loteo ? copM(estado.valorM2 * loteo.areaVendible) : "—"}
          delta={loteo ? `${num(loteo.areaVendible)} m² vendibles` : "Dibuja un terreno"}
          positive={!!loteo}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="relative h-[460px] overflow-hidden rounded-xl border shadow-sm">
            <MapaSelector
              soloLectura
              foco={foco}
              puntos={puntos}
              loteo={loteo}
              etapas={etapas}
              estado={estado}
              ladoVia={ladoSel}
              onClickMapa={() => {}}
            />
            {!loteo && (
              <div className="absolute inset-x-0 top-4 z-10 mx-auto w-80 rounded-xl bg-white/95 p-4 text-center shadow-lg">
                <MapPin size={22} className="mx-auto mb-1 text-emerald-600" />
                <p className="text-sm font-semibold text-slate-800">Aún no hay un terreno estudiado</p>
                <p className="mt-1 text-xs text-slate-500">
                  Dibuja un terreno en Aguachica para ver aquí su loteo, la construcción y el valor de los lotes.
                </p>
                <Link
                  href="/terreno"
                  className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Ir a Estudio de terreno
                </Link>
              </div>
            )}
          </div>

          <ControlesTimeLapse
            anio={anio}
            setAnio={setAnio}
            max={pp.horizonte}
            escenario={escenario}
            setEscenario={setEscenario}
          />
        </div>

        <div className="space-y-6">
          <ResumenEstudio />
          <DistribucionTerreno />
          <GraficaEscenarios />
          <SelectorEscenario />
          <AlertasEstudio />
        </div>
      </div>
    </div>
  );
}