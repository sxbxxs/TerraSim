"use client";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { Escenario } from "@/types";
import { ANIO_BASE } from "@/lib/progreso";

type Props = {
  anio: number;
  setAnio: Dispatch<SetStateAction<number>>;
  max: number;
  escenario: Escenario;
  setEscenario: (e: Escenario) => void;
};

const escenarios: { id: Escenario; label: string }[] = [
  { id: "pesimista", label: "Pesimista" },
  { id: "base", label: "Base" },
  { id: "optimista", label: "Optimista" },
];

export default function ControlesTimeLapse({ anio, setAnio, max, escenario, setEscenario }: Props) {
  const [reproduciendo, setReproduciendo] = useState(false);

  useEffect(() => {
    if (!reproduciendo) return;
    const id = setInterval(() => setAnio((a) => (a >= max ? a : a + 1)), 700);
    return () => clearInterval(id);
  }, [reproduciendo, max, setAnio]);

  useEffect(() => {
    if (reproduciendo && anio >= max) setReproduciendo(false);
  }, [anio, max, reproduciendo]);

  const alternar = () => {
    if (anio >= max) setAnio(0);
    setReproduciendo((r) => !r);
  };

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={alternar}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            {reproduciendo ? <Pause size={16} /> : <Play size={16} />}
            {reproduciendo ? "Pausar" : "Reproducir"}
          </button>
          <button
            title="Reiniciar"
            onClick={() => { setReproduciendo(false); setAnio(0); }}
            className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw size={16} />
          </button>
          <p className="ml-2 text-sm text-slate-700">
            Año de simulación: <b>{ANIO_BASE + anio}</b>
          </p>
        </div>

        <div className="flex overflow-hidden rounded-lg border text-sm">
          {escenarios.map((e) => (
            <button
              key={e.id}
              onClick={() => setEscenario(e.id)}
              className={`px-3 py-2 ${escenario === e.id ? "bg-emerald-600 text-white" : "hover:bg-slate-50"}`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <input
          type="range"
          min={0}
          max={max}
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          className="w-full accent-emerald-600"
        />
        <div className="flex justify-between text-xs text-slate-500">
          {[0, 5, 10, 15, 20].filter((a) => a <= max).map((a) => (
            <span key={a}>{ANIO_BASE + a}</span>
          ))}
        </div>
      </div>
    </div>
  );
}