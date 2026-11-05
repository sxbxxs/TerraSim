export type Escenario = "pesimista" | "base" | "optimista";

export type Factor = {
  anioActivacion: number; // año en que la mejora entra en vigor
  peso: number; // efecto anual sobre la tasa (0.08 = 8%)
  activo: boolean;
};

export type ParametrosSimulacion = {
  sector: string;
  valorInicial: number; // COP/m²
  areaM2: number;
  tasaBase: number;
  horizonte: number; // años
  infraestructura: Factor;
  usoSuelo: Factor;
  caracteristicas: Factor;
};

export type PuntoSerie = {
  anio: number;
  valorM2: number;
  valorTotal: number;
  tasa: number;
};

export type ResultadoSimulacion = {
  serie: PuntoSerie[];
  valorFinalM2: number;
  valorFinalTotal: number;
  plusvaliaPct: number;
  tasaAnualEquivalente: number;
};