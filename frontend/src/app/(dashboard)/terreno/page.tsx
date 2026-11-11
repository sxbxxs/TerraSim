import EstudioTerreno from "@/components/terreno/EstudioTerreno";

export default function Terreno() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Estudio de un terreno</h2>
        <p className="text-sm text-slate-500">
          Ubica el sector por coordenadas y dibuja el terreno para calcular su área.
        </p>
      </div>
      <EstudioTerreno />
    </div>
  );
}