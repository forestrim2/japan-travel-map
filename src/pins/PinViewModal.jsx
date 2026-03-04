import React from "react";
import PhotoSlider from "./PhotoSlider.jsx";
import { googleDirectionsUrl, googleSearchUrlByAddress } from "../utils/mapLinks.js";

export default function PinViewModal({ pin, currentLoc, onClose, onEdit, onMove, onDelete }) {
  if (!pin) return null;
  const streetView = googleSearchUrlByAddress(pin.krAddr || pin.jpAddr || "");
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <div className="modalTitle">{pin.name || "이름 없음"}</div>
            <div className="muted">{pin.themeName ? `${pin.cityName} · ${pin.themeName}` : pin.cityName}</div>
          </div>
          <div className="row gap8">
            <button className="iconBtn" title="수정" onClick={onEdit}>✏</button>
            <button className="iconBtn" title="이동" onClick={onMove}>⇄</button>
            <button className="iconBtn" title="삭제" onClick={onDelete}>🗑</button>
            <button className="btn ghost" onClick={onClose}>닫기</button>
          </div>
        </div>

        <div className="modalBody">
          <div className="kv"><div className="k">일본 주소</div><div className="v">{pin.jpAddr || "-"}</div></div>
          <div className="kv"><div className="k">한국 주소</div><div className="v">{pin.krAddr || "-"}</div></div>
          <div className="kv"><div className="k">구글 로드뷰</div><div className="v">{streetView ? <a href={streetView} target="_blank" rel="noreferrer">주소로 열기</a> : "-"}</div></div>

          <div className="kv"><div className="k">메모</div><div className="v" style={{ whiteSpace: "pre-wrap" }}>{pin.memo || ""}</div></div>

          <div className="kv">
            <div className="k">링크</div>
            <div className="v">
              {pin.links?.length ? (
                <ul className="linkList">
                  {pin.links.map((u, i) => (<li key={i}><a href={u} target="_blank" rel="noreferrer">{u}</a></li>))}
                </ul>
              ) : "-"}
            </div>
          </div>

          <div className="kv"><div className="k">사진</div><div className="v"><PhotoSlider photos={pin.photos || []} /></div></div>

          <div className="sectionTitle">길찾기 (구글맵)</div>
          <div className="row gap8 wrap">
            <a className="btn" href={googleDirectionsUrl({ fromLatLng: currentLoc, toLatLng: {lat: pin.lat, lng: pin.lng}, toAddress: (pin.krAddr||pin.jpAddr), mode: "transit" })} target="_blank" rel="noreferrer">대중교통</a>
            <a className="btn" href={googleDirectionsUrl({ fromLatLng: currentLoc, toLatLng: {lat: pin.lat, lng: pin.lng}, toAddress: (pin.krAddr||pin.jpAddr), mode: "walking" })} target="_blank" rel="noreferrer">도보</a>
            <a className="btn" href={googleDirectionsUrl({ fromLatLng: currentLoc, toLatLng: {lat: pin.lat, lng: pin.lng}, toAddress: (pin.krAddr||pin.jpAddr), mode: "driving" })} target="_blank" rel="noreferrer">차</a>
          </div>
        </div>
      </div>
    </div>
  );
}
