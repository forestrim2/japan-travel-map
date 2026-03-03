import React, { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { KJ_BOUNDS } from "../utils/bounds.js";

import "leaflet/dist/leaflet.css";

// 기본 마커 아이콘 깨짐 방지(번들 환경)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

function AddHandlers({ enabledClick, onPick, enableLongPress }) {
  const timerRef = useRef(null);
  const startLatLngRef = useRef(null);
  const movedRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useMapEvents({
    click(e) {
      if (!enabledClick) return;
      onPick(e.latlng);
    },
    // 모바일: 꾹 눌러 핀 추가(기본 550ms)
    mousedown(e) {
      if (!enableLongPress) return;
      movedRef.current = false;
      startLatLngRef.current = e.latlng;
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (movedRef.current) return;
        onPick(startLatLngRef.current);
      }, 550);
    },
    mouseup() { clearTimer(); },
    mousemove() { if (timerRef.current) movedRef.current = true; },
    touchstart(e) {
      if (!enableLongPress) return;
      movedRef.current = false;
      startLatLngRef.current = e.latlng;
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (movedRef.current) return;
        onPick(startLatLngRef.current);
      }, 550);
    },
    touchend() { clearTimer(); },
    touchmove() { if (timerRef.current) movedRef.current = true; }
  });

  useEffect(() => () => clearTimer(), []);
  return null;
}

export default function MapView({
  pins,
  selectedPinId,
  onSelectPin,
  addMode,
  onMapPickForCreate,
  flyTo,
  userLocation,
  invalidateSignal
}) {
  const mapRef = useRef(null);

  const invalidate = () => {
    const map = mapRef.current;
    if (!map) return;
    try { map.invalidateSize(); } catch {}
  };

  useEffect(() => {
    invalidate();
    const t1 = setTimeout(invalidate, 80);
    const t2 = setTimeout(invalidate, 220);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [invalidateSignal]);

  useEffect(() => {
    const onResize = () => invalidate();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    const map = mapRef.current;
    map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 14, { duration: 0.8 });
    if (flyTo.pinId) onSelectPin(flyTo.pinId);
  }, [flyTo?.lat, flyTo?.lng, flyTo?.zoom, flyTo?.pinId, flyTo?.t]);

  const center = useMemo(() => [35.6, 134.6], []);

  const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
  const usingMapTiler = Boolean(MAPTILER_KEY);
  const tileUrl = usingMapTiler
    ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const attribution = usingMapTiler
    ? '&copy; MapTiler &copy; OpenStreetMap contributors'
    : '&copy; OpenStreetMap contributors';

  return (
    <div className="mapWrap">
      <MapContainer
        center={center}
        zoom={6}
        minZoom={6}
        maxZoom={19}
        maxBounds={KJ_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
        whenCreated={(map) => {
          mapRef.current = map;
          requestAnimationFrame(() => {
            try { map.invalidateSize(); } catch {}
          });
          setTimeout(() => {
            try { map.invalidateSize(); } catch {}
          }, 150);
        }}
      >
        <TileLayer attribution={attribution} url={tileUrl} noWrap={true} maxNativeZoom={19} />

        <AddHandlers enabledClick={addMode} enableLongPress={true} onPick={onMapPickForCreate} />

        {userLocation ? <Marker position={[userLocation.lat, userLocation.lng]} /> : null}

        {pins.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            eventHandlers={{ click: () => onSelectPin(p.id) }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
