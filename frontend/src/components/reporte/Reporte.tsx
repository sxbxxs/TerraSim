"use client";
import type { ReactNode } from "react";
import type { ParametrosLoteo } from "@/lib/lotes";
import { ANIO_BASE, ParametrosProgreso } from "@/lib/progreso";
import { TOPE_VIP, TOPE_VIS, TOPE_VIP_SMMLV, TOPE_VIS_SMMLV, SMMLV_2026 } from "@/lib/financiero";
import { DatosReporte, ESCENARIOS, ETIQUETA_ESCENARIO, ETIQUETA_ESTRATEGIA } from "@/lib/reporte";
import type { Escenario } from "@/types";
import PlanoComparacion from "@/components/reporte/PlanoComparacion";
import { COLORES, IdCandidato } from "@/lib/candidatos";
import { ESC, Evaluado } from "@/lib/comparador";

const num = (n: number, d = 0) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(n);
const cop = (n: number) => `$${num(n)}`;
const mm = (n: number) => {
  const a = Math.abs(n);
  const t = a >= 1e9 ? `$${num(a / 1e9, 2)} mil millones` : `$${num(a / 1e6, a >= 1e8 ? 0 : 1)} M`;
  return n < 0 ? `−${t}` : t;
};
const pct = (f: number, d = 1) => `${num(f * 100, d)} %`;
const rango = (a: number, b: number) => (Math.abs(a - b) < 0.05 ? num(a, 1) : `${num(a, 1)}–${num(b, 1)}`);
const corto = (t: string, n = 24) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const COLOR: Record<Escenario, string> = { pesimista: "#ef4444", base: "#2563eb", optimista: "#059669" };

