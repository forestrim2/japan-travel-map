/**
 * 키 없이 동작하는 지오코딩(브라우저용)
 * - 1차: Photon(komoot) (빠름)
 * - 2차: Nominatim(OSM) (Photon 실패 시 fallback)
 */
const PHOTON_BASE = "https://photon.komoot.io";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

function clampLang(lang) {
  return (lang || "en").split("-")[0];
}

async function tryPhotonSearch(q, { limit, lang }) {
  const url = `${PHOTON_BASE}/api/?q=${encodeURIComponent(q)}&limit=${limit}&lang=${encodeURIComponent(clampLang(lang))}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
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
    return { lat: String(lat), lon: String(lng), name, display_name: display || name };
  }).filter(x => x.lat && x.lon);
}

async function tryNominatimSearch(q, { limit, lang }) {
  const url =
    `${NOMINATIM_BASE}/search?format=json&addressdetails=1&limit=${limit}` +
    `&q=${encodeURIComponent(q)}&accept-language=${encodeURIComponent(clampLang(lang))}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("nominatim_search_failed");
  const data = await res.json();
  return (data || []).map((r) => ({
    lat: String(r.lat),
    lon: String(r.lon),
    name: (r.name || r.display_name || "장소").split(",")[0],
    display_name: r.display_name || r.name || "장소"
  })).filter(x => x.lat && x.lon);
}

export async function geocodeSearch(query, { limit = 8, lang = "ko" } = {}) {
  const q = (query || "").trim();
  if (!q) return [];
  try {
    const out = await tryPhotonSearch(q, { limit, lang });
    if (out.length) return out;
  } catch {}
  // fallback
  return await tryNominatimSearch(q, { limit, lang });
}

async function tryPhotonReverse(lat, lng, { lang }) {
  const url = `${PHOTON_BASE}/reverse/?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&lang=${encodeURIComponent(clampLang(lang))}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
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

async function tryNominatimReverse(lat, lng, { lang }) {
  const url =
    `${NOMINATIM_BASE}/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}` +
    `&accept-language=${encodeURIComponent(clampLang(lang))}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("nominatim_reverse_failed");
  const data = await res.json();
  return {
    name: (data?.name || data?.display_name || "").split(",")[0],
    display_name: data?.display_name || data?.name || ""
  };
}

export async function geocodeReverse(lat, lng, { lang = "ko" } = {}) {
  try {
    const out = await tryPhotonReverse(lat, lng, { lang });
    if (out?.display_name) return out;
  } catch {}
  return await tryNominatimReverse(lat, lng, { lang });
}
