/// <reference types="google.maps" />
"use client";
import { useEffect } from "react";
import { APIProvider, Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import { CENTRO_AGUACHICA, RADIO_KM, Punto } from "@/lib/geo";
import type { LoteGen } from "@/lib/lotes";

export type Foco = { lat: number; lng: number; zoom: number };

function Capa({
  foco, puntos, lotes, ladoVia,
}: { foco: Foco; puntos: Punto[]; lotes: LoteGen[]; ladoVia: number }) {
  const map = useMap();

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

  // Polígono del terreno y vértices
  useEffect(() => {
    if (!map) return;
    const poly = new google.maps.Polygon({
      map,
      paths: puntos,
      strokeColor: "#facc15",
      strokeWeight: 3,
      fillColor: "#facc15",
      fillOpacity: 0.2,
      clickable: false,
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
      strokeWeight: 6,
      clickable: false,
      zIndex: 5,
    });
    return () => linea.setMap(null);
  }, [map, puntos, ladoVia]);

  // Lotes y zonas verdes
  useEffect(() => {
    if (!map) return;
    const polys = lotes.map(
      (l) =>
        new google.maps.Polygon({
          map,
          paths: l.coords,
          strokeColor: "#ffffff",
          strokeWeight: 1,
          fillColor: l.tipo === "verde" ? "#22c55e" : "#38bdf8",
          fillOpacity: 0.55,
          clickable: false,
          zIndex: 3,
        })
    );
    return () => polys.forEach((p) => p.setMap(null));
  }, [map, lotes]);

  return null;
}

type Props = {
  foco: Foco;
  puntos: Punto[];
  lotes: LoteGen[];
  ladoVia: number;
  onClickMapa: (p: Punto) => void;
};

export default function MapaSelector({ foco, puntos, lotes, ladoVia, onClickMapa }: Props) {
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
        defaultCenter={{ lat: foco.lat, lng: foco.lng }}
        defaultZoom={foco.zoom}
        mapTypeId="hybrid"
        gestureHandling="greedy"
        disableDoubleClickZoom
        draggableCursor="crosshair"
        onClick={(e) => {
          const ll = e.detail.latLng;
          if (ll) onClickMapa({ lat: ll.lat, lng: ll.lng });
        }}
      >
        <Capa foco={foco} puntos={puntos} lotes={lotes} ladoVia={ladoVia} />
      </GoogleMap>
    </APIProvider>
  );
}