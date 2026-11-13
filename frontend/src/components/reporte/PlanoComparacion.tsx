import { CENTRO_AGUACHICA, Punto, distanciaM } from "@/lib/geo";
import { COLORES, IdCandidato } from "@/lib/candidatos";

type Terreno = { id: string; nombre: string; puntos: Punto[] };

type Props = { terrenos: Terreno[]; ancho?: number; alto?: number };

const corto = (t: string, n = 26) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const color = (id: string) => COLORES[id as IdCandidato] ?? "#475569";

// Esquema (SVG vectorial) de dónde está cada terreno respecto al centro de Aguachica.
// Los terrenos se dibujan con su letra; los anillos marcan la distancia al centro en km.
export default function PlanoComparacion({ terrenos, ancho = 680, alto = 180 }: Props) {
  const todos = [CENTRO_AGUACHICA, ...terrenos.flatMap((t) => t.puntos)];
  const lat0 = (Math.min(...todos.map((q) => q.lat)) + Math.max(...todos.map((q) => q.lat))) / 2;
  const lng0 = (Math.min(...todos.map((q) => q.lng)) + Math.max(...todos.map((q) => q.lng))) / 2;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const P = (q: Punto) => ({ x: (q.lng - lng0) * kx, y: -(q.lat - lat0) * 111320 }); // el norte queda arriba

  const xy = todos.map(P);
  const spanX = Math.max(...xy.map((q) => q.x)) - Math.min(...xy.map((q) => q.x));
  const spanY = Math.max(...xy.map((q) => q.y)) - Math.min(...xy.map((q) => q.y));
  const pad = Math.max(120, Math.max(spanX, spanY) * 0.12);
  const minX = Math.min(...xy.map((q) => q.x)) - pad;
  const maxX = Math.max(...xy.map((q) => q.x)) + pad;
  const minY = Math.min(...xy.map((q) => q.y)) - pad;
  const maxY = Math.max(...xy.map((q) => q.y)) + pad;
  const esc = Math.min(ancho / (maxX - minX), alto / (maxY - minY));
  const W = (maxX - minX) * esc;
  const H = (maxY - minY) * esc;
  const FRANJA = 26;
  const T = (q: Punto) => {
    const p = P(q);
    return { x: (p.x - minX) * esc, y: (p.y - minY) * esc };
  };
  const centro = T(CENTRO_AGUACHICA);

  // anillos cada kilómetro hasta cubrir el terreno más lejano
  const lejos = Math.max(...terrenos.flatMap((t) => t.puntos.map((q) => distanciaM(q, CENTRO_AGUACHICA))));
  const anillos = Array.from({ length: Math.min(8, Math.ceil(lejos / 1000) + 1) }, (_, k) => (k + 1) * 1000);

  const candidatas = [100, 200, 250, 500, 1000, 2000];
  const largoM = [...candidatas].reverse().find((m) => m <= (maxX - minX) / 3) ?? 100;

  return (
    <svg viewBox={`0 0 ${W.toFixed(1)} ${(H + FRANJA).toFixed(1)}`} width={Math.round(W)} height={Math.round(H + FRANJA)} style={{ display: "block", margin: "0 auto", maxWidth: "100%" }} role="img" aria-label="Ubicación de los terrenos comparados">
      <defs>
        <clipPath id="recorte-comparacion"><rect width={W} height={H} /></clipPath>
      </defs>
      <rect width={W} height={H + FRANJA} fill="#f8fafc" />
      <g clipPath="url(#recorte-comparacion)">
        {anillos.map((r) => (
          <g key={r}>
            <circle cx={centro.x} cy={centro.y} r={r * esc} fill="none" stroke="#cbd5e1" strokeWidth={0.8} strokeDasharray="4 4" />
            <text x={centro.x + r * esc * 0.7071 + 3} y={centro.y - r * esc * 0.7071 - 3} fontSize={9} fill="#94a3b8">{r / 1000} km</text>
          </g>
        ))}
        {terrenos.map((t) => {
          const pts = t.puntos.map(T);
          const cx = pts.reduce((s, q) => s + q.x, 0) / pts.length;
          const cy = pts.reduce((s, q) => s + q.y, 0) / pts.length;
          const cen = { lat: t.puntos.reduce((s, q) => s + q.lat, 0) / t.puntos.length, lng: t.puntos.reduce((s, q) => s + q.lng, 0) / t.puntos.length };
          const km = distanciaM(cen, CENTRO_AGUACHICA) / 1000;
          const c = color(t.id);
          return (
            <g key={t.id}>
              <line x1={centro.x} y1={centro.y} x2={cx} y2={cy} stroke={c} strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
              <polygon points={pts.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ")} fill={c} fillOpacity={0.35} stroke={c} strokeWidth={1.5} />
              <circle cx={cx} cy={cy} r={11} fill={c} stroke="#ffffff" strokeWidth={2} />
              <text x={cx} y={cy + 4} fontSize={12} fontWeight={700} textAnchor="middle" fill="#ffffff">{t.id}</text>
              <text x={cx + 15} y={cy + 4} fontSize={10} fill="#0f172a" stroke="#f8fafc" strokeWidth={3} paintOrder="stroke">{corto(t.nombre)} · {km.toFixed(1)} km</text>
            </g>
          );
        })}
        <g transform={`translate(${centro.x} ${centro.y})`}>
          <polygon points="0,-7 7,0 0,7 -7,0" fill="#0f172a" stroke="#ffffff" strokeWidth={1.5} />
          <text x={10} y={4} fontSize={10} fontWeight={700} fill="#0f172a" stroke="#f8fafc" strokeWidth={3} paintOrder="stroke">Centro</text>
        </g>
      </g>
      {/* escala */}
      <g transform={`translate(14 ${H + 16})`}>
        <line x1={0} y1={0} x2={largoM * esc} y2={0} stroke="#0f172a" strokeWidth={2} />
        <line x1={0} y1={-4} x2={0} y2={4} stroke="#0f172a" strokeWidth={1.5} />
        <line x1={largoM * esc} y1={-4} x2={largoM * esc} y2={4} stroke="#0f172a" strokeWidth={1.5} />
        <text x={largoM * esc + 8} y={4} fontSize={10} fill="#0f172a">{largoM >= 1000 ? `${largoM / 1000} km` : `${largoM} m`}</text>
      </g>
      <g transform={`translate(${W - 26} ${H + 5})`}>
        <polygon points="0,0 5,14 0,11 -5,14" fill="#0f172a" />
        <text x={12} y={12} fontSize={10} fill="#0f172a">N</text>
      </g>
    </svg>
  );
}