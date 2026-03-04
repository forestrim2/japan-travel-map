import React, { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Sidebar from "./Sidebar.jsx";
import MapView from "./map/MapView.jsx";
import LocationButton from "./map/LocationButton.jsx";
import PinEditModal from "./pins/PinEditModal.jsx";
import PinViewModal from "./pins/PinViewModal.jsx";
import { loadState, saveState, clearState } from "./utils/storage.js";
import { confirmDelete } from "./utils/confirm.js";
import { forwardSearch, reverseGeocode } from "./search/Geocoder.js";
import { pushRecent } from "./search/SearchHistory.js";
import { isSyncAvailable, pullState, pushState } from "./sync/SyncEngine.js";

function nowIso() { return new Date().toISOString(); }

function initialData() {
  const seoul = { id: uuidv4(), name: "서울", createdAt: nowIso() };
  const tokyo = { id: uuidv4(), name: "도쿄", createdAt: nowIso() };
  const tFood = { id: uuidv4(), cityId: tokyo.id, name: "맛집", createdAt: nowIso() };
  return {
    cities: [seoul, tokyo],
    themes: [tFood],
    pins: [],
    recentSearches: [],
    ui: { openCityIds: [tokyo.id], openThemeId: tFood.id, selectedCityId: tokyo.id, selectedThemeId: tFood.id },
    syncKey: "",
  };
}

export default function App() {
  const saved = loadState();
  const [data, setData] = useState(saved || initialData());

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [addMode, setAddMode] = useState(false);

  const [mapQuery, setMapQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [searchCandidate, setSearchCandidate] = useState(null);

  const [flyTarget, setFlyTarget] = useState(null);
  const [flyZoom, setFlyZoom] = useState(null);

  const [selectedPinId, setSelectedPinId] = useState(null);
  const [viewPinId, setViewPinId] = useState(null);

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState("add");
  const [pinDraft, setPinDraft] = useState(null);

  const [currentLoc, setCurrentLoc] = useState(null);

  const syncAvailable = isSyncAvailable();

  const cities = data.cities || [];
  const themes = data.themes || [];
  const pins = data.pins || [];
  const recentSearches = data.recentSearches || [];
  const ui = data.ui || {};
  const syncKey = data.syncKey || "";

  useEffect(() => { saveState(data); }, [data]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!syncAvailable) return;
      if (!syncKey.trim()) return;
      const remote = await pullState(syncKey);
      if (cancelled || !remote?.payload) return;
      try {
        const payload = remote.payload;
        if (payload?.cities && payload?.themes && payload?.pins) setData((prev) => ({ ...prev, ...payload }));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []); // once

  useEffect(() => {
    if (!syncAvailable) return;
    if (!syncKey.trim()) return;
    const id = setInterval(() => {
      const payload = { cities, themes, pins, recentSearches, ui, syncKey };
      pushState(syncKey, payload);
    }, 5000);
    return () => clearInterval(id);
  }, [syncAvailable, syncKey, cities, themes, pins, recentSearches, ui]);

  const cityById = useMemo(() => Object.fromEntries(cities.map((c) => [c.id, c])), [cities]);
  const themeById = useMemo(() => Object.fromEntries(themes.map((t) => [t.id, t])), [themes]);

  const selectedCityId = ui.selectedCityId || "";
  const selectedThemeId = ui.selectedThemeId || "";
  const openCityIds = ui.openCityIds || [];
  const openThemeId = ui.openThemeId || null;

  const filteredPins = useMemo(() => {
    if (!selectedThemeId) return pins;
    return pins.filter((p) => p.themeId === selectedThemeId);
  }, [pins, selectedThemeId]);

  function setUI(patch) { setData((prev) => ({ ...prev, ui: { ...(prev.ui || {}), ...patch } })); }

  function toggleCity(cityId) {
    setUI({ openCityIds: openCityIds.includes(cityId) ? openCityIds.filter((x) => x !== cityId) : [...openCityIds, cityId] });
  }

  async function runSearch(termOverride) {
    const q = String(termOverride ?? mapQuery).trim();
    if (!q) return;
    setSearchError("");
    try {
      const res = await forwardSearch(q, 8);
      setSearchResults(res);
      setData((prev) => ({ ...prev, recentSearches: pushRecent(prev.recentSearches || [], q, 5) }));
    } catch {
      setSearchError("검색 실패");
    }
  }

  function clearSearchAll() {
    setMapQuery("");
    setSearchResults([]);
    setSearchError("");
    setSearchCandidate(null);
  }

  function pickSearch(r) {
    setSearchCandidate({ lat: r.lat, lng: r.lng, name: r.name });
    setFlyTarget({ lat: r.lat, lng: r.lng });
    setFlyZoom(16);
    setSidebarOpen(false);
  }

  function deleteRecent(term) {
    const t = String(term || "").trim();
    setData((prev) => ({ ...prev, recentSearches: (prev.recentSearches || []).filter((x) => x !== t) }));
  }

  async function openAddPinAt(latlng, { force } = {}) {
    if (!addMode && !force) return;
    try {
      const [ko, ja] = await Promise.all([
        reverseGeocode(latlng.lat, latlng.lng, "ko"),
        reverseGeocode(latlng.lat, latlng.lng, "ja"),
      ]);
      const draft = {
        id: uuidv4(),
        lat: latlng.lat,
        lng: latlng.lng,
        name: searchCandidate?.name ? String(searchCandidate.name).split(",")[0] : "",
        krAddr: ko.display || "",
        jpAddr: ja.display || (ko.display || ""),
        memo: "",
        links: [],
        photos: [],
        cityId: selectedCityId || "",
        themeId: selectedThemeId || "",
      };
      setPinDraft(draft);
      setPinModalMode("add");
      setPinModalOpen(true);
      setAddMode(false);
    } catch {
      setPinDraft({
        id: uuidv4(),
        lat: latlng.lat,
        lng: latlng.lng,
        name: "",
        krAddr: "",
        jpAddr: "",
        memo: "",
        links: [],
        photos: [],
        cityId: selectedCityId || "",
        themeId: selectedThemeId || "",
      });
      setPinModalMode("add");
      setPinModalOpen(true);
      setAddMode(false);
    }
  }

  function viewPin(pinId) {
    setSelectedPinId(pinId);
    const p = pins.find((x) => x.id === pinId);
    if (p) {
      setFlyTarget({ lat: p.lat, lng: p.lng });
      setFlyZoom(16);
      setViewPinId(pinId);
      setSidebarOpen(false);
    }
  }

  function editPin(pinId) {
    const p = pins.find((x) => x.id === pinId);
    if (!p) return;
    setPinDraft(p);
    setPinModalMode("edit");
    setPinModalOpen(true);
  }

  function savePin(updated) {
    const u = { ...updated };
    const c = cityById[u.cityId];
    const t = themeById[u.themeId];
    u.cityName = c?.name || "";
    u.themeName = t?.name || "";
    setData((prev) => {
      const exist = (prev.pins || []).some((p) => p.id === u.id);
      const nextPins = exist ? (prev.pins || []).map((p) => (p.id === u.id ? u : p)) : [...(prev.pins || []), u];
      return { ...prev, pins: nextPins };
    });
    setPinModalOpen(false);
    setPinDraft(null);
  }

  function deletePin(pinId) {
    if (!confirmDelete("정말 삭제하십니까?")) return;
    setData((prev) => ({ ...prev, pins: (prev.pins || []).filter((p) => p.id !== pinId) }));
    if (viewPinId === pinId) setViewPinId(null);
    if (selectedPinId === pinId) setSelectedPinId(null);
  }

  function addCityOrTheme() {
    const choice = window.prompt("추가할 항목을 입력하세요: 도시 / 테마", "도시");
    if (!choice) return;
    const c = choice.trim();
    if (c === "도시") {
      const name = window.prompt("도시 이름", "");
      if (!name) return;
      const city = { id: uuidv4(), name: name.trim(), createdAt: nowIso() };
      setData((prev) => ({ ...prev, cities: [...(prev.cities || []), city], ui: { ...(prev.ui||{}), openCityIds: [...new Set([...(prev.ui?.openCityIds||[]), city.id])] } }));
      return;
    }
    if (c === "테마") {
      const cityNameList = cities.map((x, i) => `${i + 1}) ${x.name}`).join("\n");
      const idx = window.prompt(`어떤 도시 아래에 추가할까요?\n${cityNameList}`, "1");
      if (!idx) return;
      const city = cities[Number(idx) - 1];
      if (!city) return;
      const name = window.prompt("테마 이름", "");
      if (!name) return;
      const theme = { id: uuidv4(), cityId: city.id, name: name.trim(), createdAt: nowIso() };
      setData((prev) => ({ ...prev, themes: [...(prev.themes || []), theme] }));
      return;
    }
    alert("도시 또는 테마만 입력해 주세요.");
  }

  function addTheme(cityId) {
    const name = window.prompt("테마 이름", "");
    if (!name) return;
    const theme = { id: uuidv4(), cityId, name: name.trim(), createdAt: nowIso() };
    setData((prev) => ({ ...prev, themes: [...(prev.themes || []), theme] }));
  }

  function editCity(cityId) {
    const city = cities.find((c) => c.id === cityId);
    if (!city) return;
    const name = window.prompt("도시 이름 수정", city.name);
    if (!name) return;
    setData((prev) => ({ ...prev, cities: (prev.cities || []).map((c) => c.id === cityId ? { ...c, name: name.trim() } : c) }));
  }

  function deleteCity(cityId) {
    if (!confirmDelete("정말 삭제하십니까?")) return;
    const themeIds = themes.filter((t) => t.cityId === cityId).map((t) => t.id);
    setData((prev) => ({
      ...prev,
      cities: (prev.cities || []).filter((c) => c.id !== cityId),
      themes: (prev.themes || []).filter((t) => t.cityId !== cityId),
      pins: (prev.pins || []).filter((p) => p.cityId !== cityId && !themeIds.includes(p.themeId)),
    }));
  }

  function editTheme(themeId) {
    const t = themes.find((x) => x.id === themeId);
    if (!t) return;
    const name = window.prompt("테마 이름 수정", t.name);
    if (!name) return;
    setData((prev) => ({ ...prev, themes: (prev.themes || []).map((x) => x.id === themeId ? { ...x, name: name.trim() } : x) }));
  }

  function deleteTheme(themeId) {
    if (!confirmDelete("정말 삭제하십니까?")) return;
    setData((prev) => ({ ...prev, themes: (prev.themes || []).filter((t) => t.id !== themeId), pins: (prev.pins || []).filter((p) => p.themeId !== themeId) }));
  }

  function moveTheme(themeId) {
    const list = cities.map((x, i) => `${i + 1}) ${x.name}`).join("\n");
    const idx = window.prompt(`이동할 도시를 선택해 주세요.\n${list}`, "1");
    if (!idx) return;
    const dest = cities[Number(idx) - 1];
    if (!dest) return;
    setData((prev) => ({ ...prev, themes: (prev.themes || []).map((x) => x.id === themeId ? { ...x, cityId: dest.id } : x) }));
  }

  function movePin(pinId) {
    const p = pins.find((x) => x.id === pinId);
    if (!p) return;
    const cityList = cities.map((x, i) => `${i + 1}) ${x.name}`).join("\n");
    const cIdx = window.prompt(`이동할 도시를 선택해 주세요.\n${cityList}`, "1");
    if (!cIdx) return;
    const destCity = cities[Number(cIdx) - 1];
    if (!destCity) return;
    const tIn = themes.filter((t) => t.cityId === destCity.id);
    if (!tIn.length) { alert("선택한 도시의 테마가 없습니다. 먼저 테마를 추가해 주세요."); return; }
    const themeList = tIn.map((x, i) => `${i + 1}) ${x.name}`).join("\n");
    const tIdx = window.prompt(`이동할 테마를 선택해 주세요.\n${themeList}`, "1");
    if (!tIdx) return;
    const destTheme = tIn[Number(tIdx) - 1];
    if (!destTheme) return;

    setData((prev) => ({
      ...prev,
      pins: (prev.pins || []).map((x) => x.id === pinId ? { ...x, cityId: destCity.id, themeId: destTheme.id, cityName: destCity.name, themeName: destTheme.name } : x),
    }));
  }

  function clearAllData() {
    if (!confirmDelete("정말 삭제하십니까?")) return;
    clearState();
    setData(initialData());
    setSearchResults([]);
    setSearchCandidate(null);
    setSelectedPinId(null);
    setViewPinId(null);
  }

  function goToCurrent() {
    if (!navigator.geolocation) return alert("GPS를 사용할 수 없습니다.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLoc(loc);
        setFlyTarget(loc);
        setFlyZoom(16);
      },
      () => alert("현위치를 가져오지 못했습니다."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const viewPinData = useMemo(() => {
    const p = pins.find((x) => x.id === viewPinId);
    if (!p) return null;
    return { ...p, cityName: p.cityName || cityById[p.cityId]?.name || "", themeName: p.themeName || themeById[p.themeId]?.name || "" };
  }, [pins, viewPinId, cityById, themeById]);

  return (
    <div className="app">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        mapQuery={mapQuery}
        setMapQuery={setMapQuery}
        onRunSearch={runSearch}
        onClearSearchAll={clearSearchAll}
        searchResults={searchResults}
        searchError={searchError}
        onPickSearch={pickSearch}
        recentSearches={recentSearches}
        onDeleteRecent={deleteRecent}
        cities={cities}
        themes={themes}
        pins={pins}
        openCityIds={openCityIds}
        toggleCity={toggleCity}
        openThemeId={openThemeId}
        setOpenThemeId={(id) => setUI({ openThemeId: id })}
        selectedCityId={selectedCityId}
        setSelectedCityId={(id) => setUI({ selectedCityId: id })}
        selectedThemeId={selectedThemeId}
        setSelectedThemeId={(id) => setUI({ selectedThemeId: id })}
        selectedPinId={selectedPinId}
        onViewPin={viewPin}
        onEditCity={editCity}
        onDeleteCity={deleteCity}
        onEditTheme={editTheme}
        onDeleteTheme={deleteTheme}
        onMoveTheme={moveTheme}
        onAddCityOrTheme={addCityOrTheme}
        onAddTheme={addTheme}
        addMode={addMode}
        onToggleAddMode={() => setAddMode((p) => !p)}
        onClearAllData={clearAllData}
        syncKey={syncKey}
        setSyncKey={(v) => setData((prev) => ({ ...prev, syncKey: v }))}
        syncAvailable={syncAvailable}
      />

      </div>

      <div className="mapWrap">
        <MapView
          addMode={addMode}
          pins={filteredPins}
          selectedPinId={selectedPinId}
          searchCandidate={searchCandidate}
          flyTarget={flyTarget}
          flyZoom={flyZoom}
          onMapPickForAdd={openAddPinAt}
          onSelectPin={(id) => viewPin(id)}
        />
        <div className="fabs">
          <button className="hamburgerFab" onClick={() => setSidebarOpen(true)} title="목록">☰</button>

          <button className={"fab" + (addMode ? " active" : "")} title="핀 저장 모드" onClick={() => setAddMode((p) => !p)}>+</button>
          <LocationButton onClick={goToCurrent} />
        </div>
      </div>

      <PinViewModal
        pin={viewPinData}
        currentLoc={currentLoc}
        onClose={() => setViewPinId(null)}
        onEdit={() => { setViewPinId(null); editPin(viewPinData?.id); }}
        onMove={() => movePin(viewPinData?.id)}
        onDelete={() => deletePin(viewPinData?.id)}
      />

      <PinEditModal
        isOpen={pinModalOpen}
        mode={pinModalMode}
        initial={pinDraft}
        cities={cities}
        themes={themes}
        onClose={() => { setPinModalOpen(false); setPinDraft(null); }}
        onSave={savePin}
      />
    </div>
  );
}
