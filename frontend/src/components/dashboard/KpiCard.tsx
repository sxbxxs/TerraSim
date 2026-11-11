import { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  value: string;
  delta: string;
  positive?: boolean;
  icon: LucideIcon;
};

export default function KpiCard({ title, value, delta, positive = true, icon: Icon }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm">
      <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className={`text-xs ${positive ? "text-emerald-600" : "text-red-500"}`}>{delta}</p>
      </div>
    </div>
  );
}