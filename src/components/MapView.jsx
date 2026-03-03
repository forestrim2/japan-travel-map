import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
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

  useEffect(() => () => clearTimer(), []);

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

  // 타일(회색 화면) 방지: maxZoom 고정 + 타일 에러 누적 시 대체 서버로 전환
  const TILE_PRIMARY = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const TILE_FALLBACK_1 = "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";
  const TILE_FALLBACK_2 = "https://tile.openstreetmap.jp/{z}/{x}/{y}.png";

  const [tileUrl, setTileUrl] = useState(TILE_PRIMARY);
  const [tileErr, setTileErr] = useState(0);

  useEffect(() => {
    if (tileErr > 20 && tileUrl === TILE_PRIMARY) setTileUrl(TILE_FALLBACK_1);
    if (tileErr > 45 && tileUrl === TILE_FALLBACK_1) setTileUrl(TILE_FALLBACK_2);
  }, [tileErr, tileUrl]);

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
    try {
      map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 16, { duration: 0.8 });
      try { map.panInsideBounds(map.getBounds()); } catch {}
    } catch {
      try { map.setView([flyTo.lat, flyTo.lng], flyTo.zoom ?? 16);
        try { map.panInsideBounds(map.getBounds()); } catch {} } catch {}
    }
    requestAnimationFrame(() => { try { map.invalidateSize(); } catch {} });
  }, [flyTo]);

  const markers = useMemo(() => pins || [], [pins]);

  return (
    <MapContainer
      whenCreated={(m) => { mapRef.current = m; }}
      bounds={KJ_BOUNDS}
      style={{ width: "100%", height: "100%" }}
      zoomControl={true}
      minZoom={5}
      maxZoom={18}
      maxBounds={KJ_BOUNDS}
      maxBoundsViscosity={0.9}
      worldCopyJump={false}
    >
      <TileLayer
        url={tileUrl}
        maxNativeZoom={18}
        maxZoom={18}
        eventHandlers={{ tileerror: () => setTileErr((c) => c + 1) }}
        attribution='&copy; OpenStreetMap contributors'
      />

      <AddHandlers
        enabledClick={addMode}
        enableLongPress={true}
        onPick={(latlng) => onMapPickForCreate(latlng)}
      />

      {userLocation ? (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={7}
          pathOptions={{ weight: 2, opacity: 1, fillOpacity: 0.45 }}
        />
      ) : null}

      {markers.map((p) => {
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const isSel = selectedPinId === p.id;
        return (
          <React.Fragment key={p.id}>
            {isSel ? (
              <CircleMarker
                center={[lat, lng]}
                radius={14}
                pathOptions={{ weight: 3, opacity: 1, fillOpacity: 0 }}
              />
            ) : null}

            <Marker
              position={[lat, lng]}
              eventHandlers={{
                click: () => onSelectPin(p.id)
              }}
            />
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}
