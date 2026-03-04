
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";

import { Icon } from "./components/Icon.jsx";
import PinModal from "./components/PinModal.jsx";
import MoveModal from "./components/MoveModal.jsx";
import { clamp, loadLS, saveLS, searchPlace, reverseGeocode, makeStreetViewSearchUrl, uid } from "./utils/api.js";

/**
 * NOTE on sync:
 * - Cross-device real-time sync requires a backend.
 * - This app runs in "local only" mode by default (localStorage).
 * - Optional: if you set Vercel KV env (not included), you can add sync later.
 */

const LS_KEY = "jtm_data_v1";
const LS_RECENT = "jtm_recent_v1";

const DEFAULT_DATA = {
  cities: [
    { id: uid("city"), name: "교토", open: true, themes: [
      { id: uid("theme"), name: "산책" },
      { id: uid("theme"), name: "쇼핑" },
    ]},
  ],
  pins: [], // {id, cityId, themeId, lat, lng, name, memo, links[], photos[], addrKo, addrJa, streetViewUrl, createdAt}
  ui: {
    selectedCityId: null,
    selectedThemeId: null,
    selectedPinId: null,
  }
};

function safeBounds() {
  // Korea + Japan region (with margin)
  const southWest = L.latLng(30.0, 122.0);
  const northEast = L.latLng(46.5, 148.5);
  return L.latLngBounds(southWest, northEast);
}

