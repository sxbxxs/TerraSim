import { Punto, areaM2 } from "@/lib/geo";

export type ParametrosLoteo = {
  frente: number; // m (mínimo)
  fondo: number; // m (mínimo)
  anchoVia: number; // m, vías internas
  anchoViaExistente: number; // m, vía a la que da el terreno
  cesionVerdePct: number; // % del área bruta
  ladoVia: number; // lado principal con calle (se usa si no se marcó ninguno en callesExistentes)
  callesExistentes?: boolean[]; // por lado del terreno: true si ahí ya existe una calle
  proporcionar?: boolean; // lotes más anchos y menos profundos con el mismo área mínima (por defecto sí)
  ajustar: boolean; // estira los lotes para llenar el terreno sin sobrantes
  lotesPorManzana: number; // máximo de lotes seguidos antes de una calle transversal (0 = sin transversales)
  optimizar?: boolean; // prueba todas las orientaciones y elige la que da más lotes (por defecto sí)
};

export type LoteGen = {
  id: string;
  tipo: "lote" | "verde";
  fila: number;
  areaM2: number;
  anchoM: number; // frente real
  largoM: number; // fondo real
  coords: Punto[]; // límites del lote
  huella: Punto[]; // planta de la casa
  techo: Punto[]; // tejado de la casa
  lado: "bajo" | "alto"; // hacia qué calle da el frente (define el tono del techo)
  tono: 0 | 1 | 2 | 3; // variante del techo: gris, azul, teja, gris oscuro
  arboles: Punto[]; // solo en zonas verdes
};

export type Calle = {
  tipo: "existente" | "interna";
  coords: Punto[]; // calzada + andenes
  asfalto: Punto[] | null; // solo la calzada (null si la vía es muy angosta)
  ejes: Punto[][]; // línea central para la señalización
};

export type ResultadoLoteo = {
  lotes: LoteGen[];
  calles: Calle[];
  nLotes: number;
  nVerdes: number;
  nManzanas: number;
  ladoFilas: number; // lado del terreno con el que se alinean las filas de lotes
  proporcional: boolean; // true si los lotes se hicieron más anchos y menos profundos para sacar más
  extremos: number; // puntas de calles nuevas que llegan al borde del terreno
  conectados: number; // de esas puntas, cuántas llegan a una calle que ya existe
  lotesSiParalelaVia: number; // lotes que saldrían con las filas paralelas a la vía
  areaBruta: number;
  areaVendible: number;
  areaVerde: number;
  areaVerdeRequerida: number;
  areaVias: number; // vías + sobrantes
  eficiencia: number; // % vendible sobre bruta
  cumpleVerde: boolean;
  anchoMin: number;
  anchoMax: number;
  largoMin: number;
  largoMax: number;
  areaPromedio: number; // m² por lote vendible
};

type XY = { x: number; y: number };

const R = 6371008.8;
const rad = (g: number) => (g * Math.PI) / 180;
const MAX_LOTES = 4000;
const TOL = 0.05; // m de holgura al comparar contra los límites del terreno
const LIMITE_PROPORCIONAR_M2 = 20000; // en terrenos más grandes no se prueban lotes proporcionales
const ANDEN = 1.2; // m de andén a cada lado de la calzada
const ESTIRAR_MAX = 1.2; // un lote no se estira más de un 20 %

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

const intercambiar = (poly: XY[]): XY[] => poly.map((q) => ({ x: q.y, y: q.x }));
const recortarX = (poly: XY[], c: number, m: "mayor" | "menor"): XY[] =>
  intercambiar(recortarY(intercambiar(poly), c, m));

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
const segmentosEnX = (poly: XY[], x: number) => segmentosEnY(intercambiar(poly), x);

// Quita de una lista de tramos los intervalos indicados (para cortar la señalización en los cruces)
function restar(segs: [number, number][], cortes: [number, number][]): [number, number][] {
  let out = segs;
  for (const [c0, c1] of cortes) {
    const nuevo: [number, number][] = [];
    for (const [s0, s1] of out) {
      if (c1 <= s0 || c0 >= s1) {
        nuevo.push([s0, s1]);
        continue;
      }
      if (c0 > s0) nuevo.push([s0, c0]);
      if (c1 < s1) nuevo.push([c1, s1]);
    }
    out = nuevo;
  }
  return out.filter(([a, b]) => b - a > 1);
}

