// ============================================================
// main — DOM 화면 오케스트레이션.
// 시작 화면 → 인트로 → 게임(HUD) → 결과 → 닉네임/랭킹 → 공유/재도전.
// 게임플레이는 Game(캔버스)이, 그 외 화면은 여기가 담당.
// ============================================================

import { Game } from "./game.js";
import { ROUNDS, GRADES } from "./config.js";
import { faceFor } from "./scoring.js";
import { unlock, sfx } from "./audio.js";
import { recordPlay, board, cleanNickname, ensurePlayerId } from "./ranking.js";
import { buildShareCard, downloadCard } from "./share.js";

const $ = (id) => document.getElementById(id);
const canvas = $("game");
let game;
let lastNickname = localStorage.getItem("bogle4th_nick") || "";
const playerId = ensurePlayerId(); // 첫 진입 시 생성·저장, 이후 동일인 판정 기준
let lastResult = null; // 마지막 recordPlay 결과(공유/랭킹 화면에서 재사용)

// 재방문 판정 — 한 번이라도 플레이했으면 튜토리얼(ROUNDS[0]) 스킵(2회차+). 새로고침해도 유지.
const PLAYED_KEY = "bogle4th_played";
const hasPlayedBefore = () => localStorage.getItem(PLAYED_KEY) === "1";

function show(id) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
}

function gradeFor(total) {
  return GRADES.find((g) => total >= g.min) || GRADES[GRADES.length - 1];
}

// ---- 시작 ----
// 시작하기는 항상 인트로 컷신부터. 튜토리얼 스킵만 재방문(hasPlayedBefore)으로 갈림.
// (컷신 스킵은 결과화면 "다시 하기"가 startGame을 직접 호출하는 경로에서만 — 같은 세션 재도전.
//  새로고침하면 메인으로 돌아오므로 다시 startBtn→컷신을 탄다.)
$("startBtn").addEventListener("click", () => {
  unlock(); // iOS 오디오 언락 (사용자 탭 시점)
  playIntro();
});

// ---- 인트로 컷신 (사장님 둘, 탭으로 진행) ----
// spk: 말하는 사람, both: 둘 다 화면에 (false면 A만 중앙)
const INTRO = [
  {
    spk: "A",
    both: false,
    text: "왔구나 일일 알바! 오늘 우리 보글하우스… 4주년이다 🎉",
  },
  { spk: "B", both: true, text: "인사는 됐고. 오늘 주방, 네가 맡는다." },
  {
    spk: "A",
    both: true,
    text: "손님이 원하는 조각 수대로, 최대~한 공평하게 나눠줘!",
  },
  { spk: "B", both: true, text: "누구 하나 억울하게 작은 조각 받으면… 알지?" },
];

// 앞 바 테이블이 사선이라, 사장님 서 있는 높이를 자기 x위치의 테라조 선에 맞춤.
// (왼쪽=선이 높음→살짝 위 / 오른쪽=선이 낮음→살짝 아래) 상반신 끝단이 테이블 뒤로 살짝 들어감.
function bossBottom(leftPct) {
  return 40.6 - 0.03 * (leftPct - 50); // %
}

function placeBoss(el, { left, shown, active }) {
  el.style.left = left;
  // boss-a 이미지는 머리 위 여백이 적어 더 높이 서므로 내려서 boss-b와 키를 맞춤
  const headFix = el.id === "bossA" ? 4.3 : 0; // %
  el.style.bottom = bossBottom(parseFloat(left)) - headFix + "%";
  el.style.opacity = shown ? "1" : "0";
  const y = shown ? "0" : "120%";
  const scale = active ? 1 : shown ? 0.96 : 1;
  el.style.transform = `translate(-50%, ${y}) scale(${scale})`;
  el.style.filter = shown && !active ? "brightness(0.6)" : "none";
  el.style.zIndex = active ? 2 : 1;
}

