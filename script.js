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

  // ---------- RED ----------
  { id: "red-1", color: "Red", text: "Who would be their dream teacher (and what would they teach)?" },
  { id: "red-2", color: "Red", text: "What’s their superpower, but make it inconvenient?" },
  { id: "red-3", color: "Red", text: "What’s their most useless talent?" },
  { id: "red-4", color: "Red", text: "What’s their signature move in a crisis?" },
  { id: "red-5", color: "Red", text: "If they had a warning label, what would it say?" },
  { id: "red-6", color: "Red", text: "What do they never apologize for?" },
  { id: "red-7", color: "Red", text: "What do they avoid dealing with?" },
  { id: "red-8", color: "Red", text: "What do they swear they're good at but absolutely aren't?" },
  { id: "red-9", color: "Red", text: "What’s their most chaotic habit?" },
  { id: "red-10", color: "Red", text: "What’s the weirdest hill they would die on?" },
  { id: "red-11", color: "Red", text: "What would their personal conspiracy theory be?" },
  { id: "red-12", color: "Red", text: "What’s something they do that makes everyone quietly judge them?" },
  { id: "red-13", color: "Red", text: "What’s something they take way too seriously?" },

  // ---------- ORANGE ----------
  { id: "orange-1", color: "Orange", text: "What has been the highlight of their year so far?" },
  { id: "orange-2", color: "Orange", text: "What would their reality TV show be called?" },
  { id: "orange-3", color: "Orange", text: "What would their autobiography be titled?" },
  { id: "orange-4", color: "Orange", text: "When this person walks in, what shifts?" },
  { id: "orange-5", color: "Orange", text: "What would their personal catchphrase be?" },
  { id: "orange-6", color: "Orange", text: "What do they think is subtle but isn't?" },
  { id: "orange-7", color: "Orange", text: "If they were president, what would their campaign slogan be?" },
  { id: "orange-8", color: "Orange", text: "What would their motivational seminar be called?" },
  { id: "orange-9", color: "Orange", text: "If they opened a restaurant, what would it be famous for?" },
  { id: "orange-10", color: "Orange", text: "What would their podcast be about?" },
  { id: "orange-11", color: "Orange", text: "What product would they accidentally invent?" },
  { id: "orange-12", color: "Orange", text: "What’s the worst excuse they would use to get out of something?" },
  { id: "orange-13", color: "Orange", text: "What’s something they always overreact to?" },

  // ---------- YELLOW ----------
  { id: "yellow-1", color: "Yellow", text: "If they started a religion, what would it be called?" },
  { id: "yellow-2", color: "Yellow", text: "What’s their villain origin story?" },
  { id: "yellow-3", color: "Yellow", text: "If they had a cult, what would the first rule be?" },
  { id: "yellow-4", color: "Yellow", text: "What crime would they be most likely to commit?" },
  { id: "yellow-5", color: "Yellow", text: "What about them would HR quietly document?" },
  { id: "yellow-6", color: "Yellow", text: "If they were to fake an illness, what would it be?" },
  { id: "yellow-7", color: "Yellow", text: "What rumor would spread about them at work?" },
  { id: "yellow-8", color: "Yellow", text: "What crime would they be terrible at committing?" },
  { id: "yellow-9", color: "Yellow", text: "What would their supervillain costume look like?" },
  { id: "yellow-10", color: "Yellow", text: "What headline would they accidentally make?" },
  { id: "yellow-11", color: "Yellow", text: "What would be the most dramatic reason they’d quit a job?" },
  { id: "yellow-12", color: "Yellow", text: "What would they get banned from doing?" }, 
  { id: "yellow-13", color: "Yellow", text: "What’s the most on-brand mistake they would make?" },

  // ---------- GREEN ----------
  { id: "green-1", color: "Green", text: "If they’d been dumped, how would you cheer them up?" },
  { id: "green-2", color: "Green", text: "What would you text them after they bombed a first date?" },
  { id: "green-3", color: "Green", text: "If you had to find them in a crowded room but couldn't use their name, what would you call?" },
  { id: "green-4", color: "Green", text: "What compliment would secretly roast them?" },
  { id: "green-5", color: "Green", text: "What’s the most ridiculous thing they’ve ever gotten away with?" },
  { id: "green-6", color: "Green", text: "If you lost them in a grocery store, what aisle would you find them in?" },
  { id: "green-7", color: "Green", text: "How would you introduce them on a talk show?" },
  { id: "green-8", color: "Green", text: "What would you write in their yearbook?" },
  { id: "green-9", color: "Green", text: "What’s something they brag about way too much?" },
  { id: "green-10", color: "Green", text: "What compliment would confuse them the most?" },
  { id: "green-11", color: "Green", text: "What would their villain nickname be?" },
  { id: "green-12", color: "Green", text: "What’s the most embarrassing thing they’d go viral for?" },
  { id: "green-13", color: "Green", text: "What’s the most predictable thing they do?" },

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
let favPickId = null;
let crePickId = null;

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

  // 🔒 Do NOT advance unless this page is locked
  const isLocked = r.locks?.[aboutId]?.resolved;
  if (!isLocked) {
    return alert("Waiting for the page owner to lock in first.");
  }

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
function ownerSelectAnswer(submissionId) {
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

  // First click: set as favorite
  if (favPickId === null && crePickId === null) {
    favPickId = submissionId;
    console.log("✅ Set as FAVORITE:", submissionId);
  }
  // Clicking favorite again: toggle/unselect
  else if (submissionId === favPickId) {
    favPickId = null;
    console.log("↩️ Unselected FAVORITE");
  }
  // Clicking creative again: toggle/unselect
  else if (submissionId === crePickId) {
    crePickId = null;
    console.log("↩️ Unselected CREATIVE");
  }
  // Second pick: set as creative (when favorite already set)
  else if (favPickId !== null && crePickId === null) {
    crePickId = submissionId;
    console.log("✅ Set as CREATIVE:", submissionId);
  }
  // Second pick: set as favorite (when creative already set)
  else if (favPickId === null && crePickId !== null) {
    favPickId = submissionId;
    console.log("✅ Set as FAVORITE (2nd):", submissionId);
  }
  // Both picks exist: do nothing (limit = 2)
  else {
    console.log("⚠️ Already have 2 picks, ignoring click");
    return;
  }

  applySelectionHighlights();
}

