"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registrar } from "@/lib/auth";

const input =
  "w-full rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";

export default function Registro() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    const r = registrar({ nombre, correo, password });
    if (!r.ok) {
      setError(r.error ?? "No se pudo crear la cuenta.");
      return;
    }
    router.push("/");
  };

  return (
    <form onSubmit={enviar} className="w-full max-w-sm space-y-6 rounded-xl border bg-white p-8 shadow-sm">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Crear cuenta</h2>
        <p className="text-sm text-slate-500">Crea tu cuenta para guardar tus simulaciones</p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Nombre o empresa</span>
          <input required className={input} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Correo</span>
          <input required type="email" className={input} value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Contraseña</span>
          <input required type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        Crear cuenta
      </button>

      <p className="text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}