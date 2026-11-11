export const resumenSimulacion = {
  anioActual: 2026,
  anioFinal: 2050,
  escenario: "Crecimiento Normal",
  proximoEvento: "Ajuste de precios",
};

export const ingresosHogares = [
  { name: "Bajos", value: 30, color: "#ef4444" },
  { name: "Medios", value: 45, color: "#f59e0b" },
  { name: "Altos", value: 25, color: "#10b981" },
];

export const demandaZonas = [
  { zona: "Norte", demanda: 95 },
  { zona: "Centro", demanda: 75 },
  { zona: "Sur", demanda: 60 },
  { zona: "Este", demanda: 35 },
  { zona: "Oeste", demanda: 25 },
];

export const alertas = [
  {
    tipo: "warning" as const,
    texto: "La demanda en la zona Norte está muy alta. Se recomienda aumentar la oferta de terrenos.",
  },
  {
    tipo: "info" as const,
    texto: "En 3 años se proyecta déficit de terrenos en la zona Centro.",
  },
];

export const escenarios = [
  "Crecimiento Normal",
  "Crecimiento Acelerado",
  "Crisis Económica",
  "Desarrollo Sostenible",
];