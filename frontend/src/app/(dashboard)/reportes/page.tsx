import { FileText } from "lucide-react";
import PaginaBase from "@/components/layout/PaginaBase";

export default function Reportes() {
  return (
    <PaginaBase
      titulo="Reportes"
      descripcion="Aquí podrás exportar en PDF el estudio de cada sector: proyección, escenarios y recomendaciones."
      icon={FileText}
    />
  );
}