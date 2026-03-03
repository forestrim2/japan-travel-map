import React, { useMemo } from "react";

function IconPencil() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 6.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.02 1.02 3.75 3.75 1.02-1.02z"
      />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v10h-2V9zm4 0h2v10h-2V9zM6 9h2v10H6V9z"
      />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.29 9.17 12 2.89 5.71 4.3 4.29l6.29 6.3 6.3-6.3 1.41 1.42z"
      />
    </svg>
  );
}

export default function Sidebar({
  onSearch,

  isMobile,
  drawerOpen,
  setDrawerOpen,
  onQuickAdd,

  cities,
  themes,
  pins,
  selectedCityId,
  selectedThemeId,
  setSelectedCityId,
  setSelectedThemeId,
  expandedCityIds,
  toggleCityExpanded,
  onRenameCity,
  onDeleteCity,
  onRenameTheme,
  onDeleteTheme,

  selectedPinId,
  onSelectPin,

  searchQuery,
  setSearchQuery,
  onRunSearch,
  searchBusy,
  searchResults,
  searchHistory,
  onPickHistory,
  onDeleteHistory,
  onPickSearchResult,

  localResults,
  onPickLocalPin
}) {
  const themesByCity = useMemo(() => {
    const m = new Map();
    for (const t of themes) {
      if (!m.has(t.cityId)) m.set(t.cityId, []);
      m.get(t.cityId).push(t);
    }
    return m;
  }, [themes]);

  const counts = useMemo(() => {
    const byCity = new Map();
    const byTheme = new Map();
    for (const p of pins) {
      if (p.cityId) byCity.set(p.cityId, (byCity.get(p.cityId) || 0) + 1);
      if (p.themeId) byTheme.set(p.themeId, (byTheme.get(p.themeId) || 0) + 1);
    }
    return { byCity, byTheme };
  }, [pins]);

  const listPinsInTheme = useMemo(() => {
    if (!selectedThemeId) return [];
    return pins.filter((p) => p.themeId === selectedThemeId);
  }, [pins, selectedThemeId]);

  const wrapCls = isMobile ? `sidebar drawer ${drawerOpen ? "open" : ""}` : "sidebar";

  return (
    <aside className={wrapCls}>
      <div className="sidebarHeader">
        <input
          className="searchInput"
          placeholder="주소/상호/지역 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onRunSearch(); }
          }}
        />
        <div className="inlineBtns">
          <button className="chip" onClick={onRunSearch} disabled={searchBusy}>
            {searchBusy ? "검색중…" : "검색"}
          </button>
        </div>

        {searchHistory?.length ? (
          <>
            <div className="sectionTitle">최근 검색(최대 5)</div>
            <div className="inlineBtns">
              {searchHistory.map((q) => (
                <span key={q} className="historyChip">
                  <button className="historyText" onClick={() => onPickHistory(q)}>
                    {q}
                  </button>
                  <button className="historyDel" onClick={() => onDeleteHistory(q)} title="삭제">
                    <IconX />
                  </button>
                </span>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="sidebarBody">
        {searchResults?.length ? (
          <>
            <div className="sectionTitle">지도에서 찾기</div>
            {searchResults.map((r, idx) => (
              <div
                key={`${r.place_id || idx}`}
                className="resultItem"
                onClick={() => {
                  onPickSearchResult(r);
                  if (isMobile) setDrawerOpen(false);
                }}
              >
                <div className="resultTitle">{r.display_name || r.name || "검색 결과"}</div>
              </div>
            ))}
          </>
        ) : null}

        {localResults?.length ? (
          <>
            <div className="sectionTitle">내 저장핀에서 찾기</div>
            {localResults.map((p) => (
              <div
                key={p.id}
                className={`resultItem ${p.id === selectedPinId ? "active" : ""}`}
                onClick={() => {
                  onPickLocalPin(p.id);
                  if (isMobile) setDrawerOpen(false);
                }}
              >
                <div className="resultTitle">{p.name || "이름 없음"}</div>
                <div className="resultSub">{p.addressKo || p.addressJa || ""}</div>
              </div>
            ))}
          </>
        ) : null}

        <div className="foldersHead">
          <div className="foldersTitle">폴더 (도시 &gt; 테마)</div>
        </div>

        <div className="folderList">
          {cities.map((c) => {
            const expanded = expandedCityIds?.has(c.id);
            const cCount = counts.byCity.get(c.id) || 0;
            const ts = themesByCity.get(c.id) || [];
            return (
              <div key={c.id} className="cityBlock">
                <div className={`cityRow ${selectedCityId === c.id ? "active" : ""}`}>
                  <button
                    className="foldBtn"
                    onClick={() => toggleCityExpanded(c.id)}
                    aria-label="열기/닫기"
                    title="열기/닫기"
                  >
                    {expanded ? "▾" : "▸"}
                  </button>
                  <button
                    className="cityName"
                    onClick={() => {
                      setSelectedCityId(c.id);
                      if (!expanded) toggleCityExpanded(c.id);
                    }}
                    title={c.name}
                  >
                    {c.name} <span className="countText">({cCount})</span>
                  </button>
                  <div className="rowActions">
                    <button className="iconBtn" title="이름" onClick={() => onRenameCity(c.id)}>
                      <IconPencil />
                    </button>
                    <button className="iconBtn" title="삭제" onClick={() => onDeleteCity(c.id)}>
                      <IconTrash />
                    </button>
                  </div>
                </div>

                {expanded ? (
                  <div className="themesList">
                    {ts.map((t) => {
                      const tCount = counts.byTheme.get(t.id) || 0;
                      return (
                        <div key={t.id} className={`themeRow ${selectedThemeId === t.id ? "active" : ""}`}>
                          <button
                            className="themeName"
                            onClick={() => {
                              setSelectedCityId(c.id);
                              setSelectedThemeId(t.id);
                            }}
                            title={t.name}
                          >
                            {t.name} <span className="countText">({tCount})</span>
                          </button>
                          <div className="rowActions">
                            <button className="iconBtn" title="이름" onClick={() => onRenameTheme(t.id)}>
                              <IconPencil />
                            </button>
                            <button className="iconBtn" title="삭제" onClick={() => onDeleteTheme(t.id)}>
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {selectedThemeId ? (
          <>
            <div className="sectionTitle">소분류 목록</div>
            <div className="pinList">
              {listPinsInTheme.map((p) => (
                <button
                  key={p.id}
                  className={`pinListItem ${p.id === selectedPinId ? "active" : ""}`}
                  onClick={() => {
                    onSelectPin?.(p.id);
                    onPickLocalPin(p.id);
                    if (isMobile) setDrawerOpen(false);
                  }}
                >
                  <div className="pinListName">{p.name || "이름 없음"}</div>
                  <div className="pinListSub">{p.addressKo || p.addressJa || ""}</div>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="sidebarFooter">
        <button className="footerPlus" onClick={onQuickAdd} title="추가">
          +
        </button>
      </div>
    </aside>
  );
}
