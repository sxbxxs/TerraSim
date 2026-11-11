/// <reference types="google.maps" />
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { APIProvider, Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import { CENTRO_AGUACHICA, RADIO_KM, Punto } from "@/lib/geo";
import type { ResultadoLoteo } from "@/lib/lotes";
import type { EstadoAnio, EtapaLote } from "@/lib/progreso";

export type Foco = { lat: number; lng: number; zoom: number };

// Estado de una casa después de un sismo (lo usa la parte 2)
type Danio = "ok" | "danada" | "destruida";

type ObjetosCalle = {
  poly: google.maps.Polygon;
  asfalto: google.maps.Polygon | null;
  lineas: google.maps.Polyline[];
};
type ObjetosLote = {
  suelo: google.maps.Polygon;
  huella: google.maps.Polygon;
  techo: google.maps.Polygon;
  arboles: google.maps.Circle[];
  x1: google.maps.Polyline; // las dos diagonales marcan la casa destruida
  x2: google.maps.Polyline;
  grieta: google.maps.Polyline; // grieta en el techo de la casa dañada
};

// Colores del techo terminado: [gris, azul, teja, gris oscuro] x [fila hacia la calle de abajo, de arriba]
const COLORES_TECHO: [string, string][] = [
  ["#d4d7dc", "#bcc1c8"],
  ["#7fa7d9", "#6a93c7"],
  ["#d9573f", "#c04a33"],
  ["#80868e", "#6d737b"],
];

const punto = (a: Punto, b: Punto, t: number): Punto => ({
  lat: a.lat + (b.lat - a.lat) * t,
  lng: a.lng + (b.lng - a.lng) * t,
});

// Línea quebrada que cruza la casa de un lado al otro, en zigzag
function zigzag(h: Punto[]): Punto[] {
  const m01 = punto(h[0], h[1], 0.5);
  const m23 = punto(h[2], h[3], 0.5);
  const sLat = (h[1].lat - h[0].lat) / 2;
  const sLng = (h[1].lng - h[0].lng) / 2;
  return [0, 0.35, -0.3, 0.3, 0].map((off, s) => {
    const base = punto(m01, m23, s / 4);
    return { lat: base.lat + sLat * off, lng: base.lng + sLng * off };
  });
}

type CapaProps = {
  foco: Foco;
  puntos: Punto[];
  loteo: ResultadoLoteo | null;
  etapas: EtapaLote[];
  estado: EstadoAnio;
  ladoVia: number;
  ladosCalle?: number[]; // lados del terreno que ya tienen calle (si no se pasa, solo ladoVia)
  danos?: Danio[]; // por lote, después de un sismo
  grietas?: Punto[][]; // grietas en las calles después de un sismo
};

type EnHover = (i: number | null, ev?: MouseEvent) => void;

function Capa({ foco, puntos, loteo, etapas, estado, ladoVia, ladosCalle, danos, grietas, onHover }: CapaProps & { onHover: EnHover }) {
  const map = useMap();
  const callesRef = useRef<ObjetosCalle[]>([]);
  const lotesRef = useRef<ObjetosLote[]>([]);
  const hoverRef = useRef<EnHover>(onHover);
  useEffect(() => {
    hoverRef.current = onHover;
  });
  const pavimentada = estado.via;
  const parque = estado.parque;
  const claveLados = (ladosCalle ?? [ladoVia]).join(",");

  useEffect(() => {
    if (!map) return;
    map.panTo({ lat: foco.lat, lng: foco.lng });
    map.setZoom(foco.zoom);
  }, [map, foco]);

  // Círculo de 5 km
  useEffect(() => {
    if (!map) return;
    const c = new google.maps.Circle({
      map,
      center: CENTRO_AGUACHICA,
      radius: RADIO_KM * 1000,
      strokeColor: "#10b981",
      strokeWeight: 2,
      strokeOpacity: 0.9,
      fillOpacity: 0.04,
      fillColor: "#10b981",
      clickable: false,
    });
    return () => c.setMap(null);
  }, [map]);

  // Contorno del terreno y vértices
  useEffect(() => {
    if (!map) return;
    const poly = new google.maps.Polygon({
      map,
      paths: puntos,
      strokeColor: "#facc15",
      strokeWeight: 3,
      fillColor: "#facc15",
      fillOpacity: 0.05,
      clickable: false,
      zIndex: 1,
    });
    const vertices = puntos.map(
      (p) =>
        new google.maps.Circle({
          map,
          center: p,
          radius: 1.5,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          fillColor: "#ef4444",
          fillOpacity: 1,
          clickable: false,
          zIndex: 10,
        })
    );
    return () => {
      poly.setMap(null);
      vertices.forEach((v) => v.setMap(null));
    };
  }, [map, puntos]);

  // Lados que ya tienen calle (línea azul)
  useEffect(() => {
    if (!map || puntos.length < 3) return;
    const n = puntos.length;
    const lados = claveLados === "" ? [] : claveLados.split(",").map(Number);
    const lineas = lados.map((k) => {
      const i = ((k % n) + n) % n;
      return new google.maps.Polyline({
        map,
        path: [puntos[i], puntos[(i + 1) % n]],
        strokeColor: "#38bdf8",
        strokeWeight: 4,
        clickable: false,
        zIndex: 8,
      });
    });
    return () => lineas.forEach((l) => l.setMap(null));
  }, [map, puntos, claveLados]);

  // Calles: geometría
  useEffect(() => {
    if (!map || !loteo) return;
    const objs: ObjetosCalle[] = loteo.calles.map((c) => ({
      poly: new google.maps.Polygon({
        map,
        paths: c.coords,
        strokeWeight: 0,
        fillColor: "#b8956a",
        fillOpacity: 0.35,
        clickable: false,
        zIndex: 2,
      }),
      asfalto: c.asfalto
        ? new google.maps.Polygon({
            map,
            paths: c.asfalto,
            strokeWeight: 0,
            fillColor: "#4b5563",
            fillOpacity: 0.96,
            clickable: false,
            visible: false,
            zIndex: 3,
          })
        : null,
      lineas: c.ejes.map(
        (eje) =>
          new google.maps.Polyline({
            map,
            path: eje,
            strokeOpacity: 0,
            clickable: false,
            visible: false,
            zIndex: 4,
            icons: [
              {
                icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: "#fef3c7", scale: 2 },
                offset: "0",
                repeat: "16px",
              },
            ],
          })
      ),
    }));
    callesRef.current = objs;
    return () => {
      objs.forEach((o) => {
        o.poly.setMap(null);
        o.asfalto?.setMap(null);
        o.lineas.forEach((l) => l.setMap(null));
      });
      callesRef.current = [];
    };
  }, [map, loteo]);

  // Calles: tierra o asfalto según el año
  useEffect(() => {
    callesRef.current.forEach((o) => {
      if (!pavimentada) {
        o.poly.setOptions({ fillColor: "#b8956a", fillOpacity: 0.35, strokeWeight: 0 });
      } else if (o.asfalto) {
        // andenes de concreto a los lados y calzada de asfalto en el centro
        o.poly.setOptions({ fillColor: "#cbd5e1", fillOpacity: 0.92, strokeColor: "#94a3b8", strokeOpacity: 0.9, strokeWeight: 1 });
      } else {
        o.poly.setOptions({ fillColor: "#4b5563", fillOpacity: 0.92, strokeColor: "#d1d5db", strokeOpacity: 0.9, strokeWeight: 1 });
      }
      o.asfalto?.setVisible(pavimentada);
      o.lineas.forEach((l) => l.setVisible(pavimentada));
    });
  }, [map, loteo, pavimentada]);

  // Grietas en las calles después de un sismo
  useEffect(() => {
    if (!map || !grietas) return;
    const lineas = grietas.map(
      (path) =>
        new google.maps.Polyline({
          map,
          path,
          strokeColor: "#ef4444",
          strokeWeight: 3,
          clickable: false,
          zIndex: 9,
        })
    );
    return () => lineas.forEach((l) => l.setMap(null));
  }, [map, grietas]);

  // Lotes y casas: geometría
  useEffect(() => {
    if (!map || !loteo) return;
    const objs: ObjetosLote[] = loteo.lotes.map((l, i) => {
      const suelo = new google.maps.Polygon({
        map,
        paths: l.coords,
        strokeColor: "#ffffff",
        strokeOpacity: 0.8,
        strokeWeight: 1,
        fillColor: "#e2e8f0",
        fillOpacity: 0.12,
        clickable: true, // para poder mostrar los valores al pasar el cursor
        zIndex: 3,
      });
      suelo.addListener("mouseover", (e: google.maps.MapMouseEvent) => hoverRef.current(i, e.domEvent as MouseEvent));
      suelo.addListener("mousemove", (e: google.maps.MapMouseEvent) => hoverRef.current(i, e.domEvent as MouseEvent));
      suelo.addListener("mouseout", () => hoverRef.current(null));
      return {
        suelo,
        huella: new google.maps.Polygon({
          map,
          paths: l.huella,
          strokeColor: "#374151",
          strokeWeight: 1,
          fillColor: "#9ca3af",
          fillOpacity: 0.9,
          clickable: false,
          visible: false,
          zIndex: 4,
        }),
        techo: new google.maps.Polygon({
          map,
          paths: l.techo,
          strokeColor: "#6b7280",
          strokeOpacity: 0.75,
          strokeWeight: 1,
          fillColor: COLORES_TECHO[l.tono][l.lado === "bajo" ? 0 : 1],
          fillOpacity: 0.97,
          clickable: false,
          visible: false,
          zIndex: 5,
        }),
        arboles:
          l.tipo === "verde"
            ? l.arboles.map(
                (c) =>
                  new google.maps.Circle({
                    map,
                    center: c,
                    radius: 1.2,
                    strokeColor: "#14532d",
                    strokeWeight: 1,
                    fillColor: "#166534",
                    fillOpacity: 0.9,
                    clickable: false,
                    visible: false,
                    zIndex: 6,
                  })
              )
            : [],
        x1: new google.maps.Polyline({ map, path: [l.huella[0], l.huella[2]], strokeColor: "#dc2626", strokeWeight: 2, clickable: false, visible: false, zIndex: 8 }),
        x2: new google.maps.Polyline({ map, path: [l.huella[1], l.huella[3]], strokeColor: "#dc2626", strokeWeight: 2, clickable: false, visible: false, zIndex: 8 }),
        grieta: new google.maps.Polyline({ map, path: zigzag(l.huella), strokeColor: "#7f1d1d", strokeWeight: 2, clickable: false, visible: false, zIndex: 8 }),
      };
    });
    lotesRef.current = objs;
    return () => {
      objs.forEach((o) => {
        o.suelo.setMap(null);
        o.huella.setMap(null);
        o.techo.setMap(null);
        o.arboles.forEach((c) => c.setMap(null));
        o.x1.setMap(null);
        o.x2.setMap(null);
        o.grieta.setMap(null);
      });
      lotesRef.current = [];
    };
  }, [map, loteo]);

  // Lotes y casas: etapa de obra y daños según el año (no recrea nada)
  useEffect(() => {
    if (!loteo) return;
    lotesRef.current.forEach((o, i) => {
      const l = loteo.lotes[i];
      if (!l) return;

      if (l.tipo === "verde") {
        o.suelo.setOptions(
          parque ? { fillColor: "#4ade80", fillOpacity: 0.6 } : { fillColor: "#bbf7d0", fillOpacity: 0.18 }
        );
        o.arboles.forEach((c) => c.setVisible(parque));
        return;
      }

      const etapa = etapas[i] ?? "vacio";
      const danio: Danio = danos && danos.length === loteo.lotes.length ? danos[i] : "ok";
      o.suelo.setOptions(
        etapa === "vacio" ? { fillColor: "#e2e8f0", fillOpacity: 0.12 } : { fillColor: "#d6d3a0", fillOpacity: 0.28 }
      );

      if (danio === "destruida") {
        // escombros: la casa queda aplastada y marcada con una X
        o.huella.setOptions({ visible: true, fillColor: "#57534e", fillOpacity: 0.95, strokeColor: "#1c1917" });
        o.techo.setVisible(false);
        o.x1.setVisible(true);
        o.x2.setVisible(true);
        o.grieta.setVisible(false);
        return;
      }

      o.x1.setVisible(false);
      o.x2.setVisible(false);
      o.huella.setOptions({ fillOpacity: 0.9 });
      if (etapa === "vacio") o.huella.setOptions({ visible: false });
      else if (etapa === "cimentacion") o.huella.setOptions({ visible: true, fillColor: "#9ca3af", strokeColor: "#374151" });
      else if (etapa === "estructura") o.huella.setOptions({ visible: true, fillColor: "#c2763b", strokeColor: "#7c2d12" });
      else o.huella.setOptions({ visible: true, fillColor: "#e5e7eb", strokeColor: "#374151" });

      o.techo.setOptions({
        visible: etapa === "casa",
        fillColor: danio === "danada" ? "#9a3412" : COLORES_TECHO[l.tono][l.lado === "bajo" ? 0 : 1],
      });
      o.grieta.setVisible(etapa === "casa" && danio === "danada");
    });
  }, [map, loteo, etapas, parque, danos]);

  return null;
}

