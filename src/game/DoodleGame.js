import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Board from './Board';
import './DoodleGame.css';

// In development the React app runs on port 3000 and the game server runs on 4000.
// In production the server serves the app itself, so it connects to the same origin.
const SERVER_URL =
  process.env.REACT_APP_GAME_SERVER ||
  (window.location.port === '3000' ? `${window.location.protocol}//${window.location.hostname}:4000` : undefined);

const AVATARS = ['🐱', '🐶', '🦊', '🐼', '🐸', '🦁', '🐵', '🐰', '🐯', '🐨', '🦄', '🐙'];
const DRAW_TIMES = [30, 45, 60, 80, 100, 120];

export default function DoodleGame() {
  const socket = useMemo(() => io(SERVER_URL, { autoConnect: false }), []);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.connect();
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => {
      setConnected(false);
      setState(null); // the server forgets us when we disconnect
    });
    socket.on('state', setState);
    socket.on('chat', (m) => setMessages((prev) => [...prev.slice(-80), { ...m, key: Math.random() }]));
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket]);

  if (!state) return <Home socket={socket} connected={connected} />;
  if (state.phase === 'lobby') return <Lobby socket={socket} state={state} messages={messages} />;
  return <Play socket={socket} state={state} messages={messages} />;
}

// ---------------- Home: pick a name & avatar, create or join ----------------

function Home({ socket, connected }) {
  const params = new URLSearchParams(window.location.search);
  const [name, setName] = useState(() => localStorage.getItem('dd-name') || '');
  const [avatar, setAvatar] = useState(() => localStorage.getItem('dd-avatar') || AVATARS[0]);
  const [code, setCode] = useState(params.get('room') || '');
  const [error, setError] = useState('');

  const profile = () => {
    localStorage.setItem('dd-name', name);
    localStorage.setItem('dd-avatar', avatar);
    return { name: name.trim() || 'Player', avatar };
  };
  const handle = (res) => !res.ok && setError(res.error);

  return (
    <div className="dd-card dd-home">
      <h2>🎨 Doodle Dash</h2>
      <p className="dd-sub">Draw it. Guess it. Giggle a lot.</p>

      <label className="dd-label">Your name</label>
      <input
        className="dd-input"
        value={name}
        maxLength={16}
        placeholder="e.g., Maya"
        onChange={(e) => setName(e.target.value)}
      />

      <label className="dd-label">Pick a buddy</label>
      <div className="dd-avatars">
        {AVATARS.map((a) => (
          <button key={a} className={`dd-avatar ${a === avatar ? 'active' : ''}`} onClick={() => setAvatar(a)}>
            {a}
          </button>
        ))}
      </div>

      <button className="dd-btn primary" disabled={!connected} onClick={() => socket.emit('room:create', profile(), handle)}>
        ✨ Create a new game
      </button>

      <div className="dd-divider">or join a friend</div>
      <div className="dd-join">
        <input
          className="dd-input code"
          value={code}
          maxLength={4}
          placeholder="CODE"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button
          className="dd-btn"
          disabled={!connected || code.length !== 4}
          onClick={() => socket.emit('room:join', { code, ...profile() }, handle)}
        >
          Join
        </button>
      </div>
      {error && <p className="dd-error">{error}</p>}
      {!connected && <p className="dd-muted">Connecting to the game server…</p>}
    </div>
  );
}

// ---------------- Lobby: players + game settings ----------------

