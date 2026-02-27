const STORAGE_KEY = "japan-travel-map-places-v2";
const el = (id) => document.getElementById(id);

const btnList = el("btnList");
const btnMap  = el("btnMap");
const mapView  = el("mapView");
const listView = el("listView");
const listEl   = el("list");

const searchInput = el("searchInput");
const btnSearch   = el("btnSearch");

const btnLocate = el("btnLocate");
const btnAdd    = el("btnAdd");
const offlineBanner = el("offlineBanner");

// Sheet
const sheetBackdrop = el("sheetBackdrop");
const sheet = el("sheet");
const sheetClose = el("sheetClose");
const sheetTitle = el("sheetTitle");
const addrText = el("addrText");
const btnStreet = el("btnStreet");
const btnCopy = el("btnCopy");
const btnCancelAdd = el("btnCancelAdd");
const btnConfirmAdd = el("btnConfirmAdd");
const confirmRow = el("confirmRow");

const placeForm = el("placeForm");
const fName = el("fName");
const fCat  = el("fCat");
const fMemo = el("fMemo");
const btnFormBack = el("btnFormBack");

const btnExport = el("btnExport");
const btnImport = el("btnImport");
const importFile = el("importFile");

let places = loadPlaces();
let addMode = false;

let map, markersLayer;
let tempPin = null;
let pendingLatLng = null;
let pendingAddress = null;

// Current location indicator
let currentCircle = null;
let currentDot = null;
let watchId = null;

function setOnlineUI(){
  const online = navigator.onLine;
  offlineBanner.classList.toggle("hidden", online);
}
window.addEventListener("online", setOnlineUI);
window.addEventListener("offline", setOnlineUI);
setOnlineUI();

// Views
function showMap(){
  mapView.classList.add("active");
  listView.classList.remove("active");
  btnMap.classList.add("active");
  btnList.classList.remove("active");
  setTimeout(() => map && map.invalidateSize(), 50);
}
function showList(){
  mapView.classList.remove("active");
  listView.classList.add("active");
  btnMap.classList.remove("active");
  btnList.classList.add("active");
  renderList();
}
btnMap.addEventListener("click", showMap);
btnList.addEventListener("click", showList);

// Map init
map = L.map("map", { zoomControl:true, doubleClickZoom:true })
  .setView([35.681236, 139.767125], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

markersLayer = L.layerGroup().addTo(map);
renderMarkers();

// Add-mode click
map.on("click", async (e) => {
  if (!addMode) return;

  dropTempPin(e.latlng.lat, e.latlng.lng);

  pendingLatLng = e.latlng;
  pendingAddress = null;

  openSheet({ title:"이 위치를 저장할까요?", address:"주소를 불러오는 중…", mode:"confirm" });

  try{
    const addr = await reverseGeocodeKo(e.latlng.lat, e.latlng.lng);
    pendingAddress = addr;
    addrText.textContent = addr || "(주소를 찾지 못했습니다)";
  }catch(err){
    addrText.textContent = "(주소를 불러오지 못했습니다)";
  }
});

// Close sheet
sheetBackdrop.addEventListener("click", closeSheet);
sheetClose.addEventListener("click", closeSheet);

// Add mode toggle
btnAdd.addEventListener("click", () => {
  addMode = !addMode;
  btnAdd.textContent = addMode ? "＋ 추가중" : "＋";
  btnAdd.classList.toggle("active", addMode);

  if(!addMode){
    clearTempPin();
    closeSheet();
  }else{
    openSheet({ title:"추가 모드", address:"지도에서 위치를 한 번 클릭해 주세요.", mode:"hint" });
  }
});

btnCancelAdd.addEventListener("click", () => {
  clearTempPin();
  pendingLatLng = null;
  pendingAddress = null;
  closeSheet();
});

btnConfirmAdd.addEventListener("click", () => {
  if(!pendingLatLng) return;
  sheetTitle.textContent = "장소 등록";
  confirmRow.classList.add("hidden");
  placeForm.classList.remove("hidden");
  fName.value = "";
  fMemo.value = "";
  fCat.value = "food";
  fName.focus();
});

btnFormBack.addEventListener("click", () => {
  placeForm.classList.add("hidden");
  confirmRow.classList.remove("hidden");
  sheetTitle.textContent = "이 위치를 저장할까요?";
});

placeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if(!pendingLatLng) return;

  const item = {
    id: cryptoRandomId(),
    name: (fName.value || "").trim() || "이름 없음",
    cat: fCat.value,
    memo: (fMemo.value || "").trim(),
    lat: pendingLatLng.lat,
    lng: pendingLatLng.lng,
    addressKo: pendingAddress || "",
    createdAt: Date.now()
  };
  places.unshift(item);
  savePlaces(places);

  addMode = false;
  btnAdd.textContent = "＋";
  btnAdd.classList.remove("active");

  clearTempPin();
  pendingLatLng = null;
  pendingAddress = null;

  closeSheet();
  renderMarkers();
  showList();
});

