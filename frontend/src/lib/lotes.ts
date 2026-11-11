import { Punto, areaM2 } from "@/lib/geo";

export type ParametrosLoteo = {
  frente: number; // m
  fondo: number; // m
  anchoVia: number; // m, vías internas
  anchoViaExistente: number; // m, vía a la que da el terreno
  cesionVerdePct: number; // % del área bruta
  ladoVia: number; // índice del lado que da a la vía existente
};

export type LoteGen = {
  id: string;
  tipo: "lote" | "verde";
  fila: number;
  areaM2: number;
  coords: Punto[]; // límites del lote
  huella: Punto[]; // planta de la casa
  techoA: Punto[]; // faldón izquierdo
  techoB: Punto[]; // faldón derecho
  cumbrera: Punto[]; // línea de la cumbrera
  arboles: Punto[]; // solo en zonas verdes
};

export type Calle = {
  tipo: "existente" | "interna";
  coords: Punto[];
  ejes: Punto[][]; // línea central para la señalización
};

export type ResultadoLoteo = {
  lotes: LoteGen[];
  calles: Calle[];
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
const TOL = 0.05; // m de holgura al comparar contra los límites del terreno
const EXTENSION_VIA = 15; // m que se prolonga la vía existente a cada lado

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
  return !poly.some((v) => v.x > x0 + eps && v.x < x1 - eps && v.y > y0 + eps && v.y < y1 - eps);
}

// Recorta un polígono conservando la parte con y >= c ("mayor") o y <= c ("menor")
function recortarY(poly: XY[], c: number, mantener: "mayor" | "menor"): XY[] {
  const ok = (p: XY) => (mantener === "mayor" ? p.y >= c : p.y <= c);
  const out: XY[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = ok(a);
    const db = ok(b);
    if (da) out.push(a);
    if (da !== db) {
      const t = (c - a.y) / (b.y - a.y);
      out.push({ x: a.x + t * (b.x - a.x), y: c });
    }
  }
  return out;
}

