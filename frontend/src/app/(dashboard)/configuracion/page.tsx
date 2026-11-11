import { Settings } from "lucide-react";
import PaginaBase from "@/components/layout/PaginaBase";

export default function Configuracion() {
  return (
    <PaginaBase
      titulo="Configuración"
      descripcion="Aquí se ajustarán los parámetros globales del modelo, el perfil de usuario y las preferencias."
      icon={Settings}
    />
  );
}