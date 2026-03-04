import React, { useEffect, useMemo, useState } from "react";
import { googleSearchUrlByAddress } from "../utils/mapLinks.js";

function readFilesAsDataUrls(files) {
  return Promise.all(
    Array.from(files || []).map(
      (f) =>
        new Promise((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ""));
          r.readAsDataURL(f);
        })
    )
  );
}

export default function PinEditModal({ isOpen, mode, initial, cities, themes, onClose, onSave }) {
  const [name, setName] = useState("");
  const [jpAddr, setJpAddr] = useState("");
  const [krAddr, setKrAddr] = useState("");
  const [memo, setMemo] = useState("");
  const [links, setLinks] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [cityId, setCityId] = useState("");
  const [themeId, setThemeId] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setName(initial?.name || "");
    setJpAddr(initial?.jpAddr || "");
    setKrAddr(initial?.krAddr || "");
    setMemo(initial?.memo || "");
    setLinks(Array.isArray(initial?.links) ? initial.links : []);
    setPhotos(Array.isArray(initial?.photos) ? initial.photos : []);
    setCityId(initial?.cityId || "");
    setThemeId(initial?.themeId || "");
  }, [isOpen, initial]);

  const themesInCity = useMemo(() => themes.filter((t) => t.cityId === cityId), [themes, cityId]);

  useEffect(() => {
    if (!isOpen) return;
    if (themeId && !themesInCity.some((t) => t.id === themeId)) setThemeId("");
  }, [themesInCity, themeId, isOpen]);

  if (!isOpen) return null;
  const street = googleSearchUrlByAddress(krAddr || jpAddr || "");

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">{mode === "add" ? "핀 저장" : "핀 수정"}</div>
          <div className="row gap8">
            <button className="btn ghost" onClick={onClose}>닫기</button>
            <button className="btn" onClick={() => onSave({
              ...initial,
              name, jpAddr, krAddr, memo,
              links: links.filter((x) => String(x||"").trim()),
              photos,
              cityId, themeId,
            })}>저장</button>
          </div>
        </div>

        <div className="modalBody">
          <div className="sectionTitle">자동 불러온 주소</div>
          <div className="kv"><div className="k">일본 주소</div><div className="v">{jpAddr || "-"}</div></div>
          <div className="kv"><div className="k">한국 주소</div><div className="v">{krAddr || "-"}</div></div>
          <div className="kv"><div className="k">구글 로드뷰</div><div className="v">{street ? <a href={street} target="_blank" rel="noreferrer">주소로 열기</a> : "-"}</div></div>

          <div className="grid2">
            <div>
              <label>거래처명</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="(비워도 저장 가능)" />
            </div>
            <div>
              <label>도시</label>
              <select value={cityId} onChange={(e) => setCityId(e.target.value)}>
                <option value="">선택</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label>테마</label>
              <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
                <option value="">선택</option>
                {themesInCity.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <label>일본 주소</label>
          <input value={jpAddr} onChange={(e) => setJpAddr(e.target.value)} placeholder="자동/직접 입력" />
          <label>한국 주소</label>
          <input value={krAddr} onChange={(e) => setKrAddr(e.target.value)} placeholder="자동/직접 입력" />

          <label>메모</label>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="" rows={4} />

          <div className="row between">
            <label>링크</label>
            <button className="btn ghost" onClick={() => setLinks((p) => [...p, ""])}>+ 추가</button>
          </div>
          <div className="stack8">
            {links.map((u, i) => (
              <div key={i} className="row gap8">
                <input value={u} onChange={(e) => setLinks((p) => p.map((x, idx) => idx === i ? e.target.value : x))} placeholder="https://..." />
                <button className="iconBtn" title="삭제" onClick={() => setLinks((p) => p.filter((_, idx) => idx !== i))}>🗑</button>
              </div>
            ))}
            {!links.length ? <div className="muted">링크 없음</div> : null}
          </div>

          <div className="row between" style={{marginTop:12}}>
            <label>사진</label>
            <label className="btn ghost" style={{cursor:"pointer"}}>
              업로드
              <input
                type="file"
                accept="image/*"
                multiple
                style={{display:"none"}}
                onChange={async (e) => {
                  const urls = await readFilesAsDataUrls(e.target.files);
                  setPhotos((p) => [...p, ...urls.filter(Boolean)]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="photoGrid">
            {photos.map((src, i) => (
              <div key={i} className="photoCell">
                <img src={src} alt="p" />
                <button className="photoDel" title="삭제" onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}>🗑</button>
              </div>
            ))}
            {!photos.length ? <div className="muted">사진 없음</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