function playIntro() {
  show("introScreen");
  const stage = $("introScreen");
  const bossA = $("bossA");
  const bossB = $("bossB");
  const box = $("introLine");
  const textEl = $("introText");
  let i = -1;
  let typing = false;
  let timer = null;
  let fullText = "";

  // 타자기: 이모지(서로게이트 쌍)가 깨지지 않도록 코드포인트 단위로 채움
  function typeText(str) {
    clearInterval(timer);
    fullText = str;
    const chars = Array.from(str);
    let n = 0;
    textEl.textContent = "";
    typing = true;
    box.classList.add("typing");
    timer = setInterval(() => {
      n++;
      textEl.textContent = chars.slice(0, n).join("");
      if (n >= chars.length) {
        clearInterval(timer);
        typing = false;
        box.classList.remove("typing");
      }
    }, 28);
  }

  function finishTyping() {
    clearInterval(timer);
    textEl.textContent = fullText;
    typing = false;
    box.classList.remove("typing");
  }

  function render(beat) {
    const aActive = beat.spk === "A";
    if (!beat.both) {
      placeBoss(bossA, { left: "50%", shown: true, active: true });
      placeBoss(bossB, { left: "82%", shown: false, active: false });
    } else {
      placeBoss(bossA, { left: "30%", shown: true, active: aActive });
      placeBoss(bossB, { left: "70%", shown: true, active: !aActive });
    }
    box.classList.add("active");
    typeText(beat.text);
    sfx.face && sfx.face();
  }

  function next() {
    i++;
    if (i >= INTRO.length) {
      stage.removeEventListener("click", advance);
      startGame();
      return;
    }
    render(INTRO[i]);
  }

  // 탭: 타이핑 중이면 즉시 전체 표시(스킵), 끝났으면 다음 대사로 진행
  function advance() {
    if (typing) {
      finishTyping();
      return;
    }
    next();
  }

  // 초기 숨김 상태 — 한 프레임 그린 뒤 첫 등장(슥) 애니가 살도록 rAF로 진행
  placeBoss(bossA, { left: "50%", shown: false, active: false });
  placeBoss(bossB, { left: "82%", shown: false, active: false });
  stage.addEventListener("click", advance);
  requestAnimationFrame(next);
}

function startGame() {
  const skipTutorial = hasPlayedBefore();
  localStorage.setItem(PLAYED_KEY, "1"); // 이후 재도전/재방문은 튜토리얼 스킵
  show("gameScreen");
  game = new Game(canvas);
  wireGame(game);
  game.start(skipTutorial);
}

function wireGame(g) {
  g.onRoundStart = (round, idx, isBonus) => {
    // 주문 말풍선 (하단 상주). 코치(튜토리얼) 라운드는 코치 시퀀스가 대신 안내.
    const bubble = $("introBubble");
    if (round.coach) {
      bubble.classList.remove("active");
    } else {
      bubble.innerHTML = `<b>${round.order}</b>조각으로 부탁해요!`;
      bubble.classList.add("active");
    }

    // 보너스(케이크) 라운드 배너 — 일반 라운드는 말풍선만으로 충분
    const punch = $("roundPunch");
    punch.innerHTML = isBonus
      ? `<div class="rp-banner">🎂 마지막 주문 · 보너스 라운드!</div>`
      : "";
    punch.classList.toggle("bonus", !!isBonus);
    punch.classList.remove("show");
    void punch.offsetWidth; // 리플로우 강제 → 애니 재시작
    punch.classList.add("show");

    // 보너스 라운드 배경 연출
    $("gameScreen").classList.toggle("bonus-round", !!isBonus);
  };

  // 튜토리얼 코치(인트로) — 안내가 끝나면 완성 버튼 노출 + 칼질 입력 오픈.
  g.onCoachStart = (round) => {
    $("doneBtn").style.display = "none"; // 안내 중엔 완성 버튼 숨김
    playBubbleSequence(round.coach, "탭해서 시작 ▸", () => {
      $("doneBtn").style.display = "block";
      g.beginCutting(); // 실전 입력 오픈
    });
  };

  g.onTick = (remaining, round) => {
    $("roundLabel").textContent = round.label;
    $("orderText").textContent = round.pizza;
    const timer = $("timer");
    if (round.limit == null) {
      timer.textContent = "연습";
      timer.className = ""; // 튜토리얼은 중립색
    } else {
      timer.textContent = remaining.toFixed(1);
      const ratio = remaining / round.limit;
      timer.classList.toggle("warn", ratio <= 0.5 && ratio > 0.25);
      timer.classList.toggle("danger", ratio <= 0.25);
      timer.classList.toggle("pulse", remaining <= 3);
    }
    $("doneBtn").style.display = "block";
  };

  g.onRoundEnd = () => {
    $("doneBtn").style.display = "none";
    $("introBubble").classList.remove("active");
    $("timer").classList.remove("pulse");
  };

  g.onRoundScored = (result, round, idx) => {
    $("doneBtn").style.display = "none";
    // 튜토리얼은 점수 카드 대신 코치 말풍선으로 이어서 실전으로 넘김.
    if (round.coach) {
      playCoachOutro(result, round, () => g.advanceFromScore());
    } else {
      showRoundScore(result, round, () => g.advanceFromScore());
    }
  };

  g.onFinished = (summary) => finish(summary);
}

