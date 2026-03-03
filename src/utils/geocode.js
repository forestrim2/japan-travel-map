// Browser-friendly geocoding that works without API keys.
// Uses Photon (Komoot) which is public and CORS-friendly, with Nominatim fallback.

const PHOTON_BASE = "https://photon.komoot.io";

function clampLang(lang) {
  return (lang || "en").split("-")[0];
}

export async function geocodeSearch(query, { limit = 8, lang = "ko" } = {}) {
  const q = (query || "").trim();
  if (!q) return [];
  const url = `${PHOTON_BASE}/api/?q=${encodeURIComponent(q)}&limit=${limit}&lang=${encodeURIComponent(clampLang(lang))}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("search_failed");
  const data = await res.json();
  const feats = data?.features || [];
  return feats.map((f) => {
    const p = f?.properties || {};
    const [lng, lat] = f?.geometry?.coordinates || [null, null];
    const name = p.name || p.street || p.city || p.county || p.state || p.country || "장소";
    const display = [
      p.name,
      p.street,
      p.housenumber ? String(p.housenumber) : "",
      p.city || p.town || p.village || "",
      p.state || "",
      p.country || ""
    ].filter(Boolean).join(" ");
    return {
      lat: String(lat),
      lon: String(lng),
      name,
      display_name: display || name
    };
  }).filter(x => x.lat && x.lon);
}

export async function geocodeReverse(lat, lng, { lang = "ko" } = {}) {
  const url = `${PHOTON_BASE}/reverse/?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&lang=${encodeURIComponent(clampLang(lang))}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("reverse_failed");
  const data = await res.json();
  const f = data?.features?.[0];
  const p = f?.properties || {};
  const name = p.name || p.street || p.city || p.county || p.state || p.country || "";
  const display = [
    p.name,
    p.street,
    p.housenumber ? String(p.housenumber) : "",
    p.city || p.town || p.village || "",
    p.state || "",
    p.country || ""
  ].filter(Boolean).join(" ");
  return { name, display_name: display || name };
}