// Franjas horizontales donde cabe una fila completa entre y0 e y1
function tramosDeFila(poly: XY[], y0: number, y1: number, minAncho: number): [number, number][] {
  const e = 0.02;
  const A = segmentosEnY(poly, y0 + e);
  const B = segmentosEnY(poly, y1 - e);
  const out: [number, number][] = [];
  for (const [a0, a1] of A) {
    for (const [b0, b1] of B) {
      const lo = Math.max(a0, b0);
      const hi = Math.min(a1, b1);
      if (hi - lo >= minAncho - TOL) out.push([lo, hi]);
    }
  }
  return out;
}

// Número pseudoaleatorio estable (0 a 1) para variar los techos sin que cambien en cada dibujo
function azar(n: number): number {
  let x = Math.imul(n + 1, 2654435761);
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  return ((x >>> 0) % 1000) / 1000;
}

function construirLoteo(pts: Punto[], p: ParametrosLoteo, ladoFilas: number): ResultadoLoteo | null {
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
  const i = ((ladoFilas % n) + n) % n;
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
  const aP = (q: XY): Punto => aLatLng(inv(q));

  const minX = Math.min(...r.map((q) => q.x));
  const maxX = Math.max(...r.map((q) => q.x));
  const maxY = Math.max(...r.map((q) => q.y));
  const areaBruta = areaM2(pts);
  const ancho = maxX - minX;
  const v = p.anchoVia;

  // --- Plan vertical: filas (de a dos, espalda con espalda) separadas por calles ---
  let fondoEf = p.fondo;
  const parecidoARectangulo = ancho > 0 && maxY > 0 && areaBruta / (ancho * maxY) > 0.95;
  if (p.ajustar && parecidoARectangulo) {
    let mejorR = 0;
    for (let nFilas = 1; nFilas <= 400; nFilas++) {
      const calles = Math.ceil(nFilas / 2) - 1;
      const f = (maxY - calles * v) / nFilas;
      if (f >= p.fondo - 1e-9) mejorR = nFilas;
      else break;
    }
    if (mejorR > 0) {
      const calles = Math.ceil(mejorR / 2) - 1;
      const f = (maxY - calles * v) / mejorR;
      if (f <= p.fondo * ESTIRAR_MAX) fondoEf = f;
    }
  }
  const paso = 2 * fondoEf + v;

  // --- Plan horizontal: manzanas separadas por calles transversales (iguales para todas las filas) ---
  let nManzanas = 1;
  let largoManzana = ancho;
  if (p.lotesPorManzana > 0 && v > 0) {
    const largoNominal = p.lotesPorManzana * p.frente;
    nManzanas = Math.max(1, Math.ceil((ancho + v) / (largoNominal + v) - 1e-9));
    while (nManzanas > 1 && (ancho - (nManzanas - 1) * v) / nManzanas < p.frente - TOL) nManzanas--;
    largoManzana = (ancho - (nManzanas - 1) * v) / nManzanas;
  }
  const manzanasX: [number, number][] = Array.from({ length: nManzanas }, (_, j) => [
    minX + j * (largoManzana + v),
    minX + j * (largoManzana + v) + largoManzana,
  ]);
  const callesX: [number, number][] = Array.from({ length: nManzanas - 1 }, (_, j) => [
    minX + j * (largoManzana + v) + largoManzana,
    minX + (j + 1) * (largoManzana + v),
  ]);

  type Interno = {
    x0: number; x1: number; y0: number; y1: number;
    fila: number; frente: "bajo" | "alto";
  };
  const internos: Interno[] = [];
  const bloquesConLotes = new Set<number>();

  for (let bloque = 0; internos.length < MAX_LOTES; bloque++) {
    const yBase = bloque * paso;
    if (yBase + fondoEf > maxY + TOL) break;
    for (let f = 0; f < 2; f++) {
      const y0 = yBase + f * fondoEf;
      const y1 = y0 + fondoEf;
      if (y1 > maxY + TOL) continue;
      for (const [lo, hi] of tramosDeFila(r, y0, y1, p.frente)) {
        for (const [mx0, mx1] of manzanasX) {
          const s0 = Math.max(lo, mx0);
          const s1 = Math.min(hi, mx1);
          const W = s1 - s0;
          if (W < p.frente - TOL) continue;
          const nLotes = Math.max(1, Math.floor(W / p.frente + 1e-9));
          // Estira el frente para que la fila llene el tramo sin sobrante
          const frenteEf = W / nLotes;
          const anchoLote = p.ajustar && frenteEf <= p.frente * ESTIRAR_MAX ? frenteEf : p.frente;
          for (let k = 0; k < nLotes && internos.length < MAX_LOTES; k++) {
            const x0 = s0 + k * anchoLote;
            const x1 = x0 + anchoLote;
            if (cabe(x0, x1, y0, y1, r)) {
              internos.push({
                x0, x1, y0, y1,
                fila: bloque * 2 + f + 1,
                frente: f === 0 ? "bajo" : "alto", // la fila 0 da a la vía de abajo, la 1 a la de arriba
              });
              bloquesConLotes.add(bloque);
            }
          }
        }
      }
    }
  }

  const areaDe = (l: Interno) => (l.x1 - l.x0) * (l.y1 - l.y0);
  const verdeRequerida = (p.cesionVerdePct / 100) * areaBruta;

  // Zona verde: los lotes más alejados de la vía pasan a parque
  const orden = internos
    .map((l, idx) => ({ idx, y: (l.y0 + l.y1) / 2, x: (l.x0 + l.x1) / 2 }))
    .sort((u, w) => w.y - u.y || w.x - u.x);
  const verdes = new Set<number>();
  let areaVerde = 0;
  for (const o of orden) {
    if (areaVerde >= verdeRequerida - 1e-6) break;
    verdes.add(o.idx);
    areaVerde += areaDe(internos[o.idx]);
  }

  const lotes: LoteGen[] = internos.map((l, idx) => {
    const w = l.x1 - l.x0;
    const h = l.y1 - l.y0;
    // Casa adosada: ocupa casi todo el frente y el fondo; solo queda un patio pequeño atrás
    const lateral = 0.05;
    const retiro = Math.min(0.8, h * 0.06);
    const prof = (h - retiro) * 0.92;
    const hx0 = l.x0 + lateral;
    const hx1 = l.x1 - lateral;
    let hy0: number;
    let hy1: number;
    if (l.frente === "bajo") {
      hy0 = l.y0 + retiro;
      hy1 = hy0 + prof;
    } else {
      hy1 = l.y1 - retiro;
      hy0 = hy1 - prof;
    }
    const huella = [
      { x: hx0, y: hy0 }, { x: hx1, y: hy0 }, { x: hx1, y: hy1 }, { x: hx0, y: hy1 },
    ].map(aP);
    const u = azar(idx);
    return {
      id: `L${idx + 1}`,
      tipo: verdes.has(idx) ? "verde" : "lote",
      fila: l.fila,
      areaM2: w * h,
      anchoM: w,
      largoM: h,
      coords: [
        { x: l.x0, y: l.y0 }, { x: l.x1, y: l.y0 }, { x: l.x1, y: l.y1 }, { x: l.x0, y: l.y1 },
      ].map(aP),
      huella,
      techo: huella,
      lado: l.frente,
      tono: u < 0.8 ? 0 : u < 0.88 ? 1 : u < 0.95 ? 2 : 3,
      arboles: [
        { x: l.x0 + 0.3 * w, y: l.y0 + 0.3 * h },
        { x: l.x0 + 0.7 * w, y: l.y0 + 0.3 * h },
        { x: l.x0 + 0.3 * w, y: l.y0 + 0.7 * h },
        { x: l.x0 + 0.7 * w, y: l.y0 + 0.7 * h },
      ].map(aP),
    };
  });

  // --- Calles (calzada + andenes) ---
  const calles: Calle[] = [];

  // Lados del terreno que ya tienen calle
  const principal = ((p.ladoVia % n) + n) % n;
  const hayCalle = (k: number) => (p.callesExistentes ? !!p.callesExistentes[((k % n) + n) % n] : ((k % n) + n) % n === principal);
  const ladosCalle: number[] = [];
  for (let k = 0; k < n; k++) if (hayCalle(k)) ladosCalle.push(k);

  if (p.anchoViaExistente > 0) {
    const cx = m.reduce((acc, q) => acc + q.x, 0) / n;
    const cy = m.reduce((acc, q) => acc + q.y, 0) / n;
    const w = p.anchoViaExistente;
    for (const k of ladosCalle) {
      const ra = m[k];
      const rb = m[(k + 1) % n];
      const L = Math.hypot(rb.x - ra.x, rb.y - ra.y);
      if (L <= 0) continue;
      const ux = (rb.x - ra.x) / L;
      const uy = (rb.y - ra.y) / L;
      let nx = -uy;
      let ny = ux;
      if ((cx - ra.x) * nx + (cy - ra.y) * ny > 0) {
        nx = -nx; // la normal debe apuntar hacia afuera del terreno
        ny = -ny;
      }
      const punto = (t: number, dist: number): XY => ({
        x: ra.x + ux * t + nx * dist,
        y: ra.y + uy * t + ny * dist,
      });
      // la franja no se pasa de las esquinas; solo cierra la esquina cuando el lado anterior también es calle
      const t0 = hayCalle(k - 1) ? -w : 0;
      const t1 = L;
      calles.push({
        tipo: "existente",
        coords: [punto(t0, 0), punto(t1, 0), punto(t1, w), punto(t0, w)].map(aLatLng),
        asfalto:
          w >= 5
            ? [punto(t0, ANDEN), punto(t1, ANDEN), punto(t1, w - ANDEN), punto(t0, w - ANDEN)].map(aLatLng)
            : null,
        ejes: [[punto(t0, w / 2), punto(t1, w / 2)].map(aLatLng)],
      });
    }
  }

  const callesY: [number, number][] = []; // intervalos de las calles horizontales dibujadas

  if (v > 0) {
    // Calles horizontales (entre cada par de filas)
    for (const bloque of Array.from(bloquesConLotes).sort((u, w) => u - w)) {
      const yS = bloque * paso + 2 * fondoEf;
      const yE = yS + v;
      const franja = recortarY(recortarY(r, yS, "mayor"), yE, "menor");
      if (franja.length < 3 || areaXY(franja) < 5) continue;
      callesY.push([yS, yE]);

      let asfalto: Punto[] | null = null;
      if (v >= 5) {
        const calzada = recortarY(recortarY(r, yS + ANDEN, "mayor"), yE - ANDEN, "menor");
        if (calzada.length >= 3 && areaXY(calzada) >= 3) asfalto = calzada.map(aP);
      }

      const yMedio = yS + v / 2;
      const ejes = restar(segmentosEnY(franja, yMedio), callesX).map(([x0, x1]) =>
        [{ x: x0, y: yMedio }, { x: x1, y: yMedio }].map(aP)
      );
      calles.push({ tipo: "interna", coords: franja.map(aP), asfalto, ejes });
    }

    // Calles transversales (entre manzanas), hasta donde llegan los lotes
    const yTope = internos.length ? Math.max(...internos.map((l) => l.y1)) : 0;
    for (const [xs, xe] of callesX) {
      const recorte = (x0: number, x1: number) =>
        recortarY(recortarX(recortarX(r, x0, "mayor"), x1, "menor"), yTope, "menor");
      const franja = recorte(xs, xe);
      if (franja.length < 3 || areaXY(franja) < 5) continue;

      let asfalto: Punto[] | null = null;
      if (v >= 5) {
        const calzada = recorte(xs + ANDEN, xe - ANDEN);
        if (calzada.length >= 3 && areaXY(calzada) >= 3) asfalto = calzada.map(aP);
      }

      const xMedio = (xs + xe) / 2;
      const ejes = restar(segmentosEnX(franja, xMedio), callesY).map(([y0, y1]) =>
        [{ x: xMedio, y: y0 }, { x: xMedio, y: y1 }].map(aP)
      );
      calles.push({ tipo: "interna", coords: franja.map(aP), asfalto, ejes });
    }
  }

  // ¿Las puntas de las calles nuevas que llegan al borde del terreno desembocan en una calle existente?
  const distSeg = (q: XY, a1: XY, b1: XY) => {
    const dx = b1.x - a1.x;
    const dy = b1.y - a1.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((q.x - a1.x) * dx + (q.y - a1.y) * dy) / l2));
    return Math.hypot(q.x - (a1.x + t * dx), q.y - (a1.y + t * dy));
  };
  let extremos = 0;
  let conectados = 0;
  for (const c of calles) {
    if (c.tipo !== "interna") continue;
    for (const eje of c.ejes) {
      for (const q of [eje[0], eje[eje.length - 1]]) {
        const xy = aMetros(q);
        const enBorde = m.some((_, k) => distSeg(xy, m[k], m[(k + 1) % n]) <= 1);
        if (!enBorde) continue;
        extremos++;
        if (ladosCalle.some((k) => distSeg(xy, m[k], m[(k + 1) % n]) <= 3)) conectados++;
      }
    }
  }

  const vendibles = lotes.filter((l) => l.tipo === "lote");
  const nVerdes = lotes.length - vendibles.length;
  const nLotes = vendibles.length;
  const areaVendible = vendibles.reduce((s, l) => s + l.areaM2, 0);
  const areaVias = Math.max(0, areaBruta - areaVendible - areaVerde);

  return {
    lotes,
    calles,
    nLotes,
    nVerdes,
    nManzanas,
    ladoFilas: i,
    proporcional: false,
    extremos,
    conectados,
    lotesSiParalelaVia: nLotes,
    areaBruta,
    areaVendible,
    areaVerde,
    areaVerdeRequerida: verdeRequerida,
    areaVias,
    eficiencia: areaBruta > 0 ? (areaVendible / areaBruta) * 100 : 0,
    cumpleVerde: areaVerde >= verdeRequerida - 1e-6,
    anchoMin: nLotes ? Math.min(...vendibles.map((l) => l.anchoM)) : 0,
    anchoMax: nLotes ? Math.max(...vendibles.map((l) => l.anchoM)) : 0,
    largoMin: nLotes ? Math.min(...vendibles.map((l) => l.largoM)) : 0,
    largoMax: nLotes ? Math.max(...vendibles.map((l) => l.largoM)) : 0,
    areaPromedio: nLotes ? areaVendible / nLotes : 0,
  };
}

