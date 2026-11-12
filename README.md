# Glide for Reddit

Reddit video with sound, without the clicking.

- **Scroll the feed:** the clip in view plays **with sound**, the previous one pauses. Works for Reddit's own videos and embedded RedGifs.
- **Fullscreen player:** a **Fullscreen** button on Reddit turns the subreddit, search or profile you are looking at into a fullscreen player. It advances by itself, or you scroll / use the arrow keys.

One userscript, desktop browsers (Windows, Mac, Linux). Free, open source (MIT).

## Install (about a minute, once)

Step-by-step with troubleshooting: **[INSTALL.md](INSTALL.md)**

### Chrome, Brave, Edge, Opera

1. Install **Tampermonkey** from the [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
2. Let it run scripts (browsers ask for this since 2025):
   open `chrome://extensions` (Brave: `brave://extensions`, Edge: `edge://extensions`), click **Details** on Tampermonkey and turn on **Allow User Scripts**.
   If your browser has no such switch, turn on **Developer mode** (top right) instead.
3. Click **[Install Glide for Reddit](https://raw.githubusercontent.com/Bensindunk123/glide-for-reddit/main/dist/glide-for-reddit.user.js)**, then **Install** in Tampermonkey.

### Firefox

Install [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/) or [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/), then step 3 above.

Updates install themselves.

## Use

- **Feed:** open reddit.com and scroll. **Click once anywhere on the page** to allow sound (browsers block sound until you interact with a page). If clips still stay muted, allow sound for the site: click the icon left of the address, **Site settings**, set **Sound** (and **Autoplay**, if listed) to **Allow** for `www.reddit.com` and `www.redgifs.com`.
- **Fullscreen:** on a subreddit, a search or a profile, click the orange **Fullscreen** button (bottom right, drag the dots to move it). Click **Start** in the new tab.
  - `Space` pause, `←` `→` previous / next, mouse wheel next / previous, `+` `-` speed, `m` sound, `c` controls, `Esc` leaves fullscreen.
  - The menu at the top left switches source; logged in you also get Home, Saved, Upvoted and your custom feeds.

## Privacy

Everything runs in your browser. The script reads Reddit with your own session and passes the posts to the player tab with `postMessage`; the player fetches RedGifs files from RedGifs' public API. Nothing is collected, stored on a server or sent anywhere else.

## Build from source

```
node build.mjs     # writes dist/glide-for-reddit.user.js and docs/ (the player, served by GitHub Pages)
node --test        # unit tests
```

## Credits

The fullscreen player is based on [Reddirama](https://github.com/Zaaphod42/reddirama) (MIT) by Zaaphod42, extended with RedGifs sound, search as a source, a start screen and mouse-wheel navigation.
