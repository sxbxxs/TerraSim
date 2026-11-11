export type Punto = { lat: number; lng: number };

// Centro aproximado de Aguachica: confirmar en Google Maps
export const CENTRO_AGUACHICA: Punto = { lat: 8.3084, lng: -73.6162 };
export const RADIO_KM = 5;

const R = 6371008.8; // radio medio de la Tierra (m)
const rad = (g: number) => (g * Math.PI) / 180;

// Distancia en metros entre dos puntos (Haversine)
export function distanciaM(a: Punto, b: Punto): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function dentroDelRadio(p: Punto): boolean {
  return distanciaM(p, CENTRO_AGUACHICA) <= RADIO_KM * 1000;
}

// Área en m² (proyección local + fórmula del polígono). Precisa para terrenos pequeños.
export function areaM2(pts: Punto[]): number {
  if (pts.length < 3) return 0;
  const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const xy = pts.map((p) => ({
    x: R * rad(p.lng) * Math.cos(rad(lat0)),
    y: R * rad(p.lat),
  }));
  let suma = 0;
  for (let i = 0; i < xy.length; i++) {
    const j = (i + 1) % xy.length;
    suma += xy[i].x * xy[j].y - xy[j].x * xy[i].y;
  }
  return Math.abs(suma) / 2;
}

export function perimetroM(pts: Punto[]): number {
  if (pts.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    if (pts.length === 2 && i === 1) break;
    total += distanciaM(pts[i], pts[j]);
  }
  return total;
}

// Acepta "8.3084, -73.6162" (formato que copia Google Maps)
export function parsearCoordenadas(texto: string): Punto | null {
  const m = texto.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}