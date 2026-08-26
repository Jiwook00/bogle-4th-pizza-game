// ============================================================
// 보글하우스 4주년 — 피자 자르기 게임 설정
// 콘텐츠(메뉴/손님 이름)는 전부 여기 모아둠. 실제 이름 들어오면 이 파일만 교체.
// ============================================================

// 로고 팔레트 (주황/초록 고정)
export const PALETTE = {
  orange: "#F28C28",
  orangeDeep: "#D9701A",
  crust: "#E8B872",
  green: "#3B7A57",
  greenDeep: "#2A5A40",
  cream: "#FBEFD8",
  ink: "#2A2018",
  bg: "#1C140E",
  highball: "#F6D98A",
};

// 등급 (리듬천국 3단계)
export const GRADES = [
  { min: 460, label: "완벽해요", comment: "주방 물려줄게. 내일부터 나와." },
  { min: 300, label: "그럭저럭", comment: "뭐, 손님들이 크게 안 싸웠으니까." },
  { min: 0, label: "다시 한 번", comment: "이건 피자가 아니라 사고 현장인데." },
];

// 라운드 구성 — order: 주문 조각 수, limit: 제한시간(초, null=무제한)
// pizza: "오늘은 ○○ 피자입니다" 문구용 (플레이스홀더)
export const ROUNDS = [
  {
    id: "tutorial",
    order: 2,
    limit: null,
    pizza: "마르게리타",
    label: "튜토리얼",
  },
  {
    id: "r1",
    order: 4,
    limit: 14,
    pizza: "페퍼로니",
    label: "ROUND 1",
  },
  {
    id: "r2",
    order: 3,
    limit: 14,
    pizza: "고르곤졸라",
    label: "ROUND 2",
  },
  {
    id: "r3",
    order: 6,
    limit: 12,
    pizza: "콰트로 치즈",
    label: "ROUND 3",
  },
  {
    id: "r4",
    order: 5,
    limit: 12,
    pizza: "트러플 감자",
    label: "ROUND 4",
  },
  {
    id: "r5",
    order: 4,
    limit: 10,
    pizza: "보글 스페셜",
    label: "ROUND 5 · 4th",
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

export const MAX_SCORE = 575;