type Props = CapaProps & {
  onClickMapa: (p: Punto) => void;
  soloLectura?: boolean;
  detalle?: (i: number) => string[] | null; // texto que se muestra al pasar el cursor sobre un lote
};

export default function MapaSelector({ onClickMapa, soloLectura, detalle, ...capa }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const contenedor = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; lineas: string[] } | null>(null);

  const onHover = useCallback<EnHover>(
    (i, ev) => {
      if (i === null || !ev || !contenedor.current) {
        setTip(null);
        return;
      }
      const lineas = detalle ? detalle(i) : null;
      if (!lineas) {
        setTip(null);
        return;
      }
      const r = contenedor.current.getBoundingClientRect();
      setTip({ x: ev.clientX - r.left, y: ev.clientY - r.top, lineas });
    },
    [detalle]
  );

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
        Falta <code className="mx-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> en
        <code className="mx-1">frontend/.env.local</code>. Reinicia el servidor al crearla.
      </div>
    );
  }

  const ancho = contenedor.current?.clientWidth ?? 800;
  const alto = contenedor.current?.clientHeight ?? 500;

  return (
    <div ref={contenedor} className="relative h-full w-full">
      <APIProvider apiKey={apiKey}>
        <GoogleMap
          defaultCenter={{ lat: capa.foco.lat, lng: capa.foco.lng }}
          defaultZoom={capa.foco.zoom}
          mapTypeId="hybrid"
          gestureHandling="greedy"
          disableDoubleClickZoom
          draggableCursor={soloLectura ? undefined : "crosshair"}
          onClick={(e) => {
            const ll = e.detail.latLng;
            if (ll && !soloLectura) onClickMapa({ lat: ll.lat, lng: ll.lng });
          }}
        >
          <Capa {...capa} onHover={onHover} />
        </GoogleMap>
      </APIProvider>

      {tip && (
        <div
          className="pointer-events-none absolute z-20 w-60 rounded-lg bg-slate-900/95 p-2 text-xs text-white shadow-lg"
          style={{ left: Math.max(4, Math.min(tip.x + 14, ancho - 250)), top: Math.max(4, Math.min(tip.y + 14, alto - 140)) }}
        >
          {tip.lineas.map((t, k) => (
            <p key={k} className={k === 0 ? "mb-1 font-semibold" : "leading-snug text-slate-200"}>
              {t}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}