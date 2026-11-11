import { Map } from "lucide-react";
import PaginaBase from "@/components/layout/PaginaBase";

export default function Mapa() {
  return (
    <PaginaBase
      titulo="Mapa de terrenos"
      descripcion="Aquí irá el mapa de Google con búsqueda, dibujo del polígono del terreno y los 3 sectores de Aguachica."
      icon={Map}
    />
  );
}