function areaXY(poly: XY[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return Math.abs(s) / 2;
}

// Tramos del polígono que cruza la recta horizontal y = valor
function segmentosEnY(poly: XY[], y: number): [number, number][] {
  const xs: number[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (a.y > y !== b.y > y) xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
  }
  xs.sort((p, q) => p - q);
  const seg: [number, number][] = [];
  for (let k = 0; k + 1 < xs.length; k += 2) seg.push([xs[k], xs[k + 1]]);
  return seg;
}

export function generarLoteo(pts: Punto[], p: ParametrosLoteo): ResultadoLoteo | null {
  if (pts.length < 3) return null;
  if (!(p.frente > 0) || !(p.fondo > 0) || p.anchoVia < 0 || p.anchoViaExistente < 0 || p.cesionVerdePct < 0) {
    return null;
  }

  const lat0 = pts.reduce((s, q) => s + q.lat, 0) / pts.length;
  const lng0 = pts.reduce((s, q) => s + q.lng, 0) / pts.length;
  const kx = R * Math.cos(rad(lat0));

  const aMetros = (q: Punto): XY => ({ x: kx * rad(q.lng - lng0), y: R * rad(q.lat - lat0) });
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
  const largoLado = Math.hypot(b.x - a.x, b.y - a.y);

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
  const aP = (q: XY): Punto => aLatLng(inv(q));

  const minX = Math.min(...r.map((q) => q.x));
  const maxX = Math.max(...r.map((q) => q.x));
  const maxY = Math.max(...r.map((q) => q.y));
  const paso = 2 * p.fondo + p.anchoVia;

  type Interno = {
    x0: number; x1: number; y0: number; y1: number;
    fila: number; bloque: number; frente: "bajo" | "alto";
  };
  const internos: Interno[] = [];
  const bloquesConLotes = new Set<number>();

  for (let bloque = 0; internos.length < MAX_LOTES; bloque++) {
    const yBase = bloque * paso;
    if (yBase + p.fondo > maxY + TOL) break;
    for (let f = 0; f < 2; f++) {
      const y0 = yBase + f * p.fondo;
      const y1 = y0 + p.fondo;
      if (y1 > maxY + TOL) continue;
      for (let x = minX; x + p.frente <= maxX + TOL && internos.length < MAX_LOTES; x += p.frente) {
        if (cabe(x, x + p.frente, y0, y1, r)) {
          internos.push({
            x0: x, x1: x + p.frente, y0, y1,
            fila: bloque * 2 + f + 1, bloque,
            frente: f === 0 ? "bajo" : "alto", // la fila 0 da a la vía de abajo, la 1 a la de arriba
          });
          bloquesConLotes.add(bloque);
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

  // Dimensiones de la casa dentro del lote
  const lateral = Math.min(1.2, p.frente * 0.15);
  const retiro = Math.min(3, p.fondo * 0.2);
  const prof = Math.min(9, (p.fondo - retiro) * 0.7);

  const lotes: LoteGen[] = internos.map((l, idx) => {
    const hx0 = l.x0 + lateral;
    const hx1 = l.x1 - lateral;
    const xc = (hx0 + hx1) / 2;
    let hy0: number;
    let hy1: number;
    if (l.frente === "bajo") {
      hy0 = l.y0 + retiro;
      hy1 = hy0 + prof;
    } else {
      hy1 = l.y1 - retiro;
      hy0 = hy1 - prof;
    }
    const w = l.x1 - l.x0;
    const h = l.y1 - l.y0;
    return {
      id: `L${idx + 1}`,
      tipo: verdes.has(idx) ? "verde" : "lote",
      fila: l.fila,
      areaM2: areaLote,
      coords: [
        { x: l.x0, y: l.y0 }, { x: l.x1, y: l.y0 }, { x: l.x1, y: l.y1 }, { x: l.x0, y: l.y1 },
      ].map(aP),
      huella: [
        { x: hx0, y: hy0 }, { x: hx1, y: hy0 }, { x: hx1, y: hy1 }, { x: hx0, y: hy1 },
      ].map(aP),
      techoA: [
        { x: hx0, y: hy0 }, { x: xc, y: hy0 }, { x: xc, y: hy1 }, { x: hx0, y: hy1 },
      ].map(aP),
      techoB: [
        { x: xc, y: hy0 }, { x: hx1, y: hy0 }, { x: hx1, y: hy1 }, { x: xc, y: hy1 },
      ].map(aP),
      cumbrera: [{ x: xc, y: hy0 }, { x: xc, y: hy1 }].map(aP),
      arboles: [
        { x: l.x0 + 0.3 * w, y: l.y0 + 0.3 * h },
        { x: l.x0 + 0.7 * w, y: l.y0 + 0.3 * h },
        { x: l.x0 + 0.3 * w, y: l.y0 + 0.7 * h },
        { x: l.x0 + 0.7 * w, y: l.y0 + 0.7 * h },
      ].map(aP),
    };
  });

  // Calles
  const calles: Calle[] = [];

  if (p.anchoViaExistente > 0) {
    const w = p.anchoViaExistente;
    calles.push({
      tipo: "existente",
      coords: [
        { x: -EXTENSION_VIA, y: 0 },
        { x: largoLado + EXTENSION_VIA, y: 0 },
        { x: largoLado + EXTENSION_VIA, y: -w },
        { x: -EXTENSION_VIA, y: -w },
      ].map(aP),
      ejes: [[{ x: -EXTENSION_VIA, y: -w / 2 }, { x: largoLado + EXTENSION_VIA, y: -w / 2 }].map(aP)],
    });
  }

  if (p.anchoVia > 0) {
    for (const bloque of Array.from(bloquesConLotes).sort((u, v) => u - v)) {
      const yS = bloque * paso + 2 * p.fondo;
      const yE = yS + p.anchoVia;
      const franja = recortarY(recortarY(r, yS, "mayor"), yE, "menor");
      if (franja.length < 3 || areaXY(franja) < 5) continue;
      const ejes = segmentosEnY(franja, yS + p.anchoVia / 2)
        .filter(([x0, x1]) => x1 - x0 > 1)
        .map(([x0, x1]) => [{ x: x0, y: yS + p.anchoVia / 2 }, { x: x1, y: yS + p.anchoVia / 2 }].map(aP));
      calles.push({ tipo: "interna", coords: franja.map(aP), ejes });
    }
  }

  const nVerdes = verdes.size;
  const nLotes = internos.length - nVerdes;
  const areaVendible = nLotes * areaLote;
  const areaVias = Math.max(0, areaBruta - areaVendible - areaVerde);

  return {
    lotes,
    calles,
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