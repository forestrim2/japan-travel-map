
const NOMINATIM = "https://nominatim.openstreetmap.org";

export async function searchPlace(q, lang="ko") {
  const url = `${NOMINATIM}/search?format=jsonv2&limit=8&addressdetails=1&accept-language=${encodeURIComponent(lang)}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" }});
  if (!res.ok) throw new Error("search_failed");
  return await res.json();
}

export async function reverseGeocode(lat, lon, lang="ko") {
  const url = `${NOMINATIM}/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=${encodeURIComponent(lang)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" }});
  if (!res.ok) throw new Error("reverse_failed");
  return await res.json();
}

export function makeStreetViewSearchUrl(addressText){
  const q = addressText?.trim();
  if(!q) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}&layer=c&cbll=`;
}

export function uid(prefix="id"){
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

export function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

export function loadLS(key, fallback){
  try{
    const v = localStorage.getItem(key);
    if(!v) return fallback;
    return JSON.parse(v);
  }catch{ return fallback; }
}
export function saveLS(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch{}
}
