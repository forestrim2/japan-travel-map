(() => {
  const STORAGE_KEY = "japan_travel_map_places_v1";

  const sheet = document.getElementById("sheet");
  const sheetBody = document.getElementById("sheetBody");
  const scrim = document.getElementById("scrim");
  const toast = document.getElementById("toast");
  const offlineBanner = document.getElementById("offlineBanner");

  const btnLocate = document.getElementById("btnLocate");
  const btnAddMode = document.getElementById("btnAddMode");
  const btnListTab = document.getElementById("btnListTab");
  const btnCloseSheet = document.getElementById("btnCloseSheet");
  const tabMap = document.getElementById("tabMap");
  const tabList = document.getElementById("tabList");

  const searchInput = document.getElementById("searchInput");
  const btnClearSearch = document.getElementById("btnClearSearch");

  let places = loadPlaces();
  let mode = "browse"; // browse | add
  let tempPin = null;
  let tempLatLng = null;
  let tempAddress = "";
  let selectedId = null;

  let currentLocationMarker = null;
  let currentAccuracyCircle = null;

  const map = L.map("map", {
    zoomControl: true,
    doubleClickZoom: true,
    tap: true,
  });

  map.setView([35.681236, 139.767125], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
    updateWhenIdle: true,
    keepBuffer: 2,
  }).addTo(map);

  const markers = L.layerGroup().addTo(map);
  renderMarkers();

  function setSheet(state) {
    sheet.dataset.state = state; // closed | peek | open
    const showScrim = state === "open";
    scrim.classList.toggle("hidden", !showScrim);
  }

  function setTab(which) {
    if (which === "map") {
      tabMap.classList.add("active");
      tabList.classList.remove("active");
      renderMapPanel();
    } else {
      tabList.classList.add("active");
      tabMap.classList.remove("active");
      renderListPanel();
    }
  }

  function showToast(msg, ms = 1400) {
    toast.textContent = msg;
    toast.classList.remove("hidden");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.add("hidden"), ms);
  }

  function fmtLatLng(lat, lng) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  function googleMapsLink(lat, lng) {
    const q = encodeURIComponent(`${lat},${lng}`);
    return `https://www.google.com/maps?q=${q}`;
  }

  function loadPlaces() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function savePlaces() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  }

  function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function markerIcon(color = "#111827", size = 16) {
    return L.divIcon({
      className: "placePin",
      html: `<div style="
        width:${size}px;height:${size}px;border-radius:999px;
        background:${color};border:3px solid #ffffff;
        box-shadow:0 6px 14px rgba(0,0,0,.18);
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  function renderMarkers() {
    markers.clearLayers();
    for (const p of places) {
      const m = L.marker([p.lat, p.lng], { icon: markerIcon("#111827", 16) });
      m.on("click", () => {
        selectedId = p.id;
        setTab("map");
        setSheet("open");
        renderPlaceDetail(p);
      });
      m.addTo(markers);
    }
  }

  function clearTemp() {
    if (tempPin) {
      map.removeLayer(tempPin);
      tempPin = null;
    }
    tempLatLng = null;
    tempAddress = "";
  }

  function setMode(next) {
    mode = next;
    if (mode === "add") {
      showToast("지도에서 위치를 찍어주세요");
    } else {
      clearTemp();
    }
  }

  btnAddMode.addEventListener("click", () => {
    setMode(mode === "add" ? "browse" : "add");
  });

  map.on("click", async (e) => {
    if (mode !== "add") return;

    clearTemp();
    tempLatLng = e.latlng;

    tempPin = L.marker([e.latlng.lat, e.latlng.lng], {
      icon: markerIcon("#2563eb", 18),
    }).addTo(map);

    setSheet("open");
    setTab("map");
    renderConfirmSave();

    tempAddress = "";
    const addr = await reverseGeocodeOSM(e.latlng.lat, e.latlng.lng);
    if (addr) tempAddress = addr;

    renderConfirmSave();
  });

  async function reverseGeocodeOSM(lat, lng) {
    if (!navigator.onLine) return "";
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return "";
      const data = await res.json();
      return data.display_name || "";
    } catch {
      return "";
    }
  }

  function renderMapPanel() {
    if (selectedId) {
      const p = places.find((x) => x.id === selectedId);
      if (p) return renderPlaceDetail(p);
    }
    if (mode === "add" && tempLatLng) return renderConfirmSave();
    renderHomePanel();
  }

  function renderHomePanel() {
    sheetBody.innerHTML = `
      <div class="card">
        <div class="cardTitle">일본 여행 지도</div>
        <div class="cardSub">• <span class="kbd">＋</span> 눌러 <b>장소 추가 모드</b> → 지도에서 위치를 찍으세요<br/>
• 저장한 장소는 <b>목록</b>에서 검색/관리합니다</div>
        <div class="cardRow">
          <button class="btn primary" id="goAdd">장소 추가 시작</button>
          <button class="btn" id="goList">저장 목록 보기</button>
        </div>
      </div>
      <div class="card">
        <div class="cardTitle">안내</div>
        <div class="cardSub">지도는 OSM(무료)입니다. 주소 표시는 OSM(Nominatim) 무료 기능(레이트리밋)이므로 표시가 늦거나 실패할 수 있습니다.</div>
      </div>
    `;
    document.getElementById("goAdd").addEventListener("click", () => setMode("add"));
    document.getElementById("goList").addEventListener("click", () => {
      setTab("list");
      setSheet("open");
    });
  }

  function renderConfirmSave() {
    if (!tempLatLng) return renderHomePanel();

    const addrLine = tempAddress
      ? `<div class="cardSub">${escapeHtml(tempAddress)}</div>`
      : `<div class="cardSub">주소 불러오는 중… (인터넷 필요)</div>`;

    sheetBody.innerHTML = `
      <div class="card">
        <div class="cardTitle">이 위치를 저장할까요?<span class="badge">확인</span></div>
        ${addrLine}
        <div class="cardSub">좌표: ${fmtLatLng(tempLatLng.lat, tempLatLng.lng)}</div>
        <div class="cardRow">
          <button class="btn" id="btnCancelTemp">취소</button>
          <button class="btn primary" id="btnOpenForm">장소 등록</button>
        </div>
      </div>
    `;

    document.getElementById("btnCancelTemp").addEventListener("click", () => {
      clearTemp();
      setMode("browse");
      setSheet("peek");
      renderHomePanel();
    });

    document.getElementById("btnOpenForm").addEventListener("click", () => {
      renderSaveForm();
    });
  }

  function renderSaveForm(existing = null) {
    const lat = existing ? existing.lat : tempLatLng?.lat;
    const lng = existing ? existing.lng : tempLatLng?.lng;
    if (lat == null || lng == null) return;

    const name = existing?.name || "";
    const nameJa = existing?.nameJa || "";
    const category = existing?.category || "맛집";
    const memo = existing?.memo || "";
    const addr = existing?.address || tempAddress || "";

    sheetBody.innerHTML = `
      <div class="card">
        <div class="cardTitle">${existing ? "장소 수정" : "장소 등록"}</div>
        <div class="cardSub">${addr ? escapeHtml(addr) + "<br/>" : ""}좌표: ${fmtLatLng(lat, lng)}</div>

        <div class="form">
          <div class="field">
            <label>이름(한국어) *</label>
            <input id="fName" type="text" value="${escapeAttr(name)}" placeholder="예) 이치란 라멘 본점" />
          </div>

          <div class="field">
            <label>이름(일본어/현지표기)</label>
            <input id="fNameJa" type="text" value="${escapeAttr(nameJa)}" placeholder="예) 一蘭 本社総本店" />
            <div class="helper">자동 번역 API는 사용하지 않습니다. 필요하면 “번역 링크”를 열어 확인 후 붙여넣으세요.</div>
            <div class="cardRow">
              <button class="btn" id="btnTranslate">번역 링크</button>
            </div>
          </div>

          <div class="field">
            <label>카테고리</label>
            <select id="fCategory">
              ${["맛집","카페","관광","쇼핑","숙소","기타"].map(c => `<option ${c===category?"selected":""}>${c}</option>`).join("")}
            </select>
          </div>

          <div class="field">
            <label>메모</label>
            <textarea id="fMemo" placeholder="예) 웨이팅, 추천 메뉴, 예약 링크">${escapeHtml(memo)}</textarea>
          </div>

          <div class="cardRow">
            <button class="btn" id="btnBack">${existing ? "취소" : "뒤로"}</button>
            <button class="btn primary" id="btnSave">${existing ? "저장" : "등록"}</button>
          </div>

          <div class="cardRow">
            <a class="btn" href="${googleMapsLink(lat,lng)}" target="_blank" rel="noreferrer">구글지도 열기</a>
          </div>
        </div>
      </div>
    `;

    document.getElementById("btnTranslate").addEventListener("click", () => {
      const text = (document.getElementById("fName").value || "").trim();
      const url = `https://translate.google.com/?sl=ko&tl=ja&text=${encodeURIComponent(text)}&op=translate`;
      window.open(url, "_blank", "noopener,noreferrer");
    });

    document.getElementById("btnBack").addEventListener("click", () => {
      if (existing) return renderPlaceDetail(existing);
      return renderConfirmSave();
    });

    document.getElementById("btnSave").addEventListener("click", () => {
      const n = (document.getElementById("fName").value || "").trim();
      const nja = (document.getElementById("fNameJa").value || "").trim();
      const cat = document.getElementById("fCategory").value;
      const m = (document.getElementById("fMemo").value || "").trim();

      if (!n) return showToast("이름(한국어)을 입력해 주세요");

      if (existing) {
        existing.name = n;
        existing.nameJa = nja;
        existing.category = cat;
        existing.memo = m;
        savePlaces();
        renderMarkers();
        showToast("수정했습니다");
        return renderPlaceDetail(existing);
      }

      const newPlace = {
        id: uid(),
        lat, lng,
        address: addr,
        name: n,
        nameJa: nja,
        category: cat,
        memo: m,
        createdAt: new Date().toISOString(),
      };

      places.unshift(newPlace);
      savePlaces();
      renderMarkers();

      selectedId = newPlace.id;
      setMode("browse");
      clearTemp();
      showToast("저장했습니다");
      return renderPlaceDetail(newPlace);
    });
  }

  function renderPlaceDetail(p) {
    sheetBody.innerHTML = `
      <div class="card">
        <div class="cardTitle">${escapeHtml(p.name)}<span class="badge">${escapeHtml(p.category || "기타")}</span></div>
        <div class="cardSub">
          ${p.nameJa ? "일본어: " + escapeHtml(p.nameJa) + "<br/>" : ""}
          ${p.address ? escapeHtml(p.address) + "<br/>" : ""}
          좌표: ${fmtLatLng(p.lat, p.lng)}
        </div>
        ${p.memo ? `<div class="cardSub">메모: ${escapeHtml(p.memo)}</div>` : ""}
        <div class="cardRow">
          <button class="btn primary" id="btnGoHere">여기로 이동</button>
          <a class="btn" href="${googleMapsLink(p.lat,p.lng)}" target="_blank" rel="noreferrer">구글지도</a>
        </div>
        <div class="cardRow">
          <button class="btn" id="btnEdit">수정</button>
          <button class="btn danger" id="btnDelete">삭제</button>
        </div>
      </div>
    `;

    document.getElementById("btnGoHere").addEventListener("click", () => {
      map.setView([p.lat, p.lng], Math.max(map.getZoom(), 16));
      showToast("이동했습니다");
    });

    document.getElementById("btnEdit").addEventListener("click", () => renderSaveForm(p));

    document.getElementById("btnDelete").addEventListener("click", () => {
      if (!confirm("이 장소를 삭제할까요?")) return;
      places = places.filter((x) => x.id !== p.id);
      savePlaces();
      renderMarkers();
      selectedId = null;
      showToast("삭제했습니다");
      renderHomePanel();
    });
  }

  function renderListPanel() {
    const q = (searchInput.value || "").trim().toLowerCase();
    const filtered = q
      ? places.filter((p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.nameJa || "").toLowerCase().includes(q) ||
          (p.memo || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
        )
      : places;

    sheetBody.innerHTML = `
      <div class="card">
        <div class="cardTitle">저장 목록 <span class="badge">${filtered.length}개</span></div>
        <div class="cardSub">검색은 상단 검색창에서 합니다.</div>
        <div class="cardRow">
          <button class="btn primary" id="btnAddFromList">새 장소 추가</button>
        </div>
      </div>
      <div id="listWrap"></div>
    `;

    document.getElementById("btnAddFromList").addEventListener("click", () => {
      setTab("map");
      setSheet("open");
      setMode("add");
    });

    const wrap = document.getElementById("listWrap");
    if (!filtered.length) {
      wrap.innerHTML = `<div class="card"><div class="cardSub">저장된 장소가 없습니다.</div></div>`;
      return;
    }

    wrap.innerHTML = filtered
      .map((p) => `
        <div class="listItem" data-id="${escapeAttr(p.id)}">
          <div class="listTop">
            <div class="listName">${escapeHtml(p.name)} <span class="badge">${escapeHtml(p.category||"기타")}</span></div>
            <div class="listMeta">${new Date(p.createdAt || Date.now()).toLocaleDateString("ko-KR")}</div>
          </div>
          <div class="cardSub">${p.nameJa ? "일본어: " + escapeHtml(p.nameJa) + "<br/>" : ""}${p.memo ? "메모: " + escapeHtml(p.memo) + "<br/>" : ""}${p.address ? escapeHtml(p.address) : ""}</div>
        </div>
      `)
      .join("");

    wrap.querySelectorAll(".listItem").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-id");
        const p = places.find((x) => x.id === id);
        if (!p) return;
        selectedId = p.id;
        setTab("map");
        setSheet("open");
        map.setView([p.lat, p.lng], Math.max(map.getZoom(), 16));
        renderPlaceDetail(p);
      });
    });
  }

  btnListTab.addEventListener("click", () => { setTab("list"); setSheet("open"); });

  tabMap.addEventListener("click", () => setTab("map"));
  tabList.addEventListener("click", () => setTab("list"));

  btnCloseSheet.addEventListener("click", () => setSheet("peek"));
  scrim.addEventListener("click", () => setSheet("peek"));

  btnClearSearch.addEventListener("click", () => {
    searchInput.value = "";
    searchInput.focus();
    if (tabList.classList.contains("active")) renderListPanel();
  });

  searchInput.addEventListener("input", () => {
    if (tabList.classList.contains("active")) renderListPanel();
  });

  btnLocate.addEventListener("click", () => {
    if (!navigator.geolocation) return showToast("이 기기에서 위치 기능을 사용할 수 없습니다");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        map.setView([lat, lng], Math.max(map.getZoom(), 17));

        if (currentLocationMarker) map.removeLayer(currentLocationMarker);
        currentLocationMarker = L.circleMarker([lat, lng], {
          radius: 8,
          color: "#ffffff",
          weight: 2,
          fillColor: "#1a73e8",
          fillOpacity: 1,
        }).addTo(map);

        if (currentAccuracyCircle) map.removeLayer(currentAccuracyCircle);
        if (typeof pos.coords.accuracy === "number") {
          currentAccuracyCircle = L.circle([lat, lng], {
            radius: pos.coords.accuracy,
            color: "#1a73e8",
            fillColor: "#1a73e8",
            fillOpacity: 0.12,
            weight: 1,
          }).addTo(map);
        }

        showToast("현위치로 이동했습니다");
      },
      () => showToast("위치 권한을 확인해 주세요"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  function updateOnline() {
    offlineBanner.classList.toggle("hidden", navigator.onLine);
  }
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();

  setSheet("peek");
  setTab("map");
  renderHomePanel();

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/\n/g, " ");
  }
})();