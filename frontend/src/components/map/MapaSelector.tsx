/// <reference types="google.maps" />
"use client";
import { useEffect, useRef } from "react";
import { APIProvider, Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import { CENTRO_AGUACHICA, RADIO_KM, Punto } from "@/lib/geo";
import type { ResultadoLoteo } from "@/lib/lotes";
import type { EstadoAnio, EtapaLote } from "@/lib/progreso";

export type Foco = { lat: number; lng: number; zoom: number };

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
};

// Colores del techo terminado: [gris, azul, teja, gris oscuro] x [fila hacia la calle de abajo, de arriba]
const COLORES_TECHO: [string, string][] = [
  ["#d4d7dc", "#bcc1c8"],
  ["#7fa7d9", "#6a93c7"],
  ["#d9573f", "#c04a33"],
  ["#80868e", "#6d737b"],
];

type CapaProps = {
  foco: Foco;
  puntos: Punto[];
  loteo: ResultadoLoteo | null;
  etapas: EtapaLote[];
  estado: EstadoAnio;
  ladoVia: number;
};

function Capa({ foco, puntos, loteo, etapas, estado, ladoVia }: CapaProps) {
  const map = useMap();
  const callesRef = useRef<ObjetosCalle[]>([]);
  const lotesRef = useRef<ObjetosLote[]>([]);
  const pavimentada = estado.via;
  const parque = estado.parque;

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

  // Lado que da a la vía
  useEffect(() => {
    if (!map || puntos.length < 3) return;
    const n = puntos.length;
    const i = ((ladoVia % n) + n) % n;
    const linea = new google.maps.Polyline({
      map,
      path: [puntos[i], puntos[(i + 1) % n]],
      strokeColor: "#38bdf8",
      strokeWeight: 4,
      clickable: false,
      zIndex: 8,
    });
    return () => linea.setMap(null);
  }, [map, puntos, ladoVia]);

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

  // Lotes y casas: geometría
  useEffect(() => {
    if (!map || !loteo) return;
    const objs: ObjetosLote[] = loteo.lotes.map((l) => ({
      suelo: new google.maps.Polygon({
        map,
        paths: l.coords,
        strokeColor: "#ffffff",
        strokeOpacity: 0.8,
        strokeWeight: 1,
        fillColor: "#e2e8f0",
        fillOpacity: 0.12,
        clickable: false,
        zIndex: 3,
      }),
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
    }));
    lotesRef.current = objs;
    return () => {
      objs.forEach((o) => {
        o.suelo.setMap(null);
        o.huella.setMap(null);
        o.techo.setMap(null);
        o.arboles.forEach((c) => c.setMap(null));
      });
      lotesRef.current = [];
    };
  }, [map, loteo]);

  // Lotes y casas: etapa de obra según el año (no recrea nada)
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
      o.suelo.setOptions(
        etapa === "vacio" ? { fillColor: "#e2e8f0", fillOpacity: 0.12 } : { fillColor: "#d6d3a0", fillOpacity: 0.28 }
      );

      if (etapa === "vacio") o.huella.setOptions({ visible: false });
      else if (etapa === "cimentacion") o.huella.setOptions({ visible: true, fillColor: "#9ca3af", strokeColor: "#374151" });
      else if (etapa === "estructura") o.huella.setOptions({ visible: true, fillColor: "#c2763b", strokeColor: "#7c2d12" });
      else o.huella.setOptions({ visible: true, fillColor: "#e5e7eb", strokeColor: "#374151" });

      o.techo.setVisible(etapa === "casa");
    });
  }, [map, loteo, etapas, parque]);

  return null;
}

type Props = CapaProps & { onClickMapa: (p: Punto) => void; soloLectura?: boolean };

export default function MapaSelector({ onClickMapa, soloLectura, ...capa }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
        Falta <code className="mx-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> en
        <code className="mx-1">frontend/.env.local</code>. Reinicia el servidor al crearla.
      </div>
    );
  }

  return (
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
        <Capa {...capa} />
      </GoogleMap>
    </APIProvider>
  );
}