import { ParametrosSimulacion } from "@/types";

// ⚠️ VALORES DE EJEMPLO: reemplazar con datos reales de Aguachica.
// Se usan pesos moderados; el script de MATLAB (8%, 5%, 3%) es muy agresivo.
export const sectores: ParametrosSimulacion[] = [
  {
    sector: "Avenida Cielo",
    valorInicial: 828000,
    areaM2: 1000,
    tasaBase: 0.02,
    horizonte: 10,
    infraestructura: { anioActivacion: 2, peso: 0.04, activo: true },
    usoSuelo: { anioActivacion: 3, peso: 0.03, activo: true },
    caracteristicas: { anioActivacion: 1, peso: 0.02, activo: true },
  },
  {
    sector: "Portal del Remanso",
    valorInicial: 650000,
    areaM2: 1000,
    tasaBase: 0.02,
    horizonte: 10,
    infraestructura: { anioActivacion: 3, peso: 0.04, activo: true },
    usoSuelo: { anioActivacion: 4, peso: 0.03, activo: true },
    caracteristicas: { anioActivacion: 1, peso: 0.02, activo: true },
  },
  {
    sector: "El Prado",
    valorInicial: 500000,
    areaM2: 1000,
    tasaBase: 0.02,
    horizonte: 10,
    infraestructura: { anioActivacion: 4, peso: 0.05, activo: true },
    usoSuelo: { anioActivacion: 5, peso: 0.03, activo: true },
    caracteristicas: { anioActivacion: 2, peso: 0.02, activo: true },
  },
];