function applySelectionHighlights() {
  const blocks = document.querySelectorAll(".answerBlock");

  blocks.forEach(block => {
    const submissionId = block.dataset.submissionId;
    block.classList.remove("pickedFav", "pickedCreative");

    if (submissionId === favPickId) {
      block.classList.add("pickedFav");
    }
    if (submissionId === crePickId) {
      block.classList.add("pickedCreative");
    }
  });

  // Update label text
  if (favPickId) {
    const fav = game?.round?.submissions.find(s => s.id === favPickId);
    $("favPickLabel").textContent = fav ? `✓ ${truncate(fav.text, 25)}` : "—";
  } else {
    $("favPickLabel").textContent = "—";
  }

  if (crePickId) {
    const creative = game?.round?.submissions.find(s => s.id === crePickId);
    $("crePickLabel").textContent = creative ? `✓ ${truncate(creative.text, 25)}` : "—";
  } else {
    $("crePickLabel").textContent = "—";
  }

  // Update lock-in button state
  $("btnLockIn").disabled = !(favPickId && crePickId);
}

// ---------- Roast Meter Logic ----------
async function increaseRoastMeter(playerId) {
  if (!game?.players) return;

  const player = game.players.find(p => p.id === playerId);
  if (!player) return;

  player.roastMeter = (player.roastMeter ?? 0) + 1;

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

  const aboutId = currentRevealPlayerId();
  if (aboutId !== me.id) return;

const favoriteSubmissionId = favPickId;
const creativeSubmissionId = crePickId;


  if (!favoriteSubmissionId || !creativeSubmissionId) {
    return alert("Pick a favorite and a creative submission.");
  }

  let favAuthorId = null;
  let creAuthorId = null;

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

  // ✅ After transaction, increment roast meters and check for winner
  if (favAuthorId) {
    const gameOver = await increaseRoastMeter(favAuthorId);
    if (gameOver) {
      favPickId = null;
      crePickId = null;
      return; // Game over, stop processing
    }
  }

  if (creAuthorId && creAuthorId !== favAuthorId) {
    const gameOver = await increaseRoastMeter(creAuthorId);
    if (gameOver) {
      favPickId = null;
      crePickId = null;
      return; // Game over, stop processing
    }
  }

  // ✅ Reset local UI state AFTER transaction completes
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

  // 🔍 DEBUG: Log key values to verify page owner detection
  const isOwner = me.id === aboutId;
  const isLocked = !!r.locks?.[aboutId]?.resolved;
  const canPick = isOwner && !isLocked;
  console.log({ meId: me.id, revealId: aboutId, isOwner, locked: isLocked, canPick });

  if (isHost()) {
    const locked = r.locks?.[aboutId]?.resolved;
    $("btnNextReveal").disabled = !locked;
  }

  const aboutPlayer = game.players.find(p => p.id === aboutId);
  $("revealName").textContent = aboutPlayer?.name ?? "—";

  const list = $("revealList");
  list.innerHTML = "";

   // Only answers ABOUT this player
  const subs = (r.submissions ?? []).filter(s => s.aboutId === aboutId);
  const qById = new Map((r.questions ?? []).map(q => [q.id, q]));

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
      block.addEventListener("click", () => ownerSelectAnswer(s.id));
    }

    groupDiv.appendChild(block);

  });

  list.appendChild(groupDiv);

  });

  // If this page is locked, mark the winning submissions for everyone (no names)
  const lock = r.locks?.[aboutId];
  if (lock?.resolved) {
    const favId = lock.favoriteSubmissionId;
    const creId = lock.creativeSubmissionId;

    const blocks = list.querySelectorAll('.answerBlock');
    blocks.forEach(block => {
      const sid = block.dataset.submissionId;

      // remove any existing inline badges we might have added previously
      const prev = block.querySelectorAll('.winnerBadge');
      prev.forEach(n => n.remove());

      if (sid === favId) {
        block.classList.add('pickedFav');
        const h = block.querySelector('h4');
        if (h) {
          const span = document.createElement('span');
          span.className = 'winnerBadge';
          span.style.marginLeft = '8px';
          span.style.color = '#ffd700';
          span.textContent = '⭐ Favorite';
          h.appendChild(span);
        }
      }

      if (sid === creId) {
        block.classList.add('pickedCreative');
        const h = block.querySelector('h4');
        if (h) {
          const span = document.createElement('span');
          span.className = 'winnerBadge';
          span.style.marginLeft = '8px';
          span.style.color = '#9b59b6';
          span.textContent = '🎨 Most Creative';
          h.appendChild(span);
        }
      }
    });
  }

  // Owner controls visibility - only show when page owner can pick
  $("ownerActions").classList.toggle("hidden", !canPick);

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
