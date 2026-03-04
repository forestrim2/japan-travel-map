# Travel Pin Map (KOR/JPN)

## 실행
```bash
npm install
npm run dev
```

## 배포 (Vercel)
- GitHub에 업로드 후 Vercel에서 Import.

## 동기화(모바일/PC 상시 동기화)
로그인 없이 ‘완전 자동’ 동기화는 기기 식별자가 필요합니다.
이 프로젝트는 **동기화 키(sync key)** 방식(로그인 없이)으로 구현되어 있습니다.

### Supabase 설정(무료 플랜 가능)
1) Supabase 프로젝트 생성
2) Table 생성:

```sql
create table if not exists map_state (
  key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
```

개인용이라면 RLS를 끄거나, 익명 read/write 정책을 간단히 허용해 주세요.

### Vercel 환경변수
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

### 앱에서 동기화 키 입력
- 모바일/PC 둘 다 동일한 키로 입력
- 5초 주기로 자동 동기화됩니다.
