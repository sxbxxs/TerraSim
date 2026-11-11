// Archivos en frontend/public: logo.jpg (logo completo, ancho) e icono.png (la T, cuadrado)
type Props = {
  variante?: "icono" | "completo";
  size?: number; // icono: lado en px · completo: ancho en px
};

export default function Logo({ variante = "icono", size = 40 }: Props) {
  if (variante === "completo") {
    // El JPEG no tiene transparencia: se muestra sobre una tarjeta blanca para que se vea bien en fondos oscuros
    return (
      <span className="inline-block rounded-2xl bg-white p-3 shadow-lg" style={{ width: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="TerraSim" className="block h-auto w-full" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/icono.png" alt="TerraSim" width={size} height={size} className="shrink-0" />;
}