function Lobby({ socket, state, messages }) {
  const isHost = state.you === state.hostId;
  const s = state.settings;
  const set = (patch) => socket.emit('settings', patch);
  const [wordsText, setWordsText] = useState(s.customWords.join(', '));
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${state.code}`;

  // Typing custom words is saved after a short pause, so we don't send one
  // message to the server for every letter typed.
  useEffect(() => {
    if (!isHost) return;
    const t = setTimeout(() => {
      const list = wordsText.split(/[,\n]/).map((w) => w.trim()).filter(Boolean);
      if (list.join('|') !== s.customWords.join('|')) set({ customWords: list });
    }, 500);
    return () => clearTimeout(t);
  }, [wordsText]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGroup = (id) => {
    const next = s.ageGroups.includes(id) ? s.ageGroups.filter((g) => g !== id) : [...s.ageGroups, id];
    if (next.length) set({ ageGroups: next });
  };

  const copy = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="dd-lobby">
      <div className="dd-card">
        <div className="dd-room-code">
          <span className="dd-muted">Room code</span>
          <strong>{state.code}</strong>
          <button className="dd-btn small" onClick={copy}>
            {copied ? '✓ Copied' : '🔗 Copy invite link'}
          </button>
        </div>
        <h3>Players ({state.players.length})</h3>
        <ul className="dd-player-grid">
          {state.players.map((p) => (
            <li key={p.id}>
              <span className="dd-big-avatar">{p.avatar}</span>
              <span>
                {p.name}
                {p.id === state.hostId && ' 👑'}
                {p.id === state.you && <em className="dd-muted"> (you)</em>}
              </span>
            </li>
          ))}
        </ul>
        {state.players.length < 2 && <p className="dd-muted">Waiting for at least one more player…</p>}
        <Chat socket={socket} messages={messages} placeholder="Say hi 👋" />
      </div>

      <div className="dd-card">
        <h3>Game settings {!isHost && <span className="dd-muted">· host decides</span>}</h3>

        <label className="dd-label">Word pack by age</label>
        <div className="dd-chips">
          {state.wordGroups.map((g) => (
            <button
              key={g.id}
              disabled={!isHost}
              className={`dd-chip ${s.ageGroups.includes(g.id) ? 'active' : ''}`}
              onClick={() => toggleGroup(g.id)}
            >
              {g.emoji} {g.label} <small>{g.ages}</small>
            </button>
          ))}
        </div>

        <div className="dd-settings-row">
          <Stepper label="Rounds" value={s.rounds} min={1} max={8} disabled={!isHost} onChange={(v) => set({ rounds: v })} />
          <Stepper
            label="Word choices"
            value={s.wordChoices}
            min={1}
            max={4}
            disabled={!isHost}
            onChange={(v) => set({ wordChoices: v })}
          />
        </div>

        <label className="dd-label">Drawing time</label>
        <div className="dd-chips">
          {DRAW_TIMES.map((t) => (
            <button
              key={t}
              disabled={!isHost}
              className={`dd-chip ${s.drawTime === t ? 'active' : ''}`}
              onClick={() => set({ drawTime: t })}
            >
              {t}s
            </button>
          ))}
        </div>

        <Toggle label="💡 Letter hints" checked={s.hints} disabled={!isHost} onChange={(v) => set({ hints: v })} />

        <label className="dd-label">Your own words (comma separated)</label>
        <textarea
          className="dd-input"
          rows={3}
          disabled={!isHost}
          value={isHost ? wordsText : s.customWords.join(', ')}
          placeholder="e.g., Grandma, our dog Biscuit, taco Tuesday"
          onChange={(e) => setWordsText(e.target.value)}
        />
        <Toggle
          label={`Use only my words (${s.customWords.length} added)`}
          checked={s.customOnly}
          disabled={!isHost || s.customWords.length < s.wordChoices}
          onChange={(v) => set({ customOnly: v })}
        />

        {isHost ? (
          <button className="dd-btn primary" disabled={state.players.length < 2} onClick={() => socket.emit('game:start')}>
            🚀 Start game
          </button>
        ) : (
          <p className="dd-muted center">Waiting for the host to start…</p>
        )}
      </div>
    </div>
  );
}

function Stepper({ label, value, min, max, disabled, onChange }) {
  return (
    <div className="dd-stepper">
      <span className="dd-label">{label}</span>
      <div>
        <button disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>−</button>
        <strong>{value}</strong>
        <button disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}

function Toggle({ label, checked, disabled, onChange }) {
  return (
    <label className={`dd-toggle ${disabled ? 'disabled' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="dd-switch" />
      {label}
    </label>
  );
}

// ---------------- Play: board, scores, chat & overlays ----------------

