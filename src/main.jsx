import React, { useEffect, useMemo, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { createRoot } from "react-dom/client";
import "./styles.css";

import Sidebar from "./components/Sidebar.jsx";
import MapView from "./components/MapView.jsx";
import PinEditor from "./components/PinEditor.jsx";
import PinDetail from "./components/PinDetail.jsx";

import { db, ensureSeed, addCity, renameCity, deleteCity, addTheme, renameTheme, deleteTheme, addPin, updatePin, deletePin } from "./db.js";
import { geocodeSearch, geocodeReverse } from "./utils/geocode.js";
import { googleMapsDirectionsUrl } from "./utils/googleMaps.js";

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
  const [invalidateSignal, setInvalidateSignal] = useState(0);

  const [isMobile, setIsMobile] = useState(() => !(window.matchMedia?.("(min-width: 901px)")?.matches ?? true));
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile drawer
  const [showCatPicker, setShowCatPicker] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(min-width: 901px)");
    if (!mq) return;
    const onChange = () => {
      const mobile = !mq.matches;
      setIsMobile(mobile);
      if (!mobile) setDrawerOpen(false);
      setInvalidateSignal(x => x + 1);
    };
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const filteredPins = useMemo(() => {
    let out = pins;
    if (selectedCityId) out = out.filter(p => p.cityId === selectedCityId);
    if (selectedThemeId) out = out.filter(p => p.themeId === selectedThemeId);
    return out;
  }, [pins, selectedCityId, selectedThemeId]);

  const localResults = useMemo(() => {
    // 소분류(테마) 선택 시: 해당 테마의 핀 목록
    let out = pins;
    if (selectedCityId) out = out.filter(p => p.cityId === selectedCityId);
    if (selectedThemeId) out = out.filter(p => p.themeId === selectedThemeId);
    return out
      .slice()
      .sort((a,b) => String(a.name||"").localeCompare(String(b.name||""),"ko"))
      .slice(0, 50);
  }, [pins, selectedCityId, selectedThemeId]);

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
      setInvalidateSignal(x => x + 1);
    })();
  }, []);

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
    setInvalidateSignal(x => x + 1);
  }

  async function handleAddTheme(cityId) {
    const name = prompt("테마 이름을 입력해 주세요.");
    if (!name?.trim()) return;
    await addTheme(cityId, name.trim());
    await refreshAll();
    setExpandedCityIds(prev => new Set([...prev, cityId]));
    setSelectedCityId(cityId);
    setSelectedThemeId(null);
    setInvalidateSignal(x => x + 1);
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
    setInvalidateSignal(x => x + 1);
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
    setInvalidateSignal(x => x + 1);
  }

  async function handleSavePin(pinData) {
    if (editorState?.mode === "edit") {
      await updatePin(pinData.id, pinData);
      await refreshAll();
      setSelectedPinId(pinData.id);
      setFlyTo({ lat: pinData.lat, lng: pinData.lng, zoom: 16, pinId: pinData.id, t: Date.now() });
    } else {
      const id = await addPin(pinData);
      await refreshAll();
      setSelectedPinId(id);
      setFlyTo({ lat: pinData.lat, lng: pinData.lng, zoom: 16, pinId: id, t: Date.now() });
    }

    if (pinData.cityId) {
      setSelectedCityId(pinData.cityId);
      setExpandedCityIds(prev => new Set([...prev, pinData.cityId]));
    }
    setSelectedThemeId(pinData.themeId ?? null);

    setEditorState(null);
    setAddMode(false);
    setInvalidateSignal(x => x + 1);
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
      const res = await geocodeSearch(q, { lang: 'ko', limit: 8 });
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

  function deleteHistoryItem(q) {
    const next = searchHistory.filter(x => x !== q).slice(0, 5);
    setSearchHistory(next);
    saveHistory(next);
  }

  async function fillAddressesFor(lat, lng) {
    try {
      const [ko, ja] = await Promise.all([
        geocodeReverse(lat, lng, { lang: 'ko' }),
        geocodeReverse(lat, lng, { lang: 'ja' })
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

  const handlePickSearchResult = async (r) => {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    setFlyTo({ lat, lng, zoom: 15, t: Date.now() });
    await handleMapPickForCreate({ lat, lng });
  }


  function handlePickLocalPin(id) {
    const pin = pins.find(p => p.id === id);
    if (!pin) return;
    setFlyTo({ lat: Number(pin.lat), lng: Number(pin.lng), zoom: 17, t: Date.now() });
    if (isMobile) setDrawerOpen(false);
    setInvalidateSignal(x => x + 1);
  }

  async function handleMapPickForCreate(latlng) {
    const lat = latlng.lat;
    const lng = latlng.lng;

    let addr = { addressJa: '', addressKo: '', nameFromKo: '' };
    try {
      addr = await fillAddressesFor(lat, lng);
    } catch {
      // 네트워크/서버 오류 시에도 저장창은 열리도록
      addr = { addressJa: '', addressKo: '', nameFromKo: '' };
    }

    const cityId = null;
    const themeId = null;

    const nextDraft = {
      lat,
      lng,
      cityId,
      themeId,
      name: addr.nameFromKo || "",
      addressJa: addr.addressJa,
      addressKo: addr.addressKo,
      memo: "",
      links: editorState?.mode === "create" ? (editorState.pin.links || []) : [],
      photos: editorState?.mode === "create" ? (editorState.pin.photos || []) : []
    };

    setEditorState({ mode: "create", pin: nextDraft });
    if (isMobile) setDrawerOpen(false);
    setInvalidateSignal(x => x + 1);
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
        setFlyTo({ lat: loc.lat, lng: loc.lng, zoom: 16, t: Date.now() });
        setInvalidateSignal(x => x + 1);
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
    const destQuery =
      (selectedPin.addressKo && selectedPin.addressKo.trim()) ||
      (selectedPin.addressJa && selectedPin.addressJa.trim()) ||
      `${selectedPin.lat},${selectedPin.lng}`;
    const url = googleMapsDirectionsUrl(origin, destQuery, "transit");
    window.open(url, "_blank");
  }

  return (
    <ErrorBoundary>
      <div className="app">
      <Sidebar
        isMobile={isMobile}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        onQuickAdd={() => { setShowCatPicker(true); }}
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
        onDeleteHistory={deleteHistoryItem}
        onPickSearchResult={handlePickSearchResult}
        localResults={localResults}
        onPickLocalPin={handlePickLocalPin}
        selectedPinId={selectedPinId}
        onSelectPin={(id) => setSelectedPinId(id)}
      />

      <main className="main">
        {isMobile ? (
          <>
            {drawerOpen ? <div className="drawerBackdrop" onClick={() => setDrawerOpen(false)} /> : null}
            <button className="menuBtn" title="목록" onClick={() => setDrawerOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/></svg>
            </button>
          </>
        ) : null}

        
        {showCatPicker ? (
          <div className="catPickerOverlay" onClick={() => setShowCatPicker(false)}>
            <div className="catPicker" onClick={(e) => e.stopPropagation()}>
              <div className="catPickerTitle">추가할 분류 선택</div>
              <div className="catPickerBtns">
                <button
                  className="catBtn"
                  onClick={() => {
                    setShowCatPicker(false);
                    handleAddCity();
                  }}
                >
                  도시 추가
                </button>
                <button
                  className="catBtn"
                  onClick={() => {
                    let cityId = selectedCityId ?? null;
                    if (!cityId) {
                      if (!cities?.length) { alert("먼저 도시를 추가해 주세요."); return; }
                      const opts = cities.map((c, i) => `${i + 1}) ${c.name}`).join("
");
                      const pick = prompt(`테마를 추가할 도시를 선택해 주세요.
${opts}`);
                      const n = Number(String(pick || "").trim());
                      if (!Number.isFinite(n) || n < 1 || n > cities.length) return;
                      cityId = cities[n - 1].id;
                    }
                    setShowCatPicker(false);
                    handleAddTheme(cityId);
                  }}
                >
                  테마 추가
                </button>
              </div>
              <button className="catCancel" onClick={() => setShowCatPicker(false)}>취소</button>
            </div>
          </div>
        ) : null}

        <MapView
          pins={filteredPins}
          selectedPinId={selectedPinId}
          onSelectPin={(id) => setSelectedPinId(id)}
          addMode={addMode}
          onMapPickForCreate={handleMapPickForCreate}
          flyTo={flyTo}
          userLocation={userLocation}
          invalidateSignal={invalidateSignal}
        />

        <div className="fabStack">
          <button className="fab" title="핀 추가" onClick={() => { setAddMode(v => !v); setInvalidateSignal(x => x + 1); }}>
            {addMode ? "✕" : "＋"}
          </button>
          <button className="fab" title="길찾기" onClick={handleDirections}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2 12l19-9-5 19-4-8-10-2zm11.5 1.2 2.2 4.4 2.6-9.8-9.8 2.6 5 2.8z"/></svg>
          </button>
        </div>

        <button className="locBtn" title="현위치" onClick={handleMyLocation}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 2h2v3.06A7.002 7.002 0 0 1 18.94 11H22v2h-3.06A7.002 7.002 0 0 1 13 18.94V22h-2v-3.06A7.002 7.002 0 0 1 5.06 13H2v-2h3.06A7.002 7.002 0 0 1 11 5.06V2zm1 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg>
        </button>

        {editorState ? (
          <PinEditor
            mode={editorState.mode}
            cities={cities}
            themes={themes}
            initialPin={editorState.pin}
            onSave={handleSavePin}
            onClose={() => { setEditorState(null); setAddMode(false); setInvalidateSignal(x => x + 1); }}
          />
        ) : null}

        {selectedPin ? (
          <PinDetail
            pin={selectedPin}
            userLocation={userLocation}
            onEdit={() => setEditorState({ mode: "edit", pin: selectedPin })}
            onDelete={() => handleDeletePin(selectedPin.id)}
            onClose={() => setSelectedPinId(null)}
          />
        ) : null}
      </main>
    </div>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById("root")).render(<App />);
