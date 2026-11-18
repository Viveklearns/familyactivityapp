// Doodle Dash game server.
// The server is the "referee": it owns every room's state (players, scores,
// the secret word, the timer), checks guesses, and relays drawing strokes.
// Clients only ever send intentions ("I guessed X", "I drew a line") and
// render whatever state the server sends back.

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { WORDS } = require('./words');

const PORT = process.env.PORT || 4000;
const CHOOSE_SECONDS = 15;
const REVEAL_SECONDS = 5;
const MAX_PLAYERS = 12;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// In production, the same server also serves the built React app.
const buildDir = path.join(__dirname, '..', 'build');
app.use(express.static(buildDir));
app.get('*', (req, res) => res.sendFile(path.join(buildDir, 'index.html'), (err) => err && res.status(404).end()));

const WORD_GROUPS = Object.entries(WORDS).map(([id, g]) => ({ id, label: g.label, ages: g.ages, emoji: g.emoji }));

/** code -> room */
const rooms = new Map();

const DEFAULT_SETTINGS = {
  ageGroups: ['kids'],
  rounds: 3,
  drawTime: 80,
  wordChoices: 3,
  hints: true,
  customWords: [],
  customOnly: false,
};

// ---------- helpers ----------

function makeCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid confusion with 1/0
  let code;
  do {
    code = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  } while (rooms.has(code));
  return code;
}

const normalize = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents so "deja vu" matches "déjà vu"
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// Edit distance, used to tell a guesser "so close!" when they're 1 letter off.
function distance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function wordPool(settings) {
  const custom = settings.customWords;
  if (settings.customOnly && custom.length >= settings.wordChoices) return custom;
  const fromGroups = settings.ageGroups.flatMap((g) => (WORDS[g] ? WORDS[g].words : []));
  return [...new Set([...fromGroups, ...custom])];
}

function pickChoices(room) {
  let pool = wordPool(room.settings).filter((w) => !room.usedWords.has(w));
  if (pool.length < room.settings.wordChoices) {
    room.usedWords.clear(); // ran out — allow repeats
    pool = wordPool(room.settings);
  }
  return shuffle(pool).slice(0, room.settings.wordChoices);
}

function sanitizeSettings(input, prev) {
  const s = { ...prev };
  const clampInt = (v, min, max, fallback) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  if (Array.isArray(input.ageGroups)) {
    const groups = input.ageGroups.filter((g) => WORDS[g]);
    if (groups.length) s.ageGroups = groups;
  }
  if ('rounds' in input) s.rounds = clampInt(input.rounds, 1, 8, prev.rounds);
  if ('drawTime' in input) s.drawTime = clampInt(input.drawTime, 20, 180, prev.drawTime);
  if ('wordChoices' in input) s.wordChoices = clampInt(input.wordChoices, 1, 4, prev.wordChoices);
  if ('hints' in input) s.hints = Boolean(input.hints);
  if ('customOnly' in input) s.customOnly = Boolean(input.customOnly);
  if (Array.isArray(input.customWords)) {
    s.customWords = [
      ...new Set(input.customWords.map((w) => String(w).trim().slice(0, 30)).filter(Boolean)),
    ].slice(0, 200);
  }
  return s;
}

// The hint shows blanks for hidden letters; spaces are always visible.
function hintFor(room) {
  if (!room.word) return [];
  return [...room.word].map((ch, i) => (ch === ' ' || room.revealed.has(i) ? ch : null));
}

// Each player gets their own view of the room: only the drawer sees the word.
function viewFor(room, playerId) {
  const drawer = room.drawerId;
  const showWord = playerId === drawer || room.phase === 'reveal';
  return {
    code: room.code,
    hostId: room.hostId,
    you: playerId,
    phase: room.phase,
    round: room.round,
    settings: room.settings,
    wordGroups: WORD_GROUPS,
    players: room.order.map((id) => room.players.get(id)),
    drawerId: drawer,
    timeLeft: room.timeLeft,
    hint: hintFor(room),
    word: showWord ? room.word : null,
    choices: playerId === drawer && room.phase === 'choosing' ? room.choices : null,
    lastTurn: room.lastTurn,
  };
}

function emitState(room) {
  for (const id of room.order) io.to(id).emit('state', viewFor(room, id));
}

function system(room, text, kind = 'system') {
  io.to(room.code).emit('chat', { kind, text });
}

function clearTimer(room) {
  clearInterval(room.timer);
  room.timer = null;
}

// ---------- game flow ----------

function startGame(room) {
  room.round = 1;
  room.queue = [...room.order];
  room.usedWords = new Set();
  room.players.forEach((p) => (p.score = 0));
  system(room, '🎨 Game started! Get ready…');
  nextTurn(room);
}

