"use client";
import { useMemo, useState } from "react";
import { MapPin, Undo2, Trash2, LocateFixed, ZoomIn } from "lucide-react";
import MapaSelector, { Foco } from "@/components/map/MapaSelector";
import ControlesTimeLapse from "@/components/terreno/ControlesTimeLapse";
import PanelProgreso from "@/components/terreno/PanelProgreso";
import {
  CENTRO_AGUACHICA, RADIO_KM, Punto,
  areaM2, perimetroM, dentroDelRadio, parsearCoordenadas, distanciaM,
} from "@/lib/geo";
import { poblacionEn, tasaCrecimiento, FUENTE_POBLACION } from "@/data/poblacion";
import { generarLoteo, ParametrosLoteo } from "@/lib/lotes";
import { Escenario } from "@/types";
import {
  simularProgreso, etapasLotes, conteoLotes,
  HITOS_POR_DEFECTO, PARAMS_PROGRESO, EtapaLote, Hito, ParametrosProgreso,
} from "@/lib/progreso";

const input =
  "w-full rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";
const num = (n: number, d = 0) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(n);

const SIN_ETAPAS: EtapaLote[] = [];

const PARAMS_INICIALES: ParametrosLoteo = {
  frente: 6,
  fondo: 14,
  anchoVia: 8,
  anchoViaExistente: 10,
  cesionVerdePct: 10,
  ladoVia: 0,
};

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Fila({ k, v, destacado }: { k: string; v: string; destacado?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{k}</dt>
      <dd className={`font-medium ${destacado ? "text-emerald-600" : ""}`}>{v}</dd>
    </div>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-3 w-3 rounded-sm border" style={{ background: color }} /> {texto}
    </span>
  );
}

