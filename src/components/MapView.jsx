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
    }
  }, [tileErr]);
  const mapRef = useRef(null);

  // Tile handling: prevent grey screen on over-zoom / transient tile failures.
  const TILE_PRIMARY = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const TILE_FALLBACK_1 = "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";
  const TILE_FALLBACK_2 = "https://tile.openstreetmap.jp/{z}/{x}/{y}.png";

  const [tileUrl, setTileUrl] = useState(TILE_PRIMARY);
  const [tileErr, setTileErr] = useState(0);

  useEffect(() => {
    if (tileErr > 18 && tileUrl === TILE_PRIMARY) setTileUrl(TILE_FALLBACK_1);
    if (tileErr > 36 && tileUrl === TILE_FALLBACK_1) setTileUrl(TILE_FALLBACK_2);
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
    const attribution = '&copy; OpenStreetMap contributors';

  return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [invalidateSignal]);

  useEffect(() => {
    const onResize = () => invalidate();
    window.addEventListener("resize", onResize);
    const attribution = '&copy; OpenStreetMap contributors';

  return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    const map = mapRef.current;
    try {
      map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 14, { duration: 0.8 });
    } catch {
      try { map.setView([flyTo.lat, flyTo.lng], flyTo.zoom ?? 14); } catch {}
    }
    // If the map is in a bad size state (mobile drawer), force a repaint.
    requestAnimationFrame(() => { try { map.invalidateSize(); } catch {} });

    if (flyTo.pinId) onSelectPin(flyTo.pinId);
  }, [flyTo?.lat, flyTo?.lng, flyTo?.zoom, flyTo?.pinId, flyTo?.t]);

  const center = useMemo(() => [35.6, 134.6], []);

  const attribution = '&copy; OpenStreetMap contributors';

  return (
    <div className="mapWrap">
      <MapContainer
        center={center}
        zoom={6}
        minZoom={6}
        maxZoom={18}
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
        <TileLayer attribution={attribution} url={tileUrl} noWrap={true} maxNativeZoom={18}
          eventHandlers={{ tileerror: () => setTileErr((c) => c + 1) }}
        />

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