function nextTurn(room) {
  clearTimer(room);
  room.queue = room.queue.filter((id) => room.players.has(id));
  if (!room.queue.length) {
    room.round += 1;
    if (room.round > room.settings.rounds) return endGame(room);
    room.queue = [...room.order];
  }
  room.drawerId = room.queue.shift();
  room.word = null;
  room.revealed = new Set();
  room.strokes = [];
  room.choices = pickChoices(room);
  room.phase = 'choosing';
  room.timeLeft = CHOOSE_SECONDS;
  room.players.forEach((p) => (p.guessed = false));
  io.to(room.code).emit('canvas:sync', []);
  emitState(room);

  room.timer = setInterval(() => {
    room.timeLeft -= 1;
    if (room.timeLeft <= 0) return chooseWord(room, room.choices[0]); // auto-pick
    emitState(room);
  }, 1000);
}

function chooseWord(room, word) {
  if (room.phase !== 'choosing' || !room.choices.includes(word)) return;
  clearTimer(room);
  room.word = word;
  room.usedWords.add(word);
  room.phase = 'drawing';
  room.timeLeft = room.settings.drawTime;
  room.turnStart = Date.now();
  const drawer = room.players.get(room.drawerId);
  system(room, `✏️ ${drawer.name} is drawing!`);

  // Plan when to reveal letters: spread over the second half of the turn,
  // never revealing more than a third of the letters.
  const letterIdx = [...word].map((c, i) => (c === ' ' ? -1 : i)).filter((i) => i >= 0);
  const hintCount = room.settings.hints ? Math.floor(letterIdx.length / 3) : 0;
  const hintTimes = Array.from({ length: hintCount }, (_, k) =>
    Math.round((room.settings.drawTime / 2) * (1 - k / Math.max(1, hintCount)))
  );
  const hintOrder = shuffle(letterIdx);

  emitState(room);
  room.timer = setInterval(() => {
    room.timeLeft -= 1;
    if (hintTimes.includes(room.timeLeft)) room.revealed.add(hintOrder[room.revealed.size]);
    if (room.timeLeft <= 0) return endTurn(room, "⏰ Time's up!");
    emitState(room);
  }, 1000);
}

function endTurn(room, reason) {
  clearTimer(room);
  const guessers = [...room.players.values()].filter((p) => p.guessed).length;
  room.lastTurn = { word: room.word, reason, guessers };
  room.phase = 'reveal';
  room.timeLeft = REVEAL_SECONDS;
  system(room, `${reason} The word was "${room.word}".`);
  emitState(room);
  room.timer = setTimeout(() => {
    room.lastTurn = null;
    nextTurn(room);
  }, REVEAL_SECONDS * 1000);
}

function endGame(room) {
  clearTimer(room);
  room.phase = 'over';
  room.drawerId = null;
  room.word = null;
  system(room, '🏆 Game over!');
  emitState(room);
}

function handleGuess(room, player, text) {
  const guess = normalize(text);
  const answer = normalize(room.word);
  if (guess === answer) {
    player.guessed = true;
    // Faster guesses earn more; the drawer earns a little for every correct guess.
    const points = Math.round(100 + 300 * (room.timeLeft / room.settings.drawTime));
    player.score += points;
    room.players.get(room.drawerId).score += 50;
    system(room, `🎉 ${player.name} guessed the word! (+${points})`, 'correct');
    const others = [...room.players.values()].filter((p) => p.id !== room.drawerId);
    if (others.every((p) => p.guessed)) return endTurn(room, '🌟 Everyone got it!');
    emitState(room);
    return;
  }
  // Players who already know the word can only chat with each other + the drawer.
  if (player.guessed) {
    for (const p of room.players.values()) {
      if (p.guessed || p.id === room.drawerId) {
        io.to(p.id).emit('chat', { kind: 'secret', name: player.name, avatar: player.avatar, text });
      }
    }
    return;
  }
  io.to(room.code).emit('chat', { kind: 'chat', name: player.name, avatar: player.avatar, text });
  if (answer.length >= 4 && distance(guess, answer) === 1) {
    io.to(player.id).emit('chat', { kind: 'close', text: `"${text}" is so close!` });
  }
}

// ---------- socket events ----------

