import L from "leaflet";

/**
 * 한국 + 일본만 보이도록 대략 범위를 타이트하게 제한합니다.
 * (필요하면 숫자만 미세 조정하세요)
 */
export const KJ_BOUNDS = L.latLngBounds(
  L.latLng(31.0, 124.0), // south, west
  L.latLng(46.2, 146.8)  // north, east
);
