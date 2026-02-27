import Dexie from "dexie";

export const db = new Dexie("travel_pin_map");

db.version(1).stores({
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

export async function addTheme(cityId, name) {
  const now = Date.now();
  return await db.themes.add({ cityId, name, createdAt: now });
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

export async function exportAll() {
  const [cities, themes, pins] = await Promise.all([
    db.cities.toArray(),
    db.themes.toArray(),
    db.pins.toArray()
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), cities, themes, pins };
}

export async function importAll(payload) {
  if (!payload || !payload.cities || !payload.themes || !payload.pins) {
    throw new Error("형식이 올바르지 않습니다.");
  }
  await db.transaction("rw", db.cities, db.themes, db.pins, async () => {
    await db.cities.clear();
    await db.themes.clear();
    await db.pins.clear();
    await db.cities.bulkAdd(payload.cities);
    await db.themes.bulkAdd(payload.themes);
    await db.pins.bulkAdd(payload.pins);
  });
}
