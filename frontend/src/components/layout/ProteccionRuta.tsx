"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usuarioActual } from "@/lib/auth";

export default function ProteccionRuta({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!usuarioActual()) {
      router.replace("/login");
    } else {
      setListo(true);
    }
  }, [router]);

  if (!listo) return null;
  return <>{children}</>;
}