import { PARAMS_SISMO, ParametrosSismo } from "@/lib/sismo";

// Los supuestos del riesgo sísmico se guardan para que el panel de sismo, Configuración y el informe usen los mismos
const CLAVE = "terrasim_sismo";
const pos = (x: unknown, def: number) => (typeof x === "number" && Number.isFinite(x) && x > 0 ? x : def);
const noNeg = (x: unknown, def: number) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : def);

export function limpiarSismo(raw: unknown): ParametrosSismo {
  const b = PARAMS_SISMO;
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const m = (d.medianaColapso && typeof d.medianaColapso === "object" ? d.medianaColapso : {}) as Record<string, unknown>;
  return {
    aa: pos(d.aa, b.aa),
    periodoRetorno: pos(d.periodoRetorno, b.periodoRetorno),
    tipo: d.tipo === "informal" ? "informal" : "formal",
    medianaColapso: { formal: pos(m.formal, b.medianaColapso.formal), informal: pos(m.informal, b.medianaColapso.informal) },
    dispersion: pos(d.dispersion, b.dispersion),
    razonDano: Math.min(1, pos(d.razonDano, b.razonDano)),
    medianaVia: pos(d.medianaVia, b.medianaVia),
    perdidaDanoPct: Math.min(100, noNeg(d.perdidaDanoPct, b.perdidaDanoPct)),
    caidaSueloPct: Math.min(100, noNeg(d.caidaSueloPct, b.caidaSueloPct)),
  };
}

export function leerSismoGuardado(): ParametrosSismo {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? limpiarSismo(JSON.parse(raw)) : PARAMS_SISMO;
  } catch {
    return PARAMS_SISMO;
  }
}

export function guardarSismo(p: ParametrosSismo) {
  try {
    // no crea el dato solo para guardar los valores por defecto
    if (localStorage.getItem(CLAVE) === null && JSON.stringify(p) === JSON.stringify(PARAMS_SISMO)) return;
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    // almacenamiento lleno o bloqueado
  }
}