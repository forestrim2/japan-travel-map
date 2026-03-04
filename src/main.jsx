
import React,{useState,useEffect} from "react";
import {createRoot} from "react-dom/client";
import {MapContainer,TileLayer,Marker,Popup,useMap, CircleMarker} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const selectedIcon = new L.Icon({
 iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
 shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
 iconSize:[30,46],
 iconAnchor:[15,46]
})

const normalIcon = new L.Icon({
 iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
 shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
 iconSize:[25,41],
 iconAnchor:[12,41]
})

function Fly({pos,zoom}){
 const map=useMap()
 useEffect(()=>{
  if(pos) map.flyTo(pos,zoom||16)
 },[pos])
 return null
}

function App(){

 const [pins,setPins]=useState([])
 const [selected,setSelected]=useState(null)
 const [fly,setFly]=useState(null)
 const [search,setSearch]=useState("")

 async function doSearch(){
  if(!search)return
  const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&q="+encodeURIComponent(search))
  const d=await r.json()
  if(d.length){
   const lat=parseFloat(d[0].lat)
   const lon=parseFloat(d[0].lon)
   setFly([lat,lon])
  }
 }

 function addPin(e){
  const name=prompt("상호명")
  const addr=prompt("주소")
  if(!name)return
  setPins([...pins,{id:Date.now(),name,addr,lat:e.latlng.lat,lng:e.latlng.lng,photos:[]}])
 }

 function addPhotos(pin){
  const url=prompt("이미지 URL")
  if(!url)return
  pin.photos.push(url)
  setPins([...pins])
 }

 return (
 <div style={{height:"100vh",display:"flex"}}>

  <div style={{width:300,padding:10,borderRight:"1px solid #ddd"}}>

   <input style={{width:"100%",fontSize:16}} value={search}
   onChange={e=>setSearch(e.target.value)}
   onKeyDown={e=>e.key==="Enter"&&doSearch()}/>

   <button onClick={doSearch}>검색</button>

   {pins.map(p=>
   <div key={p.id} style={{padding:8,cursor:"pointer"}}
   onClick={()=>{setSelected(p.id);setFly([p.lat,p.lng])}}>

   <b>{p.name}</b>
   <div>{p.addr}</div>

   </div>
   )}

  </div>

  <MapContainer
   center={[36,135]}
   zoom={5}
   style={{flex:1}}
   whenCreated={(map)=>{
    map.on("click",addPin)
   }}
  >

   <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"/>

   <Fly pos={fly}/>

   {pins.map(p=>(
    <Marker key={p.id}
     position={[p.lat,p.lng]}
     icon={selected===p.id?selectedIcon:normalIcon}
     eventHandlers={{click:()=>setSelected(p.id)}}>

     <Popup>

     <b>{p.name}</b>
     <div>{p.addr}</div>

     <button onClick={()=>addPhotos(p)}>사진추가</button>

     {p.photos.length>0 &&
      <div>
       <img src={p.photos[0]} style={{width:200}}/>
      </div>
     }

     <div>
     <a target="_blank"
     href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(p.addr)}>
     로드뷰 검색
     </a>
     </div>

     </Popup>

     {selected===p.id &&
      <CircleMarker center={[p.lat,p.lng]} radius={18}/>
     }

    </Marker>
   ))}

  </MapContainer>

 </div>
 )
}

createRoot(document.getElementById("root")).render(<App/>)
