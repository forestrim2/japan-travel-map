
import React, { useMemo, useState } from "react";
import { Icon } from "./Icon.jsx";

export default function MoveModal({ isOpen, onClose, cities, title="이동", onConfirm }){
  const [cityId, setCityId] = useState(cities[0]?.id ?? "");
  const themes = useMemo(()=> (cities.find(c=>c.id===cityId)?.themes ?? []), [cities, cityId]);
  const [themeId, setThemeId] = useState(themes[0]?.id ?? "");

  if(!isOpen) return null;

  const submit = ()=> onConfirm({ cityId, themeId });

  return (
    <div className="modalOverlay" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="iconBtn" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div className="form">
          <div className="row2">
            <div className="field">
              <label>도시(대분류)</label>
              <select value={cityId} onChange={(e)=>{ setCityId(e.target.value); const t=(cities.find(c=>c.id===e.target.value)?.themes ?? []); setThemeId(t[0]?.id ?? ""); }}>
                {cities.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>테마(소분류)</label>
              <select value={themeId} onChange={(e)=>setThemeId(e.target.value)}>
                {themes.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="modalFooter">
            <button className="btn" onClick={onClose}>취소</button>
            <button className="btn primary" onClick={submit}>이동</button>
          </div>
        </div>
      </div>
    </div>
  );
}