const CSS = `
.rp{font-family:inherit;color:#0f172a;font-size:11.5px;line-height:1.45}
.rp *{box-sizing:border-box}
.rp-barra{max-width:820px;margin:0 auto 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:12px 16px}
.rp-barra button{background:#059669;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:600;font-size:13px;cursor:pointer}
.rp-barra button:hover{background:#10b981}
.rp-hoja{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:26px 30px;margin:0 auto 18px;max-width:820px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.rp-enc{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #059669;padding-bottom:10px;margin-bottom:12px}
.rp-marca{display:flex;align-items:center;gap:10px}
.rp-marca img{width:44px;height:44px}
.rp-marca b{font-size:20px;display:block;line-height:1.1}
.rp-marca span{color:#64748b;font-size:11px}
.rp-der{text-align:right;color:#475569;font-size:10.5px}
.rp h2{font-size:14px;margin:14px 0 6px;color:#065f46;border-bottom:1px solid #d1fae5;padding-bottom:3px}
.rp h3{font-size:12px;margin:10px 0 4px}
.rp-titulo{font-size:19px;font-weight:700;margin:4px 0 8px}
.rp-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.rp-kpi{border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;background:#f8fafc}
.rp-kpi b{display:block;font-size:15px}
.rp-kpi span{color:#64748b;font-size:10px}
.rp table{width:100%;border-collapse:collapse;font-size:10.5px}
.rp th{background:#ecfdf5;text-align:left;padding:4px 6px;border:1px solid #d1fae5}
.rp td{padding:4px 6px;border:1px solid #e2e8f0;vertical-align:top}
.rp td.n,.rp th.n{text-align:right}
.rp-aviso{border-left:4px solid #f59e0b;background:#fffbeb;padding:6px 10px;margin:8px 0;font-size:10.5px}
.rp-aviso.rojo{border-color:#dc2626;background:#fef2f2}
.rp-ley{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:9.5px;color:#475569;margin-top:6px}
.rp-ley i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px;border:1px solid #94a3b8}
.rp-dos{display:grid;grid-template-columns:1.25fr 1fr;gap:12px}
.rp-tres{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.rp-pie{margin-top:10px;font-size:9.5px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:6px}
.rp ul{margin:4px 0 4px 16px;padding:0}
.rp li{margin:1px 0}
.rp-compacta td,.rp-compacta th{padding:2px 6px}
@page{size:A4;margin:12mm 12mm 14mm}
@media print{
  html,body{height:auto !important;overflow:visible !important;background:#fff !important}
  div:has(> aside),div:has(> header){display:block !important;height:auto !important;overflow:visible !important}
  aside,header{display:none !important}
  main{overflow:visible !important;height:auto !important;padding:0 !important}
  .rp-barra{display:none !important}
  .rp-hoja{border:none;box-shadow:none;border-radius:0;padding:0;margin:0;max-width:none;break-after:page;page-break-after:always}
  .rp-hoja:last-child{break-after:auto;page-break-after:auto}
  .rp{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;

// Gráfica del valor del suelo por m² en los 20 años, dibujada en SVG
function Grafica({ curvas }: { curvas: Record<Escenario, number[]> }) {
  const W = 680, H = 230, ml = 50, mr = 12, mt = 14, mb = 30;
  const n = curvas.base.length;
  const max = Math.max(...ESCENARIOS.flatMap((e) => curvas[e]));
  const techo = Math.ceil(max / 1e6) * 1e6;
  const x = (i: number) => ml + (i / (n - 1)) * (W - ml - mr);
  const y = (v: number) => mt + (1 - v / techo) * (H - mt - mb);
  const pasos = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Valor del suelo por m² en 20 años">
      {Array.from({ length: pasos + 1 }, (_, k) => {
        const v = (techo / pasos) * k;
        return (
          <g key={k}>
            <line x1={ml} x2={W - mr} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={ml - 6} y={y(v) + 3} fontSize={9} textAnchor="end" fill="#64748b">{num(v / 1e6, 1)} M</text>
          </g>
        );
      })}
      {[0, 5, 10, 15, 20].filter((a) => a < n).map((a) => (
        <text key={a} x={x(a)} y={H - 12} fontSize={9} textAnchor="middle" fill="#64748b">{ANIO_BASE + a}</text>
      ))}
      {ESCENARIOS.map((e) => (
        <polyline key={e} fill="none" stroke={COLOR[e]} strokeWidth={2.4} points={curvas[e].map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} />
      ))}
      {ESCENARIOS.map((e, k) => (
        <g key={`l${e}`} transform={`translate(${ml + 8 + k * 110} ${mt + 2})`}>
          <rect width={14} height={4} y={3} fill={COLOR[e]} />
          <text x={19} y={9} fontSize={10} fill="#0f172a">{ETIQUETA_ESCENARIO[e]}</text>
        </g>
      ))}
    </svg>
  );
}

type Props = {
  datos: DatosReporte;
  pp: ParametrosProgreso;
  paramsLoteo: ParametrosLoteo;
  plano: ReactNode;
  onImprimir?: () => void;
};

function Encabezado({ d, titulo, detalle }: { d: DatosReporte; titulo: string; detalle?: boolean }) {
  return (
    <div className="rp-enc">
      <div className="rp-marca">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icono.png" alt="" />
        <div>
          <b>TerraSim</b>
          <span>{titulo}</span>
        </div>
      </div>
      <div className="rp-der">
        {detalle && d.datosInforme?.proyecto && <div style={{ fontWeight: 600, color: "#0f172a" }}>{d.datosInforme.proyecto}</div>}
        {detalle && d.datosInforme?.organizacion && <div>Para: {d.datosInforme.organizacion}</div>}
        {detalle && d.datosInforme?.analista && <div>Preparó: {d.datosInforme.analista}</div>}
        <div>{d.fecha}</div>
        <div>Aguachica, Cesar</div>
      </div>
    </div>
  );
}

export default function Reporte({ datos: d, pp, paramsLoteo, plano, onImprimir }: Props) {
  const f = d.financiero;
  const resultados = f.resultados;
  const equilibrio = (fe: number | null) => (fe === null ? "—" : fe <= 1 ? `los precios pueden bajar ${num((1 - fe) * 100, 0)} %` : `los precios deben subir ${num((fe - 1) * 100, 0)} %`);
  const sm = d.sismo;

  return (
    <div className="rp">
      <style>{CSS}</style>

      <div className="rp-barra">
        <div>
          <b>Informe listo para guardar como PDF</b>
          <div style={{ fontSize: 11, color: "#047857" }}>En la ventana que se abre elige «Guardar como PDF» y desactiva «Encabezados y pies de página».</div>
        </div>
        <button onClick={onImprimir}>Descargar PDF</button>
      </div>

      {/* ---------- Hoja 1: resumen y plano ---------- */}
      <section className="rp-hoja">
        <Encabezado d={d} titulo="Informe de prefactibilidad de terreno" detalle />
        <div className="rp-titulo">Estudio de terreno de {num(d.terreno.hectareas, 2)} ha ({num(d.terreno.areaM2)} m²)</div>
        <div className="rp-kpis">
          <div className="rp-kpi"><span>Lotes vendibles</span><b>{num(d.loteo.nLotes)}</b></div>
          <div className="rp-kpi"><span>Medidas (frente × fondo)</span><b>{rango(d.loteo.anchoMin, d.loteo.anchoMax)} × {rango(d.loteo.largoMin, d.loteo.largoMax)} m</b></div>
          <div className="rp-kpi"><span>Aprovechamiento del terreno</span><b>{num(d.loteo.eficiencia, 1)} %</b></div>
          <div className="rp-kpi"><span>Valor del suelo por m² ({d.anioCalendario}, {ETIQUETA_ESCENARIO[d.escenario].toLowerCase()})</span><b>{cop(d.estado.valorM2)}</b></div>
          <div className="rp-kpi"><span>Valor del terreno ({d.anioCalendario})</span><b>{mm(d.estado.valorTerreno)}</b></div>
          <div className="rp-kpi"><span>Casas terminadas en {d.anioCalendario}</span><b>{d.estado.casas} de {d.loteo.nLotes}</b></div>
        </div>

        <h2>Plano del loteo · {d.anioCalendario} · escenario {ETIQUETA_ESCENARIO[d.escenario].toLowerCase()}</h2>
        {plano}
        <div className="rp-ley">
          <span><i style={{ background: "#f1f5f9" }} />Lote vacío</span>
          <span><i style={{ background: "#9ca3af" }} />Cimentación</span>
          <span><i style={{ background: "#c2763b" }} />Estructura</span>
          <span><i style={{ background: "#d4d7dc" }} />Casa terminada</span>
          <span><i style={{ background: "#86efac" }} />Parque</span>
          <span><i style={{ background: "#d9c7a4" }} />Vía sin pavimentar</span>
          <span><i style={{ background: "#4b5563" }} />Vía pavimentada</span>
        </div>
        <ul>
          <li>Terreno a {num(d.terreno.distanciaCentroKm, 2)} km del centro (referencia aproximada), perímetro de {num(d.terreno.perimetroM)} m. El estudio cubre un radio de 5 km de Aguachica.</li>
          <li>{d.loteo.nLotes} lotes vendibles de {num(d.loteo.areaPromedio)} m² en promedio y {d.loteo.nVerdes} para zona verde ({num(d.loteo.areaVerde)} m²); vías y sobrantes: {num(d.loteo.areaVias)} m².</li>
          {d.loteo.extremos > 0 && <li>Calles nuevas que desembocan en una calle existente: {d.loteo.conectados} de {d.loteo.extremos} puntas.</li>}
          {d.loteo.proporcional && <li>Se usaron lotes más anchos y menos profundos para sacar más lotes conservando el área mínima.</li>}
        </ul>
      </section>

      {/* ---------- Hoja 2: evolución a 20 años ---------- */}
      <section className="rp-hoja">
        <Encabezado d={d} titulo="Evolución del sector a 20 años" />
        <h2>Valor del suelo por m² según el escenario</h2>
        <Grafica curvas={d.curvas} />
        <h2>Valor y construcción en el tiempo</h2>
        <table>
          <thead>
            <tr>
              <th>Año</th>
              {ESCENARIOS.map((e) => <th key={e} className="n">{ETIQUETA_ESCENARIO[e]}</th>)}
            </tr>
          </thead>
          <tbody>
            {d.escenarios[0].filas.map((fila, i) => (
              <tr key={fila.anio}>
                <td>{ANIO_BASE + fila.anio}</td>
                {d.escenarios.map((e) => (
                  <td key={e.id} className="n">{cop(e.filas[i].valorM2)} · {num(e.filas[i].ocupacionPct, 0)} % construido</td>
                ))}
              </tr>
            ))}
            <tr>
              <td><b>A 20 años</b></td>
              {d.escenarios.map((e) => (
                <td key={e.id} className="n"><b>{e.plusvaliaPct >= 0 ? "+" : ""}{num(e.plusvaliaPct, 0)} %</b> ({num(e.tasaAnualPct, 1)} % anual)</td>
              ))}
            </tr>
          </tbody>
        </table>

        <h2>¿Cuándo llega cada mejora?</h2>
        <table>
          <thead>
            <tr><th>Mejora</th>{ESCENARIOS.map((e) => <th key={e} className="n">{ETIQUETA_ESCENARIO[e]}</th>)}</tr>
          </thead>
          <tbody>
            {([["Vía pavimentada", "via"], ["Servicios públicos", "servicios"], ["Parque", "parque"], ["Uso del suelo", "usoSuelo"]] as const).map(([nombre, k]) => (
              <tr key={k}>
                <td>{nombre}</td>
                {ESCENARIOS.map((e) => <td key={e} className="n">{d.hitos[e][k] >= 99 ? "no llega" : ANIO_BASE + d.hitos[e][k]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="rp-aviso">
          El valor sigue el modelo de valorización de TerraSim (dV/dt = tasa·V, traducido de Simulink y validado contra MATLAB). Cada mejora que llega sube la tasa de valorización; los años de llegada de cada escenario son supuestos que deben contrastarse con los planes de obra de la alcaldía. Los valores son nominales (sin descontar inflación).
        </div>
      </section>

      {/* ---------- Hoja 3: análisis financiero ---------- */}
      <section className="rp-hoja">
        <Encabezado d={d} titulo="Análisis financiero" />
        <div className="rp-titulo" style={{ fontSize: 15 }}>{ETIQUETA_ESTRATEGIA[f.estrategia]} · horizonte de {f.horizonte} años</div>

        {f.esEjemplo && (
          <div className="rp-aviso rojo"><b>Este informe usa valores de ejemplo de TerraSim</b> para los costos y los precios de lote. No son datos de mercado: reemplázalos con cotizaciones reales antes de tomar decisiones.</div>
        )}

        {!resultados ? (
          <div className="rp-aviso">
            <b>Faltan datos para calcular el análisis financiero.</b> TerraSim no inventa valores; completa en «Análisis financiero»:
            <ul>{f.faltan.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        ) : (
          <>
            <h2>Resultados por escenario</h2>
            <table>
              <thead><tr><th>Indicador</th>{ESCENARIOS.map((e) => <th key={e} className="n">{ETIQUETA_ESCENARIO[e]}</th>)}</tr></thead>
              <tbody>
                <tr><td>Utilidad neta</td>{ESCENARIOS.map((e) => <td key={e} className="n"><b>{mm(resultados[e].utilidadNeta)}</b></td>)}</tr>
                <tr><td>Margen sobre lo vendido</td>{ESCENARIOS.map((e) => <td key={e} className="n">{pct(resultados[e].margen)}</td>)}</tr>
                <tr><td>TIR (rentabilidad anual)</td>{ESCENARIOS.map((e) => <td key={e} className="n">{resultados[e].tir === null ? "no aplica" : pct(resultados[e].tir as number)}</td>)}</tr>
                <tr><td>VPN</td>{ESCENARIOS.map((e) => <td key={e} className="n">{mm(resultados[e].vpn)}</td>)}</tr>
                <tr><td>Dinero máximo que se necesita</td>{ESCENARIOS.map((e) => <td key={e} className="n">{mm(resultados[e].exposicionMaxima)}</td>)}</tr>
                <tr><td>Se recupera lo invertido</td>{ESCENARIOS.map((e) => <td key={e} className="n">{resultados[e].anioRecuperacion === null ? "no en el horizonte" : ANIO_BASE + (resultados[e].anioRecuperacion as number)}</td>)}</tr>
                <tr><td>Punto de equilibrio</td>{ESCENARIOS.map((e) => <td key={e} className="n">{equilibrio(resultados[e].factorEquilibrio)}</td>)}</tr>
                {f.estrategia !== "invertir" && <tr><td>Lotes sin vender al final</td>{ESCENARIOS.map((e) => <td key={e} className="n">{num(resultados[e].lotesSinVender, 0)}</td>)}</tr>}
              </tbody>
            </table>
          </>
        )}

        <h2>Comparación de las tres opciones (utilidad · TIR)</h2>
        <table>
          <thead><tr><th>Opción</th>{ESCENARIOS.map((e) => <th key={e} className="n">{ETIQUETA_ESCENARIO[e]}</th>)}</tr></thead>
          <tbody>
            {f.matriz.map((fila) => (
              <tr key={fila.id}>
                <td>{ETIQUETA_ESTRATEGIA[fila.id]}</td>
                {fila.celdas
                  ? fila.celdas.map((c, i) => <td key={i} className="n">{mm(c.utilidadNeta)} · {c.tir === null ? "n/a" : pct(c.tir)}</td>)
                  : <td colSpan={3} style={{ color: "#94a3b8" }}>Faltan datos para esta opción</td>}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rp-dos">
          <div>
            <h2>Datos que se ingresaron</h2>
            <table><tbody>{f.entradas.map((x) => <tr key={x.etiqueta}><td>{x.etiqueta}</td><td className="n">{x.valor}</td></tr>)}</tbody></table>
          </div>
          <div>
            <h2>Precio del suelo en la zona</h2>
            {d.referencia && d.referencia.precioM2 !== null ? (
              <>
                <p><b>${num(d.referencia.precioM2)} por m²</b> estimado en el terreno ({d.referencia.metodo === "ponderado" ? "promedio ponderado por distancia" : "promedio simple"}).</p>
                <table>
                  <thead><tr><th>Referencia</th><th className="n">$/m²</th></tr></thead>
                  <tbody>{d.referencia.usados.map((u) => <tr key={u.nombre}><td>{u.nombre}{u.distanciaKm !== null ? ` · a ${num(u.distanciaKm, 1)} km` : ""}</td><td className="n">{num(u.precioM2)}</td></tr>)}</tbody>
                </table>
                {d.referencia.avisos.map((a) => <p key={a} style={{ color: "#92400e", fontSize: 10 }}>• {a}</p>)}
              </>
            ) : <p style={{ color: "#64748b" }}>Sin referencias de precios registradas.</p>}
          </div>
        </div>
      </section>

      {/* ---------- Hoja opcional: comparación de terrenos ---------- */}
      {d.comparacion && (
        <section className="rp-hoja">
          <Encabezado d={d} titulo="Comparación de terrenos" />
          <h2 style={{ margin: "10px 0 4px" }}>Dónde están los terrenos comparados</h2>
          <PlanoComparacion terrenos={d.comparacion.terrenos} />

          <h2 style={{ margin: "10px 0 4px" }}>Qué conviene según quién seas</h2>
          <div className="rp-dos" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {([["Si eres inversionista", d.comparacion.inversionista], ["Si eres constructora", d.comparacion.constructora]] as const).map(([titulo, r]) => {
              const g = d.comparacion!.evals.find((e) => e.id === r.ganadorId);
              return (
                <div key={titulo} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9.5, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>{titulo}</div>
                  {g && r.ganadorId ? (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORES[r.ganadorId as IdCandidato] }}>★ {g.nombre}</div>
                      <div style={{ fontSize: 9.5, color: "#64748b" }}>Comparado por: {r.criterio}</div>
                      <ul style={{ fontSize: 9.5, marginTop: 2 }}>
                        {r.razones.map((t) => <li key={t}>{t}</li>)}
                      </ul>
                    </>
                  ) : (
                    <div style={{ fontSize: 10.5, color: "#64748b" }}>Sin recomendación todavía.</div>
                  )}
                </div>
              );
            })}
          </div>

          <h2 style={{ margin: "10px 0 4px" }}>Comparación en cifras</h2>
          <table className="rp-compacta" style={{ fontSize: 9.5 }}>
            <thead>
              <tr>
                <th>Indicador</th>
                {d.comparacion.evals.map((e) => (
                  <th key={e.id} className="n" style={{ color: COLORES[e.id] }}>{corto(e.nombre)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                ["Área", (e) => `${num(e.area)} m²`],
                ["Distancia al centro", (e) => `${num(e.distanciaKm, 2)} km`],
                ["Valor de referencia del suelo", (e) => `${cop(e.valorM2)}/m²${e.usaReferencias ? "" : " *"}`],
                ["Precio de compra", (e) => (e.precioCompraM2 === null ? "falta" : `${cop(e.precioCompraM2)}/m²`)],
                ["Lote urbanizado de la zona ÷ terreno", (e) => (e.spread === null ? "—" : `${num(e.spread, 1)} veces`)],
                ["Lotes que caben (aprovechamiento)", (e) => `${e.nLotes} (${num(e.eficiencia, 0)} %)`],
                ["Mejoras que le faltan", (e) => (e.pendientes.length ? `${e.pendientes.length} de 4` : "ninguna")],
                ["Valorización a 20 años (base)", (e) => `+${num(e.plusvaliaPct.base, 0)} %`],
                ["Inversionista · TIR pes. / base / opt.", (e) => (e.invertir ? ESC.map((s) => (e.invertir![s].tir === null ? "n/a" : pct(e.invertir![s].tir as number))).join(" / ") : "faltan datos")],
                ["Inversionista · utilidad (base)", (e) => (e.invertir ? mm(e.invertir.base.utilidadNeta) : "—")],
                ["Constructora · TIR pes. / base / opt.", (e) => (e.construir ? ESC.map((s) => (e.construir![s].tir === null ? "n/a" : pct(e.construir![s].tir as number))).join(" / ") : "faltan datos")],
                ["Constructora · utilidad (base)", (e) => (e.construir ? mm(e.construir.base.utilidadNeta) : "—")],
              ] as [string, (e: Evaluado) => string][]).map(([etiqueta, f]) => (
                <tr key={etiqueta}>
                  <td>{etiqueta}</td>
                  {d.comparacion!.evals.map((e) => <td key={e.id} className="n">{f(e)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {d.comparacion.evals.some((e) => !e.usaReferencias) && (
            <p style={{ fontSize: 9.5, color: "#64748b" }}>* Sin referencias de precios cerca: se usó el valor inicial del modelo.</p>
          )}
          {[...new Set([...d.comparacion.inversionista.avisos, ...d.comparacion.constructora.avisos])].slice(0, 3).map((a) => (
            <p key={a} style={{ fontSize: 9, color: "#92400e", margin: "2px 0" }}>• {a}</p>
          ))}
          <div className="rp-pie">
            Comparación con los datos y supuestos ingresados. Lo que ya existe en un sector valoriza desde hoy; lo que falta llega en el año de cada escenario. Es una simulación: no es un avalúo ni asesoría financiera.
          </div>
        </section>
      )}

      {/* ---------- Hoja 4: riesgo sísmico, supuestos y fuentes ---------- */}
      <section className="rp-hoja">
        <Encabezado d={d} titulo="Riesgo sísmico, supuestos y fuentes" />
        <h2>Riesgo sísmico</h2>
        <div className="rp-tres">
          <div className="rp-kpi"><span>Sismo de diseño en 5 años</span><b>{pct(sm.prob.a5)}</b></div>
          <div className="rp-kpi"><span>en 10 años</span><b>{pct(sm.prob.a10)}</b></div>
          <div className="rp-kpi"><span>en 20 años</span><b>{pct(sm.prob.a20)}</b></div>
        </div>
        <p>Periodo de retorno de {sm.params.periodoRetorno} años (la NSR-10 diseña para 10 % de probabilidad en 50 años). Aceleración de diseño Aa = {num(sm.params.aa, 2)} g; construcción {sm.params.tipo === "formal" ? "con diseño y supervisión (NSR-10)" : "sin diseño (autoconstrucción)"}. Casas terminadas en {d.anioCalendario}: <b>{sm.casas}</b>.</p>
        <table>
          <thead>
            <tr><th>Sismo</th><th className="n">Aceleración</th><th className="n">Colapso por casa</th><th className="n">Daño por casa</th><th className="n">Destruidas</th><th className="n">Dañadas</th><th className="n">Pérdida esperada</th></tr>
          </thead>
          <tbody>
            {sm.escenarios.map((s) => (
              <tr key={s.nombre}>
                <td>{s.nombre}</td>
                <td className="n">{num(s.pga, 2)} g</td>
                <td className="n">{pct(s.pColapso)}</td>
                <td className="n">{pct(s.pDano)}</td>
                <td className="n">{num(s.destruidas, 1)}</td>
                <td className="n">{num(s.danadas, 1)}</td>
                <td className="n">{mm(s.perdida)} ({num(s.perdidaPct, 1)} %)</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="rp-aviso">
          Los escenarios «hipotéticos» muestran qué pasaría con eventos mucho más raros que el de diseño. Las curvas de fragilidad (mediana de colapso {num(sm.params.medianaColapso[sm.params.tipo], 2)} g, dispersión {num(sm.params.dispersion, 2)}) son supuestos de orden de magnitud y deben calibrarse con un estudio de vulnerabilidad local. El Aa de Aguachica debe confirmarse en la NSR-10 (Apéndice A-4); el valor usado es el de referencia de Valledupar (zona de amenaza baja).
        </div>

        <div className="rp-dos">
          <div>
            <h2>Supuestos del modelo</h2>
            <table>
              <tbody>
                <tr><td>Valor inicial del suelo</td><td className="n">{cop(pp.valorInicial)} /m²</td></tr>
                <tr><td>Tasa base de valorización</td><td className="n">{num(pp.tasaBase * 100, 1)} % anual</td></tr>
                <tr><td>Efecto de infraestructura</td><td className="n">+{num(pp.pesoInfra * 100, 1)} %</td></tr>
                <tr><td>Efecto del uso del suelo</td><td className="n">+{num(pp.pesoUso * 100, 1)} %</td></tr>
                <tr><td>Efecto de parque y entorno</td><td className="n">+{num(pp.pesoCarac * 100, 1)} %</td></tr>
                <tr><td>Velocidad de construcción</td><td className="n">{num(pp.kappa, 1)}</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h2>Parámetros del loteo</h2>
            <table>
              <tbody>
                <tr><td>Frente y fondo mínimos</td><td className="n">{num(paramsLoteo.frente, 1)} × {num(paramsLoteo.fondo, 1)} m</td></tr>
                <tr><td>Vía interna / existente</td><td className="n">{num(paramsLoteo.anchoVia, 1)} / {num(paramsLoteo.anchoViaExistente, 1)} m</td></tr>
                <tr><td>Cesión para zona verde</td><td className="n">{num(paramsLoteo.cesionVerdePct, 1)} %</td></tr>
                <tr><td>Lotes por manzana</td><td className="n">{paramsLoteo.lotesPorManzana > 0 ? paramsLoteo.lotesPorManzana : "sin transversales"}</td></tr>
                <tr><td>Medidas ajustadas al terreno</td><td className="n">{paramsLoteo.ajustar ? "sí" : "no"}</td></tr>
                <tr><td>Lotes proporcionales</td><td className="n">{paramsLoteo.proporcionar !== false ? "sí" : "no"}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <h2>Fuentes</h2>
        <ul>
          <li>Población: proyecciones de población del DANE por municipio (consultadas vía telencuestas.com); verificar en dane.gov.co.</li>
          <li>Salario mínimo 2026: {cop(SMMLV_2026)} (Decreto 1469 de 2025). Topes de vivienda de interés social: VIS {TOPE_VIS_SMMLV} SMMLV = {mm(TOPE_VIS)}; VIP {TOPE_VIP_SMMLV} SMMLV = {mm(TOPE_VIP)} (verificar la norma vigente).</li>
          <li>Amenaza sísmica: NSR-10 (periodo de retorno de diseño de 475 años); curvas de fragilidad lognormales como metodología estándar.</li>
          <li>Calles existentes (cuando se detectan automáticamente): © colaboradores de OpenStreetMap.</li>
          <li>Mapa satelital y ubicación: Google Maps.</li>
        </ul>
        <div className="rp-pie">
          Este informe es una simulación con los datos y supuestos indicados. No es un avalúo comercial, ni asesoría financiera o legal, ni garantiza rentabilidad. El uso del suelo, las cesiones y el área mínima de lotes deben confirmarse con el certificado de uso del suelo y el POT de Aguachica. Generado con TerraSim el {d.fecha}.
        </div>
      </section>
    </div>
  );
}