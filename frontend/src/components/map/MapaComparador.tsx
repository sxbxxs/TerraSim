/// <reference types="google.maps" />
"use client";
import { useEffect } from "react";
import { APIProvider, Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import { CENTRO_AGUACHICA, RADIO_KM, Punto } from "@/lib/geo";
import { COLORES, IdCandidato } from "@/lib/candidatos";

export type TerrenoMapa = { id: IdCandidato; puntos: Punto[] };

type Props = {
  terrenos: TerrenoMapa[];
  activo: IdCandidato;
  onClickMapa: (p: Punto) => void;
};

function Capa({ terrenos, activo }: Pick<Props, "terrenos" | "activo">) {
  const map = useMap();

  // Círculo de 5 km alrededor del centro de Aguachica
  useEffect(() => {
    if (!map) return;
    const c = new google.maps.Circle({
      map, center: CENTRO_AGUACHICA, radius: RADIO_KM * 1000,
      strokeColor: "#10b981", strokeWeight: 2, strokeOpacity: 0.9, fillOpacity: 0.03, fillColor: "#10b981", clickable: false,
    });
    return () => c.setMap(null);
  }, [map]);

  // Los tres terrenos, cada uno con su color y su letra
  useEffect(() => {
    if (!map) return;
    const objs: { setMap: (m: google.maps.Map | null) => void }[] = [];
    for (const t of terrenos) {
      if (!t.puntos.length) continue;
      const color = COLORES[t.id];
      const esActivo = t.id === activo;
      if (t.puntos.length >= 3) {
        objs.push(new google.maps.Polygon({
          map, paths: t.puntos, strokeColor: color, strokeWeight: esActivo ? 4 : 3,
          fillColor: color, fillOpacity: esActivo ? 0.32 : 0.2, clickable: false, zIndex: esActivo ? 5 : 3,
        }));
      } else if (t.puntos.length === 2) {
        objs.push(new google.maps.Polyline({ map, path: t.puntos, strokeColor: color, strokeWeight: 3, clickable: false }));
      }
      for (const p of t.puntos) {
        objs.push(new google.maps.Circle({
          map, center: p, radius: esActivo ? 2.5 : 1.8, strokeColor: "#ffffff", strokeWeight: 2,
          fillColor: color, fillOpacity: 1, clickable: false, zIndex: 10,
        }));
      }
      if (t.puntos.length >= 3) {
        const cen = {
          lat: t.puntos.reduce((s, q) => s + q.lat, 0) / t.puntos.length,
          lng: t.puntos.reduce((s, q) => s + q.lng, 0) / t.puntos.length,
        };
        objs.push(new google.maps.Marker({
          map, position: cen, clickable: false, zIndex: 20,
          label: { text: t.id, color: "#ffffff", fontWeight: "700" },
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 13, fillColor: color, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
        }));
      }
    }
    return () => objs.forEach((o) => o.setMap(null));
  }, [map, terrenos, activo]);

  return null;
}

export default function MapaComparador({ terrenos, activo, onClickMapa }: Props) {
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
        defaultCenter={{ lat: CENTRO_AGUACHICA.lat, lng: CENTRO_AGUACHICA.lng }}
        defaultZoom={13}
        mapTypeId="hybrid"
        gestureHandling="greedy"
        disableDoubleClickZoom
        draggableCursor="crosshair"
        onClick={(e) => {
          const ll = e.detail.latLng;
          if (ll) onClickMapa({ lat: ll.lat, lng: ll.lng });
        }}
      >
        <Capa terrenos={terrenos} activo={activo} />
      </GoogleMap>
    </APIProvider>
  );
}