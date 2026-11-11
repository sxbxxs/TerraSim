"use client";
import { useState } from "react";
import { Activity, AlertTriangle, Dices, X } from "lucide-react";
import { ANIO_BASE } from "@/lib/progreso";
import {
  ESCENARIOS_SISMO, TipoConstruccion, probabilidadEnAnios, probabilidadesCasa,
} from "@/lib/sismo";
import type { EstadoSismo } from "@/components/terreno/useSismo";

const input =
  "w-full rounded-lg border px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";
const num = (n: number, d = 0) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(n);
const pct = (f: number) => `${num(f * 100, f < 0.1 ? 1 : 0)} %`;
const dinero = (n: number) =>
  `${n < 0 ? "−" : ""}${Math.abs(n) >= 1e9 ? `$${num(Math.abs(n) / 1e9, 2)} mil millones` : `$${num(Math.abs(n) / 1e6, Math.abs(n) >= 1e8 ? 0 : 1)} M`}`;

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-slate-500">{label}</span>
      {children}
    </label>
  );
}

type Props = { s: EstadoSismo; anio: number; hayLotes: boolean };

export default function PanelSismo({ s, anio, hayLotes }: Props) {
  const { params, setParams, evento, evaluacion } = s;
  const [escenario, setEscenario] = useState<string>("diseno");
  const [pgaPropia, setPgaPropia] = useState<string>("");

  const pgaDe = (id: string): number => {
    if (id === "diseno") return params.aa;
    if (id === "propio") return Number(pgaPropia) > 0 ? Number(pgaPropia) : 0;
    const e = ESCENARIOS_SISMO.find((x) => x.id === id);
    return e && "pga" in e ? e.pga : params.aa;
  };
  const nombreDe = (id: string) =>
    id === "propio" ? "Sismo propio" : ESCENARIOS_SISMO.find((x) => x.id === id)?.nombre ?? "Sismo";

  const pga = pgaDe(escenario);
  const pr = probabilidadesCasa(pga, params);
  const numeroCambio = (k: "aa" | "periodoRetorno" | "dispersion" | "razonDano" | "medianaVia" | "perdidaDanoPct" | "caidaSueloPct") =>
    (v: string) => setParams((p) => ({ ...p, [k]: Number.isFinite(Number(v)) ? Number(v) : 0 }));

  const casas = s.casasEnEvento;
  const pAlMenosUna = casas > 0 ? 1 - Math.pow(1 - pr.colapso, casas) : 0;

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Activity size={18} className="text-red-500" />
        <h3 className="font-semibold text-slate-800">Riesgo sísmico</h3>
      </div>

      <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
        Modelo simplificado: las curvas de daño son supuestos para calibrar con un estudio de vulnerabilidad local. Aa = 0,10 es el valor de Valledupar (zona baja); el de Aguachica consúltalo en la NSR-10 (Apéndice A-4) o en el Servicio Geológico Colombiano.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Aceleración de diseño Aa (g)">
          <input type="number" step="0.01" min={0} className={input} value={params.aa} onChange={(e) => numeroCambio("aa")(e.target.value)} />
        </Campo>
        <Campo label="Periodo de retorno (años)">
          <input type="number" min={1} className={input} value={params.periodoRetorno} onChange={(e) => numeroCambio("periodoRetorno")(e.target.value)} />
        </Campo>
        <div className="col-span-2">
          <Campo label="Tipo de construcción">
            <select className={input} value={params.tipo} onChange={(e) => setParams((p) => ({ ...p, tipo: e.target.value as TipoConstruccion }))}>
              <option value="formal">Con diseño y supervisión (NSR-10)</option>
              <option value="informal">Sin diseño (autoconstrucción)</option>
            </select>
          </Campo>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <p className="mb-2 text-sm font-medium text-slate-700">Probabilidad de un sismo igual o mayor al de diseño</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[5, 10, 20].map((a) => (
            <div key={a} className="rounded-lg bg-white p-2">
              <p className="text-lg font-bold text-slate-900">{pct(probabilidadEnAnios(params.periodoRetorno, a))}</p>
              <p className="text-xs text-slate-500">en {a} años</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          La NSR-10 diseña para un sismo con 10 % de probabilidad en 50 años (unos 475 años de retorno).
        </p>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-slate-700">Simular un terremoto</p>
        <div className="grid grid-cols-2 gap-2">
          {[...ESCENARIOS_SISMO.map((e) => e.id as string), "propio"].map((id) => (
            <button
              key={id}
              onClick={() => setEscenario(id)}
              className={`rounded-lg border px-2 py-2 text-left text-xs ${escenario === id ? "border-red-500 bg-red-50" : "hover:bg-slate-50"}`}
            >
              <span className="block font-medium text-slate-800">{id === "propio" ? "Otra aceleración" : nombreDe(id)}</span>
              <span className="text-slate-500">{id === "propio" ? "tú la escribes" : `${num(pgaDe(id), 2)} g`}</span>
            </button>
          ))}
        </div>
        {escenario === "propio" && (
          <div className="mt-2">
            <Campo label="Aceleración pico (g)">
              <input type="number" step="0.01" min={0} className={input} value={pgaPropia} onChange={(e) => setPgaPropia(e.target.value)} placeholder="Ej. 0.25" />
            </Campo>
          </div>
        )}

        <div className="mt-3 rounded-lg border p-3 text-xs text-slate-600">
          <p className="mb-1 font-medium text-slate-700">Con {num(pga, 2)} g, cada casa terminada tiene:</p>
          <p>Colapso: <b>{pct(pr.colapso)}</b> · Daño sin colapso: <b>{pct(pr.soloDano)}</b> · Sin daño: <b>{pct(pr.sinDano)}</b></p>
        </div>

        <button
          disabled={!hayLotes || pga <= 0}
          onClick={() => s.simular(pga, nombreDe(escenario))}
          className="mt-3 w-full rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40"
        >
          Simular terremoto en {ANIO_BASE + anio}
        </button>
        {!hayLotes && <p className="mt-1 text-xs text-slate-500">Dibuja un terreno para poder simular.</p>}
      </div>

      {evento && evaluacion && (
        <div className="mt-4 space-y-3 rounded-lg border border-red-200 bg-red-50/50 p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-slate-800">
              {evento.nombre}: {num(evento.pga, 2)} g en {ANIO_BASE + evento.anio}
            </p>
            <div className="flex gap-1">
              <button title="Volver a sortear" onClick={s.resortear} className="rounded-lg border bg-white p-1.5 text-slate-600 hover:bg-slate-50">
                <Dices size={14} />
              </button>
              <button title="Quitar el sismo" onClick={s.quitar} className="rounded-lg border bg-white p-1.5 text-slate-600 hover:bg-slate-50">
                <X size={14} />
              </button>
            </div>
          </div>

          {!s.visible && (
            <p className="flex gap-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Mueve el año de la simulación a {ANIO_BASE + evento.anio} o después para ver los daños en el mapa.
            </p>
          )}

          {evaluacion.casas === 0 ? (
            <p className="text-slate-600">En ese año todavía no hay casas terminadas, así que no hay nada que se pueda dañar. Avanza el año y vuelve a simular.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white p-2">
                  <p className="text-lg font-bold text-red-600">{evaluacion.destruidas}</p>
                  <p className="text-xs text-slate-500">destruidas</p>
                </div>
                <div className="rounded-lg bg-white p-2">
                  <p className="text-lg font-bold text-orange-500">{evaluacion.danadas}</p>
                  <p className="text-xs text-slate-500">dañadas</p>
                </div>
                <div className="rounded-lg bg-white p-2">
                  <p className="text-lg font-bold text-slate-800">{evaluacion.casas - evaluacion.destruidas - evaluacion.danadas}</p>
                  <p className="text-xs text-slate-500">sin daño</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Esperado por probabilidad: {num(evaluacion.casas * pr.colapso, 1)} destruidas y {num(evaluacion.casas * pr.soloDano, 1)} dañadas de {evaluacion.casas} casas. Probabilidad de que caiga al menos una: <b>{pct(pAlMenosUna)}</b>.
              </p>

              <dl className="space-y-1 text-xs">
                <div className="flex justify-between"><dt className="text-slate-500">Valor del proyecto antes</dt><dd className="font-medium">{dinero(evaluacion.valorAntes)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Pérdida en casas</dt><dd className="font-medium text-red-600">{dinero(-evaluacion.perdidaCasas)}</dd></div>
                {evaluacion.perdidaSuelo > 0 && (
                  <div className="flex justify-between"><dt className="text-slate-500">Caída del valor del suelo</dt><dd className="font-medium text-red-600">{dinero(-evaluacion.perdidaSuelo)}</dd></div>
                )}
                <div className="flex justify-between border-t pt-1"><dt className="text-slate-700">Valor después</dt><dd className="font-semibold">{dinero(evaluacion.valorDespues)} ({num(evaluacion.perdidaPct, 1)} % menos)</dd></div>
              </dl>
            </>
          )}

          <p className="text-xs text-slate-600">
            Calles: {s.tramosDanados} de {s.tramos} tramos agrietados (≈ {num(s.metrosDanados)} m).
          </p>
        </div>
      )}

      <details className="mt-4 text-xs">
        <summary className="cursor-pointer font-medium text-slate-700">Supuestos del modelo (editables)</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Campo label="Colapsa la mitad con (g): con diseño">
            <input type="number" step="0.05" className={input} value={params.medianaColapso.formal}
              onChange={(e) => setParams((p) => ({ ...p, medianaColapso: { ...p.medianaColapso, formal: Number(e.target.value) || 0 } }))} />
          </Campo>
          <Campo label="Colapsa la mitad con (g): sin diseño">
            <input type="number" step="0.05" className={input} value={params.medianaColapso.informal}
              onChange={(e) => setParams((p) => ({ ...p, medianaColapso: { ...p.medianaColapso, informal: Number(e.target.value) || 0 } }))} />
          </Campo>
          <Campo label="Dispersión β">
            <input type="number" step="0.05" min={0.1} className={input} value={params.dispersion} onChange={(e) => numeroCambio("dispersion")(e.target.value)} />
          </Campo>
          <Campo label="Daño empieza a (× colapso)">
            <input type="number" step="0.05" min={0.1} max={1} className={input} value={params.razonDano} onChange={(e) => numeroCambio("razonDano")(e.target.value)} />
          </Campo>
          <Campo label="Calle se agrieta a (g)">
            <input type="number" step="0.05" className={input} value={params.medianaVia} onChange={(e) => numeroCambio("medianaVia")(e.target.value)} />
          </Campo>
          <Campo label="Pérdida de casa dañada (%)">
            <input type="number" step="5" className={input} value={params.perdidaDanoPct} onChange={(e) => numeroCambio("perdidaDanoPct")(e.target.value)} />
          </Campo>
          <Campo label="Caída del valor del suelo (%)">
            <input type="number" step="1" className={input} value={params.caidaSueloPct} onChange={(e) => numeroCambio("caidaSueloPct")(e.target.value)} />
          </Campo>
        </div>
        <p className="mt-3 text-slate-500">
          Referencias de orden de magnitud: estudios de casas de mampostería confinada de un piso estiman cerca de 28 % de colapso ante un sismo moderado, y pérdidas del 30 % a 0,5 g en construcciones de diseño sísmico bajo. En Colombia la mayoría de las construcciones no se diseñan con la NSR-10.
        </p>
      </details>
    </div>
  );
}