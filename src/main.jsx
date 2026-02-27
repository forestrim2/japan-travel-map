import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

import Sidebar from "./components/Sidebar.jsx";
import MapView from "./components/MapView.jsx";
import PinEditor from "./components/PinEditor.jsx";
import PinDetail from "./components/PinDetail.jsx";

import { db, ensureSeed, addCity, renameCity, deleteCity, addTheme, renameTheme, deleteTheme, addPin, updatePin, deletePin } from "./db.js";
import { nominatimSearch, nominatimReverse } from "./utils/nominatim.js";

const SEARCH_HISTORY_KEY = "tpm_search_history_v1";

function loadHistory() {
  try {
    const arr = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
    return Array.isArray(arr) ? arr.slice(0, 5) : [];
  } catch {
    return [];
  }
}
function saveHistory(arr) {
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(arr.slice(0, 5)));
}

function App() {
  const [cities, setCities] = useState([]);
  const [themes, setThemes] = useState([]);
  const [pins, setPins] = useState([]);

  const [selectedCityId, setSelectedCityId] = useState(null);
  const [selectedThemeId, setSelectedThemeId] = useState(null);

  const [expandedCityIds, setExpandedCityIds] = useState(new Set());

  const [selectedPinId, setSelectedPinId] = useState(null);

  const [addMode, setAddMode] = useState(false);
  const [editorState, setEditorState] = useState(null); // {mode, pin}
  const [flyTo, setFlyTo] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchHistory, setSearchHistory] = useState(loadHistory());

  const [userLocation, setUserLocation] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredPins = useMemo(() => {
    let out = pins;
    if (selectedCityId) out = out.filter(p => p.cityId === selectedCityId);
    if (selectedThemeId) out = out.filter(p => p.themeId === selectedThemeId);
    return out;
  }, [pins, selectedCityId, selectedThemeId]);

  const localResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return pins
      .filter(p => {
        const hay = `${p.name||""} ${p.memo||""} ${p.addressKo||""} ${p.addressJa||""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 6);
  }, [searchQuery, pins]);

  async function refreshAll() {
    const [c, t, p] = await Promise.all([
      db.cities.toArray(),
      db.themes.toArray(),
      db.pins.toArray()
    ]);
    c.sort((a,b) => a.name.localeCompare(b.name,"ko"));
    setCities(c);
    setThemes(t);
    setPins(p);

    if (!selectedCityId && c[0]?.id) {
      setSelectedCityId(c[0].id);
      setExpandedCityIds(new Set([c[0].id]));
    }
  }

  useEffect(() => {
    (async () => {
      await ensureSeed();
      await refreshAll();
    })();
  }, []);

  // Enter로 검색
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Enter") return;
      if (document.activeElement?.tagName?.toLowerCase?.() !== "input") return;
      runSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchQuery]);

  const selectedPin = useMemo(() => pins.find(p => p.id === selectedPinId) || null, [pins, selectedPinId]);

  function toggleCityExpanded(cityId) {
    setExpandedCityIds(prev => {
      const next = new Set(prev);
      if (next.has(cityId)) next.delete(cityId);
      else next.add(cityId);
      return next;
    });
  }

  async function handleAddCity() {
    const name = prompt("도시 이름을 입력해 주세요.");
    if (!name?.trim()) return;
    const id = await addCity(name.trim());
    await refreshAll();
    setExpandedCityIds(prev => new Set([...prev, id]));
    setSelectedCityId(id);
    setSelectedThemeId(null);
  }

  async function handleAddTheme(cityId) {
    const name = prompt("테마 이름을 입력해 주세요.");
    if (!name?.trim()) return;
    await addTheme(cityId, name.trim());
    await refreshAll();
    setExpandedCityIds(prev => new Set([...prev, cityId]));
    setSelectedCityId(cityId);
    setSelectedThemeId(null);
  }

  async function handleRenameCity(city) {
    const name = prompt("도시 이름 수정", city.name);
    if (!name?.trim()) return;
    await renameCity(city.id, name.trim());
    await refreshAll();
  }

  async function handleDeleteCity(city) {
    if (!confirm(`도시 '${city.name}'를 삭제할까요? (하위 테마/핀도 함께 삭제됩니다)`)) return;
    await deleteCity(city.id);
    setSelectedCityId(null);
    setSelectedThemeId(null);
    setSelectedPinId(null);
    await refreshAll();
  }

  async function handleRenameTheme(theme) {
    const name = prompt("테마 이름 수정", theme.name);
    if (!name?.trim()) return;
    await renameTheme(theme.id, name.trim());
    await refreshAll();
  }

  async function handleDeleteTheme(theme) {
    if (!confirm(`테마 '${theme.name}'를 삭제할까요? (해당 핀도 함께 삭제됩니다)`)) return;
    await deleteTheme(theme.id);
    setSelectedThemeId(null);
    setSelectedPinId(null);
    await refreshAll();
  }

  function openCreateEditor(pinDraft) {
    setEditorState({ mode: "create", pin: pinDraft });
  }

  function openEditEditor(pin) {
    setEditorState({ mode: "edit", pin });
  }

  async function handleSavePin(pinData) {
    if (editorState.mode === "create") {
      const id = await addPin(pinData);
      await refreshAll();
      setSelectedCityId(pinData.cityId);
      setSelectedThemeId(pinData.themeId);
      setExpandedCityIds(prev => new Set([...prev, pinData.cityId]));
      setSelectedPinId(id);
      setFlyTo({ lat: pinData.lat, lng: pinData.lng, zoom: 16, pinId: id, t: Date.now() });
    } else {
      await updatePin(pinData.id, pinData);
      await refreshAll();
      setSelectedCityId(pinData.cityId);
      setSelectedThemeId(pinData.themeId);
      setExpandedCityIds(prev => new Set([...prev, pinData.cityId]));
      setSelectedPinId(pinData.id);
      setFlyTo({ lat: pinData.lat, lng: pinData.lng, zoom: 16, pinId: pinData.id, t: Date.now() });
    }
    setEditorState(null);
    setAddMode(false);
  }

  async function handleDeletePin(id) {
    if (!confirm("삭제할까요?")) return;
    await deletePin(id);
    setSelectedPinId(null);
    await refreshAll();
  }

  async function runSearch(qOverride) {
    const q = (qOverride ?? searchQuery).trim();
    if (!q) return;
    try {
      setSearchBusy(true);
      const res = await nominatimSearch(q);
      setSearchResults(res || []);

      const nextHist = [q, ...searchHistory.filter(x => x !== q)].slice(0, 5);
      setSearchHistory(nextHist);
      saveHistory(nextHist);
    } catch {
      alert("검색에 실패했습니다.");
    } finally {
      setSearchBusy(false);
    }
  }

  async function fillAddressesFor(lat, lng) {
    try {
      const [ko, ja] = await Promise.all([
        nominatimReverse(lat, lng, "ko"),
        nominatimReverse(lat, lng, "ja")
      ]);
      return {
        addressKo: ko?.display_name || "",
        addressJa: ja?.display_name || "",
        nameFromKo: (ko?.name || ko?.display_name || "").split(",")[0] || ""
      };
    } catch {
      return { addressKo: "", addressJa: "", nameFromKo: "" };
    }
  }

  async function autoSaveFromSearchResult(r) {
    const lat = Number(r.lat);
    const lng = Number(r.lon);

    setFlyTo({ lat, lng, zoom: 15, t: Date.now() });

    const addr = await fillAddressesFor(lat, lng);
    const title = (r.name || r.display_name || "").split(",")[0] || addr.nameFromKo || "저장한 장소";

    const cityId = selectedCityId ?? cities[0]?.id ?? null;
    const themeId =
      selectedThemeId ??
      themes.find(t => t.cityId === cityId)?.id ??
      null;

    const pinData = {
      lat,
      lng,
      cityId,
      themeId,
      name: title,
      addressJa: addr.addressJa,
      addressKo: addr.addressKo,
      memo: "",
      links: [],
      photos: []
    };

    const id = await addPin(pinData);
    await refreshAll();

    setSelectedCityId(cityId);
    setSelectedThemeId(themeId);
    setExpandedCityIds(prev => new Set([...prev, cityId]));
    setSelectedPinId(id);

    setFlyTo({ lat, lng, zoom: 16, pinId: id, t: Date.now() });

    // 모바일: 자동 저장 후 사이드바 닫기
    setSidebarOpen(false);
  }

  function handlePickLocalPin(pin) {
    setFlyTo({ lat: pin.lat, lng: pin.lng, zoom: 16, pinId: pin.id, t: Date.now() });
    setSidebarOpen(false);
  }

  async function handleMapPickForCreate(latlng) {
    const lat = latlng.lat;
    const lng = latlng.lng;

    const addr = await fillAddressesFor(lat, lng);

    const cityId = selectedCityId ?? cities[0]?.id ?? null;
    const themeId =
      selectedThemeId ??
      themes.find(t => t.cityId === cityId)?.id ??
      null;

    openCreateEditor({
      lat,
      lng,
      cityId,
      themeId,
      name: addr.nameFromKo || "",
      addressJa: addr.addressJa,
      addressKo: addr.addressKo,
      memo: "",
      links: [],
      photos: []
    });

    setSidebarOpen(false);
  }

  function handleMyLocation() {
    if (!navigator.geolocation) {
      alert("이 브라우저는 위치 기능을 지원하지 않습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyTo({ lat: loc.lat, lng: loc.lng, zoom: 14, t: Date.now() });
      },
      () => alert("위치 권한이 필요합니다."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleDirections() {
    if (!selectedPin) {
      alert("먼저 핀을 선택해 주세요.");
      return;
    }
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : "";
    const url = `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${encodeURIComponent(origin)}` : ""}&destination=${encodeURIComponent(`${selectedPin.lat},${selectedPin.lng}`)}&travelmode=transit`;
    window.open(url, "_blank");
  }

  return (
    <div className="app">
      {/* 모바일: 메뉴 버튼 */}
      <button className="menuBtn" title="메뉴" onClick={() => setSidebarOpen(true)}>☰</button>
      {sidebarOpen ? <div className="drawerBackdrop" onClick={() => setSidebarOpen(false)} /> : null}

      <Sidebar
        isOpen={sidebarOpen || window.innerWidth > 900}
        onClose={() => setSidebarOpen(false)}
        cities={cities}
        themes={themes}
        pins={pins}
        selectedCityId={selectedCityId}
        selectedThemeId={selectedThemeId}
        setSelectedCityId={(id) => { setSelectedCityId(id); setSelectedThemeId(null); }}
        setSelectedThemeId={setSelectedThemeId}
        expandedCityIds={expandedCityIds}
        toggleCityExpanded={toggleCityExpanded}
        onAddCity={handleAddCity}
        onAddTheme={handleAddTheme}
        onRenameCity={handleRenameCity}
        onDeleteCity={handleDeleteCity}
        onRenameTheme={handleRenameTheme}
        onDeleteTheme={handleDeleteTheme}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onRunSearch={() => runSearch()}
        searchBusy={searchBusy}
        searchResults={searchResults}
        searchHistory={searchHistory}
        onPickHistory={(q) => { setSearchQuery(q); runSearch(q); }}
        onPickSearchResult={(r) => autoSaveFromSearchResult(r)}
        localResults={localResults}
        onPickLocalPin={handlePickLocalPin}
      />

      <main className="main">
        <MapView
          pins={filteredPins}
          selectedPinId={selectedPinId}
          onSelectPin={(id) => setSelectedPinId(id)}
          addMode={addMode}
          onMapPickForCreate={handleMapPickForCreate}
          flyTo={flyTo}
          userLocation={userLocation}
        />

        <div className="fabStack">
          <button className="fab" title="핀 추가" onClick={() => setAddMode(v => !v)}>
            {addMode ? "✕" : "＋"}
          </button>
          <button className="fab" title="현위치" onClick={handleMyLocation}>⌖</button>
          <button className="fab" title="길찾기" onClick={handleDirections}>➤</button>
        </div>

        {editorState ? (
          <PinEditor
            mode={editorState.mode}
            cities={cities}
            themes={themes}
            initialPin={editorState.pin}
            onSave={handleSavePin}
            onClose={() => { setEditorState(null); setAddMode(false); }}
          />
        ) : null}

        {selectedPin ? (
          <PinDetail
            pin={selectedPin}
            userLocation={userLocation}
            onEdit={() => openEditEditor(selectedPin)}
            onDelete={() => handleDeletePin(selectedPin.id)}
            onClose={() => setSelectedPinId(null)}
          />
        ) : null}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
