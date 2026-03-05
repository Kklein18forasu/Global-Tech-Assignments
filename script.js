// 🔥 Firebase Setup (Realtime Database Multiplayer)
// 🔥 Firebase Setup (Realtime Database Multiplayer)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getDatabase, ref, set, get, runTransaction, onValue } 
from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyADZrx36oil91a58Nzf7MjZ7_1uJD43Xdg",
  authDomain: "anonymous-roast-room-prototype.firebaseapp.com",
  databaseURL: "https://anonymous-roast-room-prototype-default-rtdb.firebaseio.com",
  projectId: "anonymous-roast-room-prototype",
  storageBucket: "anonymous-roast-room-prototype.firebasestorage.app",
  messagingSenderId: "227276252448",
  appId: "1:227276252448:web:08beea9f9f51a4fe0de345"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// ---------- Utilities ----------
const $ = (id) => document.getElementById(id);
const randId = () => Math.random().toString(36).slice(2, 9).toUpperCase();

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[s]));
}

function truncate(str, n) {
  const s = String(str);
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function clampNumber(val, min, max) {
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function getRoundKey(r) {
  if (!r) return null;

  const ids = (r.questions ?? []).map(q => q.id).join("|");
  const qpp = r.qPerPlayer ?? 0;

  return `${qpp}:${ids}`;
}

// ---------- Question Bank ----------
const QUESTION_BANK = [

 { id: "q1", text: "Who would be their dream teacher (and what would they teach)?" },
  { id: "q2", text: "What’s their superpower, but make it inconvenient?" },
  { id: "q3", text: "What’s their most useless talent?" },
  { id: "q4", text: "What’s their signature move in a crisis?" },
  { id: "q5", text: "If they had a warning label, what would it say?" },
  { id: "q6", text: "What do they never apologize for?" },
  { id: "q7", text: "What do they avoid dealing with?" },
  { id: "q8", text: "What do they swear they're good at but absolutely aren't?" },
  { id: "q9", text: "What’s their most chaotic habit?" },
  { id: "q10", text: "What’s the weirdest hill they would die on?" },
  { id: "q11", text: "What would their personal conspiracy theory be?" },
  { id: "q12", text: "What’s something they do that makes everyone quietly judge them?" },
  { id: "q13", text: "What’s something they take way too seriously?" },
  { id: "q14", text: "What has been the highlight of their year so far?" },
  { id: "q15", text: "What would their reality TV show be called?" },
  { id: "q16", text: "What would their autobiography be titled?" },
  { id: "q17", text: "When this person walks in, what shifts?" },
  { id: "q18", text: "What would their personal catchphrase be?" },
  { id: "q19", text: "What do they think is subtle but isn't?" },
  { id: "q20", text: "If they were president, what would their campaign slogan be?" },
  { id: "q21", text: "What would their motivational seminar be called?" },
  { id: "q22", text: "If they opened a restaurant, what would it be famous for?" },
  { id: "q23", text: "What would their podcast be about?" },
  { id: "q24", text: "What product would they accidentally invent?" },
  { id: "q25", text: "What’s the worst excuse they would use to get out of something?" },
  { id: "q26", text: "What’s something they always overreact to?" },
  { id: "q27", text: "If they started a religion, what would it be called?" },
  { id: "q28", text: "What’s their villain origin story?" },
  { id: "q29", text: "If they had a cult, what would the first rule be?" },
  { id: "q30", text: "What crime would they be most likely to commit?" },
  { id: "q31", text: "What about them would HR quietly document?" },
  { id: "q32", text: "If they were to fake an illness, what would it be?" },
  { id: "q33", text: "What rumor would spread about them at work?" },
  { id: "q34", text: "What crime would they be terrible at committing?" },
  { id: "q35", text: "What would their supervillain costume look like?" },
  { id: "q36", text: "What headline would they accidentally make?" },
  { id: "q37", text: "What would be the most dramatic reason they’d quit a job?" },
  { id: "q38", text: "What would they get banned from doing?" },
  { id: "q39", text: "What’s the most on-brand mistake they would make?" },
  { id: "q40", text: "If they’d been dumped, how would you cheer them up?" },
  { id: "q41", text: "What would you text them after they bombed a first date?" },
  { id: "q42", text: "If you had to find them in a crowded room but couldn't use their name, what would you call?" },
  { id: "q43", text: "What compliment would secretly roast them?" },
  { id: "q44", text: "What’s the most ridiculous thing they’ve ever gotten away with?" },
  { id: "q45", text: "If you lost them in a grocery store, what aisle would you find them in?" },
  { id: "q46", text: "How would you introduce them on a talk show?" },
  { id: "q47", text: "What would you write in their yearbook?" },
  { id: "q48", text: "What’s something they brag about way too much?" },
  { id: "q49", text: "What compliment would confuse them the most?" },
  { id: "q50", text: "What would their villain nickname be?" },
  { id: "q51", text: "What’s the most embarrassing thing they’d go viral for?" },
  { id: "q52", text: "What’s the most predictable thing they do?" }
];

// ---------- App State ----------
const ME_KEY = "arb_me_id"; // Anonymous Roast Burnbook

const me = {
  id: localStorage.getItem(ME_KEY) || randId(),
  name: "",
  role: "none",
  room: ""
};

localStorage.setItem(ME_KEY, me.id);

let game = null;
let gameRef = null;
let unsubscribe = null;

let lastRoundQuestionIds = [];

let answeringUiRoundKey = null;
let draftAnswersByQid = new Map();

// Global variables for reveal selections
let favPickId = null;
let crePickId = null;
let currentRevealOwner = null;

// ---------- Screens + Header UI (matches your HTML) ----------
const screens = {
  room: $("screenRoom"),
  lobby: $("screenLobby"),
  answer: $("screenAnswer"),
  wait: $("screenWait"),
  reveal: $("screenReveal"),
  score: $("screenScore"),
  gameOver: $("screengameover")
};

const roomLabel = $("roomLabel");
const phaseLabel = $("phaseLabel");
const meLabel = $("meLabel");

function showScreen(which) {
  Object.values(screens).forEach(s => s?.classList.add("hidden"));
  screens[which]?.classList.remove("hidden");
}

function setTopStatus() {
  roomLabel.textContent = me.room || "—";
  phaseLabel.textContent = game?.phase || "—";
  meLabel.textContent = me.role === "none" ? "—" : `${me.role.toUpperCase()} (${me.name || me.id})`;
}

function isHost() {
  return !!game && me.role === "host" && game.hostId === me.id;
}

function currentRevealPlayerId() {
  const r = game?.round;
  if (!r) return null;
  const idx = r.revealIndex ?? 0;
  return r.revealQueue?.[idx] ?? null;
}

function pickQuestions(qPerPlayer) {
  const shuffled = shuffle([...QUESTION_BANK]);

  let filtered = shuffled.filter(
    q => !lastRoundQuestionIds.includes(q.id)
  );

  // fallback if the bank is too small
  if (filtered.length < qPerPlayer) {
    filtered = shuffled;
  }

  const selected = filtered.slice(0, qPerPlayer);

  lastRoundQuestionIds = selected.map(q => q.id);

  return selected;
}

// ---------- Firebase Room ----------
function openRoom(roomCode) {
  me.room = roomCode;
  gameRef = ref(db, `rooms/${roomCode}/game`);

  if (unsubscribe) unsubscribe();

  unsubscribe = onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    game = data;
    // Set role based on persisted ID
    me.role = game.hostId === me.id ? "host" : "player";
    setTopStatus();

    // ✅ Single routing logic (no conflicting overrides)
    if (!game.phase) return;

    if (game.phase === "answering") {
      const hasSubmitted =
        game.round?.submittedPlayerIds?.includes(me.id);

      showScreen(hasSubmitted ? "wait" : "answer");
    } else {
      switch (game.phase) {
        case "lobby":
          showScreen("lobby");
          break;
        case "reveal":
          showScreen("reveal");
          break;
        case "score":
          showScreen("score");
          break;
        case "gameover":
          showScreen("gameover");
          renderGameOver();
          break;
      }
    }

    // 🔥 THEN render
    render();
  });
}

