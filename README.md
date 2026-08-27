# 보글하우스 4주년 · 피자 자르기

주방 알바가 되어 손님이 주문한 개수만큼 피자를 최대한 공평하게 잘라내는 5라운드 아케이드 게임.
바닐라 JS + Canvas, 빌드 없음.

레포: https://github.com/Jiwook00/bogle-4th-pizza-game

## 실행

ES 모듈이라 `file://`로는 안 열림. 정적 서버 필요:

```bash
python3 -m http.server 8777
# → http://localhost:8777
```

모바일 실기 테스트는 같은 와이파이에서 `http://<맥-IP>:8777`.

## 배포

빌드 도구 없는 순수 정적 사이트라 GitHub 연동만으로 자동 배포됨. **Cloudflare Pages** 사용(정적 asset 다수 + 대역폭 무제한).

- Framework preset: `None`
- Build command: (없음)
- Build output directory: `/` (루트)

`main`에 push하면 자동 재배포.

## 구조

| 파일                | 역할                                                           |
| ------------------- | -------------------------------------------------------------- |
| `src/config.js`     | **콘텐츠/설정 한 곳** — 팔레트·라운드·메뉴/손님 이름·점수 상수 |
| `src/geometry.js`   | 피자(원) 다각형 근사, 직선 절단, 면적/무게중심                 |
| `src/scoring.js`    | 공평도(최소÷최대)·시간계수·보너스·구멍 처리, 표정 매핑         |
| `src/input.js`      | 포인터/마우스 추적, 첫 포인터만, 취기 손떨림                   |
| `src/characters.js` | 표정 4종 얼굴 렌더                                             |
| `src/audio.js`      | WebAudio 합성 효과음 5종 + iOS 언락                            |
| `src/render.js`     | 배경·조각·궤적·리액션 + 라운드별 피자 이미지 clip 렌더         |
| `src/game.js`       | 상태 머신·라운드 흐름·리액션 타이밍 비트                       |
| `src/ranking.js`    | localStorage 랭킹 (Supabase 드롭인 가능한 인터페이스)          |
| `src/share.js`      | 결과 카드 PNG 합성                                             |
| `src/main.js`       | DOM 화면 오케스트레이션 + 인트로 컷신(사장님 둘) 재생          |

### assets

| 경로                             | 용도                                     |
| -------------------------------- | ---------------------------------------- |
| `assets/pizza2/*.png`            | 라운드별 실제 메뉴 피자/케이크 top-down  |
| `assets/boss-a.png` `boss-b.png` | 인트로 컷신 사장님 둘                    |
| `assets/intro-scene-bg.png`      | 인트로 배경(바 벽·선반)                  |
| `assets/intro-scene-front.png`   | 인트로 전경(바 카운터 상판, 하반신 가림) |

## 콘텐츠 수정

라운드/메뉴/톤은 `src/config.js` 한 파일에서 관리:

- `ROUNDS[].pizza` / `ROUNDS[].image` — 라운드별 메뉴 이름 + 이미지 경로
- `GUEST_NAMES` — 매장 단골 손님 이름
- `GRADES[].comment` — 캐릭터 목소리 코멘트 톤

인트로 사장님 대사는 `src/main.js`의 `INTRO` 배열.

## 남은 작업

- [ ] Supabase 연결 (`ranking.js`의 submit/board를 교체, RLS insert-only)
- [ ] 효과음 톤 튜닝 (현재 합성음)
- [ ] 실기기 터치 테스트 (레티나 좌표는 수정 완료)
