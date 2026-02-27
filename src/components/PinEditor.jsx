import React, { useMemo, useState } from "react";

function safeArr(x){ return Array.isArray(x) ? x : []; }

export default function PinEditor({
  mode, // "create" | "edit"
  cities,
  themes,
  initialPin,
  onSave,
  onClose
}) {
  const [cityId, setCityId] = useState(initialPin.cityId ?? (cities[0]?.id ?? null));
  const themeList = useMemo(() => themes.filter(t => t.cityId === cityId), [themes, cityId]);
  const [themeId, setThemeId] = useState(initialPin.themeId ?? (themeList[0]?.id ?? null));

  const [name, setName] = useState(initialPin.name ?? "");
  const [addressJa, setAddressJa] = useState(initialPin.addressJa ?? "");
  const [addressKo, setAddressKo] = useState(initialPin.addressKo ?? "");
  const [memo, setMemo] = useState(initialPin.memo ?? "");

  const [links, setLinks] = useState(safeArr(initialPin.links));
  const [photos, setPhotos] = useState(safeArr(initialPin.photos));
  const [tags, setTags] = useState((safeArr(initialPin.tags)).join(", "));

  const lat = initialPin.lat;
  const lng = initialPin.lng;

  const canSave = name.trim() && cityId && themeId && memo.trim();

  const addLink = () => setLinks([...links, { title: "", url: "" }]);
  const addPhoto = () => setPhotos([...photos, ""]);

  return (
    <div className="panel" role="dialog" aria-modal="true">
      <div className="panelHeader">
        <div className="panelTitle">{mode === "edit" ? "핀 수정" : "핀 저장"}</div>
        <button className="chip" onClick={onClose}>닫기</button>
      </div>

      <div className="panelBody">
        <div className="small">좌표: {lat?.toFixed?.(5)}, {lng?.toFixed?.(5)}</div>

        <div className="kv">
          <label>도시</label>
          <select
            className="select"
            value={cityId ?? ""}
            onChange={(e) => {
              const nextCityId = Number(e.target.value);
              setCityId(nextCityId);
              const nextThemes = themes.filter(t => t.cityId === nextCityId);
              setThemeId(nextThemes[0]?.id ?? null);
            }}
          >
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="kv">
          <label>테마</label>
          <select className="select" value={themeId ?? ""} onChange={(e) => setThemeId(Number(e.target.value))}>
            {themeList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="kv">
          <label>이름 (필수)</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 이치란 텐진점" />
        </div>

        <div className="kv">
          <label>주소 (일본어)</label>
          <input className="input" value={addressJa} onChange={(e) => setAddressJa(e.target.value)} placeholder="예: 日本語住所" />
        </div>

        <div className="kv">
          <label>주소 (한국어)</label>
          <input className="input" value={addressKo} onChange={(e) => setAddressKo(e.target.value)} placeholder="예: 한국어 번역 주소" />
        </div>

        <div className="kv">
          <label>메모 (필수)</label>
          <textarea className="textarea" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="왜 저장했는지, 먹을 메뉴, 주의사항…" />
        </div>

        <div className="kv">
          <label>태그 (쉼표로 구분)</label>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="라멘, 카페, 야경" />
        </div>

        <div className="hr" />

        <div className="kv">
          <label>링크(리뷰/구글맵/인스타 등) 여러 개</label>
          <div className="inlineBtns">
            <button className="chip" onClick={addLink}>+ 링크 추가</button>
          </div>
          {links.map((l, idx) => (
            <div className="linkRow" key={idx}>
              <input className="input" value={l.title} onChange={(e) => {
                const next = [...links]; next[idx] = { ...next[idx], title: e.target.value }; setLinks(next);
              }} placeholder="제목(예: 구글맵)" />
              <input className="input" value={l.url} onChange={(e) => {
                const next = [...links]; next[idx] = { ...next[idx], url: e.target.value }; setLinks(next);
              }} placeholder="URL" />
            </div>
          ))}
          {links.length ? (
            <button className="chip" onClick={() => setLinks(links.filter((_, i) => i !== links.length - 1))}>마지막 링크 삭제</button>
          ) : null}
        </div>

        <div className="hr" />

        <div className="kv">
          <label>사진 URL 여러 개</label>
          <div className="inlineBtns">
            <button className="chip" onClick={addPhoto}>+ 사진 URL 추가</button>
          </div>
          {photos.map((p, idx) => (
            <input
              key={idx}
              className="input"
              value={p}
              onChange={(e) => {
                const next = [...photos]; next[idx] = e.target.value; setPhotos(next);
              }}
              placeholder="https://…"
            />
          ))}
          {photos.length ? (
            <button className="chip" onClick={() => setPhotos(photos.filter((_, i) => i !== photos.length - 1))}>마지막 사진 삭제</button>
          ) : null}
        </div>

        <div className="row">
          <button className="btn btnGhost" onClick={onClose}>취소</button>
          <button
            className="btn btnPrimary"
            disabled={!canSave}
            onClick={() => onSave({
              ...initialPin,
              cityId,
              themeId,
              name: name.trim(),
              addressJa: addressJa.trim(),
              addressKo: addressKo.trim(),
              memo: memo.trim(),
              tags: tags.split(",").map(s => s.trim()).filter(Boolean),
              links: links.filter(l => (l.title?.trim() || l.url?.trim())).map(l => ({ title: l.title.trim(), url: l.url.trim() })),
              photos: photos.map(s => s.trim()).filter(Boolean)
            })}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
