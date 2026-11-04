import { Users, Layers, DollarSign, TrendingUp } from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";

export default function VistaGeneral() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Población Total" value="12.540" delta="+3,2% este año" icon={Users} />
        <KpiCard title="Terrenos Disponibles" value="312" delta="-2,4% este año" positive={false} icon={Layers} />
        <KpiCard title="Precio Promedio m²" value="$1.250.000" delta="+5,6% este año" icon={DollarSign} />
        <KpiCard title="Valorización Estimada" value="8,4% anual" delta="Escenario base" icon={TrendingUp} />
      </div>
      <div className="rounded-xl border bg-white p-6 text-slate-500">
        Aquí irá el mapa de Google Maps
      </div>
    </div>
  );
}