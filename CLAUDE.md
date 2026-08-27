# CLAUDE.md — 보글하우스 4주년 피자 자르기 게임

이 파일은 Claude Code가 이 프로젝트에서 작업할 때 참고하는 지침이다.

## 프로젝트 개요

주방 알바가 되어 손님 주문 개수만큼 피자를 **최대한 공평하게** 잘라내는 5라운드 아케이드 게임. 보글하우스 매장 4주년 이벤트용.

- **스택**: 순수 바닐라 JS (ES 모듈) + Canvas 2D. **빌드 도구/프레임워크 없음**, `package.json` 없음.
- **스타일**: 전역 `style.css` 한 파일. 동적 값은 JS에서 `el.style.*` 인라인으로 덮어씀.
- **배포**: Cloudflare Pages, `main` push 시 자동. output = 루트, build command 없음.
- **레포**: https://github.com/Jiwook00/bogle-4th-pizza-game (브랜치 `main` 단일 운영)

## 실행 / 확인

ES 모듈이라 `file://`로는 안 열림. 반드시 정적 서버로:

```bash
python3 -m http.server 8777   # → http://localhost:8777
```

동작 확인이 필요한 변경은 서버 띄우고 브라우저로 실제 렌더를 봐야 함(테스트 코드 없음).

### 작업 완료 후 모바일 확인 (자동)

UI/렌더에 영향 있는 작업을 끝내면 **따로 요청받지 않아도** 아래를 자동으로 수행하고
모바일 접속 링크를 전달한다(이 게임은 모바일 실기기 확인이 필수):

1. 정적 서버가 안 떠 있으면 백그라운드로 띄운다: `python3 -m http.server 8777`
2. 맥의 LAN IP를 얻는다: `ipconfig getifaddr en0`
3. **`http://<LAN_IP>:8777`** 형태로 링크를 전달한다(같은 Wi-Fi 전제).
   접속 안 되면 원인 후보(다른 Wi-Fi / 맥 방화벽의 python 수신 차단)를 안내한다.

문서·설정 등 렌더와 무관한 변경만 했을 땐 생략한다.

## 아키텍처 원칙

- **콘텐츠는 `src/config.js` 한 곳**에 모음 — 라운드/메뉴/이미지 경로/손님 이름/점수 상수/팔레트. 콘텐츠 수정은 되도록 여기만 건드림.
- **로직 분리**: `geometry`(절단 수학) → `scoring`(공평도 계산) → `game`(상태 머신) → `render`(그리기) → `main`(DOM 오케스트레이션). 순수 함수 위주.
- **랭킹은 `ranking.js`가 인터페이스 경계** — 현재 localStorage, Supabase 드롭인 교체 가능하게 설계됨(RLS insert-only 예정).
- 인트로 컷신 로직/대사는 `src/main.js`의 `playIntro()` + `INTRO` 배열. 대사는 화면 하단 게임 대사 박스(`.intro-box`)에 타자기 효과로 출력.

## 작업 시 주의

- 프레임워크 도입·빌드 스텝 추가 금지. 미니멀·정적 유지가 이 프로젝트의 방향.
- 이미지 asset은 `assets/pizza2/`(라운드 피자), `assets/intro-scene-*`, `assets/boss-*`. 경로는 config 또는 CSS `url()`로 참조.
- 레티나 좌표는 수정 완료 상태. 새 캔버스 입력 작업 시 DPR 스케일 유지할 것.
- 커밋 메시지는 한국어 `feat:`/`fix:` 컨벤션 유지.
