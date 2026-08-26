// ============================================================
// 랭킹 — localStorage 구현. 나중에 Supabase를 그대로 끼울 수 있게
// submit/top/myRank 인터페이스만 유지한다.
// 규칙: 같은 닉네임이면 최고점만. 동점은 먼저 등록한 쪽이 위.
// ============================================================

import { MAX_SCORE } from "./config.js";

const KEY = "bogle4th_ranking";
const PENDING = "bogle4th_pending"; // 네트워크 실패 시 재시도 큐(로컬 모드에선 미사용)

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}
function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// 어뷰징 최소 검증: 총점 상한 + 라운드 합 일치
export function validate(score, rounds) {
  if (score > MAX_SCORE) return false;
  const sum = rounds.reduce((s, r) => s + r, 0);
  if (Math.abs(sum - score) > 2) return false; // 반올림 여유
  return true;
}

// 반환: { ok, rank }  — ok=false면 검증 실패
export async function submit({ nickname, score, rounds }) {
  if (!validate(score, rounds)) return { ok: false, reason: "invalid" };
  const list = load();
  const existing = list.find((e) => e.nickname === nickname);
  if (existing) {
    if (score > existing.score) {
      existing.score = score;
      existing.rounds = rounds;
      existing.created_at = Date.now();
    }
  } else {
    list.push({ nickname, score, rounds, created_at: Date.now() });
  }
  save(list);
  const sorted = sortRanking(list);
  const rank = sorted.findIndex((e) => e.nickname === nickname) + 1;
  return { ok: true, rank };
}

function sortRanking(list) {
  // 점수 내림차순, 동점은 먼저 등록(created_at 오름차순)
  return [...list].sort(
    (a, b) => b.score - a.score || a.created_at - b.created_at,
  );
}

// 상위 n + 내 순위
export async function board(nickname, n = 20) {
  const sorted = sortRanking(load());
  const top = sorted.slice(0, n).map((e, i) => ({ rank: i + 1, ...e }));
  let me = null;
  if (nickname) {
    const idx = sorted.findIndex((e) => e.nickname === nickname);
    if (idx >= 0) me = { rank: idx + 1, ...sorted[idx] };
  }
  return { top, me, total: sorted.length };
}

// 최소 욕설 필터 (플레이스홀더 — 실제 배포 전 목록 보강)
const BADWORDS = ["시발", "씨발", "병신", "fuck", "shit"];
export function cleanNickname(raw) {
  let s = (raw || "").trim().slice(0, 8);
  for (const w of BADWORDS) {
    if (s.toLowerCase().includes(w)) s = s.replace(new RegExp(w, "gi"), "**");
  }
  return s || "주방알바";
}
