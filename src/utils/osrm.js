// OSRM 공개 서버(개인용 수준). 가끔 느리거나 제한될 수 있음.
export async function osrmRouteETA(mode, fromLat, fromLng, toLat, toLng) {
  const profile = mode === "walking" ? "foot" : "car";
  const url = `https://router.project-osrm.org/route/v1/${profile}/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("OSRM 실패");
  const data = await res.json();
  const sec = data?.routes?.[0]?.duration;
  const meter = data?.routes?.[0]?.distance;
  if (typeof sec !== "number") return null;
  return { seconds: sec, meters: meter ?? null };
}

export function formatETA(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}
