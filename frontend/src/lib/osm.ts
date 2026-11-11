import type { Punto } from "@/lib/geo";

// Detección automática de las calles que rodean el terreno con datos de OpenStreetMap.
// Es una AYUDA: el usuario siempre puede corregir los lados a mano.

export type SegmentoVia = { a: Punto; b: Punto };

const SERVIDORES = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const TIPOS_VIA = "motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|track";

type RespuestaOverpass = {
  elements?: { type?: string; geometry?: { lat: number; lon: number }[] }[];
};

export function segmentosDeRespuesta(r: RespuestaOverpass): SegmentoVia[] {
  const out: SegmentoVia[] = [];
  for (const el of r.elements ?? []) {
    const g = el.geometry;
    if (!g || g.length < 2) continue;
    for (let i = 0; i + 1 < g.length; i++) {
      out.push({ a: { lat: g[i].lat, lng: g[i].lon }, b: { lat: g[i + 1].lat, lng: g[i + 1].lon } });
    }
  }
  return out;
}

export async function consultarViasOSM(puntos: Punto[], margenM = 60): Promise<SegmentoVia[]> {
  const lats = puntos.map((q) => q.lat);
  const lngs = puntos.map((q) => q.lng);
  const dLat = margenM / 111320;
  const dLng = margenM / (111320 * Math.cos((lats[0] * Math.PI) / 180));
  const s = Math.min(...lats) - dLat;
  const w = Math.min(...lngs) - dLng;
  const n = Math.max(...lats) + dLat;
  const e = Math.max(...lngs) + dLng;
  const consulta = `[out:json][timeout:20];way["highway"~"^(${TIPOS_VIA})$"](${s},${w},${n},${e});out geom;`;

  let ultimoError: unknown = null;
  for (const url of SERVIDORES) {
    try {
      const ctl = new AbortController();
      const temporizador = setTimeout(() => ctl.abort(), 20000);
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(consulta)}`,
        signal: ctl.signal,
      });
      clearTimeout(temporizador);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return segmentosDeRespuesta((await resp.json()) as RespuestaOverpass);
    } catch (err) {
      ultimoError = err;
    }
  }
  throw ultimoError instanceof Error ? ultimoError : new Error("No se pudo consultar OpenStreetMap");
}

// Un lado del terreno "tiene calle" si una vía corre casi paralela y cerca durante gran parte de su largo.
export function ladosConCalle(
  puntos: Punto[],
  vias: SegmentoVia[],
  opciones: { toleranciaM?: number; anguloMaxGrados?: number; coberturaMin?: number } = {}
): boolean[] {
  const { toleranciaM = 14, anguloMaxGrados = 25, coberturaMin = 0.6 } = opciones;
  const n = puntos.length;
  if (n < 3) return [];
  const lat0 = puntos.reduce((s, q) => s + q.lat, 0) / n;
  const lng0 = puntos.reduce((s, q) => s + q.lng, 0) / n;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const xy = (q: Punto) => ({ x: (q.lng - lng0) * kx, y: (q.lat - lat0) * 111320 });
  const segs = vias.map((v) => ({ a: xy(v.a), b: xy(v.b) }));
  const cosMin = Math.cos((anguloMaxGrados * Math.PI) / 180);

  const distA = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };

  const resultado: boolean[] = [];
  for (let k = 0; k < n; k++) {
    const A = xy(puntos[k]);
    const B = xy(puntos[(k + 1) % n]);
    const L = Math.hypot(B.x - A.x, B.y - A.y);
    if (L < 1) {
      resultado.push(false);
      continue;
    }
    const ux = (B.x - A.x) / L;
    const uy = (B.y - A.y) / L;
    const muestras = Math.max(5, Math.ceil(L / 2));
    let cubiertas = 0;
    for (let i = 0; i < muestras; i++) {
      const t = (i + 0.5) / muestras;
      const P = { x: A.x + ux * L * t, y: A.y + uy * L * t };
      const hay = segs.some((s) => {
        const sl = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
        if (sl < 0.5) return false;
        const paralelo = Math.abs(((s.b.x - s.a.x) * ux + (s.b.y - s.a.y) * uy) / sl) >= cosMin;
        return paralelo && distA(P, s.a, s.b) <= toleranciaM;
      });
      if (hay) cubiertas++;
    }
    resultado.push(cubiertas / muestras >= coberturaMin);
  }
  return resultado;
}