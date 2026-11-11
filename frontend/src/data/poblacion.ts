// Proyecciones DANE de Aguachica (habitantes), vía telencuestas.com.
// VERIFICAR en dane.gov.co antes de presentar.
export const poblacionAguachica: Record<number, number> = {
  2025: 135087,
  2026: 137624,
  2027: 140057,
  2028: 142421,
  2029: 144726,
  2030: 146984,
  2036: 159552,
};

export const FUENTE_POBLACION =
  "Proyecciones DANE (vía telencuestas.com). Años 2031-2035 interpolados.";

const anios = Object.keys(poblacionAguachica).map(Number).sort((a, b) => a - b);

export function poblacionEn(anio: number): { valor: number; estimado: boolean } {
  const exacto = poblacionAguachica[anio];
  if (exacto) return { valor: exacto, estimado: false };

  const primero = anios[0];
  const ultimo = anios[anios.length - 1];

  if (anio < primero) return { valor: poblacionAguachica[primero], estimado: true };

  if (anio > ultimo) {
    const g = tasaCrecimiento(ultimo - 6, ultimo);
    return { valor: Math.round(poblacionAguachica[ultimo] * Math.pow(1 + g, anio - ultimo)), estimado: true };
  }

  const a0 = [...anios].reverse().find((a) => a < anio)!;
  const a1 = anios.find((a) => a > anio)!;
  const g = Math.pow(poblacionAguachica[a1] / poblacionAguachica[a0], 1 / (a1 - a0)) - 1;
  return { valor: Math.round(poblacionAguachica[a0] * Math.pow(1 + g, anio - a0)), estimado: true };
}

export function tasaCrecimiento(desde: number, hasta: number): number {
  const p0 = poblacionEn(desde).valor;
  const p1 = poblacionEn(hasta).valor;
  return Math.pow(p1 / p0, 1 / (hasta - desde)) - 1;
}