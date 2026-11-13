import { useCallback, useEffect, useState } from "react";
import type { Punto } from "@/lib/geo";

// Los tres terrenos que se comparan: A, B y C, dibujados donde el usuario quiera dentro de Aguachica
export type IdCandidato = "A" | "B" | "C";
export type Mercado = 0 | 1 | 2; // 0 = casas del mercado alto (zona 1), 1 = medio (zona 2), 2 = económico (zona 3)

export type Mejoras = { via: boolean; servicios: boolean; parque: boolean; usoSuelo: boolean };

export type Candidato = {
  id: IdCandidato;
  nombre: string;
  puntos: Punto[];
  precioCompra: number | null; // COP, lo que pide el dueño por todo el terreno
  yaExiste: Mejoras; // lo que el sector YA tiene (se activa desde el año 0 en el modelo de valorización)
  mercado: Mercado;
};

export const COLORES: Record<IdCandidato, string> = { A: "#2563eb", B: "#f59e0b", C: "#9333ea" };
export const IDS: IdCandidato[] = ["A", "B", "C"];
export const MEJORAS_NOMBRE: Record<keyof Mejoras, string> = {
  via: "vía pavimentada",
  servicios: "servicios públicos",
  parque: "parque y entorno",
  usoSuelo: "uso del suelo definido",
};

export const CANDIDATOS_INICIALES: Candidato[] = IDS.map((id) => ({
  id,
  nombre: `Terreno ${id}`,
  puntos: [],
  precioCompra: null,
  yaExiste: { via: false, servicios: false, parque: false, usoSuelo: false },
  mercado: 1,
}));

const CLAVE = "terrasim_candidatos";
const esNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

export function limpiarCandidatos(raw: unknown): Candidato[] {
  const lista = Array.isArray(raw) ? raw : [];
  return CANDIDATOS_INICIALES.map((base) => {
    const c = lista.find((x) => x && typeof x === "object" && (x as Record<string, unknown>).id === base.id) as Record<string, unknown> | undefined;
    if (!c) return base;
    const ye = (c.yaExiste && typeof c.yaExiste === "object" ? c.yaExiste : {}) as Record<string, unknown>;
    return {
      id: base.id,
      nombre: typeof c.nombre === "string" && c.nombre.trim() ? c.nombre : base.nombre,
      puntos: Array.isArray(c.puntos)
        ? c.puntos.filter((p): p is Punto => !!p && esNum((p as Punto).lat) && esNum((p as Punto).lng)).map((p) => ({ lat: p.lat, lng: p.lng }))
        : [],
      precioCompra: esNum(c.precioCompra) && c.precioCompra > 0 ? c.precioCompra : null,
      yaExiste: {
        via: ye.via === true, servicios: ye.servicios === true, parque: ye.parque === true, usoSuelo: ye.usoSuelo === true,
      },
      mercado: c.mercado === 0 || c.mercado === 2 ? c.mercado : 1,
    };
  });
}

export function leerCandidatosGuardados(): Candidato[] {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? limpiarCandidatos(JSON.parse(raw)) : CANDIDATOS_INICIALES;
  } catch {
    return CANDIDATOS_INICIALES;
  }
}

export function useCandidatos() {
  const [candidatos, setCandidatos] = useState<Candidato[]>(CANDIDATOS_INICIALES);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setCandidatos(leerCandidatosGuardados());
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(candidatos));
    } catch {
      // almacenamiento lleno o bloqueado
    }
  }, [listo, candidatos]);

  const cambiar = useCallback((id: IdCandidato, f: (c: Candidato) => Candidato) => {
    setCandidatos((lista) => lista.map((c) => (c.id === id ? f(c) : c)));
  }, []);
  const agregarPunto = useCallback((id: IdCandidato, p: Punto) => cambiar(id, (c) => ({ ...c, puntos: [...c.puntos, p] })), [cambiar]);
  const deshacerPunto = useCallback((id: IdCandidato) => cambiar(id, (c) => ({ ...c, puntos: c.puntos.slice(0, -1) })), [cambiar]);
  const borrarTerreno = useCallback((id: IdCandidato) => cambiar(id, (c) => ({ ...c, puntos: [] })), [cambiar]);

  return { candidatos, listo, cambiar, agregarPunto, deshacerPunto, borrarTerreno };
}