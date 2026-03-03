import React, { useMemo, useRef, useState } from "react";

function IconPencil() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 6.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.02 1.02 3.75 3.75 1.02-1.02z"/>
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v10h-2V9zm4 0h2v10h-2V9zM6 9h2v10H6V9z"/>
    </svg>
  );
}
function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.29 9.17 12 2.89 5.71 4.3 4.29l6.29 6.3 6.3-6.3 1.41 1.42z"/>
    </svg>
  );
}
export default function Sidebar({
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
  onAddCity,
  onAddTheme,
  onRenameCity,
  onDeleteCity,
  onRenameTheme,
  onDeleteTheme,

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
      byCity.set(p.cityId, (byCity.get(p.cityId) || 0) + 1);
      byTheme.set(p.themeId, (byTheme.get(p.themeId) || 0) + 1);
    }
    return { byCity, byTheme };
  }, [pins]);


  const wrapCls = isMobile ? `sidebar drawer ${drawerOpen ? "open" : ""}` : "sidebar";

  return (
    <aside className={wrapCls}>
      <div className="sidebarHeader">
        <input
          className="searchInput"
          placeholder="주소/상호/메모 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
                  <button className="historyText" onClick={() => onPickHistory(q)}>{q}</button>
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
        {localResults?.length ? (
          <>
            <div className="sectionTitle">내 저장핀에서 찾기</div>
            {localResults.map((p) => (
              <div key={p.id} className="resultItem" onClick={() => { onPickLocalPin(p); if (isMobile) setSheetOpen(false); }}>
                <div className="resultTitle">{p.name || "저장한 핀"}</div>
                <div className="resultSub">{p.addressKo || p.addressJa || ""}</div>
              </div>
            ))}
          </>
        ) : null}

        {searchResults?.length ? (
          <>
            <div className="sectionTitle">검색 결과(클릭하면 자동 저장)</div>
            {searchResults.map((r, idx) => (
              <div
                key={idx}
                className="resultItem"
                onClick={() => { onPickSearchResult(r); if (isMobile) setSheetOpen(false); }}
              >
                <div className="resultTitle">{(r.name || r.display_name || "").split(",")[0] || "검색 결과"}</div>
                <div className="resultSub">{r.display_name || ""}</div>
              </div>
            ))}
          </>
        ) : null}

        <div className="sectionTitle">폴더 (도시 &gt; 테마)</div>

        {cities.map((c) => {
          const isExpanded = expandedCityIds.has(c.id);
          const cityThemes = themesByCity.get(c.id) || [];
          const cityCount = counts.byCity.get(c.id) || 0;

          return (
            <div key={c.id}>
              <div
                className={"treeItem " + (selectedCityId === c.id && !selectedThemeId ? "active" : "")}
                onClick={() => { setSelectedCityId(c.id); setSelectedThemeId(null); }}
              >
                <div className="treeLeft">
                  <button className="iconBtn" onClick={(e) => { e.stopPropagation(); toggleCityExpanded(c.id); }} title="열기/닫기">
                    <span className="icon">{isExpanded ? "▾" : "▸"}</span>
                  </button>
                  <div className="treeName">{c.name} <span className="count">({cityCount})</span></div>
                </div>

                <div className="inlineBtns">
                  <button className="iconBtn" title="이름" onClick={(e) => { e.stopPropagation(); onRenameCity(c); }}>
                    <IconPencil />
                  </button>
                  <button className="iconBtn" title="삭제" onClick={(e) => { e.stopPropagation(); onDeleteCity(c); }}>
                    <IconTrash />
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="treeIndent">
                  <div className="inlineBtns" style={{ padding: "6px 6px 10px" }}>
                    <button className="chip" onClick={() => onAddTheme(c.id)}>+ 테마</button>
                  </div>

                  {cityThemes.map((t) => {
                    const themeCount = counts.byTheme.get(t.id) || 0;
                    const active = selectedThemeId === t.id;
                    return (
                      <div
                        key={t.id}
                        className={"treeItem " + (active ? "active" : "")}
                        onClick={() => { setSelectedCityId(c.id); setSelectedThemeId(t.id); }}
                      >
                        <div className="treeLeft">
                          <div className="treeName">{t.name} <span className="count">({themeCount})</span></div>
                        </div>
                        <div className="inlineBtns">
                          <button className="iconBtn" title="이름" onClick={(e) => { e.stopPropagation(); onRenameTheme(t); }}>
                            <IconPencil />
                          </button>
                          <button className="iconBtn" title="삭제" onClick={(e) => { e.stopPropagation(); onDeleteTheme(t); }}>
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

      <div className="sidebarFooter">
        <div className="footerRow">
          <button className="footerAddBtn" title="추가" onClick={onQuickAdd}>+</button>
          <button className="footerBtn" onClick={onAddCity}>도시 추가</button>
        </div>
      </div>
    </aside>
  );
}
