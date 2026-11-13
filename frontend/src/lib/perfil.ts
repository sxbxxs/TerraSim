// Datos que aparecen en la primera hoja del informe en PDF
export type DatosInforme = { proyecto: string; organizacion: string; analista: string };

export const DATOS_INFORME_VACIOS: DatosInforme = { proyecto: "", organizacion: "", analista: "" };

const CLAVE = "terrasim_perfil";
const limpio = (x: unknown) => (typeof x === "string" ? x.trim().slice(0, 80) : "");

export function limpiarDatosInforme(raw: unknown): DatosInforme {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { proyecto: limpio(d.proyecto), organizacion: limpio(d.organizacion), analista: limpio(d.analista) };
}

export function leerDatosInforme(): DatosInforme {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? limpiarDatosInforme(JSON.parse(raw)) : DATOS_INFORME_VACIOS;
  } catch {
    return DATOS_INFORME_VACIOS;
  }
}

export function guardarDatosInforme(d: DatosInforme) {
  try {
    // no crea el dato solo para guardar campos vacíos
    if (localStorage.getItem(CLAVE) === null && !d.proyecto && !d.organizacion && !d.analista) return;
    localStorage.setItem(CLAVE, JSON.stringify(d));
  } catch {
    // almacenamiento lleno o bloqueado
  }
}