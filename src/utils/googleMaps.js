export function googleMapsSearchUrl(query) {
  const q = encodeURIComponent(query);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function googleMapsPlaceUrlFromPin(pin) {
  const q =
    (pin.addressKo && pin.addressKo.trim()) ||
    (pin.addressJa && pin.addressJa.trim()) ||
    (pin.name && pin.name.trim()) ||
    `${pin.lat},${pin.lng}`;
  return googleMapsSearchUrl(q);
}

export function googleMapsDirectionsUrl(origin, destQuery, travelmode = "transit") {
  // destQuery: address string or "lat,lng"
  const originParam = origin ? `&origin=${encodeURIComponent(origin)}` : "";
  return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${encodeURIComponent(destQuery)}&travelmode=${encodeURIComponent(travelmode)}`;
}
