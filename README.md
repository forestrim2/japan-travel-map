# Japan Travel Map (2.2.3 기반 안정화)

## 실행
```bash
npm install
npm run dev
```

## 동기화 (PC/모바일 상시 동기화)
- 로그인 없이 **같은 링크(URL 해시 #sync=...)** 를 열면 동일 데이터가 보이도록 설계했습니다.
- 동기화를 켜려면 Supabase(무료) 설정이 필요합니다. 설정이 없으면 로컬 저장(localStorage)만 사용합니다.

### 1) Supabase 프로젝트 생성
- Table: `travel_maps`
- Columns:
  - `id` (text, primary key)
  - `data` (jsonb)
  - `updated_at` (timestamptz, default now()) — 선택

아래 SQL을 Supabase SQL Editor에 실행하세요.

```sql
create table if not exists travel_maps (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);
```
> RLS를 끄거나, 아래처럼 아주 단순 정책을 추가해야 합니다(개인용 전제).

```sql
alter table travel_maps enable row level security;

create policy "public read" on travel_maps
for select using (true);

create policy "public upsert" on travel_maps
for insert with check (true);

create policy "public update" on travel_maps
for update using (true);
```

### 2) Vercel 환경변수
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

설정 후 재배포하면 동기화가 활성화됩니다.

## 주의
- 해시(`#sync=...`)가 없는 경우 처음 접속 시 자동 생성됩니다.
- 동일한 해시 링크를 PC/모바일에서 열어야 같은 데이터로 동기화됩니다.