io.on('connection', (socket) => {
  let room = null;

  const join = (code, { name, avatar }) => {
    room = rooms.get(code);
    const player = {
      id: socket.id,
      name: String(name || 'Player').trim().slice(0, 16) || 'Player',
      avatar: String(avatar || '🐱').slice(0, 4),
      score: 0,
      guessed: false,
    };
    room.players.set(socket.id, player);
    room.order.push(socket.id);
    socket.join(code);
    system(room, `👋 ${player.name} joined`);
    emitState(room);
  };

  socket.on('room:create', (profile, ack) => {
    const code = makeCode();
    rooms.set(code, {
      code,
      hostId: socket.id,
      players: new Map(),
      order: [],
      settings: { ...DEFAULT_SETTINGS },
      phase: 'lobby',
      round: 0,
      strokes: [],
      revealed: new Set(),
      usedWords: new Set(),
      queue: [],
      timer: null,
    });
    join(code, profile);
    ack && ack({ ok: true, code });
  });

  socket.on('room:join', ({ code, ...profile }, ack) => {
    code = String(code || '').toUpperCase().trim();
    const target = rooms.get(code);
    if (!target) return ack && ack({ ok: false, error: 'No game with that code.' });
    if (target.players.size >= MAX_PLAYERS) return ack && ack({ ok: false, error: 'That game is full.' });
    join(code, profile);
    ack && ack({ ok: true, code });
  });

  socket.on('settings', (input) => {
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby') return;
    room.settings = sanitizeSettings(input || {}, room.settings);
    emitState(room);
  });

  socket.on('game:start', () => {
    if (!room || room.hostId !== socket.id) return;
    if (room.players.size < 2) return socket.emit('chat', { kind: 'close', text: 'You need at least 2 players.' });
    if (room.phase === 'lobby' || room.phase === 'over') startGame(room);
  });

  socket.on('game:lobby', () => {
    if (!room || room.hostId !== socket.id || room.phase !== 'over') return;
    room.phase = 'lobby';
    room.round = 0;
    emitState(room);
  });

  socket.on('word:choose', (word) => {
    if (room && room.drawerId === socket.id) chooseWord(room, word);
  });

  socket.on('guess', (text) => {
    if (!room) return;
    const player = room.players.get(socket.id);
    text = String(text || '').trim().slice(0, 60);
    if (!player || !text) return;
    if (room.phase === 'drawing' && socket.id !== room.drawerId) return handleGuess(room, player, text);
    if (room.phase !== 'drawing') {
      io.to(room.code).emit('chat', { kind: 'chat', name: player.name, avatar: player.avatar, text });
    }
  });

  // Drawing: only the current drawer may draw. Strokes are stored so that
  // undo and late joiners can replay the whole picture.
  const canDraw = () => room && room.phase === 'drawing' && room.drawerId === socket.id;

  socket.on('stroke:start', (stroke) => {
    if (!canDraw() || !stroke) return;
    const s = { id: String(stroke.id), color: String(stroke.color), size: Number(stroke.size) || 6, pts: stroke.pts || [] };
    room.strokes.push(s);
    socket.to(room.code).emit('stroke:start', s);
  });

  socket.on('stroke:move', ({ id, pts } = {}) => {
    if (!canDraw() || !Array.isArray(pts)) return;
    const s = room.strokes.find((st) => st.id === id);
    if (!s) return;
    s.pts.push(...pts);
    socket.to(room.code).emit('stroke:move', { id, pts });
  });

  // A board that just appeared on screen asks for the picture so far.
  socket.on('canvas:request', () => room && socket.emit('canvas:sync', room.strokes));

  socket.on('canvas:undo', () => {
    if (!canDraw()) return;
    room.strokes.pop();
    io.to(room.code).emit('canvas:sync', room.strokes);
  });

  socket.on('canvas:clear', () => {
    if (!canDraw()) return;
    room.strokes = [];
    io.to(room.code).emit('canvas:sync', []);
  });

  socket.on('disconnect', () => {
    if (!room) return;
    const player = room.players.get(socket.id);
    room.players.delete(socket.id);
    room.order = room.order.filter((id) => id !== socket.id);
    if (!room.players.size) {
      clearTimer(room);
      rooms.delete(room.code);
      return;
    }
    if (room.hostId === socket.id) room.hostId = room.order[0];
    system(room, `🚪 ${player.name} left`);

    const playing = ['choosing', 'drawing', 'reveal'].includes(room.phase);
    if (playing && room.players.size < 2) {
      clearTimer(room);
      room.phase = 'lobby';
      room.drawerId = null;
      room.word = null;
      system(room, 'Not enough players — back to the lobby.');
    } else if (room.drawerId === socket.id && room.phase === 'choosing') {
      return nextTurn(room);
    } else if (room.drawerId === socket.id && room.phase === 'drawing') {
      return endTurn(room, '✋ The artist left.');
    }
    emitState(room);
  });
});

server.listen(PORT, () => console.log(`🎨 Doodle Dash server running on http://localhost:${PORT}`));
