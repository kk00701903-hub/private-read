# 리드 (Read)

회차별 Markdown 파일을 등록하면 모바일에서 읽을 수 있는 웹소설 PWA입니다.
Vite + React 기반이며 GitHub Pages에 배포할 수 있습니다.

## 빠른 시작

```bash
npm install
npm run generate   # novels 폴더 스캔 → index 생성
npm run dev
```

## 소설 등록 방법

1. `public/novels/{슬러그}/` 폴더를 만듭니다.
2. `meta.json`을 작성합니다.
3. 회차 MD 파일을 `001.md`, `002.md` … 형식으로 넣습니다.
4. `npm run generate`를 실행합니다.

### meta.json 예시

```json
{
  "title": "작품 제목",
  "author": "작가명",
  "description": "한 줄 소개",
  "cover": "cover.jpg",
  "genre": "판타지",
  "status": "연재중"
}
```

### 회차 MD 예시 (`001.md`)

```md
---
title: 프롤로그
---

본문이 여기에 옵니다.
```

프론트매터 `title`이 없으면 파일명의 숫자 + 본문 첫 줄을 사용합니다.

## GitHub Pages 배포

배포 주소: https://kk00701903-hub.github.io/private-read/

`package.json`의 `homepage`이 Vite `base` 경로(`/private-read/`)의 기준입니다.

1. 이 저장소를 GitHub에 `private-read` 이름으로 푸시합니다.
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. `main`(또는 `master`)에 푸시하면 `.github/workflows/deploy.yml`이 자동 배포합니다.

로컬에서 Pages 경로로 미리보기:

```bash
npm run build
npm run preview
# → http://localhost:4173/private-read/
```

모바일 브라우저에서 홈 화면에 추가하면 앱처럼 실행됩니다.

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 로컬 개발 서버 |
| `npm run generate` | 소설/회차 인덱스 생성 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
