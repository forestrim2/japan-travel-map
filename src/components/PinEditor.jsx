import React, { useEffect, useMemo, useRef, useState } from "react";

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

  useEffect(() => {
    if (themeId && themeList.some(t => t.id === themeId)) return;
    setThemeId(themeList[0]?.id ?? null);
  }, [cityId]);

  const [name, setName] = useState(initialPin.name ?? "");
  const [addressJa, setAddressJa] = useState(initialPin.addressJa ?? "");
  const [addressKo, setAddressKo] = useState(initialPin.addressKo ?? "");
  const [memo, setMemo] = useState(initialPin.memo ?? "");

  const [links, setLinks] = useState(safeArr(initialPin.links)); // [{title,url}]
  const [photos, setPhotos] = useState(safeArr(initialPin.photos)); // [{name,dataUrl}]
  const fileRef = useRef(null);

  const addLink = () => setLinks([...links, { title: "", url: "" }]);

  const deleteLink = (idx) => setLinks(links.filter((_, i) => i !== idx));

  const onPickFiles = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const readers = list.map(f => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve({ name: f.name, dataUrl: String(r.result) });
      r.onerror = reject;
      r.readAsDataURL(f);
    }));
    try {
      const items = await Promise.all(readers);
      setPhotos(prev => [...prev, ...items]);
    } catch {
      alert("이미지 읽기에 실패했습니다.");
    }
  };

  function normalizeAtSave() {
    const finalCityId = cityId ?? (cities[0]?.id ?? null);
    const finalThemeId =
      themeId ??
      themes.find(t => t.cityId === finalCityId)?.id ??
      null;

    return {
      ...initialPin,
      cityId: finalCityId,
      themeId: finalThemeId,
      name: (name ?? "").trim(),
      addressJa: (addressJa ?? "").trim(),
      addressKo: (addressKo ?? "").trim(),
      memo: memo ?? "",
      links: links
        .filter(l => (l.title?.trim() || l.url?.trim()))
        .map(l => ({ title: (l.title||"").trim(), url: (l.url||"").trim() })),
      photos
    };
  }

  return (
    <div className="panel" role="dialog" aria-modal="true">
      <div className="panelHeader">
        <div className="panelTitle">{mode === "edit" ? "핀 수정" : "핀 저장"}</div>
        <button className="chip" onClick={onClose}>닫기</button>
      </div>

      <div className="panelBody">
        <div className="kv">
          <label>도시(대분류)</label>
          <select className="select" value={cityId ?? ""} onChange={(e) => setCityId(Number(e.target.value))}>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="kv">
          <label>테마(소분류)</label>
          <select className="select" value={themeId ?? ""} onChange={(e) => setThemeId(Number(e.target.value))}>
            {themeList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="kv">
          <label>거래처명</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="kv">
          <label>일본 주소</label>
          <input className="input" value={addressJa} onChange={(e) => setAddressJa(e.target.value)} />
        </div>

        <div className="kv">
          <label>한국 주소</label>
          <input className="input" value={addressKo} onChange={(e) => setAddressKo(e.target.value)} />
        </div>

        
        <div className="kv">
          <label>구글(로드뷰 검색용) 링크</label>
          <input
            className="input"
            value={pin.roadviewUrl || ""}
            onChange={(e) => setPin((p) => ({ ...p, roadviewUrl: e.target.value }))}
            placeholder="자동으로 채워집니다. 필요하면 수정하세요."
          />
          <div className="inlineBtns">
            <button
              className="btn"
              type="button"
              onClick={() => {
                const q = (pin.addressKo || pin.addressJa || pin.name || "").trim();
                const url = q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}&layer=c&cbll=${pin.lat},${pin.lng}` : "";
                if (!url) return;
                setPin((p) => ({ ...p, roadviewUrl: url }));
                window.open(url, "_blank");
              }}
            >
              구글 로드뷰 열기
            </button>
          </div>
        </div>

        <div className="kv">
          <label>메모</label>
          <textarea className="textarea" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="" />
        </div>

        <div className="hr" />

        <div className="kv">
          <label>링크</label>
          <div className="inlineBtns">
            <button className="chip" onClick={addLink}>+ 링크 추가</button>
          </div>

          {links.map((l, idx) => (
            <div key={idx} className="resultItem">
              <div className="linkRow">
                <input className="input" value={l.title} onChange={(e) => {
                  const next = [...links]; next[idx] = { ...next[idx], title: e.target.value }; setLinks(next);
                }} placeholder="제목" />
                <input className="input" value={l.url} onChange={(e) => {
                  const next = [...links]; next[idx] = { ...next[idx], url: e.target.value }; setLinks(next);
                }} placeholder="URL" />
              </div>
              <div className="inlineBtns">
                <button className="chip" onClick={() => deleteLink(idx)}>삭제</button>
              </div>
            </div>
          ))}
        </div>

        <div className="hr" />

        <div className="kv">
          <label>사진</label>
          <div className="inlineBtns">
            <button className="chip" onClick={() => fileRef.current?.click()}>+ 사진 추가</button>
            {photos.length ? <button className="chip" onClick={() => setPhotos([])}>전체 삭제</button> : null}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              onPickFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {photos.map((p, idx) => (
            <div key={idx} className="resultItem">
              <div className="resultTitle">{p.name || `사진 ${idx+1}`}</div>
              <img src={p.dataUrl} alt={p.name || ""} style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)" }} />
              <div className="inlineBtns">
                <button className="chip" onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}>삭제</button>
              </div>
            </div>
          ))}
        </div>

        <div className="row">
          <button className="btn btnGhost" onClick={onClose}>취소</button>
          <button className="btn btnPrimary" onClick={() => onSave(normalizeAtSave())}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