// Leaflet default icon fix for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function App(){
  const [data, setData] = useState(()=> loadLS(LS_KEY, DEFAULT_DATA));
  const [recent, setRecent] = useState(()=> loadLS(LS_RECENT, [])); // [{q, ts}]
  const mapRef = useRef(null);
  const mapElRef = useRef(null);
  const tileRef = useRef(null);
  const markersRef = useRef(new Map()); // pinId -> marker
  const tempMarkerRef = useRef(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const [addMode, setAddMode] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState("create"); // create/view/edit
  const [activePin, setActivePin] = useState(null); // pin object
  const [addrKo, setAddrKo] = useState("");
  const [addrJa, setAddrJa] = useState("");
  const [streetViewUrl, setStreetViewUrl] = useState("");

  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null); // {type, id}

  const cities = data.cities;
  const pins = data.pins;

  const selectedCityId = data.ui.selectedCityId ?? (cities[0]?.id ?? null);
  const selectedThemeId = data.ui.selectedThemeId ?? (cities.find(c=>c.id===selectedCityId)?.themes?.[0]?.id ?? null);
  const selectedPinId = data.ui.selectedPinId ?? null;

  const selectedPins = useMemo(()=>{
    if(!selectedCityId || !selectedThemeId) return [];
    return pins.filter(p=>p.cityId===selectedCityId && p.themeId===selectedThemeId);
  }, [pins, selectedCityId, selectedThemeId]);

  // Persist
  useEffect(()=>{ saveLS(LS_KEY, data); }, [data]);
  useEffect(()=>{ saveLS(LS_RECENT, recent); }, [recent]);

  // Init map
  useEffect(()=>{
    if(mapRef.current) return;
    const map = L.map(mapElRef.current, {
      zoomControl: true,
      attributionControl: true,
      maxBounds: safeBounds(),
      maxBoundsViscosity: 0.95,
    });

    map.setView([34.985, 135.758], 6); // Kyoto-ish
    map.setMinZoom(5);
    map.setMaxZoom(18); // prevent grey beyond tile max

    const tile = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      maxNativeZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
      crossOrigin: true
    }).addTo(map);

    tileRef.current = tile;
    mapRef.current = map;

    // Long press / click to add pin
    let pressTimer = null;
    let pressed = false;

    const startPress = (e)=>{
      pressed = true;
      pressTimer = window.setTimeout(()=>{
        if(!pressed) return;
        // long press: start add mode then open modal at point
        setAddMode(true);
        const latlng = e.latlng || map.mouseEventToLatLng(e.originalEvent);
        onPickLocation(latlng);
      }, 520);
    };
    const cancelPress = ()=>{
      pressed = false;
      if(pressTimer) window.clearTimeout(pressTimer);
      pressTimer = null;
    };

    map.on("mousedown", (e)=>{
      // only on desktop: don't long press
      if(window.matchMedia("(pointer:fine)").matches){
        // no long press for mouse; use click in addMode
        return;
      }
      startPress(e);
    });
    map.on("touchstart", startPress);
    map.on("touchend", cancelPress);
    map.on("touchmove", cancelPress);

    map.on("click", (e)=>{
      if(!addMode) return;
      onPickLocation(e.latlng);
    });

    return ()=> map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render markers
  useEffect(()=>{
    const map = mapRef.current;
    if(!map) return;

    // Remove markers not in pins
    for(const [pid, marker] of markersRef.current.entries()){
      if(!pins.find(p=>p.id===pid)){
        marker.remove();
        markersRef.current.delete(pid);
      }
    }
    // Add/update markers
    pins.forEach(p=>{
      const existing = markersRef.current.get(p.id);
      const isSelected = p.id === selectedPinId;
      if(!existing){
        const marker = L.marker([p.lat, p.lng], { icon: isSelected ? redIcon : undefined });
        marker.on("click", ()=>{
          selectPin(p.id, true);
        });
        marker.addTo(map);
        markersRef.current.set(p.id, marker);
      }else{
        existing.setLatLng([p.lat, p.lng]);
        existing.setIcon(isSelected ? redIcon : new L.Icon.Default());
      }
    });

  }, [pins, selectedPinId]);

  // helpers
  const setUI = (patch)=>{
    setData(prev=> ({...prev, ui: { ...prev.ui, ...patch }}));
  };

  const selectTheme = (cityId, themeId)=>{
    setUI({ selectedCityId: cityId, selectedThemeId: themeId, selectedPinId: null });
  };

  const selectPin = (pinId, pan=false)=>{
    const p = pins.find(x=>x.id===pinId);
    if(!p) return;
    setUI({ selectedPinId: pinId, selectedCityId: p.cityId, selectedThemeId: p.themeId });
    if(pan && mapRef.current){
      mapRef.current.setView([p.lat, p.lng], Math.max(mapRef.current.getZoom(), 14), { animate: true });
    }
    // open view modal
    setActivePin(p);
    setAddrKo(p.addrKo || "");
    setAddrJa(p.addrJa || "");
    setStreetViewUrl(p.streetViewUrl || "");
    setPinModalMode("view");
    setPinModalOpen(true);
  };

  const upsertRecent = (q)=>{
    const s = q.trim();
    if(!s) return;
    setRecent(prev=>{
      const filtered = prev.filter(x=>x.q!==s);
      return [{ q:s, ts: Date.now() }, ...filtered].slice(0, 5);
    });
  };

  const clearSearch = ()=>{
    setSearchQ("");
    setSearchResults([]);
  };

  const doSearch = async (q)=>{
    const query = (q ?? searchQ).trim();
    if(!query) return;
    setSearching(true);
    try{
      // For Korean users: search with ko, but also store display_name which might be JP
      const res = await searchPlace(query, "ko");
      setSearchResults(res);
      upsertRecent(query);
    }catch{
      alert("검색할 수 없습니다.");
    }finally{
      setSearching(false);
    }
  };

  const onClickSearchResult = async (r)=>{
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if(mapRef.current){
      mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 15), { animate: true });
    }
    // temp marker for picked location
    if(tempMarkerRef.current){
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }
    tempMarkerRef.current = L.circleMarker([lat,lng], { radius: 8, weight: 2, color: "#0ea5e9" }).addTo(mapRef.current);
  };

  const toggleAddMode = ()=>{
    setAddMode(v=> !v);
  };

  const onPickLocation = async (latlng)=>{
    try{
      // temp marker
      if(tempMarkerRef.current){
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
      tempMarkerRef.current = L.circleMarker(latlng, { radius: 9, weight: 2, color: "#e11d48" }).addTo(mapRef.current);

      // Reverse geocode both langs
      const [ja, ko] = await Promise.all([
        reverseGeocode(latlng.lat, latlng.lng, "ja"),
        reverseGeocode(latlng.lat, latlng.lng, "ko"),
      ]);

      const aJa = ja?.display_name ?? "";
      const aKo = ko?.display_name ?? "";
      setAddrJa(aJa);
      setAddrKo(aKo);
      setStreetViewUrl(makeStreetViewSearchUrl(aKo || aJa));

      // open create modal (do not require fields)
      setActivePin({ id: null, lat: latlng.lat, lng: latlng.lng, cityId: selectedCityId, themeId: selectedThemeId });
      setPinModalMode("create");
      setPinModalOpen(true);
    }catch{
      // still allow save even if no address
      setAddrJa("");
      setAddrKo("");
      setStreetViewUrl("");
      setActivePin({ id: null, lat: latlng.lat, lng: latlng.lng, cityId: selectedCityId, themeId: selectedThemeId });
      setPinModalMode("create");
      setPinModalOpen(true);
    }
  };

  const onSavePin = (payload)=>{
    // special: switch to edit
    if(payload?.__mode==="edit"){
      setPinModalMode("edit");
      return;
    }

    const now = Date.now();
    if(pinModalMode==="create"){
      const p = {
        id: uid("pin"),
        cityId: payload.cityId || selectedCityId,
        themeId: payload.themeId || selectedThemeId,
        lat: activePin.lat,
        lng: activePin.lng,
        name: payload.name || "",
        memo: payload.memo || "",
        links: payload.links || [],
        photos: payload.photos || [],
        addrKo,
        addrJa,
        streetViewUrl,
        createdAt: now,
      };
      setData(prev=> ({ ...prev, pins: [p, ...prev.pins] }));
      setUI({ selectedPinId: p.id, selectedCityId: p.cityId, selectedThemeId: p.themeId });
      setPinModalOpen(false);
      setAddMode(false);
      return;
    }

    if(pinModalMode==="edit"){
      setData(prev=> ({
        ...prev,
        pins: prev.pins.map(p=> p.id===payload.id ? {
          ...p,
          cityId: payload.cityId,
          themeId: payload.themeId,
          name: payload.name ?? "",
          memo: payload.memo ?? "",
          links: payload.links ?? [],
          photos: payload.photos ?? [],
          // keep stored addresses
          addrKo: p.addrKo,
          addrJa: p.addrJa,
          streetViewUrl: p.streetViewUrl,
        } : p)
      }));
      // reopen view
      const updated = { ...pins.find(x=>x.id===payload.id), ...payload };
      setActivePin(updated);
      setPinModalMode("view");
      return;
    }
  };

  const onDeletePin = (p)=>{
    if(!p?.id) return;
    setData(prev=> ({ ...prev, pins: prev.pins.filter(x=>x.id!==p.id) }));
    if(selectedPinId===p.id) setUI({ selectedPinId: null });
    setPinModalOpen(false);
  };

  const renameCity = (cityId)=>{
    const c = cities.find(x=>x.id===cityId);
    const v = prompt("도시 이름", c?.name ?? "");
    if(v===null) return;
    setData(prev=> ({
      ...prev,
      cities: prev.cities.map(cy=> cy.id===cityId ? { ...cy, name: v.trim() || cy.name } : cy)
    }));
  };

  const deleteCity = (cityId)=>{
    if(!confirm("정말 삭제하십니까?")) return;
    setData(prev=> ({
      ...prev,
      cities: prev.cities.filter(c=>c.id!==cityId),
      pins: prev.pins.filter(p=>p.cityId!==cityId),
      ui: { ...prev.ui, selectedCityId: prev.ui.selectedCityId===cityId ? null : prev.ui.selectedCityId }
    }));
  };

  const toggleCityOpen = (cityId)=>{
    setData(prev=> ({
      ...prev,
      cities: prev.cities.map(c=> c.id===cityId ? { ...c, open: !c.open } : c)
    }));
  };

  const addCityOrTheme = ()=>{
    const pick = prompt("추가할 분류를 선택해 주세요.\n1) 도시\n2) 테마");
    if(!pick) return;
    const v = pick.trim();
    if(v==="1"){
      const name = prompt("도시 이름");
      if(!name) return;
      const newCity = { id: uid("city"), name: name.trim(), open: true, themes: [] };
      setData(prev=> ({ ...prev, cities: [...prev.cities, newCity] }));
      return;
    }
    if(v==="2"){
      // must choose a city
      const opts = cities.map((c,i)=> `${i+1}) ${c.name}`).join("\n");
      const pickCity = prompt(`테마를 추가할 도시를 선택해 주세요.\n${opts}`);
      if(!pickCity) return;
      const idx = Number(pickCity) - 1;
      if(!Number.isFinite(idx) || idx<0 || idx>=cities.length) return;
      const name = prompt("테마 이름");
      if(!name) return;
      const cityId = cities[idx].id;
      const theme = { id: uid("theme"), name: name.trim() };
      setData(prev=> ({
        ...prev,
        cities: prev.cities.map(c=> c.id===cityId ? { ...c, themes: [...c.themes, theme] } : c)
      }));
      return;
    }
    alert("1 또는 2만 입력해 주세요.");
  };

  const renameTheme = (cityId, themeId)=>{
    const t = cities.find(c=>c.id===cityId)?.themes?.find(x=>x.id===themeId);
    const v = prompt("테마 이름", t?.name ?? "");
    if(v===null) return;
    setData(prev=> ({
      ...prev,
      cities: prev.cities.map(c=> c.id===cityId ? { ...c, themes: c.themes.map(t=> t.id===themeId ? { ...t, name: v.trim() || t.name } : t ) } : c)
    }));
  };

  const deleteTheme = (cityId, themeId)=>{
    if(!confirm("정말 삭제하십니까?")) return;
    setData(prev=> ({
      ...prev,
      cities: prev.cities.map(c=> c.id===cityId ? { ...c, themes: c.themes.filter(t=>t.id!==themeId) } : c),
      pins: prev.pins.filter(p=> !(p.cityId===cityId && p.themeId===themeId)),
      ui: { ...prev.ui, selectedThemeId: (prev.ui.selectedThemeId===themeId ? null : prev.ui.selectedThemeId) }
    }));
  };

  const openMove = (target)=>{
    setMoveTarget(target);
    setMoveModalOpen(true);
  };

  const doMove = ({cityId, themeId})=>{
    if(!moveTarget) return;
    if(moveTarget.type==="pin"){
      setData(prev=> ({
        ...prev,
        pins: prev.pins.map(p=> p.id===moveTarget.id ? { ...p, cityId, themeId } : p)
      }));
    } else if(moveTarget.type==="theme"){
      // move theme to another city: copy theme + move pins, then remove old theme
      const fromCityId = moveTarget.cityId;
      const fromThemeId = moveTarget.id;
      const themeObj = cities.find(c=>c.id===fromCityId)?.themes?.find(t=>t.id===fromThemeId);
      if(!themeObj) return;
      const newThemeId = uid("theme");
      setData(prev=>{
        const movedPins = prev.pins.map(p=> (p.cityId===fromCityId && p.themeId===fromThemeId) ? { ...p, cityId, themeId: newThemeId } : p);
        const newCities = prev.cities.map(c=>{
          if(c.id===fromCityId){
            return { ...c, themes: c.themes.filter(t=>t.id!==fromThemeId) };
          }
          if(c.id===cityId){
            return { ...c, themes: [...c.themes, { ...themeObj, id: newThemeId }] };
          }
          return c;
        });
        return { ...prev, cities: newCities, pins: movedPins };
      });
    } else if(moveTarget.type==="city"){
      // move city is not supported in this minimal (cities top-level). Could reorder later.
      alert("도시 이동은 지원하지 않습니다.");
    }
    setMoveModalOpen(false);
    setMoveTarget(null);
  };

  const locateMe = ()=>{
    if(!navigator.geolocation){
      alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition((pos)=>{
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      if(mapRef.current){
        mapRef.current.setView([lat,lng], 15, { animate: true });
        // show a marker
        if(tempMarkerRef.current){
          tempMarkerRef.current.remove();
          tempMarkerRef.current = null;
        }
        tempMarkerRef.current = L.circleMarker([lat,lng], { radius: 9, weight: 2, color: "#0ea5e9" }).addTo(mapRef.current);
      }
    }, ()=>{
      alert("현재 위치를 가져올 수 없습니다.");
    }, { enableHighAccuracy: true, timeout: 8000 });
  };

  const deleteRecentItem = (q)=>{
    setRecent(prev=> prev.filter(x=>x.q!==q));
  };

  const movePinFromView = (pin)=>{
    openMove({ type:"pin", id: pin.id });
  };

  const sidebar = (
    <>
      <div className="sidebarHeader">
        <div className="searchWrap">
          <input
            className="searchInput"
            value={searchQ}
            onChange={(e)=>setSearchQ(e.target.value)}
            placeholder="검색 (상호/주소)"
            onKeyDown={(e)=>{ if(e.key==="Enter") doSearch(); }}
          />
          <button className="iconBtn" onClick={clearSearch} title="지우기" aria-label="지우기">
            <Icon name="x"/>
          </button>
          <button className="iconBtn primary" onClick={()=>doSearch()} title="검색" aria-label="검색">
            <Icon name="search"/>
          </button>
        </div>
      </div>

      <div className="sidebarBody">
        {searchResults.length>0 && (
          <>
            <div className="sectionTitle">검색 결과</div>
            <div className="resultList">
              {searchResults.map(r=>(
                <div key={r.place_id} className="resultItem" onClick={()=>onClickSearchResult(r)}>
                  <div className="resultMain">
                    <div className="resultName">{r.name || r.display_name?.split(",")?.[0] || "결과"}</div>
                    <div className="resultAddr">{r.display_name}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {searchResults.length===0 && recent.length>0 && (
          <>
            <div className="sectionTitle">최근 검색</div>
            <div className="recentList">
              {recent.map(item=>(
                <div key={item.q} className="recentItem" onClick={()=>{ setSearchQ(item.q); doSearch(item.q); }}>
                  <div className="resultMain">
                    <div className="resultName">{item.q}</div>
                  </div>
                  <button className="iconBtn danger" onClick={(e)=>{ e.stopPropagation(); deleteRecentItem(item.q); }} title="삭제" aria-label="삭제">
                    <Icon name="trash"/>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="sectionTitle">폴더 (도시 &gt; 테마)</div>
        <div className="folders">
          {cities.map(city=>{
            const cityCount = pins.filter(p=>p.cityId===city.id).length;
            return (
              <div className="cityRow" key={city.id}>
                <div className="cityTop">
                  <div className="cityName">
                    <button className="disclosure" onClick={()=>toggleCityOpen(city.id)} aria-label="열기/닫기">
                      <Icon name={city.open ? "chevDown":"chev"} />
                    </button>
                    <div>{city.name} <span className="count">({cityCount})</span></div>
                  </div>
                  <div className="smallActions">
                    <button className="iconBtn" onClick={()=>renameCity(city.id)} title="수정" aria-label="수정"><Icon name="pencil"/></button>
                    <button className="iconBtn danger" onClick={()=>deleteCity(city.id)} title="삭제" aria-label="삭제"><Icon name="trash"/></button>
                    <button className="iconBtn" onClick={()=>openMove({type:"city", id: city.id})} title="이동" aria-label="이동"><Icon name="move"/></button>
                  </div>
                </div>

                {city.open && (
                  <div className="themeList">
                    {city.themes.map(theme=>{
                      const themeCount = pins.filter(p=>p.cityId===city.id && p.themeId===theme.id).length;
                      const isSelected = city.id===selectedCityId && theme.id===selectedThemeId;
                      return (
                        <div key={theme.id}>
                          <div className="themeRow" style={isSelected ? {borderColor:"rgba(14,165,233,.45)"}:null}>
                            <div className="themeLeft" onClick={()=>selectTheme(city.id, theme.id)} style={{cursor:"pointer"}}>
                              <div className="themeName">{theme.name}</div>
                              <div className="count">({themeCount})</div>
                            </div>
                            <div className="smallActions">
                              <button className="iconBtn" onClick={()=>renameTheme(city.id, theme.id)} title="수정" aria-label="수정"><Icon name="pencil"/></button>
                              <button className="iconBtn danger" onClick={()=>deleteTheme(city.id, theme.id)} title="삭제" aria-label="삭제"><Icon name="trash"/></button>
                              <button className="iconBtn" onClick={()=>openMove({type:"theme", id: theme.id, cityId: city.id})} title="이동" aria-label="이동"><Icon name="move"/></button>
                            </div>
                          </div>

                          {/* pins under selected theme only */}
                          {isSelected && (
                            <div className="pinList">
                              {selectedPins.map(p=>(
                                <div key={p.id} className={"pinRow " + (p.id===selectedPinId ? "selected":"")} onClick={()=>selectPin(p.id, true)}>
                                  <div style={{minWidth:0}}>
                                    <div className="pinName">{p.name || "(이름 없음)"}</div>
                                    <div className="pinMeta">{p.addrKo || p.addrJa || ""}</div>
                                  </div>
                                  <div className="smallActions">
                                    <button className="iconBtn" onClick={(e)=>{ e.stopPropagation(); openMove({type:"pin", id: p.id}); }} title="이동" aria-label="이동"><Icon name="move"/></button>
                                  </div>
                                </div>
                              ))}
                              {selectedPins.length===0 && (
                                <div className="notice" style={{padding:"8px 10px"}}>저장된 핀이 없습니다.</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{marginTop:12}}>
          <button className="smallBtn primary" onClick={addCityOrTheme} style={{width:"100%", height:44, borderRadius:14}}>+</button>
        </div>
      </div>
    </>
  );

  return (
    <div className="app">
      <div className="sidebar">{sidebar}</div>

      <div className="mapWrap">
        <div id="map" ref={mapElRef}></div>

        <div className="fabColumn" aria-label="actions">
          <button
            className={"fab " + (addMode ? "addMode" : "")}
            onClick={toggleAddMode}
            title={addMode ? "핀 저장 모드 종료" : "핀 저장 모드"}
            aria-label="핀 저장 모드"
          >
            <Icon name="plus" />
          </button>
          <button className="fab" onClick={locateMe} title="현위치" aria-label="현위치">
            <Icon name="loc" />
          </button>
        </div>

        <div className="hamburgerMobile">
          <button className="fab" onClick={()=>setDrawerOpen(true)} aria-label="메뉴">
            <Icon name="hamburger" />
          </button>
        </div>

        <div className={"drawerOverlay " + (drawerOpen ? "open":"")} onClick={()=>setDrawerOpen(false)}></div>
        <div className={"drawer " + (drawerOpen ? "open":"")}>
          {sidebar}
        </div>

        <PinModal
          mode={pinModalMode}
          isOpen={pinModalOpen}
          onClose={()=>{ setPinModalOpen(false); if(pinModalMode==="create") setAddMode(false); }}
          cities={cities}
          pin={activePin}
          initialCityId={activePin?.cityId || selectedCityId}
          initialThemeId={activePin?.themeId || selectedThemeId}
          addrKo={pinModalMode==="create" ? addrKo : (activePin?.addrKo || addrKo)}
          addrJa={pinModalMode==="create" ? addrJa : (activePin?.addrJa || addrJa)}
          streetViewUrl={pinModalMode==="create" ? streetViewUrl : (activePin?.streetViewUrl || streetViewUrl)}
          onSave={onSavePin}
          onDelete={onDeletePin}
          onMove={movePinFromView}
        />

        <MoveModal
          isOpen={moveModalOpen}
          onClose={()=>{ setMoveModalOpen(false); setMoveTarget(null); }}
          cities={cities}
          onConfirm={doMove}
        />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
