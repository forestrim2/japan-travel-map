// Browser-friendly geocoding without API keys.
// Primary: Photon (komoot) - generally CORS-friendly.
// Fallback: Nominatim (OSM) - sometimes rate-limited or CORS-blocked.

const PHOTON_BASE = "https://photon.komoot.io";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

function clampLang(lang) {
  return (lang || "en").split("-")[0];
}

function toResult(lat, lon, name, display_name) {
  return { lat: String(lat), lon: String(lon), name: name || "장소", display_name: display_name || name || "장소" };
}

async function photonSearch(q, { limit, lang }) {
  const url = `${PHOTON_BASE}/api/?q=${encodeURIComponent(q)}&limit=${limit}&lang=${encodeURIComponent(clampLang(lang))}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("photon_search_failed");
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
    return toResult(lat, lng, name, display || name);
  }).filter(x => x.lat && x.lon);
}

async function nominatimSearch(q, { limit, lang }) {
  const url = `${NOMINATIM_BASE}/search?format=jsonv2&limit=${limit}&q=${encodeURIComponent(q)}&accept-language=${encodeURIComponent(clampLang(lang))}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("nominatim_search_failed");
  const data = await res.json();
  return (data || []).map((x) => toResult(x.lat, x.lon, x.name || x.display_name, x.display_name));
}

async function photonReverse(lat, lon, { lang }) {
  const url = `${PHOTON_BASE}/reverse/?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&lang=${encodeURIComponent(clampLang(lang))}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("photon_reverse_failed");
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

async function nominatimReverse(lat, lon, { lang }) {
  const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&accept-language=${encodeURIComponent(clampLang(lang))}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("nominatim_reverse_failed");
  const data = await res.json();
  const name = data?.name || data?.display_name || "";
  const display = data?.display_name || name;
  return { name, display_name: display };
}

export async function geocodeSearch(query, { limit = 8, lang = "ko" } = {}) {
  const q = (query || "").trim();
  if (!q) return [];
  // try photon first, then nominatim
  try {
    const r = await photonSearch(q, { limit, lang });
    if (r.length) return r;
  } catch (e) {}
  try {
    return await nominatimSearch(q, { limit, lang });
  } catch (e) {
    return [];
  }
}

export async function geocodeReverse(lat, lon, { lang = "ko" } = {}) {
  try {
    return await photonReverse(lat, lon, { lang });
  } catch (e) {}
  try {
    return await nominatimReverse(lat, lon, { lang });
  } catch (e) {
    return { name: "", display_name: "" };
  }
}
