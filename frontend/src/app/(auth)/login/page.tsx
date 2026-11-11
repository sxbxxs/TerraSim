"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { iniciarSesion } from "@/lib/auth";

const input =
  "w-full rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";

export default function Login() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const r = iniciarSesion(correo, password);
    if (!r.ok) {
      setError(r.error ?? "No se pudo iniciar sesión.");
      return;
    }
    router.push("/");
  };

  return (
    <form onSubmit={enviar} className="w-full max-w-sm space-y-6 rounded-xl border bg-white p-8 shadow-sm">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Iniciar sesión</h2>
        <p className="text-sm text-slate-500">Ingresa a tu cuenta de TerraSim</p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Correo</span>
          <input required type="email" className={input} value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="tu@correo.com" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Contraseña</span>
          <input required type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        Entrar
      </button>

      <p className="text-center text-sm text-slate-500">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-emerald-700 hover:underline">
          Regístrate
        </Link>
      </p>
    </form>
  );
}