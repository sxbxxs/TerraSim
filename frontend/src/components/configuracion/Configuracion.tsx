"use client";
import { useEffect, useRef, useState } from "react";
import { Database, Download, FileText, Info, Upload, Activity } from "lucide-react";
import { CENTRO_AGUACHICA, RADIO_KM } from "@/lib/geo";
import { SMMLV_2026, TOPE_VIP, TOPE_VIP_SMMLV, TOPE_VIS, TOPE_VIS_SMMLV } from "@/lib/financiero";
import { DATOS_INFORME_VACIOS, DatosInforme, guardarDatosInforme, leerDatosInforme } from "@/lib/perfil";
import { PARAMS_SISMO, ParametrosSismo, TipoConstruccion } from "@/lib/sismo";
import { guardarSismo, leerSismoGuardado } from "@/lib/sismo-guardado";
import { ResumenGrupo, armarRespaldo, aplicarRespaldo, borrarGrupo, borrarTodo, resumenGrupos, validarRespaldo } from "@/lib/respaldo";

const input = "w-full rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";
const num = (n: number, d = 0) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(n);

function Tarjeta({ icono, titulo, children }: { icono: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">{icono}{titulo}</h3>
      {children}
    </section>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const leerArchivo = (f: File) =>
  new Promise<string>((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result ?? ""));
    r.onerror = () => mal(new Error("No se pudo leer el archivo"));
    r.readAsText(f);
  });