// Sheet helpers
function openSheet({title, address, mode}){
  sheetTitle.textContent = title;
  addrText.textContent = address;

  const isConfirm = (mode === "confirm");
  const isHint = (mode === "hint");
  const isView = (mode === "view");

  btnStreet.classList.toggle("hidden", isHint);
  btnCopy.classList.toggle("hidden", isHint);

  confirmRow.classList.toggle("hidden", !(isConfirm));
  placeForm.classList.add("hidden");

  sheetBackdrop.classList.remove("hidden");
  sheet.classList.remove("hidden");

  if(isView){
    confirmRow.classList.add("hidden");
    placeForm.classList.add("hidden");
  }
}
function closeSheet(){
  sheetBackdrop.classList.add("hidden");
  sheet.classList.add("hidden");
}

btnCopy.addEventListener("click", async () => {
  const text = (addrText.textContent || "").trim();
  if(!text) return;
  try{ await navigator.clipboard.writeText(text); }catch(e){}
});

btnStreet.addEventListener("click", () => {
  const lat = pendingLatLng?.lat ?? tempPin?.getLatLng().lat;
  const lng = pendingLatLng?.lng ?? tempPin?.getLatLng().lng;
  if(lat == null || lng == null) return;
  const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  window.open(url, "_blank", "noopener,noreferrer");
});

// Search (local)
btnSearch.addEventListener("click", () => {
  const q = (searchInput.value || "").trim().toLowerCase();
  if(!q){ renderList(); return; }
  const filtered = places.filter(p =>
    (p.name || "").toLowerCase().includes(q) ||
    (p.memo || "").toLowerCase().includes(q) ||
    (p.addressKo || "").toLowerCase().includes(q) ||
    (p.cat || "").toLowerCase().includes(q)
  );
  renderList(filtered);
});
searchInput.addEventListener("keydown", (e) => { if(e.key==="Enter") btnSearch.click(); });

// My location (more accurate + dot + accuracy)
btnLocate.addEventListener("click", () => {
  if(!navigator.geolocation){
    alert("이 기기/브라우저에서 위치 기능을 사용할 수 없습니다.");
    return;
  }
  if(watchId != null){
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude:lat, longitude:lng, accuracy } = pos.coords;
      if(currentCircle) map.removeLayer(currentCircle);
      if(currentDot) map.removeLayer(currentDot);

      currentCircle = L.circle([lat,lng], {
        radius: Math.max(accuracy || 0, 10),
        weight: 1,
        color: "#111111",
        fillColor: "#111111",
        fillOpacity: 0.08
      }).addTo(map);

      currentDot = L.circleMarker([lat,lng], {
        radius: 6,
        weight: 2,
        color: "#ffffff",
        fillColor: "#111111",
        fillOpacity: 1
      }).addTo(map);

      map.setView([lat,lng], 16, { animate:true });
    },
    () => {
      alert("위치 권한을 허용했는지 확인해 주세요. (주소창 자물쇠 → 위치 허용)");
      try{ navigator.geolocation.clearWatch(watchId); }catch(e){}
      watchId = null;
    },
    { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
  );
});

// Markers & list
function catLabel(cat){
  switch(cat){
    case "food": return "맛집";
    case "cafe": return "카페";
    case "stay": return "숙소";
    case "spot": return "관광";
    case "shop": return "쇼핑";
    default: return "기타";
  }
}
function catEmoji(cat){
  switch(cat){
    case "food": return "🍣";
    case "cafe": return "☕";
    case "stay": return "🏨";
    case "spot": return "📍";
    case "shop": return "🛍️";
    default: return "⭐";
  }
}

