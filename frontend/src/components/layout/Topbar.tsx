import { Bell } from "lucide-react";

export default function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <h2 className="text-lg font-semibold text-slate-800">Aguachica, Cesar</h2>
      <div className="flex items-center gap-4">
        <Bell size={20} className="text-slate-500" />
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
            JP
          </div>
          <div className="text-sm leading-tight">
            <p className="font-medium text-slate-800">Juan Pérez</p>
            <p className="text-xs text-slate-500">Administrador</p>
          </div>
        </div>
      </div>
    </header>
  );
}