function descargar(nombre: string, texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Props = { onRecargar?: () => void };

export default function Configuracion({ onRecargar = () => window.location.reload() }: Props) {
  const [listo, setListo] = useState(false);
  const [informe, setInforme] = useState<DatosInforme>(DATOS_INFORME_VACIOS);
  const [sismo, setSismo] = useState<ParametrosSismo>(PARAMS_SISMO);
  const [grupos, setGrupos] = useState<ResumenGrupo[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  const refrescar = () => {
    try {
      setGrupos(resumenGrupos(localStorage));
    } catch {
      setGrupos([]);
    }
  };

  useEffect(() => {
    setInforme(leerDatosInforme());
    setSismo(leerSismoGuardado());
    refrescar();
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    guardarDatosInforme(informe);
    refrescar();
  }, [listo, informe]);

  useEffect(() => {
    if (!listo) return;
    guardarSismo(sismo);
    refrescar();
  }, [listo, sismo]);

  const num_ = (k: keyof Omit<ParametrosSismo, "tipo" | "medianaColapso">) => (v: string) =>
    setSismo((p) => ({ ...p, [k]: Number.isFinite(Number(v)) && v !== "" ? Number(v) : 0 }));
  const aviso = (tipo: "ok" | "error", texto: string) => setMensaje({ tipo, texto });

  const exportar = () => {
    try {
      const r = armarRespaldo(localStorage);
      if (Object.keys(r.datos).length === 0) return aviso("error", "Todavía no hay datos guardados para copiar.");
      descargar(`terrasim-respaldo-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(r, null, 2));
      aviso("ok", `Copia descargada con ${Object.keys(r.datos).length} datos guardados. Guárdala en un lugar seguro o llévala a otro computador.`);
    } catch {
      aviso("error", "No se pudo crear la copia.");
    }
  };

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const v = validarRespaldo(await leerArchivo(f));
      if (!v.ok) return aviso("error", v.error);
      const n = aplicarRespaldo(localStorage, v.respaldo);
      aviso("ok", `Copia restaurada: ${n} conjunto${n === 1 ? "" : "s"} de datos. Recargando…${v.ignoradas.length ? ` (se ignoraron ${v.ignoradas.length} datos desconocidos)` : ""}`);
      setTimeout(onRecargar, 700);
    } catch {
      aviso("error", "No se pudo leer el archivo.");
    } finally {
      if (archivo.current) archivo.current.value = "";
    }
  };

  // los botones que borran piden confirmación con un segundo clic
  const borrar = (id: string) => {
    if (confirmando !== id) {
      setConfirmando(id);
      setTimeout(() => setConfirmando((c) => (c === id ? null : c)), 4000);
      return;
    }
    setConfirmando(null);
    try {
      if (id === "todo") borrarTodo(localStorage);
      else borrarGrupo(localStorage, id);
      aviso("ok", id === "todo" ? "Se borraron todos los datos de trabajo. Recargando…" : "Datos borrados. Recargando…");
      setTimeout(onRecargar, 700);
    } catch {
      aviso("error", "No se pudo borrar.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Configuración</h2>
        <p className="text-sm text-slate-500">Datos del informe, supuestos de riesgo sísmico y copia de seguridad de tu trabajo.</p>
      </div>

      <Tarjeta icono={<FileText size={18} className="text-emerald-600" />} titulo="Datos del informe">
        <p className="mb-3 text-xs text-slate-500">Aparecen en la primera hoja del informe en PDF.</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Campo label="Nombre del proyecto"><input className={input} maxLength={80} placeholder="Ej. Lotes Avenida Cielo" value={informe.proyecto} onChange={(e) => setInforme((p) => ({ ...p, proyecto: e.target.value }))} /></Campo>
          <Campo label="Preparado para (cliente o empresa)"><input className={input} maxLength={80} placeholder="Ej. Constructora Cesar" value={informe.organizacion} onChange={(e) => setInforme((p) => ({ ...p, organizacion: e.target.value }))} /></Campo>
          <Campo label="Preparado por"><input className={input} maxLength={80} placeholder="Tu nombre" value={informe.analista} onChange={(e) => setInforme((p) => ({ ...p, analista: e.target.value }))} /></Campo>
        </div>
      </Tarjeta>

      <Tarjeta icono={<Activity size={18} className="text-red-500" />} titulo="Supuestos de riesgo sísmico">
        <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          Aa = 0,10 es el valor de referencia de Valledupar (zona de amenaza baja). El de Aguachica debe consultarse en la NSR-10 (Apéndice A-4) o en el Servicio Geológico Colombiano. Las curvas de daño son supuestos para calibrar con un estudio de vulnerabilidad local. Estos valores los usan el panel de sismo y el informe.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Campo label="Aceleración de diseño Aa (g)"><input type="number" step="0.01" min={0} className={input} value={sismo.aa} onChange={(e) => num_("aa")(e.target.value)} /></Campo>
          <Campo label="Periodo de retorno (años)"><input type="number" min={1} className={input} value={sismo.periodoRetorno} onChange={(e) => num_("periodoRetorno")(e.target.value)} /></Campo>
          <div className="col-span-2">
            <Campo label="Tipo de construcción">
              <select className={input} value={sismo.tipo} onChange={(e) => setSismo((p) => ({ ...p, tipo: e.target.value as TipoConstruccion }))}>
                <option value="formal">Con diseño y supervisión (NSR-10)</option>
                <option value="informal">Sin diseño (autoconstrucción)</option>
              </select>
            </Campo>
          </div>
          <Campo label="Colapsa la mitad con (g): con diseño"><input type="number" step="0.05" className={input} value={sismo.medianaColapso.formal} onChange={(e) => setSismo((p) => ({ ...p, medianaColapso: { ...p.medianaColapso, formal: Number(e.target.value) || 0 } }))} /></Campo>
          <Campo label="Colapsa la mitad con (g): sin diseño"><input type="number" step="0.05" className={input} value={sismo.medianaColapso.informal} onChange={(e) => setSismo((p) => ({ ...p, medianaColapso: { ...p.medianaColapso, informal: Number(e.target.value) || 0 } }))} /></Campo>
          <Campo label="Dispersión β"><input type="number" step="0.05" min={0.1} className={input} value={sismo.dispersion} onChange={(e) => num_("dispersion")(e.target.value)} /></Campo>
          <Campo label="Daño empieza a (× colapso)"><input type="number" step="0.05" min={0.1} max={1} className={input} value={sismo.razonDano} onChange={(e) => num_("razonDano")(e.target.value)} /></Campo>
          <Campo label="Calle se agrieta a (g)"><input type="number" step="0.05" className={input} value={sismo.medianaVia} onChange={(e) => num_("medianaVia")(e.target.value)} /></Campo>
          <Campo label="Pérdida de casa dañada (%)"><input type="number" step="5" className={input} value={sismo.perdidaDanoPct} onChange={(e) => num_("perdidaDanoPct")(e.target.value)} /></Campo>
          <Campo label="Caída del valor del suelo (%)"><input type="number" step="1" className={input} value={sismo.caidaSueloPct} onChange={(e) => num_("caidaSueloPct")(e.target.value)} /></Campo>
        </div>
        <button onClick={() => setSismo(PARAMS_SISMO)} className="mt-3 rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">Volver a los valores de TerraSim</button>
      </Tarjeta>

      <Tarjeta icono={<Database size={18} className="text-blue-600" />} titulo="Datos guardados y copia de seguridad">
        <p className="mb-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
          Tu trabajo se guarda <b>solo en este navegador</b>. Si cambias de computador o borras los datos del navegador, se pierde. Descarga una copia para llevarlo a otro equipo o tenerlo de respaldo. La copia no incluye tu cuenta ni tu contraseña.
        </p>
        <ul className="divide-y rounded-lg border">
          {grupos.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{g.nombre}</p>
                <p className="text-xs text-slate-500">{g.descripcion}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${g.guardado ? "text-emerald-700" : "text-slate-400"}`}>{g.guardado ? `Guardado · ${num(Math.max(1, g.caracteres / 1000), 1)} KB` : "Vacío"}</span>
                <button disabled={!g.guardado} onClick={() => borrar(g.id)}
                  className={`rounded-lg border px-2.5 py-1 text-xs disabled:opacity-30 ${confirmando === g.id ? "border-red-500 bg-red-50 text-red-700" : "text-slate-600 hover:bg-slate-50"}`}>
                  {confirmando === g.id ? "¿Seguro? Pulsa otra vez" : "Borrar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={exportar} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"><Download size={14} /> Descargar copia de seguridad</button>
          <button onClick={() => archivo.current?.click()} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Upload size={14} /> Restaurar una copia</button>
          <input ref={archivo} type="file" accept=".json,application/json" className="hidden" onChange={importar} aria-label="Archivo de copia de seguridad" />
          <button onClick={() => borrar("todo")}
            className={`ml-auto rounded-lg border px-3 py-2 text-sm ${confirmando === "todo" ? "border-red-500 bg-red-50 text-red-700" : "text-slate-600 hover:bg-slate-50"}`}>
            {confirmando === "todo" ? "¿Seguro? Pulsa otra vez" : "Borrar todos los datos"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Al restaurar una copia se reemplazan los datos actuales por los de la copia.</p>
        {mensaje && (
          <p role="status" className={`mt-3 rounded-lg p-2 text-sm ${mensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{mensaje.texto}</p>
        )}
      </Tarjeta>

      <Tarjeta icono={<Info size={18} className="text-slate-500" />} titulo="Datos de referencia del sistema">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm md:grid-cols-2">
          <div><dt className="text-xs text-slate-500">Centro de Aguachica (aproximado)</dt><dd className="text-slate-800">{CENTRO_AGUACHICA.lat}, {CENTRO_AGUACHICA.lng}</dd></div>
          <div><dt className="text-xs text-slate-500">Radio del estudio</dt><dd className="text-slate-800">{RADIO_KM} km</dd></div>
          <div><dt className="text-xs text-slate-500">Salario mínimo 2026 (Decreto 1469 de 2025)</dt><dd className="text-slate-800">${num(SMMLV_2026)}</dd></div>
          <div><dt className="text-xs text-slate-500">Tope de vivienda de interés social</dt><dd className="text-slate-800">VIS {TOPE_VIS_SMMLV} SMMLV = ${num(TOPE_VIS)} · VIP {TOPE_VIP_SMMLV} SMMLV = ${num(TOPE_VIP)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Población: proyecciones del DANE (vía telencuestas.com). Amenaza sísmica: NSR-10. Calles: © colaboradores de OpenStreetMap. Mapa: Google Maps. TerraSim es una simulación: no es un avalúo ni asesoría financiera o legal. Verifica las normas vigentes y el POT de Aguachica.
        </p>
      </Tarjeta>
    </div>
  );
}