// 코치 말풍선 시퀀스 — 딤 오버레이(#coach)를 탭하면 다음 대사로.
// beats: [{ text, finger? }], lastHint: 마지막 비트의 탭 힌트, onDone: 마지막 탭 후 콜백.
function playBubbleSequence(beats, lastHint, onDone) {
  const coach = $("coach");
  const bubble = $("introBubble");
  let i = -1;

  const advance = () => {
    i++;
    if (i >= beats.length) {
      coach.classList.remove("active", "show-finger");
      coach.removeEventListener("click", advance);
      bubble.classList.remove("active");
      onDone();
      return;
    }
    sfx.face(); // 넘김 틱
    const beat = beats[i];
    const last = i === beats.length - 1;
    bubble.innerHTML = `${beat.text}<span class="tap-hint">${
      last ? lastHint : "탭해서 계속 ▸"
    }</span>`;
    bubble.classList.add("active");
    coach.classList.toggle("show-finger", !!beat.finger);
  };

  coach.classList.add("active");
  coach.addEventListener("click", advance);
  advance();
}

// 연습 종료 코치 — 결과(n/공평도)로 첫 대사를 고르고, 공통 마무리 뒤 실전으로.
function playCoachOutro(result, round, next) {
  const o = round.coachOutro;
  let first;
  if (result.n < round.order) first = o.short;
  else if (result.n > round.order) first = o.over;
  else if (result.fairness < round.unevenThreshold) first = o.uneven;
  else first = o.good;
  playBubbleSequence(
    [{ text: first }, { text: o.end }],
    "탭해서 실전으로 ▸",
    next,
  );
}

// 라운드 점수 팝업 (탭하면 다음)
function showRoundScore(result, round, next) {
  const pop = $("roundScore");
  const worst = Math.min(...result.shares.map((s) => s));
  const worstExpr = faceFor(worst);
  const comment = {
    smug: "흡족한 표정이야.",
    content: "다들 조용하네.",
    brow: "누가 눈썹을 올렸어.",
    shock: "한 명이 자기 조각을 노려봐.",
  }[worstExpr];

  $("rsFair").textContent = `${result.fairness}%`;
  // 보너스 줄: 케이크 배율(×1.5)과 최소칼질(+15)을 함께 표기
  const bonusBits = [];
  if (result.mult) bonusBits.push(`🎂 ×${result.mult} 보너스!`);
  if (result.bonus) bonusBits.push(`+${result.bonus} 최소칼질!`);
  $("rsBonus").textContent = bonusBits.join("  ");
  // 튜토리얼은 점수 미반영 (오른쪽 코멘트는 기존과 동일하게 표정/상태 코멘트)
  $("rsScore").textContent = round.limit == null ? "연습" : `+${result.score}`;
  $("rsComment").textContent = statusComment(result.status) || comment;
  pop.classList.add("active");

  const handler = () => {
    pop.classList.remove("active");
    pop.removeEventListener("click", handler);
    next();
  };
  pop.addEventListener("click", handler);
}

function statusComment(status) {
  if (status === "over") return "너무 많이 잘랐어! 공평도 반토막.";
  if (status === "timeout") return "손님이 그냥 가버렸습니다.";
  if (status === "short") return "조각이 모자라잖아.";
  return null;
}

// ---- 완성 버튼 ----
$("doneBtn").addEventListener("click", () => game && game.endRound());

// ---- 결과 ----
async function finish(summary) {
  show("resultScreen");
  const grade = gradeFor(summary.total);
  $("gradeLabel").textContent = grade.label;
  $("gradeComment").textContent = grade.comment;
  $("totalScore").textContent = summary.total;

  // 라운드 막대 — summary.rounds는 채점 라운드(튜토리얼 제외)만
  const scoredRounds = ROUNDS.filter((r) => r.limit != null);
  const wrap = $("roundBars");
  wrap.innerHTML = "";
  summary.rounds.forEach((s, i) => {
    const r = scoredRounds[i];
    const max = r?.bonus ? Math.round(115 * r.bonus) : 115; // 케이크는 상한 173
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `<span>${r ? r.label : `R${i + 1}`}</span>
      <div class="bar"><div class="fill" style="width:${Math.min(100, (s / max) * 100)}%"></div></div>
      <b>${s}</b>`;
    wrap.appendChild(row);
  });

  window._summary = summary;

  // 결과 화면 분기: 닉네임이 저장돼 있으면(재방문) 닉 입력을 건너뛰고 자동 등록.
  const returning = !!lastNickname;
  $("playResult").innerHTML = "";
  $("playResult").className = "play-result";
  $("submitState").textContent = "";
  $("nickRow").hidden = returning;
  $("submitBtn").hidden = returning;
  $("viewRankBtn").hidden = !returning;

  if (returning) {
    $("nickInput").value = lastNickname;
    await autoRecord(summary);
  } else {
    $("nickInput").value = "";
  }
}

