// ============================================================
// 보글하우스 4주년 — 피자 자르기 게임 설정
// 콘텐츠(메뉴/손님 이름)는 전부 여기 모아둠. 실제 이름 들어오면 이 파일만 교체.
// ============================================================

// 로고 팔레트 (주황/초록 고정) — orange는 실제 로고 컬러(#E4741D)에 맞춤
export const PALETTE = {
  orange: "#E4741D",
  orangeDeep: "#C85F12",
  crust: "#E8B872",
  green: "#3B7A57",
  greenDeep: "#2A5A40",
  cream: "#FBEFD8",
  ink: "#2A2018",
  bg: "#1C140E",
  highball: "#F6D98A",
};

// 등급 (리듬천국 3단계) — MAX_SCORE 633 기준 (완벽 ~80% / 그럭저럭 ~52%)
export const GRADES = [
  { min: 505, label: "완벽해요", comment: "주방 물려줄게. 내일부터 나와." },
  { min: 330, label: "그럭저럭", comment: "뭐, 손님들이 크게 안 싸웠으니까." },
  { min: 0, label: "다시 한 번", comment: "이건 피자가 아니라 사고 현장인데." },
];

// 라운드 구성 — order: 주문 조각 수, limit: 제한시간(초, null=무제한)
// pizza: "오늘은 ○○ 입니다" 문구용 (보글하우스 실제 메뉴)
// topping: 조각 렌더 스타일 — base(채움색) + dots(토핑 마크: 색/상대반지름/개수).
//          메뉴마다 다른 비주얼을 주는 감도 레버. render.js가 읽는다.
export const ROUNDS = [
  {
    id: "tutorial",
    order: 2,
    limit: null,
    pizza: "보글 페퍼로니 피자",
    label: "튜토리얼",
    image: "assets/pizza2/페퍼로니피자.png",
    topping: {
      base: "#E4741D",
      dots: [{ color: "#B4331F", r: 0.075, n: 9 }],
    },
  },
  {
    id: "r1",
    order: 4,
    limit: 14,
    pizza: "머쉬렐라 피자",
    label: "ROUND 1",
    image: "assets/pizza2/머쉬렐라피자.png",
    topping: {
      base: "#E8C88A", // 크림/화이트 베이스
      dots: [
        { color: "#9C7A4E", r: 0.07, n: 7 }, // 버섯
        { color: "#FBEFD8", r: 0.05, n: 8 }, // 흰치즈
      ],
    },
  },
  {
    id: "r2",
    order: 3,
    limit: 14,
    pizza: "치져스 크러스트",
    label: "ROUND 2",
    image: "assets/pizza2/치져스크러스트.png",
    topping: {
      base: "#E6A93C", // 골든 치즈
      dots: [{ color: "#C98A2A", r: 0.05, n: 6 }], // 치즈 방울 (토핑 적게)
    },
  },
  {
    id: "r3",
    order: 6,
    limit: 12,
    pizza: "베이컨 초리소 케이준 피자",
    label: "ROUND 3",
    image: "assets/pizza2/베이컨초리소케이준피자.png",
    topping: {
      base: "#C85F12", // 어둡고 매운 베이스
      dots: [
        { color: "#8E2A18", r: 0.04, n: 14 }, // 붉은 향신료 flecks
        { color: "#6E3B22", r: 0.06, n: 7 }, // 베이컨 조각
      ],
    },
  },
  {
    id: "r4",
    order: 5,
    limit: 12,
    pizza: "비리아 피자",
    label: "ROUND 4",
    image: "assets/pizza2/비리아피자.png",
    topping: {
      base: "#B23A1A", // 붉은 콘소메 베이스
      dots: [
        { color: "#4F8B3B", r: 0.045, n: 10 }, // 고수
        { color: "#EBDCC0", r: 0.04, n: 6 }, // 양파
      ],
    },
  },
  {
    id: "r5",
    order: 4,
    limit: 10,
    bonus: 1.5, // 마지막 케이크 = 보너스 라운드. 최종 점수 ×1.5
    pizza: "보글 4주년 기념 케이크 🎉",
    label: "ROUND 5 · 4th",
    image: "assets/pizza2/보글4기념케이크.png",
    topping: {
      base: "#FBEFD8", // 케이크 크림 베이스 (이미지 로드 전 폴백)
      dots: [
        { color: "#E4741D", r: 0.06, n: 8 },
        { color: "#B4331F", r: 0.04, n: 6 },
      ],
    },
  },
];

// 손님 이름 (플레이스홀더 — 매장 단골 이름 들어오면 교체)
export const GUEST_NAMES = [
  "단골A",
  "단골B",
  "사장님",
  "바텐더",
  "홀매니저",
  "옆테이블",
  "단골C",
  "첫손님",
];

// 점수 상수
export const SCORE = {
  timeFloor: 0.7, // 시간계수 하한
  minCutBonus: 15, // 최소 칼질 보너스
  overcutPenalty: 0.5, // 주문 초과 시 공평도 배율
  crumbRatio: 0.02, // 전체 면적의 2% 미만은 조각으로 안 셈
};

// 타깃 조각 수 → 이론상 최소 칼질(직선 현) 수 (lazy caterer)
export const MIN_CUTS = { 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 4 };

// 채점 라운드 5개(튜토리얼 제외): r1~r4 각 115 + 케이크 round(115×1.5)=173
export const MAX_SCORE = 633;
