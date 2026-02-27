import React, { useMemo, useState } from "react";

export default function Sidebar({
  cities,
  themes,
  pins,
  selectedCityId,
  selectedThemeId,
  setSelectedCityId,
  setSelectedThemeId,
  onAddCity,
  onAddTheme,
  onExport,
  onImportClick,
  searchQuery,
  setSearchQuery,
  searchResults,
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
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    }
    return m;
  }, [themes]);

  const pinCountByTheme = useMemo(() => {
    const m = new Map();
    for (const p of pins) {
      const key = `${p.cityId}:${p.themeId}`;
      m.set(key, (m.get(key) || 0) + 1);
    }
    return m;
  }, [pins]);

  return (
    <aside className="sidebar">
      <div className="sidebarHeader">
        <input
          className="searchInput"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="장소/주소 검색…"
        />
        <div className="small">Enter로 검색 · 결과 클릭 시 지도 이동/저장</div>
      </div>

      <div className="sidebarBody">
        {searchResults?.length ? (
          <>
            <div className="sectionTitle">검색 결과</div>
            {searchResults.map((r) => (
              <div
                key={r.place_id}
                className="resultItem"
                onClick={() => onPickSearchResult(r)}
                title="클릭: 지도 이동 + 핀 저장"
              >
                <div className="resultTitle">{r.display_name.split(",")[0]}</div>
                <div className="resultSub">{r.display_name}</div>
              </div>
            ))}
            <div className="hr" />
          </>
        ) : null}

        {localResults?.length ? (
          <>
            <div className="sectionTitle">내 핀 검색</div>
            {localResults.map((p) => (
              <div
                key={p.id}
                className="resultItem"
                onClick={() => onPickLocalPin(p)}
                title="클릭: 해당 핀으로 이동"
              >
                <div className="resultTitle">{p.name}</div>
                <div className="resultSub">{p.addressKo || p.addressJa || ""}</div>
              </div>
            ))}
            <div className="hr" />
          </>
        ) : null}

        <div className="sectionTitle">폴더 (도시 &gt; 테마)</div>

        {cities.map((c) => {
          const isCityActive = selectedCityId === c.id;
          const cityThemes = themesByCity.get(c.id) || [];
          return (
            <div key={c.id}>
              <div
                className={`treeItem ${isCityActive ? "active" : ""}`}
                onClick={() => {
                  setSelectedCityId(c.id);
                  setSelectedThemeId(null);
                }}
              >
                <span>{c.name}</span>
                <span className="badge">{cityThemes.length}</span>
              </div>

              {isCityActive ? (
                <div className="treeIndent">
                  <div
                    className={`treeItem ${selectedThemeId === null ? "active" : ""}`}
                    onClick={() => setSelectedThemeId(null)}
                  >
                    <span>전체</span>
                    <span className="badge">
                      {pins.filter((p) => p.cityId === c.id).length}
                    </span>
                  </div>

                  {cityThemes.map((t) => {
                    const isThemeActive = selectedThemeId === t.id;
                    const cnt = pinCountByTheme.get(`${t.cityId}:${t.id}`) || 0;
                    return (
                      <div
                        key={t.id}
                        className={`treeItem ${isThemeActive ? "active" : ""}`}
                        onClick={() => setSelectedThemeId(t.id)}
                      >
                        <span>{t.name}</span>
                        <span className="badge">{cnt}</span>
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
        <div className="row">
          <button className="btn btnGhost" onClick={onAddCity}>+ 도시</button>
          <button className="btn btnGhost" onClick={onAddTheme} disabled={!selectedCityId}>
            + 테마
          </button>
        </div>
        <div className="row">
          <button className="btn btnGhost" onClick={onExport}>내보내기</button>
          <button className="btn btnGhost" onClick={onImportClick}>가져오기</button>
        </div>
        <div className="small">
          데이터는 이 브라우저(기기)에만 저장됩니다.
        </div>
      </div>
    </aside>
  );
}
