import React, { useMemo } from "react";

export default function Sidebar({
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

  const pinCountByCity = useMemo(() => {
    const m = new Map();
    for (const p of pins) m.set(p.cityId, (m.get(p.cityId) || 0) + 1);
    return m;
  }, [pins]);

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
          placeholder="장소/주소/상호 검색…"
        />
        <div className="row">
          <button className="btn btnPrimary" onClick={onRunSearch}>검색</button>
          <button className="btn btnGhost" onClick={() => setSearchQuery("")}>초기화</button>
        </div>
        <div className="small">검색 결과 클릭 → 지도 이동 + 바로 저장</div>
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
                <div className="resultTitle">{(r.name || r.display_name || "").split(",")[0]}</div>
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
          const isExpanded = expandedCityIds.has(c.id);
          const cityThemes = themesByCity.get(c.id) || [];
          const cityPinCnt = pinCountByCity.get(c.id) || 0;

          return (
            <div key={c.id}>
              <div
                className={`treeItem ${(selectedCityId === c.id && selectedThemeId === null) ? "active" : ""}`}
                onClick={() => {
                  setSelectedCityId(c.id);
                  setSelectedThemeId(null);
                }}
              >
                <span className="treeLeft" onClick={(e) => { e.stopPropagation(); toggleCityExpanded(c.id); }}>
                  <span>{isExpanded ? "▾" : "▸"}</span>
                  <span className="treeName">{c.name}</span>
                  <span className="count">({cityPinCnt})</span>
                </span>

                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="iconBtn" aria-label="도시 이름 수정" title="이름 수정"
                    onClick={(e) => { e.stopPropagation(); onRenameCity(c); }}>
                    <span className="icon">✎</span>
                  </button>
                  <button className="iconBtn" aria-label="도시 삭제" title="삭제"
                    onClick={(e) => { e.stopPropagation(); onDeleteCity(c); }}>
                    <span className="icon">🗑</span>
                  </button>
                </span>
              </div>

              {isExpanded ? (
                <div className="treeIndent">
                  {cityThemes.map((t) => {
                    const isActive = selectedCityId === t.cityId && selectedThemeId === t.id;
                    const cnt = pinCountByTheme.get(`${t.cityId}:${t.id}`) || 0;

                    return (
                      <div
                        key={t.id}
                        className={`treeItem ${isActive ? "active" : ""}`}
                        onClick={() => {
                          setSelectedCityId(t.cityId);
                          setSelectedThemeId(t.id);
                        }}
                      >
                        <span className="treeLeft">
                          <span className="treeName">{t.name}</span>
                          <span className="count">({cnt})</span>
                        </span>

                        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button className="iconBtn" aria-label="테마 이름 수정" title="이름 수정"
                            onClick={(e) => { e.stopPropagation(); onRenameTheme(t); }}>
                            <span className="icon">✎</span>
                          </button>
                          <button className="iconBtn" aria-label="테마 삭제" title="삭제"
                            onClick={(e) => { e.stopPropagation(); onDeleteTheme(t); }}>
                            <span className="icon">🗑</span>
                          </button>
                        </span>
                      </div>
                    );
                  })}

                  <div style={{ margin: "8px 0 12px 0" }}>
                    <button className="btn btnGhost" style={{ width: "100%" }} onClick={() => onAddTheme(c.id)}>
                      + 테마 추가
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="sidebarFooter">
        <button className="btn btnGhost" onClick={onAddCity}>+ 도시 추가</button>
        <div className="small">데이터는 이 브라우저(기기)에만 저장됩니다.</div>
      </div>
    </aside>
  );
}
