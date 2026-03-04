export function hasSyncConfig() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export async function syncPull(key) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const res = await fetch(`${url}/rest/v1/map_state?key=eq.${encodeURIComponent(key)}&select=payload`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j?.[0]?.payload ?? null;
}

export async function syncPush(key, payload) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  // upsert
  const res = await fetch(`${url}/rest/v1/map_state`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ key, payload, updated_at: new Date().toISOString() }),
  });
  return res.ok;
}
