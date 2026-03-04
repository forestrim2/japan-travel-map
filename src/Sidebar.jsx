import React, { useMemo } from "react";
import SearchBox from "./search/SearchBox.jsx";
import FolderTree from "./folders/FolderTree.jsx";

export default function Sidebar({
  isOpen,
  onClose,
  mapQuery,
  setMapQuery,
  onRunSearch,
  onClearSearchAll,
  searchResults,
  searchError,
  onPickSearch,
  recentSearches,
  onDeleteRecent,
  cities,
  themes,
  pins,
  openCityIds,
  toggleCity,
  openThemeId,
  setOpenThemeId,
  selectedCityId,
  setSelectedCityId,
  selectedThemeId,
  setSelectedThemeId,
  selectedPinId,
  onViewPin,
  onEditCity,
  onDeleteCity,
  onEditTheme,
  onDeleteTheme,
  onMoveTheme,
  onAddCityOrTheme,
  onAddTheme,
  addMode,
  onToggleAddMode,
  onClearAllData,
  syncKey,
  setSyncKey,
  syncAvailable,
}) {
  const show = isOpen ? "sidebar open" : "sidebar";
  const results = searchResults || [];
  const recents = useMemo(() => recentSearches || [], [recentSearches]);

  return (
    <>
      {isOpen ? <div className="overlay" onClick={onClose} /> : null}
      <aside className={show}>
        <div className="sideHeader">
          <div className="brand">Travel Pins</div>
          <button className="btn ghost" onClick={onClose}>닫기</button>
        </div>

        <div className="section">
          <div className="sectionTitle">검색</div>
          <SearchBox query={mapQuery} setQuery={setMapQuery} onSearch={() => onRunSearch()} onClear={onClearSearchAll} />
          {searchError ? <div className="err">{searchError}</div> : null}

          {!!recents.length ? (
            <div className="recentWrap">
              <div className="muted" style={{ marginBottom: 6 }}>최근 검색</div>
              <div className="chipRow">
                {recents.map((t) => (
                  <div key={t} className="chip" onClick={() => onRunSearch(t)}>
                    <span className="chipText">{t}</span>
                    <button className="chipX" title="삭제" onClick={(e) => { e.stopPropagation(); onDeleteRecent(t); }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {results.length ? (
            <div className="resultList">
              {results.map((r) => (
                <button key={r.id} className="resultItem" onClick={() => onPickSearch(r)}>
                  {r.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="section">
          <div className="sectionTitle">폴더 (도시 &gt; 테마)</div>
          <FolderTree
            cities={cities}
            themes={themes}
            pins={pins}
            openCityIds={openCityIds}
            toggleCity={toggleCity}
            openThemeId={openThemeId}
            setOpenThemeId={setOpenThemeId}
            selectedCityId={selectedCityId}
            setSelectedCityId={setSelectedCityId}
            selectedThemeId={selectedThemeId}
            setSelectedThemeId={setSelectedThemeId}
            selectedPinId={selectedPinId}
            onViewPin={onViewPin}
            onEditCity={onEditCity}
            onDeleteCity={onDeleteCity}
            onEditTheme={onEditTheme}
            onDeleteTheme={onDeleteTheme}
            onMoveTheme={onMoveTheme}
            onAddTheme={onAddTheme}
          />
        </div>

        <div className="section">
          <div className="sectionTitle">동기화</div>
          {!syncAvailable ? (
            <div className="muted">Supabase 설정이 없어서 로컬 저장만 됩니다.</div>
          ) : (
            <div className="muted">동기화 키를 같은 값으로 맞추면 기기 간 동기화됩니다.</div>
          )}
          <input value={syncKey} onChange={(e) => setSyncKey(e.target.value)} placeholder="동기화 키 (선택)" />
        </div>

        <div className="section">
          <div className="row gap8 wrap">
            <button className="btn" onClick={onAddCityOrTheme}>＋ 도시/테마 추가</button>
            <button className={"btn" + (addMode ? " danger" : "")} onClick={onToggleAddMode}>
              {addMode ? "핀 저장 모드 ON" : "핀 저장 모드"}
            </button>
          </div>
        </div>

        <div className="section">
          <button className="btn ghost" onClick={onClearAllData}>전체 삭제</button>
        </div>
      </aside>
    </>
  );
}