async function writeGame() {
  if (!gameRef) return;
  await set(gameRef, game);
}

// ---------- Host Actions ----------
async function createRoomAsHost() {

  const name = $("hostNameInput").value.trim();

  if (!name) {
    alert("Enter your name first!");
    return;
  }

  me.name = name;

  const room = randId();

  me.role = "host";
  openRoom(room);

  game = {
    phase: "lobby",
    hostId: me.id,
    players: [{ id: me.id, name: me.name, joinedAt: Date.now(), roastMeter: 0 }],
    round: null,
    scores: { [me.id]: 0 },
    winnerId: null
  };

  await writeGame();

  setTopStatus();

  // helpful UX
  alert(`Room created! Code: ${room}`);
}

async function hostStartRound() {
  if (!isHost()) return;

  const qPerPlayer = clampNumber($("qPerPlayer").value, 1, 10);
  const order = $("revealOrder").value;

  const picked = pickQuestions(qPerPlayer);
  const players = game.players;

  const queue = order === "random"
    ? shuffle(players.map(p => p.id))
    : players.map(p => p.id);

  game.round = {
    qPerPlayer,
    questions: picked,
    submissions: [],
    submittedPlayerIds: [],
    revealQueue: queue,
    revealIndex: 0,
    locks: {},
    activePlayerIds: players.map(p => p.id),
    // shared marker for the currently selected winning answer (cleared each reveal/page)
    winningAnswerId: null,
    favoriteAnswerId: null,
    creativeAnswerId: null,
  };

  game.phase = "answering";
  await writeGame();
}

