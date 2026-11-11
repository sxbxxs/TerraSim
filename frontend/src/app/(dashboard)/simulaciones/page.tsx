"use client";
import { useMemo, useState } from "react";
import FormularioSimulador from "@/components/simulador/FormularioSimulador";
import ResultadosSimulador from "@/components/simulador/ResultadosSimulador";
import { sectores } from "@/data/sectores";
import { simular } from "@/lib/simulador";
import { Escenario, ParametrosSimulacion } from "@/types";

export default function Simulaciones() {
  const [params, setParams] = useState<ParametrosSimulacion>(sectores[0]);
  const [escenario, setEscenario] = useState<Escenario>("base");

  const resultado = useMemo(() => simular(params, escenario), [params, escenario]);

  const cambiarSector = (nombre: string) => {
    const s = sectores.find((x) => x.sector === nombre);
    if (s) setParams({ ...s, horizonte: params.horizonte });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="xl:col-span-1">
        <FormularioSimulador
          params={params}
          escenario={escenario}
          onChange={setParams}
          onEscenario={setEscenario}
          sectores={sectores}
          onSector={cambiarSector}
        />
      </div>
      <div className="xl:col-span-2">
        <ResultadosSimulador r={resultado} />
      </div>
    </div>
  );
}