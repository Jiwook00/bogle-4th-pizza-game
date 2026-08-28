// ============================================================
// 랭킹 — Supabase(PostgREST). 디바이스 ID 계정 모델.
//
// - 매 판 rankings에 계속 쌓는다(갱신·삭제 없음, RLS insert-only).
// - 동일인 판정은 player_id(localStorage). 닉네임은 표시용일 뿐.
// - "player당 최고점 한 줄" 랭킹은 읽는 시점에 leaderboard 뷰가 처리.
// - 정렬: 점수 내림차순, 동점은 먼저 등록(created_at 오름차순)이 위.
// ============================================================

import { MAX_SCORE, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const REST = `${SUPABASE_URL}/rest/v1/rankings`; // 쓰기(insert) 대상
const VIEW = `${SUPABASE_URL}/rest/v1/leaderboard`; // 읽기(player당 최고 1줄)
const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

const PID_KEY = "bogle4th_pid";

// UUID v4. crypto.randomUUID는 secure context(https/localhost) 전용이라
// http 실기기 테스트에서 undefined → getRandomValues, 최후엔 Math.random 폴백.
function uuidv4() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, "0"));
    return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h
      .slice(6, 8)
      .join("")}-${h.slice(8, 10).join("")}-${h.slice(10, 16).join("")}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// 첫 진입 시 player_id 생성·저장. 이게 계정 역할을 한다.
export function ensurePlayerId() {
  let id = null;
  try {
    id = localStorage.getItem(PID_KEY);
  } catch {}
  if (!id) {
    id = uuidv4();
    try {
      localStorage.setItem(PID_KEY, id);
    } catch {}
  }
  return id;
}

// 어뷰징 최소 검증(클라이언트): 총점 상한 + 라운드 합 일치.
// 서버에서도 RLS CHECK(0~MAX_SCORE)로 한 번 더 막는다.
export function validate(score, rounds) {
  if (score > MAX_SCORE) return false;
  const sum = rounds.reduce((s, r) => s + r, 0);
  if (Math.abs(sum - score) > 2) return false; // 반올림 여유
  return true;
}

// count=exact 헤더로 개수만 싸게 얻는다(Content-Range: */N).
async function countRows(base, query) {
  const res = await fetch(`${base}?select=player_id&${query}`, {
    method: "GET",
    headers: { ...HEADERS, Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok) throw new Error(`count failed: ${res.status}`);
  const range = res.headers.get("content-range") || "*/0";
  return Number(range.split("/")[1]) || 0;
}

// 한 기록의 순위 = 1 + (더 높은 점수 수) + (동점이면서 먼저 등록된 수). 대상은 뷰.
async function rankOf(score, createdAt) {
  const [higher, tieEarlier] = await Promise.all([
    countRows(VIEW, `score=gt.${score}`),
    countRows(
      VIEW,
      `score=eq.${score}&created_at=lt.${encodeURIComponent(createdAt)}`,
    ),
  ]);
  return 1 + higher + tieEarlier;
}

// 내 최고 기록(뷰의 1줄) + 순위. 없으면 null.
async function myStanding(playerId) {
  const res = await fetch(
    `${VIEW}?select=nickname,score,created_at&player_id=eq.${playerId}&limit=1`,
    { method: "GET", headers: HEADERS },
  );
  if (!res.ok) throw new Error(`standing failed: ${res.status}`);
  const [row] = await res.json();
  if (!row) return null;
  const rank = await rankOf(row.score, row.created_at);
  return {
    best: row.score,
    createdAt: row.created_at,
    nickname: row.nickname,
    rank,
  };
}

// 한 판 기록 — 메인은 이것만 부르면 됨.
// 반환: { ok, score, best, rank, prevBest, prevRank, isNewHigh, total }
export async function recordPlay({ playerId, nickname, score, rounds }) {
  if (!validate(score, rounds)) return { ok: false, reason: "invalid" };
  const prev = await myStanding(playerId); // 이번 판 넣기 전 내 최고/순위
  const res = await fetch(REST, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify({ player_id: playerId, nickname, score, rounds }),
  });
  if (!res.ok) throw new Error(`record failed: ${res.status}`);
  const now = await myStanding(playerId); // 뷰가 새 최고를 반영
  const total = await countRows(VIEW, "player_id=not.is.null"); // 참가자 수(뷰=player당 1줄)
  return {
    ok: true,
    score,
    best: now.best,
    rank: now.rank,
    prevBest: prev ? prev.best : null,
    prevRank: prev ? prev.rank : null,
    isNewHigh: !prev || score > prev.best,
    total,
  };
}

// 상위 n + 내 순위. 하이라이트는 닉네임이 아니라 player_id로 판정(동명이인 대응).
export async function board(playerId, n = 20) {
  const topRes = await fetch(
    `${VIEW}?select=player_id,nickname,score,created_at&order=score.desc,created_at.asc&limit=${n}`,
    { method: "GET", headers: { ...HEADERS, Prefer: "count=exact" } },
  );
  if (!topRes.ok) throw new Error(`board failed: ${topRes.status}`);
  const rows = await topRes.json();
  const total =
    Number((topRes.headers.get("content-range") || "*/0").split("/")[1]) || 0;
  const top = rows.map((e, i) => ({ rank: i + 1, ...e }));

  let me = null;
  if (playerId) {
    const s = await myStanding(playerId);
    if (s) {
      me = {
        rank: s.rank,
        player_id: playerId,
        nickname: s.nickname,
        score: s.best,
        created_at: s.createdAt,
      };
    }
  }
  return { top, me, total };
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
