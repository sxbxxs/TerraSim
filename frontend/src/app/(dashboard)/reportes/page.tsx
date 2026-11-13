"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Reporte from "@/components/reporte/Reporte";
import PlanoLoteo from "@/components/reporte/PlanoLoteo";
import { useEstudio } from "@/lib/estudio-contexto";
import { useFinanzasGuardadas } from "@/lib/finanzas-guardadas";
import { armarReporte } from "@/lib/reporte";
import { PARAMS_SISMO } from "@/lib/sismo";
import { Candidato, leerCandidatosGuardados } from "@/lib/candidatos";
import { Comparable, leerComparablesGuardados, leerCostoConstruccionM2 } from "@/lib/ubicacion";

export default function Reportes() {
  const { loteo, puntos, series, pp, hitos, escenario, anio, params, etapas, estado, hidratado } = useEstudio();
  const fin = useFinanzasGuardadas();
  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [costoM2, setCostoM2] = useState<number | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);

  useEffect(() => {
    setComparables(leerComparablesGuardados());
    setCostoM2(leerCostoConstruccionM2());
    setCandidatos(leerCandidatosGuardados());
  }, []);

  const datos = useMemo(
    () =>
      loteo
        ? armarReporte({ puntos, loteo, series, pp, hitos, escenario, anio, fin, comparables, costoConstruccionM2: costoM2, sismo: PARAMS_SISMO, candidatos, paramsLoteo: params })
        : null,
    [loteo, puntos, series, pp, hitos, escenario, anio, fin, comparables, costoM2, candidatos, params]
  );

  // El nombre sugerido del PDF es el título de la página
  const imprimir = () => {
    const anterior = document.title;
    document.title = `TerraSim - Informe de terreno - ${new Date().toISOString().slice(0, 10)}`;
    window.print();
    setTimeout(() => {
      document.title = anterior;
    }, 1000);
  };

  if (!hidratado) return null;

  if (!loteo || !datos) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Primero necesitas un terreno</h2>
        <p className="mt-1 text-sm text-slate-500">El informe se arma con el terreno que dibujes en Estudio de terreno.</p>
        <Link href="/terreno" className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
          Ir a Estudio de terreno
        </Link>
      </div>
    );
  }

  return (
    <Reporte
      datos={datos}
      pp={pp}
      paramsLoteo={params}
      plano={<PlanoLoteo loteo={loteo} puntos={puntos} etapas={etapas} estado={estado} />}
      onImprimir={imprimir}
    />
  );
}