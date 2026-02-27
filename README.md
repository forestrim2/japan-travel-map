# Travel Pin Map (0원/개인용/로그인 없음)

지도 메인 + 좌측 폴더(도시 > 테마) + 핀 저장/검색/내 위치/길찾기(구글맵) + 내보내기/가져오기(JSON).

## 로컬 실행
```bash
npm install
npm run dev
```

## GitHub + Vercel 배포
1) GitHub에 새 repo 만들고 이 프로젝트 전체를 push
2) Vercel → New Project → GitHub repo 선택 → Framework: Vite(자동) → Deploy

## 주요 기능
- 한국/일본 영역 밖으로 이동 제한
- 지도 검색(주소/장소): Nominatim(OSM) 개인용 수준
- 핀 추가: 지도 클릭 또는 검색 결과에서 바로 저장
- 핀 상세: 이름/주소(일본어/한국어)/메모/링크 여러 개/사진 URL 여러 개
- 길찾기: 구글맵 버튼(도보/차량/대중교통 선택)
- 도보/차량 ETA: OSRM 공개 서버(개인용 수준)
- 데이터 저장: 브라우저 IndexedDB (Dexie)
- 백업: 내보내기/가져오기(JSON)

## 주의
- “실시간 운영정보(영업중/휴무)”는 무료/무키 방식으로 안정 제공이 어렵습니다.
  그래서 기본은 [구글맵 열기] 버튼으로 확인하도록 구성했습니다.
