// 🔥 Firebase Setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getDatabase, ref, set, update, get, onValue } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
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
const randId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ---------- Question Bank ----------
const QUESTION_BANK = [
  { id: "1", text: "What’s their villain origin story?" },
  { id: "2", text: "What reality show would they star in?" },
  { id: "3", text: "What’s their useless superpower?" },
  { id: "4", text: "What would their autobiography be called?" }
];

// ---------- App State ----------
let game = null;
let gameRef = null;

const me = {
  id: randId(),
  name: "",
  role: "none",
  room: ""
};

// ---------- Firebase Room ----------
function openRoom(roomCode) {
  me.room = roomCode;
  gameRef = ref(db, `rooms/${roomCode}/game`);

  onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    game = data;
    render();
  });
}

async function writeGame() {
  if (!gameRef) return;
  await set(gameRef, game);
}

// ---------- Create Room ----------
async function createRoomAsHost() {
  const room = randId();

  me.role = "host";
  me.name = "Host";

  openRoom(room);

  game = {
    phase: "lobby",
    hostId: me.id,
    players: [{
      id: me.id,
      name: me.name,
      joinedAt: Date.now()
    }],
    round: null,
    scores: {
      [me.id]: 0
    }
  };

  await writeGame();

  showScreen("lobby");   // 🔥 THIS WAS MISSING
  setTopStatus();        // 🔥 update header
}

// ---------- Join Room ----------
async function joinRoomAsPlayer() {
  const room = $("roomInput").value.trim().toUpperCase();
  const name = $("nameInput").value.trim();

  if (!room || !name) return alert("Enter room & name");

  me.role = "player";
  me.name = name;

  openRoom(room);

  const snapshot = await get(ref(db, `rooms/${room}/game`));
  const data = snapshot.val();

  if (!data) return alert("Room not found");

  if (!data.players.find(p => p.id === me.id)) {
    data.players.push({ id: me.id, name });
    data.scores[me.id] = 0;

    await update(ref(db, `rooms/${room}/game`), {
      players: data.players,
      scores: data.scores
    });
  }
}

// ---------- Start Round ----------
async function hostStartRound() {
  if (me.role !== "host") return;

  game.round = {
    questions: shuffle(QUESTION_BANK).slice(0, 2),
    submissions: [],
    revealIndex: 0
  };

  game.phase = "answering";
  await writeGame();
}

// ---------- Submit Answers ----------
async function submitMyAnswers() {
  const blocks = document.querySelectorAll("textarea");
  const answers = [];

  blocks.forEach((t, i) => {
    if (t.value.trim()) {
      answers.push({
        id: randId(),
        authorId: me.id,
        questionId: game.round.questions[i].id,
        text: t.value.trim()
      });
    }
  });

  game.round.submissions.push(...answers);
  await writeGame();
  alert("Submitted!");
}

// ---------- Reveal ----------
async function nextReveal() {
  if (me.role !== "host") return;

  game.round.revealIndex++;

  if (game.round.revealIndex >= game.round.questions.length) {
    game.phase = "score";
  }

  await writeGame();
}

// ---------- Rendering ----------
function render() {
  if (!game) return;

  console.log("Game Updated:", game);
}

// ---------- Buttons ----------
$("btnCreateRoom")?.addEventListener("click", createRoomAsHost);
$("btnJoinRoom")?.addEventListener("click", joinRoomAsPlayer);
$("btnStartRound")?.addEventListener("click", hostStartRound);
$("btnSubmitAnswers")?.addEventListener("click", submitMyAnswers);
$("btnNextReveal")?.addEventListener("click", nextReveal);
