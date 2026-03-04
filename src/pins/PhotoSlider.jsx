import React, { useMemo, useState } from "react";

export default function PhotoSlider({ photos = [] }) {
  const list = useMemo(() => photos.filter(Boolean), [photos]);
  const [idx, setIdx] = useState(0);
  if (!list.length) return <div className="muted">사진 없음</div>;
  const cur = list[Math.min(idx, list.length - 1)];
  return (
    <div className="photoSlider">
      <div className="photoFrame">
        <img src={cur} alt="photo" />
      </div>
      <div className="row gap8">
        <button className="btn ghost" onClick={() => setIdx((p) => Math.max(0, p - 1))} disabled={idx <= 0}>이전</button>
        <div className="muted">{idx + 1} / {list.length}</div>
        <button className="btn ghost" onClick={() => setIdx((p) => Math.min(list.length - 1, p + 1))} disabled={idx >= list.length - 1}>다음</button>
      </div>
    </div>
  );
}