async function hostBeginReveal() {
  if (!isHost()) return;
  if (!game?.round) return;

  const total = game.players.length;
  const submitted = game.round.submittedPlayerIds?.length ?? 0;

  if (submitted < total) {
    return alert(`Not everyone has submitted yet (${submitted}/${total}).`);
  }

  game.phase = "reveal";
  game.round.revealIndex = 0;

  await writeGame();
}

async function hostNextReveal() {
  if (!isHost()) return;

  const r = game.round;
  const aboutId = currentRevealPlayerId();
  if (!aboutId) return;

  // Determine if there are any submissions for this page
  const pageSubs = (r.submissions ?? []).filter(s => s.aboutId === aboutId);

  // 🔒 If there are answers, require page to be locked before advancing
  if (pageSubs.length > 0) {
    const isLocked = r.locks?.[aboutId]?.resolved;
    if (!isLocked) {
      return alert("Waiting for the page owner to lock in first.");
    }
  }
  // if pageSubs.length === 0, we allow skipping without a lock

  r.revealIndex = Math.min(
    (r.revealIndex ?? 0) + 1,
    r.revealQueue.length
  );

  if (r.revealIndex >= r.revealQueue.length) {
    game.phase = "score";
  } else {
    game.phase = "reveal";
  }

  await writeGame();
}

async function setPhase(phase) {
  if (!isHost()) return;
  game.phase = phase;
  await writeGame();
}

// ---------- Player Actions ----------
async function joinRoomAsPlayer() {
  const room = $("roomInput").value.trim().toUpperCase();
  const name = $("nameInput").value.trim();

  if (!room) return alert("Enter a room code");
  if (!name) return alert("Enter your name");

  me.role = "player";
  me.name = name;
  openRoom(room);

  // confirm room exists
  const snap = await get(ref(db, `rooms/${room}/game`));
  const data = snap.val();
  if (!data) {
    alert("Room not found.");
    leaveRoom(); // reset UI
    return;
  }

  // transaction: add player safely
  await runTransaction(ref(db, `rooms/${room}/game`), (cur) => {
    if (!cur) return cur;
    cur.players ??= [];
    cur.scores ??= {};

    const exists = cur.players.some(p => p.id === me.id);
    if (!exists) {
      cur.players.push({ id: me.id, name: me.name, joinedAt: Date.now(), roastMeter: 0 });
      cur.scores[me.id] = cur.scores[me.id] ?? 0;
    } else {
      // update name if rejoining
      const p = cur.players.find(p => p.id === me.id);
      if (p) p.name = me.name;
    }

    return cur;
  });

  setTopStatus();
  showScreen("lobby");
}

