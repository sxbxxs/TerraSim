import {
  Escenario,
  ParametrosSimulacion,
  ResultadoSimulacion,
  PuntoSerie,
} from "@/types";

const multiplicadorEscenario: Record<Escenario, number> = {
  pesimista: 0.5,
  base: 1,
  optimista: 1.3,
};

// Equivale a los bloques Step + Gain + Sum de Simulink
export function tasaEnAnio(
  p: ParametrosSimulacion,
  t: number,
  escenario: Escenario
): number {
  const f = (x: { anioActivacion: number; peso: number; activo: boolean }) =>
    x.activo && t >= x.anioActivacion ? x.peso : 0;

  const tasa =
    p.tasaBase + f(p.infraestructura) + f(p.usoSuelo) + f(p.caracteristicas);

  return tasa * multiplicadorEscenario[escenario];
}

export function simular(
  p: ParametrosSimulacion,
  escenario: Escenario
): ResultadoSimulacion {
  const paso = 0.05; // igual que MaxStep del script de MATLAB
  const serie: PuntoSerie[] = [];
  let valor = p.valorInicial;
  const pasosPorAnio = Math.round(1 / paso);

  for (let i = 0; i <= p.horizonte * pasosPorAnio; i++) {
    const t = i * paso;
    const tasa = tasaEnAnio(p, t, escenario);

    if (i % pasosPorAnio === 0) {
      serie.push({
        anio: Math.round(t),
        valorM2: valor,
        valorTotal: valor * p.areaM2,
        tasa,
      });
    }
    // solución exacta de dV/dt = tasa·V en un paso con tasa constante
    valor = valor * Math.exp(tasa * paso);
  }

  const ultimo = serie[serie.length - 1];
  const razon = ultimo.valorM2 / p.valorInicial;

  return {
    serie,
    valorFinalM2: ultimo.valorM2,
    valorFinalTotal: ultimo.valorTotal,
    plusvaliaPct: (razon - 1) * 100,
    tasaAnualEquivalente: (Math.pow(razon, 1 / p.horizonte) - 1) * 100,
  };
}