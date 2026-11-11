import { LucideIcon } from "lucide-react";

type Props = {
  titulo: string;
  descripcion: string;
  icon: LucideIcon;
};

export default function PaginaBase({ titulo, descripcion, icon: Icon }: Props) {
  return (
    <div className="flex h-96 flex-col items-center justify-center rounded-xl border bg-white text-center shadow-sm">
      <div className="mb-4 rounded-full bg-emerald-50 p-4 text-emerald-600">
        <Icon size={32} />
      </div>
      <h2 className="text-xl font-semibold text-slate-800">{titulo}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">{descripcion}</p>
      <span className="mt-4 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
        En construcción
      </span>
    </div>
  );
}