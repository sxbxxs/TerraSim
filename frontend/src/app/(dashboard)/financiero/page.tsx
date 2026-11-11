import AnalisisFinanciero from "@/components/financiero/AnalisisFinanciero";

export default function Financiero() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Análisis financiero</h2>
        <p className="text-sm text-slate-500">
          Cuánto se gana con tu terreno si compras y esperas, vendes lotes o construyes casas.
        </p>
      </div>
      <AnalisisFinanciero />
    </div>
  );
}