import type { Punto } from "@/lib/geo";
import type { ResultadoLoteo } from "@/lib/lotes";
import type { EstadoAnio, EtapaLote } from "@/lib/progreso";

// Mismos tonos de techo que el mapa
const TECHOS: [string, string][] = [
  ["#d4d7dc", "#bcc1c8"],
  ["#7fa7d9", "#6a93c7"],
  ["#d9573f", "#c04a33"],
  ["#80868e", "#6d737b"],
];

type Props = {
  loteo: ResultadoLoteo;
  puntos: Punto[];
  etapas: EtapaLote[];
  estado: EstadoAnio;
  ancho?: number;
  alto?: number;
};

// Plano del loteo dibujado en SVG (vectorial: se ve nítido al imprimir o guardar como PDF)
export default function PlanoLoteo({ loteo, puntos, etapas, estado, ancho = 680, alto = 400 }: Props) {
  const lat0 = puntos.reduce((s, q) => s + q.lat, 0) / puntos.length;
  const lng0 = puntos.reduce((s, q) => s + q.lng, 0) / puntos.length;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const P = (q: Punto) => ({ x: (q.lng - lng0) * kx, y: -(q.lat - lat0) * 111320 }); // el norte queda arriba

  const todos = [...puntos, ...loteo.calles.flatMap((c) => c.coords)].map(P);
  const pad = 6;
  const minX = Math.min(...todos.map((q) => q.x)) - pad;
  const maxX = Math.max(...todos.map((q) => q.x)) + pad;
  const minY = Math.min(...todos.map((q) => q.y)) - pad;
  const maxY = Math.max(...todos.map((q) => q.y)) + pad;
  const esc = Math.min(ancho / (maxX - minX), alto / (maxY - minY));
  const W = (maxX - minX) * esc;
  const H = (maxY - minY) * esc;
  const FRANJA = 30; // espacio debajo del dibujo para la escala y el norte
  const T = (q: Punto) => {
    const p = P(q);
    return `${((p.x - minX) * esc).toFixed(1)},${((p.y - minY) * esc).toFixed(1)}`;
  };
  const poly = (pts: Punto[]) => pts.map(T).join(" ");

  // barra de escala con una longitud "redonda"
  const candidatas = [5, 10, 20, 25, 50, 100, 200];
  const largoM = [...candidatas].reverse().find((m) => m <= (maxX - minX) / 3) ?? 5;
  const pav = estado.via;

  return (
    <svg viewBox={`0 0 ${W.toFixed(1)} ${(H + FRANJA).toFixed(1)}`} width={Math.round(W)} height={Math.round(H + FRANJA)} style={{ display: "block", margin: "0 auto", maxWidth: "100%", height: "auto" }} role="img" aria-label="Plano del loteo">
      <rect width={W} height={H + FRANJA} fill="#f8fafc" />
      <polygon points={poly(puntos)} fill="#fffbeb" stroke="#eab308" strokeWidth={1.6} />

      {loteo.calles.map((c, i) => (
        <g key={`c${i}`}>
          <polygon points={poly(c.coords)} fill={pav ? (c.asfalto ? "#cbd5e1" : "#4b5563") : "#d9c7a4"} />
          {pav && c.asfalto && <polygon points={poly(c.asfalto)} fill="#4b5563" />}
          {pav && c.ejes.map((e, j) => (
            <polyline key={j} points={poly(e)} fill="none" stroke="#fde68a" strokeWidth={0.9} strokeDasharray="4 3" />
          ))}
        </g>
      ))}

      {loteo.lotes.map((l, i) => {
        const etapa = etapas[i] ?? "vacio";
        const verde = l.tipo === "verde";
        const suelo = verde ? (estado.parque ? "#86efac" : "#dcfce7") : etapa === "vacio" ? "#f1f5f9" : "#e7e5c8";
        return (
          <g key={l.id}>
            <polygon points={poly(l.coords)} fill={suelo} stroke="#94a3b8" strokeWidth={0.4} />
            {!verde && etapa === "cimentacion" && <polygon points={poly(l.huella)} fill="#9ca3af" stroke="#4b5563" strokeWidth={0.3} />}
            {!verde && etapa === "estructura" && <polygon points={poly(l.huella)} fill="#c2763b" stroke="#7c2d12" strokeWidth={0.3} />}
            {!verde && etapa === "casa" && (
              <polygon points={poly(l.techo)} fill={TECHOS[l.tono][l.lado === "bajo" ? 0 : 1]} stroke="#6b7280" strokeWidth={0.35} />
            )}
            {verde && estado.parque && l.arboles.map((a, j) => {
              const c = T(a).split(",");
              return <circle key={j} cx={c[0]} cy={c[1]} r={Math.max(1.5, 1.2 * esc)} fill="#166534" />;
            })}
          </g>
        );
      })}

      {/* escala */}
      <g transform={`translate(14 ${H + 19})`}>
        <line x1={0} y1={0} x2={largoM * esc} y2={0} stroke="#0f172a" strokeWidth={2} />
        <line x1={0} y1={-4} x2={0} y2={4} stroke="#0f172a" strokeWidth={1.5} />
        <line x1={largoM * esc} y1={-4} x2={largoM * esc} y2={4} stroke="#0f172a" strokeWidth={1.5} />
        <text x={(largoM * esc) / 2} y={-7} fontSize={10} textAnchor="middle" fill="#0f172a">{largoM} m</text>
      </g>
      {/* norte */}
      <g transform={`translate(${W - 26} ${H + 6})`}>
        <polygon points="0,0 5,15 0,12 -5,15" fill="#0f172a" />
        <text x={12} y={13} fontSize={10} fill="#0f172a">N</text>
      </g>
    </svg>
  );
}