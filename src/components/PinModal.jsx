
import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon.jsx";

export default function PinModal({
  mode, // "create" | "view" | "edit"
  isOpen,
  onClose,
  cities,
  pin,
  initialCityId,
  initialThemeId,
  addrKo,
  addrJa,
  streetViewUrl,
  onSave,
  onDelete,
  onMove,
}){
  const isView = mode==="view";
  const isEdit = mode==="edit";
  const isCreate = mode==="create";

  const [cityId, setCityId] = useState(initialCityId || pin?.cityId || (cities[0]?.id ?? ""));
  const themes = useMemo(()=> (cities.find(c=>c.id===cityId)?.themes ?? []), [cities, cityId]);
  const [themeId, setThemeId] = useState(initialThemeId || pin?.themeId || (themes[0]?.id ?? ""));

  const [name, setName] = useState(pin?.name ?? "");
  const [memo, setMemo] = useState(pin?.memo ?? "");
  const [links, setLinks] = useState(pin?.links?.length ? pin.links : [""]);
  const [photos, setPhotos] = useState(pin?.photos?.length ? pin.photos : []);
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(()=>{
    if(!isOpen) return;
    setCityId(initialCityId || pin?.cityId || (cities[0]?.id ?? ""));
  },[isOpen]);

  useEffect(()=>{
    if(!isOpen) return;
    const t = (cities.find(c=>c.id=== (initialCityId || pin?.cityId))?.themes ?? []);
    const firstTheme = t[0]?.id ?? "";
    setThemeId(initialThemeId || pin?.themeId || firstTheme);
  },[isOpen, cityId]);

  useEffect(()=>{
    if(!isOpen) return;
    setName(pin?.name ?? "");
    setMemo(pin?.memo ?? "");
    setLinks(pin?.links?.length ? pin.links : [""]);
    setPhotos(pin?.photos?.length ? pin.photos : []);
    setSlideIdx(0);
  },[isOpen, pin?.id]);

  useEffect(()=>{
    if(isCreate && isOpen){
      // create: if empty name, keep blank (user wanted no required fields)
    }
  },[isCreate, isOpen]);

  if(!isOpen) return null;

  const canEdit = isCreate || isEdit;

  const addLink = ()=> setLinks(prev=> [...prev, ""]);
  const removeLink = (idx)=> setLinks(prev=> prev.filter((_,i)=> i!==idx).length ? prev.filter((_,i)=> i!==idx) : [""]);
  const updateLink = (idx, v)=> setLinks(prev=> prev.map((x,i)=> i===idx ? v : x));

  const addPhotos = async (fileList)=>{
    const files = Array.from(fileList || []);
    const toDataUrl = (file)=> new Promise((resolve,reject)=>{
      const fr = new FileReader();
      fr.onload = ()=> resolve(String(fr.result||""));
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
    const dataUrls = [];
    for(const f of files){
      dataUrls.push(await toDataUrl(f));
    }
    setPhotos(prev=> [...prev, ...dataUrls]);
  };
  const delPhoto = (idx)=>{
    setPhotos(prev=> prev.filter((_,i)=> i!==idx));
    setSlideIdx(0);
  };

  const onSubmit = ()=>{
    onSave({
      ...pin,
      cityId,
      themeId,
      name,
      memo,
      links: links.map(s=>s.trim()).filter(Boolean),
      photos,
    });
  };

  const confirmDelete = ()=>{
    if(confirm("정말 삭제하십니까?")) onDelete?.(pin);
  };

  const confirmMove = ()=>{
    onMove?.(pin);
  };

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modalHeader">
          <div className="modalTitle">
            {isCreate ? "핀 저장" : isView ? "핀 보기" : "핀 수정"}
          </div>
          <button className="iconBtn" onClick={onClose} aria-label="닫기">
            <Icon name="x" />
          </button>
        </div>

        <div className="form">
          <div className="row2">
            <div className="field">
              <label>도시(대분류)</label>
              <select value={cityId} onChange={(e)=>setCityId(e.target.value)} disabled={!canEdit}>
                {cities.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>테마(소분류)</label>
              <select value={themeId} onChange={(e)=>setThemeId(e.target.value)} disabled={!canEdit}>
                {themes.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>거래처명</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="(비워도 저장 가능)" disabled={!canEdit}/>
          </div>

          <div className="row3">
            <div className="field">
              <label>일본 주소</label>
              <input value={addrJa || ""} disabled />
            </div>
            <div className="field">
              <label>한국 주소</label>
              <input value={addrKo || ""} disabled />
            </div>
            <div className="field">
              <label>구글(로드뷰)</label>
              <input value={streetViewUrl || ""} disabled />
            </div>
          </div>

          <div className="field">
            <label>메모</label>
            <textarea value={memo} onChange={(e)=>setMemo(e.target.value)} placeholder="" disabled={!canEdit} />
          </div>

          <div className="field">
            <label>링크</label>
            <div className="links">
              {links.map((v, idx)=>(
                <div className="linkRow" key={idx}>
                  <input value={v} onChange={(e)=>updateLink(idx, e.target.value)} placeholder="https://..." disabled={!canEdit}/>
                  {canEdit && (
                    <button className="iconBtn danger" onClick={()=>removeLink(idx)} title="삭제" aria-label="링크 삭제">
                      <Icon name="trash" />
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                <button className="smallBtn" onClick={addLink}>+ 링크 추가</button>
              )}
            </div>
          </div>

          <div className="field">
            <label>사진</label>
            <div className="gallery">
              {photos.length>0 && (
                <div>
                  <div style={{border:"1px solid var(--border)", borderRadius: "14px", overflow:"hidden", background:"#fafafa"}}>
                    <img src={photos[slideIdx]} alt="photo" style={{width:"100%", maxHeight:"280px", objectFit:"cover", display:"block"}} />
                  </div>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8}}>
                    <button className="smallBtn" onClick={()=>setSlideIdx((i)=> Math.max(0, i-1))} disabled={slideIdx===0}>이전</button>
                    <div className="notice">{slideIdx+1} / {photos.length}</div>
                    <button className="smallBtn" onClick={()=>setSlideIdx((i)=> Math.min(photos.length-1, i+1))} disabled={slideIdx===photos.length-1}>다음</button>
                  </div>
                </div>
              )}

              {canEdit && (
                <>
                  <input type="file" accept="image/*" multiple onChange={(e)=>addPhotos(e.target.files)} />
                  <div className="thumbRow">
                    {photos.map((p, idx)=>(
                      <div className="thumb" key={idx}>
                        <img src={p} alt="thumb" />
                        <button className="thumbDel" onClick={()=>delPhoto(idx)} title="삭제" aria-label="사진 삭제">
                          <Icon name="x" size={14}/>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="modalFooter">
            {isView && (
              <>
                <button className="btn" onClick={confirmMove} title="이동"><span style={{display:"inline-flex",alignItems:"center",gap:8}}><Icon name="move" />이동</span></button>
                <button className="btn" onClick={()=>onSave({ ...pin, __mode:"edit" })} title="수정"><span style={{display:"inline-flex",alignItems:"center",gap:8}}><Icon name="pencil" />수정</span></button>
                <button className="btn danger" onClick={confirmDelete} title="삭제"><span style={{display:"inline-flex",alignItems:"center",gap:8}}><Icon name="trash" />삭제</span></button>
              </>
            )}
            {canEdit && (
              <>
                <button className="btn" onClick={onClose}>취소</button>
                <button className="btn primary" onClick={onSubmit}>저장</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
