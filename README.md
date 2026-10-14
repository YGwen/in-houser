# In-Houser

Balanced 5v5 team generator for League of Legends in-house games between friends, with a Street Fighter–style VS reveal.

- Rank players from ★ to ★★★★★; teams are balanced on total stars, with a "variety" slider so you don't always get the same teams.
- Lock new players to one role; everyone else gets a random role.
- Duels: two players who accept a challenge face each other in the same lane on opposite teams (one game only).
- Role rotation: games you play ("✓ We play this") are remembered for the evening, so people don't get the same role or teammates again.
- Import/export the roster as `players.yaml`.
- VS reveal with chiptune music, sound effects and a voice announcer.

Everything runs in the browser (data is saved in localStorage); no backend.

## Run it

Requires Node.js 18+.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # team generator tests
npm run build    # static site in dist/
```

## Deploy

Every push to `main` runs the tests, builds the app and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`): https://ygwen.github.io/in-houser/

## Dependency updates

Dependabot (`.github/dependabot.yml`) opens weekly update PRs. Every PR is tested
(`.github/workflows/pr.yml`); patch/minor npm updates are merged automatically and the site redeployed.
Major updates and GitHub Actions updates wait for a review.

## Announcer voice

The announcer plays clips from `public/voice/`, generated locally with [Piper](https://github.com/OHF-Voice/piper1-gpl).
Players without a clip fall back to the browser's text-to-speech.

One-time setup (Python 3):

```bash
python -m venv .venv-voice
.venv-voice/Scripts/python -m pip install piper-tts
.venv-voice/Scripts/python -m piper.download_voices --download-dir .venv-voice/voices en_US-ryan-high
```

Then export `players.yaml` from the app into the project root and run:

```bash
npm run voice
```

Only missing or changed clips are generated, so voices you already like stay the same
(`npm run voice -- --all` regenerates everything).
Add `say: "..."` to a player in `players.yaml` to fix how their name is pronounced.