function leaveRoom() {
  // (Optional) you could also remove from players via transaction.
  if (unsubscribe) unsubscribe();
  unsubscribe = null;

  me.role = "none";
  me.name = "";
  me.room = "";
  game = null;
  gameRef = null;

  setTopStatus();
  showScreen("room");
}

// ---------- Submissions ----------
async function submitMyAnswers() {
  if (!game?.round) return;

 const my = [];

for (const q of (game.round.questions ?? [])) {
  const draft = draftAnswersByQid.get(q.id);
  const aboutId = draft?.aboutId;
  const text = draft?.text?.trim();

  if (!aboutId || !text) {
    return alert("Please fill every prompt before submitting.");
  }

  my.push({
    id: randId(),
    authorId: me.id,
    aboutId,
    questionId: q.id,
    text
  });
}


  // transaction: append submissions safely
 await runTransaction(gameRef, (cur) => {
  if (!cur?.round) return cur;

  // 🔒 Guard: only allow submit during answering phase
  if (cur.phase !== "answering") return cur;

  cur.round.submissions ??= [];
  cur.round.submittedPlayerIds ??= [];

  // prevent double submit
  if (cur.round.submittedPlayerIds.includes(me.id)) return cur;

  cur.round.submissions.push(...my);
  cur.round.submittedPlayerIds.push(me.id);

  // ❌ DO NOT change cur.phase here

  return cur;
});
}

// ---------- Owner Selection Logic ----------
async function ownerSelectAnswer(submissionId) {
  // 🔒 Guard: verify this player is the page owner and page is not locked
  const aboutId = currentRevealPlayerId();
  const isOwner = me.id === aboutId;
  const isLocked = !!game?.round?.locks?.[aboutId]?.resolved;
  const canPick = isOwner && !isLocked;

  console.log({ meId: me.id, revealId: aboutId, isOwner, locked: isLocked, canPick, submissionId });

  if (!canPick) {
    console.warn("❌ Cannot pick: not page owner or page is locked");
    return;
  }

  // Get current shared selections
  const currentFav = game?.round?.favoriteAnswerId;
  const currentCre = game?.round?.creativeAnswerId;

  console.log(`ownerSelectAnswer: submissionId=${submissionId}, currentFav=${currentFav}, currentCre=${currentCre}`);

  let newFav = currentFav;
  let newCre = currentCre;

  if (currentFav === submissionId) {
    // unselect favorite
    newFav = null;
  } else if (currentCre === submissionId) {
    // unselect creative
    newCre = null;
  } else if (currentFav === null) {
    newFav = submissionId;
  } else if (currentCre === null) {
    newCre = submissionId;
  } else {
    // both set, reset and set favorite
    newFav = submissionId;
    newCre = null;
  }

  // Update shared state
  try {
    await runTransaction(gameRef, cur => {
      if (!cur?.round) return cur;
      const r = cur.round;
      // guard again
      if (me.id !== aboutId) return cur;
      if (r.locks?.[aboutId]?.resolved) return cur;
      r.favoriteAnswerId = newFav;
      r.creativeAnswerId = newCre;
      return cur;
    });
  } catch (err) {
    console.error("failed to save selections", err);
    return;
  }

  // Update local state
  favPickId = newFav;
  crePickId = newCre;

  // Update local copy
  if (game?.round) {
    game.round.favoriteAnswerId = newFav;
    game.round.creativeAnswerId = newCre;
  }

  // Re-render
  render();
}


// ---------- Roast Meter Logic ----------
async function increaseRoastMeter(playerId) {
  if (!game?.players) return;

  const player = game.players.find(p => p.id === playerId);
  if (!player) return;

  // 🔥 FIX: Do NOT increment here - the transaction in ownerLockIn() already incremented roastMeter
  // This function only checks if the player reached 10 and triggers game over
  // The actual increment happens in the transaction within ownerLockIn()

  // Check if reached 10 (Roast Champion)
  if (player.roastMeter >= 10) {
    game.phase = "gameover";
    game.winnerId = playerId;
    await writeGame();
    render();
    return true; // Signal that game is over
  }

  return false;
}

