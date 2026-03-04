const NOMINATIM = "https://nominatim.openstreetmap.org";

export async function forwardSearch(query, limit = 8) {
  const q = String(query || "").trim();
  if (!q) return [];
  const url = `${NOMINATIM}/search?format=jsonv2&limit=${limit}&q=${encodeURIComponent(q)}&addressdetails=1&accept-language=ko`;
  const res = await fetch(url, { headers: { "Accept-Language": "ko" } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data || []).map((d) => ({
    id: String(d.place_id),
    name: d.display_name,
    lat: Number(d.lat),
    lng: Number(d.lon),
  }));
}

export async function reverseGeocode(lat, lng, lang = "ko") {
  const url = `${NOMINATIM}/reverse?format=jsonv2&zoom=18&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1&accept-language=${encodeURIComponent(lang)}`;
  const res = await fetch(url, { headers: { "Accept-Language": lang } });
  if (!res.ok) return { display: "" };
  const data = await res.json();
  return { display: String(data?.display_name || "") };
}