function Play({ socket, state, messages }) {
  const me = state.players.find((p) => p.id === state.you);
  const drawer = state.players.find((p) => p.id === state.drawerId);
  const isDrawer = state.you === state.drawerId;
  const ranked = [...state.players].sort((a, b) => b.score - a.score);

  let banner;
  if (state.phase === 'drawing' && isDrawer) banner = <span>Draw: <strong className="dd-word">{state.word}</strong></span>;
  else if (state.phase === 'drawing' && me?.guessed) banner = <span>✅ You got it!</span>;
  else if (state.phase === 'drawing') banner = <Hint hint={state.hint} />;
  else if (state.phase === 'choosing') banner = <span>{isDrawer ? 'Pick a word!' : `${drawer?.name} is choosing a word…`}</span>;
  else if (state.phase === 'reveal') banner = <span>The word was <strong className="dd-word">{state.word}</strong></span>;

  return (
    <div className="dd-play">
      <div className="dd-card dd-topbar">
        <span className="dd-pill">Round {Math.min(state.round, state.settings.rounds)}/{state.settings.rounds}</span>
        <div className="dd-banner">{banner}</div>
        {['choosing', 'drawing'].includes(state.phase) && (
          <span className={`dd-timer ${state.timeLeft <= 10 ? 'low' : ''}`}>⏱ {state.timeLeft}</span>
        )}
      </div>

      <div className="dd-card dd-scores">
        {ranked.map((p, i) => (
          <div key={p.id} className={`dd-score ${p.guessed ? 'guessed' : ''} ${p.id === state.drawerId ? 'drawing' : ''}`}>
            <span className="dd-rank">#{i + 1}</span>
            <span className="dd-big-avatar">{p.avatar}</span>
            <span className="dd-score-name">
              {p.name}
              {p.id === state.you && ' (you)'}
              <small>{p.score} pts</small>
            </span>
            {p.id === state.drawerId && <span title="Drawing">✏️</span>}
          </div>
        ))}
      </div>

      <div className="dd-stage">
        <Board socket={socket} canDraw={isDrawer && state.phase === 'drawing'} />

        {state.phase === 'choosing' && isDrawer && (
          <div className="dd-overlay">
            <h3>Choose a word to draw</h3>
            <div className="dd-choices">
              {state.choices.map((w) => (
                <button key={w} className="dd-btn primary" onClick={() => socket.emit('word:choose', w)}>
                  {w}
                </button>
              ))}
            </div>
          </div>
        )}
        {state.phase === 'reveal' && state.lastTurn && (
          <div className="dd-overlay soft">
            <h3>{state.lastTurn.reason}</h3>
            <p>
              The word was <strong className="dd-word">{state.lastTurn.word}</strong>
            </p>
          </div>
        )}
        {state.phase === 'over' && <GameOver socket={socket} state={state} ranked={ranked} />}
      </div>

      <div className="dd-card dd-chat-card">
        <Chat
          socket={socket}
          messages={messages}
          disabled={isDrawer && state.phase === 'drawing'}
          placeholder={isDrawer && state.phase === 'drawing' ? "You're drawing! 🤫" : 'Type your guess…'}
        />
      </div>
    </div>
  );
}

function Hint({ hint }) {
  return (
    <span className="dd-hint" aria-label={`${hint.filter((c) => c !== ' ').length} letters`}>
      {hint.map((c, i) => (
        <span key={i} className={c === ' ' ? 'space' : 'letter'}>
          {c === ' ' ? '' : c || ''}
        </span>
      ))}
      <small>{hint.filter((c) => c !== ' ').length}</small>
    </span>
  );
}

function GameOver({ socket, state, ranked }) {
  const isHost = state.you === state.hostId;
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="dd-overlay">
      <h3>🏆 Great game!</h3>
      <ol className="dd-podium">
        {ranked.slice(0, 3).map((p, i) => (
          <li key={p.id}>
            <span>{medals[i]}</span>
            <span className="dd-big-avatar">{p.avatar}</span>
            <strong>{p.name}</strong>
            <small>{p.score} pts</small>
          </li>
        ))}
      </ol>
      {isHost ? (
        <div className="dd-choices">
          <button className="dd-btn primary" onClick={() => socket.emit('game:start')}>🔁 Play again</button>
          <button className="dd-btn" onClick={() => socket.emit('game:lobby')}>⚙️ Change settings</button>
        </div>
      ) : (
        <p>Waiting for the host…</p>
      )}
    </div>
  );
}

function Chat({ socket, messages, disabled, placeholder }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    socket.emit('guess', text);
    setText('');
  };

  return (
    <div className="dd-chat">
      <ul ref={listRef}>
        {messages.map((m) => (
          <li key={m.key} className={`dd-msg ${m.kind}`}>
            {m.name ? (
              <>
                <b>
                  {m.avatar} {m.name}:
                </b>{' '}
                {m.text}
              </>
            ) : (
              m.text
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={send}>
        <input
          className="dd-input"
          value={text}
          maxLength={60}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
        />
      </form>
    </div>
  );
}