// ---------- Owner Lock-In ----------
async function ownerLockIn() {
  if (!game?.round) return;

  // 🔥 FIX: Only the host should update scores to prevent duplicate scoring
  if (!isHost()) return;

  const aboutId = currentRevealPlayerId();
  if (aboutId !== me.id) return;

  const favoriteSubmissionId = favPickId;
  const creativeSubmissionId = crePickId;

  console.log(`ownerLockIn: favoriteSubmissionId=${favoriteSubmissionId}, creativeSubmissionId=${creativeSubmissionId}`);

  if (!favoriteSubmissionId || !creativeSubmissionId) {
    return alert("Pick a favorite and a creative submission.");
  }

  let favAuthorId = null;
  let creAuthorId = null;

  console.log("ownerLockIn: Starting transaction");
  await runTransaction(gameRef, (cur) => {
    if (!cur?.round) return cur;

    const r = cur.round;
    r.locks ??= {};
    cur.scores ??= {};

    // already locked
    if (r.locks[aboutId]?.resolved) return cur;

    const fav = (r.submissions ?? []).find(s => s.id === favoriteSubmissionId);
    const creative = (r.submissions ?? []).find(s => s.id === creativeSubmissionId);

    if (!fav || !creative) return cur;

    // Favorite gets +1 roast meter
    const favPlayer = cur.players.find(p => p.id === fav.authorId);
    if (favPlayer) {
      favPlayer.roastMeter = (favPlayer.roastMeter ?? 0) + 1;
      favAuthorId = fav.authorId;

      if (favPlayer.roastMeter >= 10) {
        cur.phase = "gameover";
        cur.winnerId = favPlayer.id;
      }
    }

    // Creative gets +1 roast meter
    const crePlayer = cur.players.find(p => p.id === creative.authorId);
    if (crePlayer) {
      crePlayer.roastMeter = (crePlayer.roastMeter ?? 0) + 1;
      creAuthorId = creative.authorId;

      if (crePlayer.roastMeter >= 10) {
        cur.phase = "gameover";
        cur.winnerId = crePlayer.id;
      }
    }

    r.locks[aboutId] = {
      favoriteSubmissionId,
      creativeSubmissionId,
      resolved: true
    };

    return cur;
  });

  console.log("ownerLockIn: Transaction completed");

  // ✅ After transaction, increment roast meters and check for winner
  if (favAuthorId) {
    const gameOver = await increaseRoastMeter(favAuthorId);
    if (gameOver) {
      game.round.favoriteAnswerId = null;
      game.round.creativeAnswerId = null;
      return; // Game over, stop processing
    }
  }

  if (creAuthorId && creAuthorId !== favAuthorId) {
    const gameOver = await increaseRoastMeter(creAuthorId);
    if (gameOver) {
      game.round.favoriteAnswerId = null;
      game.round.creativeAnswerId = null;
      return; // Game over, stop processing
    }
  }

  // ✅ Reset local UI state AFTER transaction completes
  game.round.favoriteAnswerId = null;
  game.round.creativeAnswerId = null;
  favPickId = null;
  crePickId = null;

  // 🔥 Immediately render to show highlights for all clients (including host)
  render();
}