// 재도전(2회차+): 결과 즉시 자동 등록 후 3-state 피드백.
async function autoRecord(summary) {
  $("submitState").textContent = "기록 중…";
  try {
    const res = await recordPlay({
      playerId,
      nickname: lastNickname,
      score: summary.total,
      rounds: summary.rounds,
    });
    if (!res.ok) {
      $("submitState").textContent = "점수 검증 실패";
      return;
    }
    lastResult = res;
    $("submitState").textContent = "";
    renderPlayResult(res);
  } catch (e) {
    $("submitState").textContent = "기록 실패 — 나중에 다시";
  }
}

// 갱신/유지 3-state 결과 메시지. 기록이 내려가지 않음을 분명히 보여준다.
function renderPlayResult(res) {
  const el = $("playResult");
  if (res.prevBest == null) {
    el.className = "play-result is-new";
    el.innerHTML = `<div class="pr-head">등록 완료! <b>${res.score}</b>점</div>
      <div class="pr-sub">현재 <b>${res.rank}</b>위</div>`;
  } else if (res.isNewHigh) {
    el.className = "play-result is-new";
    const up = res.score - res.prevBest;
    const rankMoved = res.prevRank !== res.rank;
    el.innerHTML = `<div class="pr-head">🎉 최고 기록! <b>${res.score}</b>점</div>
      <div class="pr-sub">이전 최고 ${res.prevBest} · <span class="pr-up">▲${up}</span></div>
      <div class="pr-rank">${
        rankMoved
          ? `${res.prevRank}위 <span class="pr-arrow">→</span> <b>${res.rank}위</b>`
          : `<b>${res.rank}위</b>`
      }</div>`;
  } else {
    el.className = "play-result is-keep";
    el.innerHTML = `<div class="pr-head">이번 판 <b>${res.score}</b>점</div>
      <div class="pr-sub">내 최고 <b>${res.best}</b>점 (${res.rank}위) — 기록은 그대로예요</div>`;
  }
}

// ---- 랭킹 등록 (첫 판: 닉네임 입력) ----
$("submitBtn").addEventListener("click", async () => {
  const nickname = cleanNickname($("nickInput").value);
  const summary = window._summary;
  localStorage.setItem("bogle4th_nick", nickname);
  lastNickname = nickname;
  $("submitState").textContent = "등록 중…";
  try {
    const res = await recordPlay({
      playerId,
      nickname,
      score: summary.total,
      rounds: summary.rounds,
    });
    if (!res.ok) {
      $("submitState").textContent = "점수 검증 실패";
      return;
    }
    lastResult = res;
    $("submitState").textContent = "";
    $("nickRow").hidden = true;
    $("submitBtn").hidden = true;
    $("viewRankBtn").hidden = false;
    renderPlayResult(res);
  } catch (e) {
    $("submitState").textContent = "등록 실패 — 나중에 다시";
  }
});

// ---- 랭킹 보기 ----
$("viewRankBtn").addEventListener("click", async () => {
  await renderBoard();
  show("rankScreen");
});

// HTML 특수문자 이스케이프 — 남의 닉네임을 그리므로 저장형 XSS 차단.
function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

async function renderBoard() {
  const { top, me } = await board(playerId, 100);
  const list = $("rankList");
  list.innerHTML = "";
  top.forEach((e) => {
    const mine = e.player_id === playerId;
    const row = document.createElement("div");
    row.className = "rank-row" + (mine ? " me" : "");
    row.innerHTML = `<span class="rk">${e.rank}</span><span class="nm">${esc(e.nickname)}</span><b>${e.score}</b>`;
    list.appendChild(row);
  });
  if (me && me.rank > 100) {
    const row = document.createElement("div");
    row.className = "rank-row me";
    row.innerHTML = `<span class="rk">${me.rank}</span><span class="nm">${esc(me.nickname)}</span><b>${me.score}</b>`;
    list.appendChild(row);
  }
}

// ---- 공유 이미지 ----
$("shareBtn").addEventListener("click", async () => {
  const nickname = lastNickname || "주방알바";
  const s = window._summary;
  const card = buildShareCard({
    nickname,
    total: s.total,
    rounds: s.rounds,
    rank: lastResult ? lastResult.rank : null,
  });
  downloadCard(card, `bogle4th-${nickname}.png`);
});

// ---- 재도전 ----
document
  .querySelectorAll(".retryBtn")
  .forEach((b) => b.addEventListener("click", () => startGame()));
$("backToResult").addEventListener("click", () => show("resultScreen"));
