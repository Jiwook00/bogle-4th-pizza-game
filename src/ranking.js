// ============================================================
// 랭킹 — Supabase(PostgREST) 구현.
// 인터페이스(submit/board/validate/cleanNickname)는 localStorage 시절과 동일.
// 정책: insert-only + 공개 read (RLS). 이번 단계는 중복 등록 허용
//       (같은 닉네임이 여러 줄 올 수 있음). 정렬: 점수 내림차순,
//       동점은 먼저 등록(created_at 오름차순)이 위.
// ============================================================

import { MAX_SCORE, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const REST = `${SUPABASE_URL}/rest/v1/rankings`;
const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

// 어뷰징 최소 검증(클라이언트): 총점 상한 + 라운드 합 일치.
// 서버에서도 RLS CHECK(0~MAX_SCORE)로 한 번 더 막는다.
export function validate(score, rounds) {
  if (score > MAX_SCORE) return false;
  const sum = rounds.reduce((s, r) => s + r, 0);
  if (Math.abs(sum - score) > 2) return false; // 반올림 여유
  return true;
}

// PostgREST count=exact 헤더로 총 개수만 싸게 얻는다(Content-Range: */N).
async function countRows(query) {
  const res = await fetch(`${REST}?select=id&${query}`, {
    method: "GET",
    headers: { ...HEADERS, Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok) throw new Error(`count failed: ${res.status}`);
  const range = res.headers.get("content-range") || "*/0";
  return Number(range.split("/")[1]) || 0;
}

// 한 기록의 순위 = 1 + (더 높은 점수 수) + (동점이면서 먼저 등록된 수)
async function rankOf(score, createdAt) {
  const [higher, tieEarlier] = await Promise.all([
    countRows(`score=gt.${score}`),
    countRows(
      `score=eq.${score}&created_at=lt.${encodeURIComponent(createdAt)}`,
    ),
  ]);
  return 1 + higher + tieEarlier;
}

// 반환: { ok, rank } — ok=false면 검증 실패
export async function submit({ nickname, score, rounds }) {
  if (!validate(score, rounds)) return { ok: false, reason: "invalid" };
  const res = await fetch(REST, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({ nickname, score, rounds }),
  });
  if (!res.ok) throw new Error(`submit failed: ${res.status}`);
  const [row] = await res.json();
  const rank = await rankOf(row.score, row.created_at);
  return { ok: true, rank };
}

// 상위 n + 내 순위(같은 닉네임 중 최고 기록 기준)
export async function board(nickname, n = 20) {
  const topRes = await fetch(
    `${REST}?select=nickname,score,created_at&order=score.desc,created_at.asc&limit=${n}`,
    { method: "GET", headers: { ...HEADERS, Prefer: "count=exact" } },
  );
  if (!topRes.ok) throw new Error(`board failed: ${topRes.status}`);
  const rows = await topRes.json();
  const total =
    Number((topRes.headers.get("content-range") || "*/0").split("/")[1]) || 0;
  const top = rows.map((e, i) => ({ rank: i + 1, ...e }));

  let me = null;
  if (nickname) {
    const meRes = await fetch(
      `${REST}?select=nickname,score,created_at&nickname=eq.${encodeURIComponent(
        nickname,
      )}&order=score.desc,created_at.asc&limit=1`,
      { method: "GET", headers: HEADERS },
    );
    if (meRes.ok) {
      const [best] = await meRes.json();
      if (best)
        me = { rank: await rankOf(best.score, best.created_at), ...best };
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
