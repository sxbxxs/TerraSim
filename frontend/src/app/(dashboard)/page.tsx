import { Users, Layers, DollarSign, TrendingUp } from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import ResumenSimulacion from "@/components/dashboard/ResumenSimulacion";
import IngresosDonut from "@/components/dashboard/IngresosDonut";
import DemandaZona from "@/components/dashboard/DemandaZona";
import Alertas from "@/components/dashboard/Alertas";
import EscenariosRapidos from "@/components/dashboard/EscenariosRapidos";

export default function VistaGeneral() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Población Total" value="12.540" delta="+3,2% este año" icon={Users} />
        <KpiCard title="Terrenos Disponibles" value="312" delta="-2,4% este año" positive={false} icon={Layers} />
        <KpiCard title="Precio Promedio m²" value="$1.250.000" delta="+5,6% este año" icon={DollarSign} />
        <KpiCard title="Valorización Estimada" value="8,4% anual" delta="Escenario base" icon={TrendingUp} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="flex h-96 items-center justify-center rounded-xl border bg-white text-slate-500 shadow-sm">
            Aquí irá el mapa de Google Maps
          </div>
          <EscenariosRapidos />
        </div>

        <div className="space-y-6">
          <ResumenSimulacion />
          <IngresosDonut />
          <DemandaZona />
          <Alertas />
        </div>
      </div>
    </div>
  );
}