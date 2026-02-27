import React, { useEffect, useMemo, useState } from "react";
import { googleMapsDirectionsUrl, googleMapsPlaceUrl } from "../utils/googleMaps.js";
import { osrmRouteETA, formatETA } from "../utils/osrm.js";

export default function PinDetail({
  pin,
  userLocation, // {lat,lng} | null
  onEdit,
  onDelete,
  onClose
}) {
  const [etaWalk, setEtaWalk] = useState(null);
  const [etaDrive, setEtaDrive] = useState(null);
  const [etaErr, setEtaErr] = useState("");

  useEffect(() => {
    let alive = true;
    async function run() {
      setEtaErr("");
      setEtaWalk(null);
      setEtaDrive(null);
      if (!userLocation) return;
      try {
        const w = await osrmRouteETA("walking", userLocation.lat, userLocation.lng, pin.lat, pin.lng);
        if (alive) setEtaWalk(w);
      } catch (e) { if (alive) setEtaErr("ETA 계산 실패(도보)"); }
      try {
        const d = await osrmRouteETA("driving", userLocation.lat, userLocation.lng, pin.lat, pin.lng);
        if (alive) setEtaDrive(d);
      } catch (e) { /* ignore */ }
    }
    run();
    return () => { alive = false; };
  }, [pin.id, pin.lat, pin.lng, userLocation?.lat, userLocation?.lng]);

  const placeUrl = useMemo(() => googleMapsPlaceUrl(pin.lat, pin.lng, pin.name), [pin.lat, pin.lng, pin.name]);

  const originStr = userLocation ? `${userLocation.lat},${userLocation.lng}` : "";
  const dirTransit = googleMapsDirectionsUrl(originStr, pin.lat, pin.lng, "transit");
  const dirWalk = googleMapsDirectionsUrl(originStr, pin.lat, pin.lng, "walking");
  const dirDrive = googleMapsDirectionsUrl(originStr, pin.lat, pin.lng, "driving");

  return (
    <div className="panel" role="dialog" aria-modal="true">
      <div className="panelHeader">
        <div className="panelTitle">{pin.name}</div>
        <button className="chip" onClick={onClose}>닫기</button>
      </div>

      <div className="panelBody">
        {(pin.addressKo || pin.addressJa) ? (
          <div className="kv">
            <label>주소</label>
            {pin.addressJa ? <div className="small">JA: {pin.addressJa}</div> : null}
            {pin.addressKo ? <div className="small">KO: {pin.addressKo}</div> : null}
          </div>
        ) : null}

        <div className="kv">
          <label>메모</label>
          <div>{pin.memo}</div>
        </div>

        {pin.tags?.length ? (
          <div className="kv">
            <label>태그</label>
            <div className="inlineBtns">
              {pin.tags.map((t, i) => <span key={i} className="chip" style={{cursor:"default"}}>{t}</span>)}
            </div>
          </div>
        ) : null}

        {pin.photos?.length ? (
          <div className="kv">
            <label>사진 URL</label>
            {pin.photos.map((p, i) => (
              <a key={i} className="resultItem" href={p} target="_blank" rel="noreferrer">
                <div className="resultTitle">사진 {i+1}</div>
                <div className="resultSub">{p}</div>
              </a>
            ))}
          </div>
        ) : null}

        {pin.links?.length ? (
          <div className="kv">
            <label>링크</label>
            {pin.links.map((l, i) => (
              <a key={i} className="resultItem" href={l.url} target="_blank" rel="noreferrer">
                <div className="resultTitle">{l.title || "링크"}</div>
                <div className="resultSub">{l.url}</div>
              </a>
            ))}
          </div>
        ) : null}

        <div className="hr" />

        <div className="kv">
          <label>이동</label>
          {userLocation ? (
            <>
              <div className="small">
                도보 ETA: {etaWalk ? formatETA(etaWalk.seconds) : "계산 중…"}
              </div>
              <div className="small">
                차량 ETA: {etaDrive ? formatETA(etaDrive.seconds) : "계산 중…"}
              </div>
              {etaErr ? <div className="small">{etaErr}</div> : null}
            </>
          ) : (
            <div className="small">내 위치를 켜면 ETA가 표시됩니다.</div>
          )}
          <div className="inlineBtns">
            <a className="chip" href={dirTransit} target="_blank" rel="noreferrer">대중교통</a>
            <a className="chip" href={dirWalk} target="_blank" rel="noreferrer">도보</a>
            <a className="chip" href={dirDrive} target="_blank" rel="noreferrer">차량</a>
            <a className="chip" href={placeUrl} target="_blank" rel="noreferrer">구글맵 열기</a>
          </div>
        </div>

        <div className="row">
          <button className="btn btnGhost" onClick={onEdit}>수정</button>
          <button className="btn btnPrimary" onClick={onDelete}>삭제</button>
        </div>
      </div>
    </div>
  );
}
