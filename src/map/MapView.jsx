import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const KJ_BOUNDS = L.latLngBounds(L.latLng(30.0, 122.0), L.latLng(46.5, 148.5));

function FlyTo({ target, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], zoom ?? map.getZoom(), { animate: true, duration: 0.6 });
  }, [target, zoom, map]);
  return null;
}

function LongPress({ onLongPress }) {
  const map = useMap();
  useEffect(() => {
    let timer = null;
    function down(e) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        onLongPress(e.latlng);
      }, 550);
    }
    function up() {
      if (timer) clearTimeout(timer);
      timer = null;
    }
    map.on("touchstart", down);
    map.on("touchend", up);
    map.on("movestart", up);
    return () => {
      map.off("touchstart", down);
      map.off("touchend", up);
      map.off("movestart", up);
    };
  }, [map, onLongPress]);
  return null;
}

function MapClick({ enabled, onPick }) {
  const map = useMap();
  useEffect(() => {
    function click(e) { onPick?.(e.latlng); }
    if (enabled) map.on("click", click);
    return () => map.off("click", click);
  }, [map, enabled, onPick]);
  return null;
}

export default function MapView({
  addMode,
  pins,
  selectedPinId,
  searchCandidate,
  flyTarget,
  flyZoom,
  onMapPickForAdd,
  onSelectPin,
}) {
  const selected = useMemo(() => pins.find((p) => p.id === selectedPinId) || null, [pins, selectedPinId]);

  return (
    <MapContainer
      className="map"
      center={[36.0, 135.0]}
      zoom={6}
      minZoom={6}
      maxZoom={18}
      maxBounds={KJ_BOUNDS}
      maxBoundsViscosity={0.9}
      zoomControl={false}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap &copy; CARTO"
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        maxNativeZoom={18}
        maxZoom={18}
      />

      <FlyTo target={flyTarget} zoom={flyZoom} />

      {/* Mobile long-press pin add */}
      <LongPress onLongPress={(latlng) => onMapPickForAdd(latlng, { force: true })} />

      {searchCandidate ? (
        <CircleMarker
          center={[searchCandidate.lat, searchCandidate.lng]}
          radius={10}
          pathOptions={{ weight: 3, opacity: 1, fillOpacity: 0.12, color: "#111" }}
        />
      ) : null}

      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} eventHandlers={{ click: () => onSelectPin(p.id) }}>
          <Popup>
            <div style={{ fontWeight: 900 }}>{p.name || "이름 없음"}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{p.krAddr || p.jpAddr || ""}</div>
          </Popup>
        </Marker>
      ))}

      {selected ? (
        <CircleMarker
          center={[selected.lat, selected.lng]}
          radius={12}
          pathOptions={{ weight: 3, opacity: 1, fillOpacity: 0.08, color: "#d11" }}
        />
      ) : null}

      <MapClick enabled={addMode} onPick={(latlng) => onMapPickForAdd(latlng)} />
    </MapContainer>
  );
}
