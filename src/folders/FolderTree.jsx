import React, { useMemo } from "react";

export default function FolderTree({
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
  onAddTheme,
}) {
  const themeByCity = useMemo(() => {
    const map = {};
    for (const t of themes) {
      (map[t.cityId] ||= []).push(t);
    }
    return map;
  }, [themes]);

  const pinsByTheme = useMemo(() => {
    const map = {};
    for (const p of pins) {
      (map[p.themeId] ||= []).push(p);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ko"));
    }
    return map;
  }, [pins]);

  const cityPinCount = (cityId) => pins.filter((p) => p.cityId === cityId).length;

  return (
    <div className="folderList">
      {cities.map((c) => {
        const isOpen = openCityIds.includes(c.id);
        const cThemes = themeByCity[c.id] || [];
        return (
          <div key={c.id} className="cityBlock">
            <div className={"row cityRow" + (selectedCityId === c.id ? " selected" : "")}>
              <button className="twisty" onClick={() => toggleCity(c.id)} title="열기/닫기">{isOpen ? "▾" : "▸"}</button>
              <button className="nameBtn" onClick={() => { setSelectedCityId(c.id); setSelectedThemeId(null); setOpenThemeId(null); }}>
                {c.name} ({cityPinCount(c.id)})
              </button>
              <button className="iconBtn" title="수정" onClick={() => onEditCity(c.id)}>✏</button>
              <button className="iconBtn" title="삭제" onClick={() => onDeleteCity(c.id)}>🗑</button>
            </div>

            {isOpen && (
              <div className="themeList">
                {cThemes.map((t) => {
                  const list = pinsByTheme[t.id] || [];
                  const tOpen = openThemeId === t.id;
                  return (
                    <div key={t.id} className="themeBlock">
                      <div className={"row themeRow" + (selectedThemeId === t.id ? " selected" : "")}>
                        <button className="twisty" onClick={() => setOpenThemeId(tOpen ? null : t.id)} title="열기/닫기">{tOpen ? "▾" : "▸"}</button>
                        <button className="nameBtn" onClick={() => { setSelectedCityId(c.id); setSelectedThemeId(t.id); setOpenThemeId(t.id); }}>
                          {t.name} ({list.length})
                        </button>
                        <button className="iconBtn" title="이동" onClick={() => onMoveTheme(t.id)}>⇄</button>
                        <button className="iconBtn" title="수정" onClick={() => onEditTheme(t.id)}>✏</button>
                        <button className="iconBtn" title="삭제" onClick={() => onDeleteTheme(t.id)}>🗑</button>
                      </div>

                      {tOpen && (
                        <div className="pinList">
                          {list.length ? list.map((p) => (
                            <div key={p.id} className={"row pinRow" + (selectedPinId === p.id ? " selected" : "")}>
                              <button className="pinName" onClick={() => onViewPin(p.id)}>{p.name || "이름 없음"}</button>
                            </div>
                          )) : <div className="muted pad8">저장된 핀이 없습니다.</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button className="addBtn" onClick={() => onAddTheme(c.id)}>+ 테마 추가</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
