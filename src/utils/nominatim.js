export async function nominatimSearch(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  // 한국/일본만
  url.searchParams.set("countrycodes", "kr,jp");
  // 한국어 우선
  url.searchParams.set("accept-language", "ko");

  const res = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json"
    }
  });
  if (!res.ok) throw new Error("검색 실패");
  return await res.json();
}
