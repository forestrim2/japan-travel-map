export function googleSearchUrlByAddress(address) {
  const q = String(address || "").trim();
  if (!q) return "";
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
}

export function googleDirectionsUrl({ fromLatLng, toLatLng, toAddress, mode }) {
  const travelmode = mode || "transit"; // transit | walking | driving
  const dest = toAddress && String(toAddress).trim()
    ? String(toAddress).trim()
    : (toLatLng ? `${toLatLng.lat},${toLatLng.lng}` : "");
  if (!dest) return "";
  const origin = fromLatLng ? `${fromLatLng.lat},${fromLatLng.lng}` : "";
  const base = "https://www.google.com/maps/dir/?api=1";
  const params = new URLSearchParams();
  if (origin) params.set("origin", origin);
  params.set("destination", dest);
  params.set("travelmode", travelmode);
  return base + "&" + params.toString();
}
