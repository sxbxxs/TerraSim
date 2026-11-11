import { Punto, areaM2 } from "@/lib/geo";

export type ParametrosLoteo = {
  frente: number; // m
  fondo: number; // m
  anchoVia: number; // m
  cesionVerdePct: number; // % del área bruta
  ladoVia: number; // índice del lado que da a la vía existente
};

export type LoteGen = {
  id: string;
  tipo: "lote" | "verde";
  fila: number;
  areaM2: number;
  coords: Punto[];
};

export type ResultadoLoteo = {
  lotes: LoteGen[];
  nLotes: number;
  nVerdes: number;
  areaBruta: number;
  areaVendible: number;
  areaVerde: number;
  areaVerdeRequerida: number;
  areaVias: number; // vías + sobrantes
  eficiencia: number; // % vendible sobre bruta
  cumpleVerde: boolean;
};

type XY = { x: number; y: number };

const R = 6371008.8;
const rad = (g: number) => (g * Math.PI) / 180;
const MAX_LOTES = 4000;

function dentro(p: XY, poly: XY[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      c = !c;
    }
  }
  return c;
}

function cabe(x0: number, x1: number, y0: number, y1: number, poly: XY[]): boolean {
  const eps = 0.05;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const esquinas: XY[] = [
    { x: x0 + eps, y: y0 + eps },
    { x: x1 - eps, y: y0 + eps },
    { x: x1 - eps, y: y1 - eps },
    { x: x0 + eps, y: y1 - eps },
  ];
  if (!esquinas.every((q) => dentro(q, poly))) return false;
  if (!dentro({ x: cx, y: cy }, poly)) return false;
  // ningún vértice del terreno puede quedar dentro del lote
  return !poly.some((v) => v.x > x0 + eps && v.x < x1 - eps && v.y > y0 + eps && v.y < y1 - eps);
}

export function generarLoteo(pts: Punto[], p: ParametrosLoteo): ResultadoLoteo | null {
  if (pts.length < 3) return null;
  if (!(p.frente > 0) || !(p.fondo > 0) || p.anchoVia < 0 || p.cesionVerdePct < 0) return null;

  const lat0 = pts.reduce((s, q) => s + q.lat, 0) / pts.length;
  const lng0 = pts.reduce((s, q) => s + q.lng, 0) / pts.length;
  const kx = R * Math.cos(rad(lat0));

  const aMetros = (q: Punto): XY => ({
    x: kx * rad(q.lng - lng0),
    y: R * rad(q.lat - lat0),
  });
  const aLatLng = (q: XY): Punto => ({
    lat: lat0 + ((q.y / R) * 180) / Math.PI,
    lng: lng0 + ((q.x / kx) * 180) / Math.PI,
  });

  const m = pts.map(aMetros);
  const n = m.length;
  const i = ((p.ladoVia % n) + n) % n;
  const a = m[i];
  const b = m[(i + 1) % n];
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const cosA = Math.cos(ang);
  const sinA = Math.sin(ang);

  // Sistema local: el lado de la vía queda sobre y = 0 y el terreno hacia y > 0
  const rot = (q: XY): XY => ({
    x: (q.x - a.x) * cosA + (q.y - a.y) * sinA,
    y: -(q.x - a.x) * sinA + (q.y - a.y) * cosA,
  });
  let r = m.map(rot);
  const signo = r.reduce((s, q) => s + q.y, 0) / n >= 0 ? 1 : -1;
  r = r.map((q) => ({ x: q.x, y: q.y * signo }));

  const inv = (q: XY): XY => {
    const y = q.y * signo;
    return { x: a.x + q.x * cosA - y * sinA, y: a.y + q.x * sinA + y * cosA };
  };

  const minX = Math.min(...r.map((q) => q.x));
  const maxX = Math.max(...r.map((q) => q.x));
  const maxY = Math.max(...r.map((q) => q.y));
  const paso = 2 * p.fondo + p.anchoVia;

  type Interno = { x0: number; x1: number; y0: number; y1: number; fila: number };
  const internos: Interno[] = [];

  for (let bloque = 0; internos.length < MAX_LOTES; bloque++) {
    const yBase = bloque * paso;
    if (yBase + p.fondo > maxY + 1e-6) break;
    for (let f = 0; f < 2; f++) {
      const y0 = yBase + f * p.fondo;
      const y1 = y0 + p.fondo;
      if (y1 > maxY + 1e-6) continue;
      for (let x = minX; x + p.frente <= maxX + 1e-6 && internos.length < MAX_LOTES; x += p.frente) {
        if (cabe(x, x + p.frente, y0, y1, r)) {
          internos.push({ x0: x, x1: x + p.frente, y0, y1, fila: bloque * 2 + f + 1 });
        }
      }
    }
  }

  const areaLote = p.frente * p.fondo;
  const areaBruta = areaM2(pts);
  const verdeRequerida = (p.cesionVerdePct / 100) * areaBruta;

  // Zona verde: los lotes más alejados de la vía pasan a parque
  const orden = internos
    .map((l, idx) => ({ idx, y: (l.y0 + l.y1) / 2, x: (l.x0 + l.x1) / 2 }))
    .sort((u, v) => v.y - u.y || v.x - u.x);
  const verdes = new Set<number>();
  let areaVerde = 0;
  for (const o of orden) {
    if (areaVerde >= verdeRequerida - 1e-6) break;
    verdes.add(o.idx);
    areaVerde += areaLote;
  }

  const lotes: LoteGen[] = internos.map((l, idx) => ({
    id: `L${idx + 1}`,
    tipo: verdes.has(idx) ? "verde" : "lote",
    fila: l.fila,
    areaM2: areaLote,
    coords: [
      { x: l.x0, y: l.y0 },
      { x: l.x1, y: l.y0 },
      { x: l.x1, y: l.y1 },
      { x: l.x0, y: l.y1 },
    ].map((q) => aLatLng(inv(q))),
  }));

  const nVerdes = verdes.size;
  const nLotes = internos.length - nVerdes;
  const areaVendible = nLotes * areaLote;
  const areaVias = Math.max(0, areaBruta - areaVendible - areaVerde);

  return {
    lotes,
    nLotes,
    nVerdes,
    areaBruta,
    areaVendible,
    areaVerde,
    areaVerdeRequerida: verdeRequerida,
    areaVias,
    eficiencia: areaBruta > 0 ? (areaVendible / areaBruta) * 100 : 0,
    cumpleVerde: areaVerde >= verdeRequerida - 1e-6,
  };
}