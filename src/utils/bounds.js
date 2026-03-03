import L from "leaflet";

// 한국/일본 커버 범위(대략) - 필요하면 미세 조정 가능
export const KJ_BOUNDS = L.latLngBounds(
  L.latLng(30.0, 122.0), // south, west
  L.latLng(46.2, 146.8)  // north, east
);
