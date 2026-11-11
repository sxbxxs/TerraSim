export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-[#0f1b2d] p-10 text-white lg:flex">
        <div>
          <h1 className="text-3xl font-bold">TerraSim</h1>
          <p className="text-sm text-slate-400">Simulador de acceso a terrenos</p>
        </div>
        <div>
          <p className="text-2xl font-semibold leading-snug">
            Evalúa la valorización y el potencial de un terreno antes de invertir.
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Proyecciones a corto, mediano y largo plazo para Aguachica, Cesar.
          </p>
        </div>
        <p className="text-xs text-slate-500">Proyecto Integrador 2</p>
      </div>
      <div className="flex items-center justify-center bg-slate-50 p-6">{children}</div>
    </div>
  );
}