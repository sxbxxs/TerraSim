"use client";
import { Dispatch, SetStateAction, useState } from "react";
import { Route, Loader2 } from "lucide-react";
import type { Punto } from "@/lib/geo";
import type { ParametrosLoteo, ResultadoLoteo } from "@/lib/lotes";
import { consultarViasOSM, ladosConCalle } from "@/lib/osm";

type Props = {
  puntos: Punto[];
  params: ParametrosLoteo;
  setParams: Dispatch<SetStateAction<ParametrosLoteo>>;
  loteo: ResultadoLoteo | null;
};

export default function CallesExistentes({ puntos, params, setParams, loteo }: Props) {
  const n = puntos.length;
  const [buscando, setBuscando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  if (n < 3) return null;

  const principal = ((params.ladoVia % n) + n) % n;
  const marcados = puntos.map((_, k) => (params.callesExistentes ? !!params.callesExistentes[k] : k === principal));

  const aplicar = (arr: boolean[]) =>
    setParams((p) => {
      const primero = arr.findIndex(Boolean);
      return { ...p, callesExistentes: arr, ladoVia: primero >= 0 ? primero : p.ladoVia };
    });

  const alternar = (k: number, valor: boolean) => {
    const arr = [...marcados];
    arr[k] = valor;
    aplicar(arr);
  };

  const detectar = async () => {
    setBuscando(true);
    setMensaje("");
    try {
      const vias = await consultarViasOSM(puntos);
      const arr = ladosConCalle(puntos, vias);
      aplicar(arr);
      const lados = arr.map((v, k) => (v ? k + 1 : 0)).filter(Boolean);
      setMensaje(
        vias.length === 0
          ? "OpenStreetMap no tiene calles registradas aquí. Márcalas a mano."
          : lados.length
            ? `Encontré calles en el lado ${lados.join(", ")}. Revisa y corrige si hace falta.`
            : "No encontré calles pegadas a ningún lado. Márcalas a mano si las hay."
      );
    } catch {
      setMensaje("No pude consultar OpenStreetMap (sin conexión o servicio ocupado). Marca los lados a mano.");
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Route size={18} className="text-emerald-600" />
        <h3 className="font-semibold text-slate-800">Calles que ya existen</h3>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Marca los lados del terreno que dan a una calle. Ahí no se crean calles nuevas, y las calles nuevas se abren hacia las que ya existen.
      </p>

      <div className="space-y-2">
        {puntos.map((_, k) => (
          <label key={k} className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={marcados[k]} onChange={(e) => alternar(k, e.target.checked)} />
            Lado {k + 1} (P{k + 1} → P{((k + 1) % n) + 1}) <span className="text-xs text-slate-400">· línea azul en el mapa</span>
          </label>
        ))}
      </div>

      <button
        onClick={detectar}
        disabled={buscando}
        className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {buscando && <Loader2 size={14} className="animate-spin" />}
        Detectar calles automáticamente
      </button>
      {mensaje && <p className="mt-2 text-xs text-slate-600">{mensaje}</p>}
      <p className="mt-2 text-[11px] text-slate-400">Datos de calles de OpenStreetMap (© colaboradores de OpenStreetMap).</p>

      {loteo && loteo.extremos > 0 && (
        <p className={`mt-3 rounded-lg p-2 text-xs ${loteo.conectados === loteo.extremos ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          Calles nuevas que desembocan en una calle existente: {loteo.conectados} de {loteo.extremos} puntas
          {loteo.conectados < loteo.extremos ? ". Las demás quedan sin salida; marca más lados si ahí hay calle." : "."}
        </p>
      )}
    </div>
  );
}