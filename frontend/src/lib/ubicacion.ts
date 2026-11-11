import { CENTRO_AGUACHICA, Punto, distanciaM, parsearCoordenadas } from "@/lib/geo";

// Una referencia de precio: un anuncio o una venta real de un lote en la zona
export type Comparable = {
  id: string;
  nombre: string;
  coordenadas: string; // "8.3084, -73.6162" (opcional)
  precio: number | null; // COP, precio total del lote
  area: number | null; // m² del lote
};

export type UsadoEnEstimacion = {
  nombre: string;
  precioM2: number;
  distanciaKm: number | null; // al terreno estudiado
  pesoPct: number;
};

export type Estimacion = {
  precioM2: number | null;
  metodo: "ponderado" | "promedio" | "ninguno";
  usados: UsadoEnEstimacion[];
  minM2: number | null;
  maxM2: number | null;
  avisos: string[];
  ignorados: string[]; // referencias a las que les falta precio o área
};

// Dato de partida: el anuncio que el usuario encontró (sin coordenadas todavía)
export const COMPARABLES_INICIALES: Comparable[] = [
  { id: "c1", nombre: "Avenida Cielo (anuncio, lote de 6×20)", coordenadas: "", precio: 85_000_000, area: 120 },
];

export function precioPorM2(c: Comparable): number | null {
  return c.precio !== null && c.precio > 0 && c.area !== null && c.area > 0 ? c.precio / c.area : null;
}

export function distanciaCentroKm(p: Punto): number {
  return distanciaM(p, CENTRO_AGUACHICA) / 1000;
}

const DISTANCIA_MINIMA_M = 100; // evita que una referencia pegada al terreno pese infinito

// Estima el precio por m² en el terreno con las referencias del usuario.
// Con coordenadas en todas: promedio ponderado por 1/distancia² (lo cercano pesa más).
// Si no, promedio simple. No inventa ninguna fórmula de precios.
export function estimarPrecioM2(comps: Comparable[], terreno: Punto | null): Estimacion {
  const validos: { nombre: string; pm2: number; pos: Punto | null }[] = [];
  const ignorados: string[] = [];
  for (const c of comps) {
    const pm2 = precioPorM2(c);
    if (pm2 === null) {
      ignorados.push(c.nombre || "Sin nombre");
      continue;
    }
    validos.push({ nombre: c.nombre || "Sin nombre", pm2, pos: parsearCoordenadas(c.coordenadas) });
  }

  const vacio: Estimacion = {
    precioM2: null, metodo: "ninguno", usados: [], minM2: null, maxM2: null,
    avisos: ["Agrega al menos una referencia con precio y área."], ignorados,
  };
  if (!validos.length) return vacio;

  const avisos: string[] = [];
  const todasConPos = validos.every((v) => v.pos !== null);
  const ponderar = terreno !== null && todasConPos;
  let usados: UsadoEnEstimacion[];

  if (ponderar && terreno) {
    const pesos = validos.map((v) => {
      const d = distanciaM(v.pos as Punto, terreno);
      return { v, d, w: 1 / Math.pow(Math.max(d, DISTANCIA_MINIMA_M), 2) };
    });
    const total = pesos.reduce((s, x) => s + x.w, 0);
    usados = pesos
      .map((x) => ({ nombre: x.v.nombre, precioM2: x.v.pm2, distanciaKm: x.d / 1000, pesoPct: (x.w / total) * 100 }))
      .sort((a, b) => b.pesoPct - a.pesoPct);

    const masCerca = Math.min(...usados.map((u) => u.distanciaKm ?? Infinity));
    if (masCerca > 3) avisos.push(`La referencia más cercana está a ${masCerca.toFixed(1)} km de tu terreno: el estimado es poco confiable.`);

    // la regla del usuario: más cerca del centro, más caro; más lejos, más barato
    const dcTerreno = distanciaCentroKm(terreno);
    const dcRefs = validos.map((v) => distanciaCentroKm(v.pos as Punto));
    if (dcTerreno < Math.min(...dcRefs) - 0.1) {
      avisos.push("Tu terreno está más cerca del centro que todas tus referencias: el precio real podría ser mayor. Agrega una referencia del centro.");
    } else if (dcTerreno > Math.max(...dcRefs) + 0.1) {
      avisos.push("Tu terreno está más lejos del centro que todas tus referencias: el precio real podría ser menor.");
    }
  } else {
    usados = validos.map((v) => ({
      nombre: v.nombre, precioM2: v.pm2,
      distanciaKm: terreno && v.pos ? distanciaM(v.pos, terreno) / 1000 : null,
      pesoPct: 100 / validos.length,
    }));
    if (!terreno) avisos.push("Dibuja un terreno para que las referencias más cercanas pesen más.");
    else if (!todasConPos) avisos.push("Para ponderar por distancia, pega las coordenadas de todas las referencias. Mientras tanto se usa el promedio simple.");
  }

  if (validos.length < 3) avisos.push(`Con ${validos.length} referencia${validos.length === 1 ? "" : "s"} el estimado es poco confiable; mientras más agregues, mejor.`);

  const precio = ponderar
    ? usados.reduce((s, u) => s + (u.precioM2 * u.pesoPct) / 100, 0)
    : validos.reduce((s, v) => s + v.pm2, 0) / validos.length;
  const ms = validos.map((v) => v.pm2);

  return {
    precioM2: precio,
    metodo: ponderar ? "ponderado" : "promedio",
    usados, minM2: Math.min(...ms), maxM2: Math.max(...ms), avisos, ignorados,
  };
}