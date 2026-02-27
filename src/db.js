import Dexie from "dexie";

export const db = new Dexie("travel_pin_map");

db.version(1).stores({
  cities: "++id,name,createdAt",
  themes: "++id,cityId,name,createdAt",
  pins: "++id,cityId,themeId,name,lat,lng,createdAt,updatedAt"
});

// v2: schema 동일, 데이터 확장(photos를 dataUrl로 저장 등) - 마이그레이션 불필요
db.version(2).stores({
  cities: "++id,name,createdAt",
  themes: "++id,cityId,name,createdAt",
  pins: "++id,cityId,themeId,name,lat,lng,createdAt,updatedAt"
});

export async function ensureSeed() {
  const cityCount = await db.cities.count();
  if (cityCount > 0) return;

  const now = Date.now();
  const [fukuokaId, beppuId, kyotoId] = await db.cities.bulkAdd(
    [
      { name: "후쿠오카", createdAt: now },
      { name: "벳푸", createdAt: now },
      { name: "교토", createdAt: now }
    ],
    { allKeys: true }
  );

  await db.themes.bulkAdd([
    { cityId: fukuokaId, name: "카페", createdAt: now },
    { cityId: fukuokaId, name: "맛집", createdAt: now },
    { cityId: beppuId, name: "온천", createdAt: now },
    { cityId: kyotoId, name: "산책", createdAt: now },
    { cityId: kyotoId, name: "쇼핑", createdAt: now }
  ]);
}

export async function addCity(name) {
  const now = Date.now();
  return await db.cities.add({ name, createdAt: now });
}

export async function renameCity(id, name) {
  return await db.cities.update(id, { name });
}

export async function deleteCity(id) {
  // 도시 삭제 시, 하위 테마/핀도 같이 삭제
  await db.transaction("rw", db.cities, db.themes, db.pins, async () => {
    const themeIds = (await db.themes.where("cityId").equals(id).toArray()).map(t => t.id);
    await db.pins.where("cityId").equals(id).delete();
    if (themeIds.length) {
      await db.themes.where("cityId").equals(id).delete();
    }
    await db.cities.delete(id);
  });
}

export async function addTheme(cityId, name) {
  const now = Date.now();
  return await db.themes.add({ cityId, name, createdAt: now });
}

export async function renameTheme(id, name) {
  return await db.themes.update(id, { name });
}

export async function deleteTheme(id) {
  await db.transaction("rw", db.themes, db.pins, async () => {
    await db.pins.where("themeId").equals(id).delete();
    await db.themes.delete(id);
  });
}

export async function addPin(pin) {
  const now = Date.now();
  return await db.pins.add({ ...pin, createdAt: now, updatedAt: now });
}

export async function updatePin(id, patch) {
  const now = Date.now();
  return await db.pins.update(id, { ...patch, updatedAt: now });
}

export async function deletePin(id) {
  return await db.pins.delete(id);
}
