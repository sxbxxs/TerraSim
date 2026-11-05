"use client";
import { Escenario, ParametrosSimulacion, Factor } from "@/types";

type Props = {
  params: ParametrosSimulacion;
  escenario: Escenario;
  onChange: (p: ParametrosSimulacion) => void;
  onEscenario: (e: Escenario) => void;
  sectores: ParametrosSimulacion[];
  onSector: (nombre: string) => void;
};

const input =
  "w-full rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default function FormularioSimulador({
  params, escenario, onChange, onEscenario, sectores, onSector,
}: Props) {
  const set = <K extends keyof ParametrosSimulacion>(k: K, v: ParametrosSimulacion[K]) =>
    onChange({ ...params, [k]: v });

  const setFactor = (
    k: "infraestructura" | "usoSuelo" | "caracteristicas",
    campo: keyof Factor,
    v: number | boolean
  ) => onChange({ ...params, [k]: { ...params[k], [campo]: v } });

  const factores = [
    ["infraestructura", "Infraestructura"],
    ["usoSuelo", "Uso del suelo"],
    ["caracteristicas", "Características físicas"],
  ] as const;

  return (
    <div className="space-y-5 rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-800">Parámetros del estudio</h3>

      <Campo label="Sector">
        <select className={input} value={params.sector} onChange={(e) => onSector(e.target.value)}>
          {sectores.map((s) => (
            <option key={s.sector}>{s.sector}</option>
          ))}
        </select>
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Precio inicial (COP/m²)">
          <input type="number" className={input} value={params.valorInicial}
            onChange={(e) => set("valorInicial", Number(e.target.value))} />
        </Campo>
        <Campo label="Área (m²)">
          <input type="number" className={input} value={params.areaM2}
            onChange={(e) => set("areaM2", Number(e.target.value))} />
        </Campo>
        <Campo label="Tasa base anual (%)">
          <input type="number" step="0.1" className={input} value={+(params.tasaBase * 100).toFixed(2)}
            onChange={(e) => set("tasaBase", Number(e.target.value) / 100)} />
        </Campo>
        <Campo label="Plazo">
          <select className={input} value={params.horizonte}
            onChange={(e) => set("horizonte", Number(e.target.value))}>
            <option value={3}>Corto (3 años)</option>
            <option value={10}>Mediano (10 años)</option>
            <option value={20}>Largo (20 años)</option>
          </select>
        </Campo>
      </div>

      <div>
        <p className="mb-2 text-sm text-slate-500">Escenario</p>
        <div className="grid grid-cols-3 gap-2">
          {(["pesimista", "base", "optimista"] as Escenario[]).map((e) => (
            <button key={e} onClick={() => onEscenario(e)}
              className={`rounded-lg border py-2 text-sm capitalize ${
                escenario === e ? "border-emerald-600 bg-emerald-600 text-white" : "hover:bg-slate-50"
              }`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-slate-500">Factores del entorno</p>
        {factores.map(([k, nombre]) => (
          <div key={k} className="rounded-lg border p-3 text-sm">
            <label className="mb-2 flex items-center gap-2 font-medium text-slate-700">
              <input type="checkbox" checked={params[k].activo}
                onChange={(e) => setFactor(k, "activo", e.target.checked)} />
              {nombre}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Se activa en el año">
                <input type="number" min={0} className={input} value={params[k].anioActivacion}
                  onChange={(e) => setFactor(k, "anioActivacion", Number(e.target.value))} />
              </Campo>
              <Campo label="Efecto anual (%)">
                <input type="number" step="0.5" className={input} value={+(params[k].peso * 100).toFixed(2)}
                  onChange={(e) => setFactor(k, "peso", Number(e.target.value) / 100)} />
              </Campo>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}