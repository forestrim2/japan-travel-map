import React, { useEffect, useMemo, useRef } from "react";
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

function ClickCatcher({ enabled, onPick }) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onPick(e.latlng);
    }
  });
  return null;
}

export default function MapView({
  pins,
  selectedPinId,
  onSelectPin,
  addMode,
  onMapPickForCreate,
  flyTo, // {lat,lng,zoom, pinId?, t?} | null
  userLocation,
  invalidateSignal // number that changes when layout might change
}) {
  const mapRef = useRef(null);
  const wrapRef = useRef(null);

  const invalidate = () => {
    const map = mapRef.current;
    if (!map) return;
    try { map.invalidateSize(); } catch {}
  };

  // 가장 확실한 방법: 컨테이너 크기 변화 감지 시 invalidateSize
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;

    // ResizeObserver 지원
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        invalidate();
      });
      ro.observe(el);
    }

    // 초기 로드에서 CSS 적용 타이밍 때문에 생기는 "오른쪽 하얀 화면" 방지
    invalidate();
    const t1 = setTimeout(invalidate, 80);
    const t2 = setTimeout(invalidate, 220);
    const t3 = setTimeout(invalidate, 600);
    const t4 = setTimeout(invalidate, 1200);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      try { ro?.disconnect?.(); } catch {}
    };
  }, []);

  // 레이아웃 변경 시(사이드바 열닫/모드 변경 등)도 한 번 더
  useEffect(() => {
    invalidate();
    const t = setTimeout(invalidate, 160);
    return () => clearTimeout(t);
  }, [invalidateSignal]);

  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    const map = mapRef.current;
    map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 14, { duration: 0.8 });
    if (flyTo.pinId) onSelectPin(flyTo.pinId);
  }, [flyTo?.lat, flyTo?.lng, flyTo?.zoom, flyTo?.pinId, flyTo?.t]);

  const center = useMemo(() => [35.6, 134.6], []);

  return (
    <div className="mapWrap" ref={wrapRef}>
      <MapContainer
        center={center}
        zoom={6}
        minZoom={4}
        maxZoom={18}
        maxBounds={KJ_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
        whenCreated={(map) => {
          mapRef.current = map;
          requestAnimationFrame(() => invalidate());
          setTimeout(() => invalidate(), 150);
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickCatcher enabled={addMode} onPick={onMapPickForCreate} />

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
