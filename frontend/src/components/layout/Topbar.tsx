"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { usuarioActual, cerrarSesion } from "@/lib/auth";

export default function Topbar() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    setNombre(usuarioActual()?.nombre ?? "");
  }, []);

  const iniciales = nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const salir = () => {
    cerrarSesion();
    router.replace("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <h2 className="text-lg font-semibold text-slate-800">Aguachica, Cesar</h2>
      <div className="flex items-center gap-4">
        <Bell size={20} className="text-slate-500" />
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
            {iniciales || "?"}
          </div>
          <p className="text-sm font-medium text-slate-800">{nombre}</p>
        </div>
        <button onClick={salir} title="Cerrar sesión" className="text-slate-500 hover:text-red-600">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}