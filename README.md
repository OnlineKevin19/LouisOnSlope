# Roly Roll 🟣

A friendly rolling game for the whole family. Steer Roly down a floating track, hop over
gaps and blocks, and collect stars. Plain HTML, CSS and JavaScript — no build step, no
dependencies, works on phones, tablets and computers.

## What's inside

- **🍼 Tiny Tots** — a no-lose mode for toddlers. Roly can't fall off, blocks just bounce,
  and any key other than the steering keys makes it hop.
- **♾️ Endless Roll** — go as far as you can. Three speeds: Chill, Normal, Wild.
- **⏱️ Star Rush** — grab as many stars as possible in 60 seconds.
- **🗺️ Level Trek** — 12 levels, each with 3 stars to earn.
- **🎯 Daily missions**, **🎨 8 unlockable skins**, **🏆 a family leaderboard**, and
  power-ups (shield, magnet, slow-mo, double stars, hearts).

Scores, stars and skins are saved in the browser on each device (localStorage).

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer | ◀ ▶ or A / D | Hold the left or right side of the screen, or the arrow buttons |
| Hop | Space, ↑ or W | HOP button, or tap the middle of the screen |
| Pause | Esc or P | ⏸ button |

## Run it locally

Open `index.html` in a browser. That's it.

## Publish to GitHub

1. Create a new empty repository at <https://github.com/new> (no README, no .gitignore).
2. In this folder, run (replace `YOUR-NAME` and `YOUR-REPO`):

   ```bash
   git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
   git push -u origin main
   ```

Optional free preview: in the repo go to **Settings → Pages**, choose **Deploy from a
branch**, branch `main`, folder `/ (root)`.

## Host on Hostinger

**Option A — File Manager (simplest)**

1. hPanel → **Websites → Manage → File Manager**.
2. Open `public_html` and remove the default placeholder page if there is one.
3. Upload `index.html`, `style.css` and `game.js` into `public_html`.
4. Visit your domain.

**Option B — deploy from GitHub**

1. hPanel → **Websites → Manage → Advanced → Git**.
2. Repository: your GitHub repo URL, branch `main`, install path empty (= `public_html`,
   which must be empty first).
3. Click **Create**, then **Deploy**. Turn on **Auto deployment** and add the webhook URL
   it shows to GitHub (**Settings → Webhooks**) so every push updates the site.

To put the game in a subfolder instead (for example `yourdomain.com/roly`), upload the
three files into `public_html/roly`.

## Files

- `index.html` — page and menus
- `style.css` — look and layout
- `game.js` — the whole game