function renderReveal() {
  if (!game?.round) return;

  const r = game.round;
  const aboutId = currentRevealPlayerId();
  if (!aboutId) return;

  // Reset local selection state when the reveal player changes
  if (currentRevealOwner !== aboutId) {
    favPickId = null;
    crePickId = null;
    currentRevealOwner = aboutId;
  }

  // 🔍 DEBUG: Log key values to verify page owner detection
  const isOwner = me.id === aboutId;
  const isLocked = !!r.locks?.[aboutId]?.resolved;
  const canPick = isOwner && !isLocked;
  console.log(`renderReveal: me.id=${me.id}, aboutId=${aboutId}, isOwner=${isOwner}`);
  console.log({ meId: me.id, revealId: aboutId, isOwner, locked: isLocked, canPick });

  if (isHost()) {
    const locked = r.locks?.[aboutId]?.resolved;
    // enable for host if either page is locked or there are no submissions
    const noSubs = (r.submissions ?? []).filter(s => s.aboutId === aboutId).length === 0;
    $("btnNextReveal").disabled = !(locked || noSubs);
  }

  const aboutPlayer = game.players.find(p => p.id === aboutId);
  $("revealName").textContent = aboutPlayer?.name ?? "—";

  const list = $("revealList");
  list.innerHTML = "";

   // Only answers ABOUT this player
  const subs = (r.submissions ?? []).filter(s => s.aboutId === aboutId);
  const qById = new Map((r.questions ?? []).map(q => [q.id, q]));

  // If there are no answers for this player, show a message and adjust controls
  if (subs.length === 0) {
    list.innerHTML = `
      <p class="hint">No answers were submitted for this player.</p>
    `;

    // owner actions should be hidden regardless of owner status
    $("ownerActions").classList.add("hidden");

    // result panel should not show anything
    $("revealResult").classList.add("hidden");
    $("resultText").textContent = "—";

    // enable next button for host (skip lock requirement)
    if (isHost()) {
      $("btnNextReveal").disabled = false;
    }

    // nothing else to render
    return;
  }

  const grouped = {};

  subs.forEach(s => {
    if (!grouped[s.questionId]) {
      grouped[s.questionId] = [];
    }
    grouped[s.questionId].push(s);
  });

  Object.entries(grouped).forEach(([questionId, answers]) => {

    const q = qById.get(questionId);

    const groupDiv = document.createElement("div");
    groupDiv.className = "questionGroup";

    const title = document.createElement("div");
    title.className = "questionTitle qColor-" + (q?.color?.toLowerCase() ?? "red");
    title.textContent = `${q?.color ?? "Prompt"} — ${q?.text ?? ""}`;

    groupDiv.appendChild(title);

    answers.forEach(s => {

      const block = document.createElement("div");

      block.className = "answerBlock";
      block.dataset.submissionId = s.id;

      block.innerHTML = `
  <div>${escapeHtml(s.text)}</div>
`;

      if (canPick) {
  block.style.cursor = "pointer";

  const handleSelect = (e) => {
    e.preventDefault();
    ownerSelectAnswer(s.id);
  };

  block.addEventListener("click", handleSelect);
  block.addEventListener("touchstart", handleSelect, { passive: false });
}

      groupDiv.appendChild(block);

    });

    list.appendChild(groupDiv);

  });

  // highlight the shared winning answer if one has been recorded
  const winId = r.winningAnswerId;
  if (winId) {
    const blocks = list.querySelectorAll('.answerBlock');
    blocks.forEach(block => {
      const sid = block.dataset.submissionId;
      if (sid === winId) {
        block.classList.add('winningAnswer');
      } else {
        block.classList.remove('winningAnswer');
      }
    });
  }

  // highlight favorite and creative selections
  const favId = r.favoriteAnswerId;
  const creId = r.creativeAnswerId;
  const blocks = list.querySelectorAll('.answerBlock');
  blocks.forEach(block => {
    const sid = block.dataset.submissionId;
    if (sid === favId) {
      block.classList.add('pickedFav');
    } else {
      block.classList.remove('pickedFav');
    }
    if (sid === creId) {
      block.classList.add('pickedCreative');
    } else {
      block.classList.remove('pickedCreative');
    }
  });

  // If this page is locked, mark the winning submissions for everyone (no names)
  const lock = r.locks?.[aboutId];
  if (lock?.resolved) {
    const lockFavId = lock.favoriteSubmissionId;
    const lockCreId = lock.creativeSubmissionId;

    blocks.forEach(block => {
      const sid = block.dataset.submissionId;

      // remove any existing inline badges we might have added previously
      const prev = block.querySelectorAll('.winnerBadge');
      prev.forEach(n => n.remove());

      if (sid === lockFavId) {
        block.classList.add('pickedFav');
        const span = document.createElement('span');
        span.className = 'winnerBadge';
        span.textContent = '⭐ Favorite';
        block.appendChild(span);
      }

      if (sid === lockCreId) {
        block.classList.add('pickedCreative');
        const span = document.createElement('span');
        span.className = 'winnerBadge';
        span.textContent = '🎨 Most Creative';
        block.appendChild(span);
      }
    });
  }

  // Owner controls visibility - only show when page owner can pick
  $("ownerActions").classList.toggle("hidden", !canPick);

  // Update owner action labels and button
  if (canPick) {
    const favSub = r.submissions.find(s => s.id === favPickId);
    const creSub = r.submissions.find(s => s.id === crePickId);
    $("favPickLabel").textContent = favSub ? truncate(favSub.text, 50) : "—";
    $("crePickLabel").textContent = creSub ? truncate(creSub.text, 50) : "—";
    $("btnLockIn").disabled = !(favPickId && crePickId);
  }

 // Result display
  const lock2 = r.locks?.[aboutId];
  const resultPanel = $("revealResult");

  if (lock2?.resolved) {
    const fav = r.submissions.find(s => s.id === lock2.favoriteSubmissionId);
    const creative = r.submissions.find(s => s.id === lock2.creativeSubmissionId);

    let message = "";

    if (fav) {
      message += `⭐ Favorite: ${truncate(fav.text, 200)}\n`;
    } else {
      message += `⭐ Favorite selected\n`;
    }

    if (creative) {
      message += `🎨 Most Creative: ${truncate(creative.text, 200)}\n`;
    } else {
      message += `🎨 Most Creative selected\n`;
    }

    if (fav?.authorId === me.id || creative?.authorId === me.id) {
      message += `\nYou earned point(s)! 🎉`;
    }

    $("resultText").textContent = message;
    resultPanel.classList.remove("hidden");
  } else {
    resultPanel.classList.add("hidden");
    $("resultText").textContent = "—";
  }
}
function renderLobby() {
  if (!game) return;

  const ul = $("playerList");
  ul.innerHTML = "";

  game.players
    .slice()
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .forEach((p, idx) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${idx + 1}. ${escapeHtml(p.name)}</span>`;
      ul.appendChild(li);
    });
}

function renderAnswering() {
  if (!game?.round) return;
  if (game.phase !== "answering") return;

  const r = game.round;
  const grid = $("questionGrid");

  const roundKey = getRoundKey(r);

  // 🔥 If we already built this round's UI, do nothing
  if (answeringUiRoundKey === roundKey) {
    return;
  }

  // New round detected — build UI once
  answeringUiRoundKey = roundKey;
  draftAnswersByQid.clear();

  grid.innerHTML = "";

  const targetOptions = game.players
    .map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join("");

  r.questions.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "qCard";
    div.setAttribute("data-qblock", "true");
    div.setAttribute("data-questionid", q.id);

    div.innerHTML = `
      <div class="qMeta">
        <strong>Prompt ${i + 1}</strong>
        <span class="badge">${escapeHtml(q.color)}</span>
      </div>
      <p>${escapeHtml(q.text)}</p>

      <label class="field">
        <span>Answer about</span>
        <select>${targetOptions}</select>
      </label>

      <label class="field">
        <span>Anonymous answer</span>
        <textarea placeholder="Type your answer…"></textarea>
      </label>
    `;

    const select = div.querySelector("select");
    const textarea = div.querySelector("textarea");
    
// 🔥 Initialize draft immediately with default dropdown value
draftAnswersByQid.set(q.id, {
  aboutId: select.value,
  text: ""
});
    // Save draft locally when user interacts
    select.addEventListener("change", () => {
      const cur = draftAnswersByQid.get(q.id) ?? { aboutId: "", text: "" };
      cur.aboutId = select.value;
      draftAnswersByQid.set(q.id, cur);
    });

    textarea.addEventListener("input", () => {
      const cur = draftAnswersByQid.get(q.id) ?? { aboutId: "", text: "" };
      cur.text = textarea.value;
      draftAnswersByQid.set(q.id, cur);
    });

    grid.appendChild(div);
  });
}


function renderWaiting() {
  if (!game?.round) return;

  const submitted = game.round.submittedPlayerIds?.length ?? 0;
  const total = game.players.length;

  $("submittedCount").textContent = submitted;
  $("totalCount").textContent = total;

  $("hostControlsWait").classList.toggle("hidden", !isHost());
  $("btnBeginReveal").disabled = !(isHost() && submitted >= total);
}

function renderScore() {
  if (!game) return;

  const ul = $("scoreList");
  ul.innerHTML = "";

  const rows = game.players
    .map(p => ({
      id: p.id,
      name: p.name,
      score: game.scores?.[p.id] ?? 0,
      roastMeter: p.roastMeter ?? 0
    }))
    .sort((a, b) => b.score - a.score);

  rows.forEach((r, idx) => {
    const li = document.createElement("li");
    
    // Create roast meter bar (10 fire emojis)
    const meterBar = "🔥".repeat(r.roastMeter) + "▫️".repeat(10 - r.roastMeter);

    li.innerHTML = `
      <div style="flex-grow: 1;">
        <span>${idx + 1}. ${escapeHtml(r.name)}</span>
        <div class="scoreMeter">
          ${meterBar}
        </div>
      </div>
      <span><strong>${r.roastMeter}</strong></span>
    `;
    ul.appendChild(li);
  });
}

function renderGameOver() {
  if (!game?.winnerId) return;

  const winner = game.players.find(p => p.id === game.winnerId);
  
$("winnerOverlay").classList.remove("hidden");
setTimeout(() => {
  $("winnerName").textContent = winner?.name ?? "Champion";
}, 900);

 const ul = $("finalScoreList");
  ul.innerHTML = "";

  const rows = game.players
    .map(p => ({
      id: p.id,
      name: p.name,
      roastMeter: p.roastMeter ?? 0
    }))
    .sort((a, b) => b.roastMeter - a.roastMeter);

  rows.forEach((r, idx) => {
    const li = document.createElement("li");
    
    // Create roast meter bar (10 fire emojis)
    const meterBar = "🔥".repeat(r.roastMeter) + "▫️".repeat(10 - r.roastMeter);

    li.innerHTML = `
      <div style="flex-grow: 1;">
        <span>${idx + 1}. ${escapeHtml(r.name)}</span>
        <div style="font-size: 14px; margin-top: 4px; letter-spacing: 2px;">
          ${meterBar}
        </div>
      </div>
      <span><strong>${r.roastMeter}</strong></span>
    `;
    ul.appendChild(li);
  });

  $("hostGameOverControls").classList.toggle("hidden", !isHost());
}

function render() {
  if (!game) return;

  renderLobby();
  renderAnswering();
  renderWaiting();
  renderReveal();
  renderScore();
  renderGameOver();

  $("btnStartRound").classList.toggle("hidden", !isHost());
  $("hostSetup").classList.toggle("hidden", !isHost());
  $("hostControlsWait").classList.toggle("hidden", !isHost());
  $("btnNextReveal").classList.toggle("hidden", !isHost());
  $("btnBackToReveal").classList.toggle("hidden", !isHost());
  $("btnNewRound").classList.toggle("hidden", !isHost());
}
// ---------- Buttons ----------
$("btnCreateRoom").addEventListener("click", createRoomAsHost);
$("btnJoinRoom").addEventListener("click", joinRoomAsPlayer);
$("btnLeave").addEventListener("click", leaveRoom);

$("btnStartRound").addEventListener("click", hostStartRound);
$("btnBackToLobby").addEventListener("click", () => setPhase("lobby"));
$("btnSubmitAnswers").addEventListener("click", submitMyAnswers);

$("btnBeginReveal").addEventListener("click", hostBeginReveal);
$("btnNextReveal").addEventListener("click", hostNextReveal);

$("btnLockIn").addEventListener("click", ownerLockIn);
$("btnNewRound").addEventListener("click", hostStartRound);
$("btnBackToReveal").addEventListener("click", () => setPhase("reveal"));

$("btnPlayAgain").addEventListener("click", hostStartRound);
$("btnPlayAgainLeave").addEventListener("click", leaveRoom);

function boot() {
  showScreen("room");
  setTopStatus();
}
boot();
