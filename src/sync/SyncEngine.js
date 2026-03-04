function cfg() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return { url, anon };
}

export function isSyncAvailable() {
  return Boolean(cfg());
}

export async function pullState(syncKey) {
  const c = cfg();
  if (!c) return null;
  const key = String(syncKey || "").trim();
  if (!key) return null;
  const res = await fetch(`${c.url}/rest/v1/map_state?key=eq.${encodeURIComponent(key)}&select=payload,updated_at`, {
    headers: { apikey: c.anon, Authorization: `Bearer ${c.anon}` },
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j?.[0] || null;
}

export async function pushState(syncKey, payload) {
  const c = cfg();
  if (!c) return false;
  const key = String(syncKey || "").trim();
  if (!key) return false;
  const body = { key, payload, updated_at: new Date().toISOString() };
  const res = await fetch(`${c.url}/rest/v1/map_state`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: c.anon,
      Authorization: `Bearer ${c.anon}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}