function renderMarkers(){
  markersLayer.clearLayers();
  places.forEach((p) => {
    const icon = L.divIcon({
      className: "pin",
      html: `<div class="pinDot">${catEmoji(p.cat)}</div>`,
      iconSize: [26,26],
      iconAnchor: [13,13]
    });
    const m = L.marker([p.lat, p.lng], { icon }).addTo(markersLayer);
    m.on("click", () => {
      pendingLatLng = { lat:p.lat, lng:p.lng };
      pendingAddress = p.addressKo || "";
      dropTempPin(p.lat, p.lng);

      openSheet({ title: p.name, address: p.addressKo || "(주소 없음)", mode:"view" });
    });
  });
}

function renderList(custom){
  const arr = custom || places;
  listEl.innerHTML = "";
  if(arr.length === 0){
    const empty = document.createElement("div");
    empty.className = "card";
    empty.textContent = "저장된 장소가 없습니다. 지도에서 ＋로 추가해 보세요.";
    listEl.appendChild(empty);
    return;
  }

  arr.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";

    const top = document.createElement("div");
    top.className = "cardTop";

    const left = document.createElement("div");
    const h = document.createElement("div");
    h.className = "cardTitle";
    h.textContent = `${catEmoji(p.cat)} ${p.name}`;

    const addr = document.createElement("div");
    addr.className = "cardAddr";
    addr.textContent = p.addressKo || "(주소 없음)";

    left.appendChild(h);
    left.appendChild(addr);

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = catLabel(p.cat);

    top.appendChild(left);
    top.appendChild(badge);

    const memo = document.createElement("div");
    memo.className = "cardMemo";
    memo.textContent = p.memo || "";

    const btns = document.createElement("div");
    btns.className = "cardBtns";

    const b1 = document.createElement("button");
    b1.className = "btn ghost";
    b1.textContent = "지도에서 보기";
    b1.addEventListener("click", () => {
      showMap();
      map.setView([p.lat, p.lng], 17, { animate:true });
      pendingLatLng = { lat:p.lat, lng:p.lng };
      pendingAddress = p.addressKo || "";
      dropTempPin(p.lat, p.lng);
      openSheet({ title: p.name, address: p.addressKo || "(주소 없음)", mode:"view" });
    });

    const b2 = document.createElement("button");
    b2.className = "btn ghost";
    b2.textContent = "삭제";
    b2.addEventListener("click", () => {
      if(!confirm("삭제할까요?")) return;
      places = places.filter(x => x.id !== p.id);
      savePlaces(places);
      renderMarkers();
      renderList();
    });

    btns.appendChild(b1);
    btns.appendChild(b2);

    card.appendChild(top);
    if(p.memo) card.appendChild(memo);
    card.appendChild(btns);

    listEl.appendChild(card);
  });
}

// Export / Import
btnExport.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({version:2, places}, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "japan-travel-map.json";
  a.click();
  URL.revokeObjectURL(url);
});

btnImport.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const f = importFile.files?.[0];
  if(!f) return;
  try{
    const text = await f.text();
    const data = JSON.parse(text);
    if(Array.isArray(data.places)){
      places = data.places;
      savePlaces(places);
      renderMarkers();
      renderList();
      alert("가져오기 완료");
    }else{
      alert("형식이 올바르지 않습니다.");
    }
  }catch(e){
    alert("파일을 읽을 수 없습니다.");
  }finally{
    importFile.value = "";
  }
});

// Temp pin
function dropTempPin(lat, lng){
  clearTempPin();
  tempPin = L.circleMarker([lat,lng], {
    radius: 8,
    weight: 2,
    color: "#111111",
    fillColor: "#ffffff",
    fillOpacity: 1
  }).addTo(map);
}
function clearTempPin(){
  if(tempPin){ map.removeLayer(tempPin); tempPin = null; }
}

// Reverse geocode (Korean)
async function reverseGeocodeKo(lat, lng){
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format","jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom","18");
  url.searchParams.set("addressdetails","1");
  url.searchParams.set("accept-language","ko");

  const res = await fetch(url.toString(), { headers: { "Accept":"application/json" } });
  if(!res.ok) throw new Error("reverse failed");
  const data = await res.json();
  return (data && data.display_name) ? data.display_name : "";
}

// Storage
function loadPlaces(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}
function savePlaces(arr){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// Utils
function cryptoRandomId(){
  const a = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(a).map(x=>x.toString(16).padStart(2,"0")).join("");
}
