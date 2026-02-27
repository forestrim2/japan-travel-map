import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

import Sidebar from "./components/Sidebar.jsx";
import MapView from "./components/MapView.jsx";
import PinEditor from "./components/PinEditor.jsx";
import PinDetail from "./components/PinDetail.jsx";

import { db, ensureSeed, addCity, addTheme, addPin, updatePin, deletePin, exportAll, importAll } from "./db.js";
import { nominatimSearch } from "./utils/nominatim.js";

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [cities, setCities] = useState([]);
  const [themes, setThemes] = useState([]);
  const [pins, setPins] = useState([]);

  const [selectedCityId, setSelectedCityId] = useState(null);
  const [selectedThemeId, setSelectedThemeId] = useState(null);

  const [selectedPinId, setSelectedPinId] = useState(null);

  const [addMode, setAddMode] = useState(false);
  const [editorState, setEditorState] = useState(null); // {mode, pin}
  const [flyTo, setFlyTo] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchBusy, setSearchBusy] = useState(false);

  const [userLocation, setUserLocation] = useState(null);

  const importInputRef = useRef(null);

  const filteredPins = useMemo(() => {
    let out = pins;
    if (selectedCityId) out = out.filter(p => p.cityId === selectedCityId);
    if (selectedThemeId) out = out.filter(p => p.themeId === selectedThemeId);
    return out;
  }, [pins, selectedCityId, selectedThemeId]);

  const localResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    // 로컬 핀 검색
    return pins
      .filter(p => {
        const hay = `${p.name||""} ${p.memo||""} ${p.addressKo||""} ${p.addressJa||""} ${(p.tags||[]).join(" ")}`.toLowerCase();
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

    if (!selectedCityId && c[0]?.id) setSelectedCityId(c[0].id);
  }

  useEffect(() => {
    (async () => {
      await ensureSeed();
      await refreshAll();
    })();
  }, []);

  // 검색 Enter 처리
  useEffect(() => {
    const onKey = async (e) => {
      if (e.key !== "Enter") return;
      const q = searchQuery.trim();
      if (!q) return;
      try {
        setSearchBusy(true);
        const res = await nominatimSearch(q);
        setSearchResults(res || []);
      } catch (err) {
        alert("검색에 실패했습니다.");
      } finally {
        setSearchBusy(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchQuery]);

  const selectedPin = useMemo(() => pins.find(p => p.id === selectedPinId) || null, [pins, selectedPinId]);

  async function handleAddCity() {
    const name = prompt("도시 이름을 입력해 주세요.");
    if (!name?.trim()) return;
    await addCity(name.trim());
    await refreshAll();
  }

  async function handleAddTheme() {
    if (!selectedCityId) return;
    const name = prompt("테마 이름을 입력해 주세요.");
    if (!name?.trim()) return;
    await addTheme(selectedCityId, name.trim());
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
      await addPin(pinData);
    } else {
      await updatePin(pinData.id, pinData);
    }
    setEditorState(null);
    setAddMode(false);
    await refreshAll();
  }

  async function handleDeletePin(id) {
    if (!confirm("삭제할까요?")) return;
    await deletePin(id);
    setSelectedPinId(null);
    await refreshAll();
  }

  function handlePickSearchResult(r) {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    setFlyTo({ lat, lng, zoom: 15 });
    // 검색 결과로 핀 저장: 이름(첫 토큰) + 주소(원문은 일본어/한국어 구분 불명) → 일단 일본어 칸에 넣고 한국어는 비움
    const title = (r.display_name || "").split(",")[0] || "저장할 장소";
    openCreateEditor({
      id: undefined,
      lat,
      lng,
      cityId: selectedCityId ?? cities[0]?.id ?? null,
      themeId: selectedThemeId ?? themes.find(t => t.cityId === (selectedCityId ?? cities[0]?.id))?.id ?? null,
      name: title,
      addressJa: r.display_name || "",
      addressKo: "",
      memo: ""
    });
  }

  function handlePickLocalPin(pin) {
    setFlyTo({ lat: pin.lat, lng: pin.lng, zoom: 16, pinId: pin.id });
  }

  function handleMapPickForCreate(latlng) {
    // 지도 클릭으로 새 핀
    openCreateEditor({
      lat: latlng.lat,
      lng: latlng.lng,
      cityId: selectedCityId ?? cities[0]?.id ?? null,
      themeId: selectedThemeId ?? themes.find(t => t.cityId === (selectedCityId ?? cities[0]?.id))?.id ?? null,
      name: "",
      addressJa: "",
      addressKo: "",
      memo: ""
    });
  }

  async function handleExport() {
    const payload = await exportAll();
    downloadJson(`travel-pin-map-export-${new Date().toISOString().slice(0,10)}.json`, payload);
  }

  async function handleImportFile(file) {
    const text = await file.text();
    const payload = JSON.parse(text);
    await importAll(payload);
    await refreshAll();
    alert("가져오기 완료");
  }

  function handleImportClick() {
    importInputRef.current?.click();
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
        setFlyTo({ lat: loc.lat, lng: loc.lng, zoom: 14 });
      },
      () => alert("위치 권한이 필요합니다."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // FAB: 길찾기 = 선택된 핀 있으면 구글맵(대중교통) 바로 열기
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
      <Sidebar
        cities={cities}
        themes={themes}
        pins={pins}
        selectedCityId={selectedCityId}
        selectedThemeId={selectedThemeId}
        setSelectedCityId={setSelectedCityId}
        setSelectedThemeId={setSelectedThemeId}
        onAddCity={handleAddCity}
        onAddTheme={handleAddTheme}
        onExport={handleExport}
        onImportClick={handleImportClick}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchBusy ? [] : searchResults}
        onPickSearchResult={handlePickSearchResult}
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
            {addMode ? "✕" : "+"}
          </button>
          <button className="fab" title="내 위치" onClick={handleMyLocation}>⌖</button>
          <button className="fab" title="길찾기(구글맵)" onClick={handleDirections}>➤</button>
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

        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            handleImportFile(f).catch(() => alert("가져오기 실패"));
            e.target.value = "";
          }}
        />
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
