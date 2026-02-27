export function googleMapsPlaceUrl(lat, lng, name = "") {
  const q = encodeURIComponent(name ? `${name} @${lat},${lng}` : `${lat},${lng}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function googleMapsDirectionsUrl(origin, destLat, destLng, travelmode = "transit") {
  // travelmode: walking, driving, transit
  const dest = `${destLat},${destLng}`;
  const originParam = origin ? `&origin=${encodeURIComponent(origin)}` : "";
  return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${encodeURIComponent(dest)}&travelmode=${encodeURIComponent(travelmode)}`;
}
