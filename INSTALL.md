# Install Glide for Reddit (2 minutes, once)

Works in Chrome, Brave, Edge and Opera on Windows, Mac and Linux. Not on phones.

## 1. Add Tampermonkey

Open the [Tampermonkey page in the Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) and click **Add to Chrome** (in Brave and Edge the button says the same or "Get").

## 2. Allow it to run scripts

Your browser blocks userscripts until you switch this on. One time only:

1. Copy this into the address bar and press Enter:
   - Chrome / Opera: `chrome://extensions`
   - Brave: `brave://extensions`
   - Edge: `edge://extensions`
2. Find **Tampermonkey** and click **Details**.
3. Turn on **Allow User Scripts**.

Don't see that switch? Turn on **Developer mode** (top right of the same page) instead.

## 3. Install Glide

Click **[Install Glide for Reddit](https://raw.githubusercontent.com/Bensindunk123/glide-for-reddit/main/dist/glide-for-reddit.user.js)**. Tampermonkey opens a page: click **Install**.

Done. Updates install themselves.

## How to use it

- **Scrolling Reddit:** open reddit.com, **click once anywhere on the page**, then scroll. The clip in view plays with sound, the one you scrolled past stops.
- **Fullscreen:** go to any subreddit, search or profile and click the orange **Fullscreen** button (bottom right). A new tab opens: click **Start**.

| Key | Does |
|-----|------|
| `Space` | pause / play |
| `←` `→` or mouse wheel | previous / next |
| `+` `-` | faster / slower auto-advance |
| `m` | sound on / off |
| `Esc` | leave fullscreen |

## Something not working?

- **No sound while scrolling:** click the icon to the left of the address bar on reddit.com, open **Site settings**, set **Sound** (and **Autoplay** if you see it) to **Allow**. Do the same on redgifs.com. Reload the page.
- **No orange button:** check that Tampermonkey is switched on and that **Allow User Scripts** (step 2) is on, then reload Reddit.
- **Fullscreen tab says it can't load:** reload the Reddit page and click the button again. Being logged in to Reddit helps.
- Still stuck? Open an issue: https://github.com/Bensindunk123/glide-for-reddit/issues
