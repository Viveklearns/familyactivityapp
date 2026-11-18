# Family Fun

Two tabs in one React app:

- **🗺️ Activity Finder**: find weekend activities for your family (Milestone 1, dummy data).
- **🎨 Doodle Dash**: a multiplayer draw-and-guess game for kids and families.

## Run it locally

```bash
yarn install
yarn server   # game server on http://localhost:4000
yarn start    # React app on http://localhost:3000 (second terminal)
```

To run it the way it would be deployed, as one server serving everything on port 4000:

```bash
yarn serve
```

To play from other devices on the same Wi-Fi, open `http://<your-computer-ip>:3000`, or port 4000 with `yarn serve`.

## Doodle Dash

1. One person creates a game and shares the 4-letter code or the invite link.
2. Each turn one player picks a word and draws it. Everyone else types guesses.
3. Faster guesses score more points. The artist earns points for each correct guess.

**Host settings**

| Setting | Options |
| --- | --- |
| Word pack by age | Little Kids (3–5), Kids (6–8), Big Kids (9–12), Teens & Adults (13+). Pick several to mix ages. |
| Rounds | 1–8 |
| Word choices | 1–4 words offered to the artist |
| Drawing time | 30–120 seconds |
| Letter hints | Reveals letters during the second half of each turn |
| Your own words | Add family words like "Grandma" or "our dog Biscuit". Optionally use only these. |

**How it works**

```
 Browser (React)  ──socket.io──►  server/index.js  (the referee)
   Board.js: canvas + tools          • rooms, players, scores
   DoodleGame.js: screens            • secret word, timer, hints
                                     • checks guesses, relays strokes
```

- `server/words.js` holds the age-based word lists.
- The secret word only goes to the artist. Guesses are checked on the server.
- Drawings travel as small lists of 0–1 coordinates, so every screen size shows the same picture.
