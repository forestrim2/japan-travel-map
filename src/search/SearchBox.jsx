import React from "react";

export default function SearchBox({ query, setQuery, onSearch, onClear }) {
  return (
    <div className="searchBox">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }}
        placeholder="주소/상호 검색"
        aria-label="검색"
      />
      {query ? (
        <button className="iconBtn" title="지우기" onClick={onClear}>×</button>
      ) : (
        <button className="iconBtn" title="검색" onClick={onSearch}>🔍</button>
      )}
    </div>
  );
}