export default function EstudioTerreno() {
  const [texto, setTexto] = useState("");
  const [foco, setFoco] = useState<Foco>({ ...CENTRO_AGUACHICA, zoom: 13 });
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [aviso, setAviso] = useState("");
  const [params, setParams] = useState<ParametrosLoteo>(PARAMS_INICIALES);

  const [anio, setAnio] = useState(0);
  const [escenario, setEscenario] = useState<Escenario>("base");
  const [pp, setPp] = useState<ParametrosProgreso>(PARAMS_PROGRESO);
  const [hitos, setHitos] = useState<Record<Escenario, Hito>>(HITOS_POR_DEFECTO);

  const setP = (k: keyof ParametrosLoteo, v: number) =>
    setParams((p) => ({ ...p, [k]: Number.isFinite(v) ? v : 0 }));

  const ubicar = () => {
    const p = parsearCoordenadas(texto);
    if (!p) {
      setAviso("Formato inválido. Usa: 8.3084, -73.6162 (latitud, longitud).");
      return;
    }
    if (!dentroDelRadio(p)) {
      const km = distanciaM(p, CENTRO_AGUACHICA) / 1000;
      setAviso(`Ese punto está a ${km.toFixed(1)} km del centro. El estudio cubre solo ${RADIO_KM} km a la redonda de Aguachica.`);
      return;
    }
    setAviso("");
    setPuntos([]);
    setAnio(0);
    setFoco({ ...p, zoom: 18 });
  };

  const agregarPunto = (p: Punto) => {
    if (!dentroDelRadio(p)) {
      setAviso(`Punto fuera del radio de ${RADIO_KM} km de Aguachica.`);
      return;
    }
    setAviso("");
    setPuntos((prev) => [...prev, p]);
  };

  // Centra el mapa en el terreno con un zoom que lo deje a buen tamaño
  const acercar = () => {
    if (puntos.length < 3) return;
    const lats = puntos.map((q) => q.lat);
    const lngs = puntos.map((q) => q.lng);
    const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const cos = Math.cos((lat * Math.PI) / 180);
    const spanLat = (Math.max(...lats) - Math.min(...lats)) * 111320;
    const spanLng = (Math.max(...lngs) - Math.min(...lngs)) * 111320 * cos;
    const span = Math.max(spanLat, spanLng, 30);
    const zoom = Math.floor(Math.log2((156543.03 * cos * 450) / span));
    setFoco({ lat, lng, zoom: Math.min(20, Math.max(15, zoom)) });
  };

  const loteo = useMemo(() => generarLoteo(puntos, params), [puntos, params]);

  const series = useMemo(
    () => ({
      pesimista: simularProgreso(pp, hitos.pesimista),
      base: simularProgreso(pp, hitos.base),
      optimista: simularProgreso(pp, hitos.optimista),
    }),
    [pp, hitos]
  );
  const estado = series[escenario][anio];
  const etapas = useMemo(
    () => (loteo ? etapasLotes(loteo.lotes, estado) : SIN_ETAPAS),
    [loteo, estado]
  );
  const conteo = loteo ? conteoLotes(loteo.lotes, etapas) : null;

  const area = areaM2(puntos);
  const perimetro = perimetroM(puntos);
  const poblacion2026 = poblacionEn(2026).valor;
  const poblacion2036 = poblacionEn(2036).valor;
  const crecimiento = tasaCrecimiento(2026, 2036) * 100;

  const n = puntos.length;
  const ladoSel = n >= 3 ? params.ladoVia % n : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <div className="flex gap-2">
          <input
            className={input}
            placeholder="Coordenadas del sector: 8.3084, -73.6162"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ubicar()}
          />
          <button
            onClick={ubicar}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <LocateFixed size={18} /> Ubicar
          </button>
        </div>

        {aviso && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{aviso}</p>}

        <div className="h-[560px] overflow-hidden rounded-xl border shadow-sm">
          <MapaSelector
            foco={foco}
            puntos={puntos}
            loteo={loteo}
            etapas={etapas}
            estado={estado}
            ladoVia={ladoSel}
            onClickMapa={agregarPunto}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>Clic en el mapa para marcar cada esquina (mínimo 3).</span>
          <Leyenda color="#e2e8f0" texto="Lote vacío" />
          <Leyenda color="#9ca3af" texto="Cimentación" />
          <Leyenda color="#c2763b" texto="Estructura" />
          <Leyenda color="#d9573f" texto="Casa terminada" />
          <Leyenda color="#4ade80" texto="Parque" />
          <Leyenda color="#b8956a" texto="Vía sin pavimentar" />
          <Leyenda color="#4b5563" texto="Vía pavimentada" />
        </div>

        {loteo && conteo && (
          <>
            <ControlesTimeLapse
              anio={anio}
              setAnio={setAnio}
              max={pp.horizonte}
              escenario={escenario}
              setEscenario={setEscenario}
            />
            <PanelProgreso
              series={series}
              escenario={escenario}
              anio={anio}
              areaBruta={loteo.areaBruta}
              conteo={conteo}
              hitos={hitos}
              onHitos={setHitos}
              pp={pp}
              onPp={setPp}
            />
          </>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Terreno dibujado</h3>
            <div className="flex gap-2">
              <button
                title="Acercar al terreno"
                onClick={acercar}
                disabled={n < 3}
                className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ZoomIn size={16} />
              </button>
              <button
                title="Deshacer último punto"
                onClick={() => setPuntos((p) => p.slice(0, -1))}
                disabled={!puntos.length}
                className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <Undo2 size={16} />
              </button>
              <button
                title="Borrar todo"
                onClick={() => { setPuntos([]); setAnio(0); }}
                disabled={!puntos.length}
                className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <dl className="space-y-2 text-sm">
            <Fila k="Vértices" v={String(n)} />
            <Fila k="Área" v={n >= 3 ? `${num(area)} m²` : "—"} />
            <Fila k="Hectáreas" v={n >= 3 ? num(area / 10000, 3) : "—"} />
            <Fila k="Perímetro" v={n >= 2 ? `${num(perimetro)} m` : "—"} />
            {n > 0 && <Fila k="Distancia al centro" v={`${num(distanciaM(puntos[0], CENTRO_AGUACHICA) / 1000, 2)} km`} />}
          </dl>

          {n < 3 && (
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <MapPin size={14} /> Marca al menos 3 puntos para calcular el área.
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-1 font-semibold text-slate-800">Parámetros de loteo</h3>
          <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
            Valores de ejemplo. Reemplazar con la norma del POT de Aguachica (certificado de uso del suelo).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Frente del lote (m)">
              <input type="number" min={1} step="0.5" className={input} value={params.frente}
                onChange={(e) => setP("frente", Number(e.target.value))} />
            </Campo>
            <Campo label="Fondo del lote (m)">
              <input type="number" min={1} step="0.5" className={input} value={params.fondo}
                onChange={(e) => setP("fondo", Number(e.target.value))} />
            </Campo>
            <Campo label="Ancho de vía interna (m)">
              <input type="number" min={0} step="0.5" className={input} value={params.anchoVia}
                onChange={(e) => setP("anchoVia", Number(e.target.value))} />
            </Campo>
            <Campo label="Ancho de vía existente (m)">
              <input type="number" min={0} step="0.5" className={input} value={params.anchoViaExistente}
                onChange={(e) => setP("anchoViaExistente", Number(e.target.value))} />
            </Campo>
            <Campo label="Cesión verde (%)">
              <input type="number" min={0} max={100} step="1" className={input} value={params.cesionVerdePct}
                onChange={(e) => setP("cesionVerdePct", Number(e.target.value))} />
            </Campo>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Área de cada lote: {num(params.frente * params.fondo)} m²
          </p>

          {n >= 3 && (
            <div className="mt-3">
              <Campo label="Lado que da a la vía existente (línea azul)">
                <select className={input} value={ladoSel} onChange={(e) => setP("ladoVia", Number(e.target.value))}>
                  {puntos.map((_, i) => (
                    <option key={i} value={i}>
                      Lado {i + 1} (P{i + 1} → P{((i + 1) % n) + 1})
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          )}
        </div>

        {loteo && (
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-slate-800">Resultado del loteo</h3>
            <dl className="space-y-2 text-sm">
              <Fila k="Lotes vendibles" v={num(loteo.nLotes)} destacado />
              <Fila k="Área vendible" v={`${num(loteo.areaVendible)} m²`} />
              <Fila k="Zonas verdes" v={`${num(loteo.areaVerde)} m² (${loteo.nVerdes} lotes)`} />
              <Fila k="Vías y sobrantes" v={`${num(loteo.areaVias)} m²`} />
              <Fila k="Aprovechamiento" v={`${num(loteo.eficiencia, 1)} %`} destacado />
            </dl>
            {!loteo.cumpleVerde && (
              <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                No alcanza la cesión verde requerida ({num(loteo.areaVerdeRequerida)} m²). El terreno es muy pequeño para esos parámetros.
              </p>
            )}
            {loteo.nLotes === 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                No cabe ningún lote. Revisa el lado de la vía o reduce el frente y el fondo.
              </p>
            )}
          </div>
        )}

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-800">Población de Aguachica</h3>
          <dl className="space-y-2 text-sm">
            <Fila k="2026" v={`${num(poblacion2026)} hab.`} />
            <Fila k="2036" v={`${num(poblacion2036)} hab.`} />
            <Fila k="Crecimiento anual" v={`${num(crecimiento, 2)}%`} destacado />
          </dl>
          <p className="mt-3 text-xs text-slate-500">{FUENTE_POBLACION} Dato municipal, no del sector.</p>
        </div>
      </div>
    </div>
  );
}