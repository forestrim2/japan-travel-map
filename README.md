# Japan Travel Map

## 실행
```bash
npm install
npm run dev
```

## 한국어 최대 적용
- 검색/주소 자동 불러오기는 OpenStreetMap(Nominatim) 기반이며 `Accept-Language: ko`를 우선 적용합니다.
- 검색 범위는 KR/JP로 제한되어 있습니다.

## 모바일/PC 동기화 (로그인 없이, 같은 링크로)
이 프로젝트는 URL 해시의 `#sync=...` 값을 “지도 키”로 사용합니다.

- 사이트를 처음 열면 자동으로 `#sync=xxxxxx`가 URL에 붙습니다.
- **PC/모바일에서 같은 링크(URL 전체)** 를 열면 같은 데이터로 자동 동기화됩니다.
- 별도 입력 UI는 없습니다.

### Supabase(무료) 설정
1) Supabase 프로젝트 생성
2) SQL Editor에서 테이블 생성

```sql
create table if not exists map_state (
  key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
```

3) Vercel 환경변수 설정
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

> Supabase 설정이 없으면 로컬 저장(localStorage)만 사용합니다.