// Distribución que maximiza los lotes. Prueba (1) alinear las filas con cada lado del terreno y
// (2) lotes más anchos y menos profundos (hasta 30 % menos fondo) que conservan el área mínima
// (frente × fondo). Se queda con la que da más lotes vendibles; si empatan, la que llega a más calles
// existentes y, después, la de mejor aprovechamiento.
export function generarLoteo(pts: Punto[], p: ParametrosLoteo): ResultadoLoteo | null {
  if (pts.length < 3) return null;
  const n = pts.length;
  const iv = ((p.ladoVia % n) + n) % n;
  const base = construirLoteo(pts, p, iv);
  if (!base) return null;

  const optimizar = p.optimizar !== false;
  const proporcionar = p.proporcionar !== false && base.areaBruta <= LIMITE_PROPORCIONAR_M2;
  if (!optimizar && !proporcionar) return base;

  const mejorQue = (a: ResultadoLoteo, b: ResultadoLoteo) =>
    a.nLotes > b.nLotes ||
    (a.nLotes === b.nLotes &&
      (a.conectados > b.conectados || (a.conectados === b.conectados && a.eficiencia > b.eficiencia + 0.5)));

  const fondos = proporcionar ? Array.from({ length: 7 }, (_, j) => p.fondo * (1 - 0.05 * j)) : [p.fondo];
  const lados = optimizar ? Array.from({ length: n }, (_, k) => k) : [iv];

  let mejor = base;
  for (const k of lados) {
    for (const h of fondos) {
      if (k === iv && h === p.fondo) continue;
      const q: ParametrosLoteo =
        h === p.fondo ? p : { ...p, fondo: h, frente: Math.max(p.frente, (p.frente * p.fondo) / h) };
      const r = construirLoteo(pts, q, k);
      if (!r) continue;
      r.proporcional = h < p.fondo - 1e-9;
      if (mejorQue(r, mejor)) mejor = r;
    }
  }
  mejor.lotesSiParalelaVia = base.nLotes;
  return mejor;
}