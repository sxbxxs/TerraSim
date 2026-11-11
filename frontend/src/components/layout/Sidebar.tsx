"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map, Layers, LineChart, GitCompare, FileText, Settings } from "lucide-react";

const items = [
  { href: "/", label: "Vista General", icon: LayoutDashboard },
  { href: "/mapa", label: "Mapa", icon: Map },
  { href: "/terrenos", label: "Terrenos", icon: Layers },
  { href: "/simulaciones", label: "Simulaciones", icon: LineChart },
  { href: "/comparador", label: "Comparador", icon: GitCompare },
  { href: "/reportes", label: "Reportes", icon: FileText },
  { href: "/terreno", label: "Estudio de terreno", icon: Map },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-64 flex-col bg-[#0f1b2d] text-slate-200">
      <div className="px-6 py-5">
        <h1 className="text-2xl font-bold text-white">TerraSim</h1>
        <p className="text-xs text-slate-400">Simulador de acceso a terrenos</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${
                active ? "bg-emerald-600 text-white" : "hover:bg-white/10"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4">
        <Link
          href="/simulaciones"
          className="block w-full rounded-lg bg-emerald-600 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Nueva Simulación
        </Link>
      </div>
    </aside>
  );
}