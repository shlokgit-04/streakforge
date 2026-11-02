# StreakForge

An offline-first DSA streak companion PWA, built for **Next Byte Hacks V5**.

**The problem it solves:** consistency is the hard part of LeetCode practice. StreakForge removes the three excuses: it picks today's problem (rotating topic), shows the streak on a GitHub-style heat grid, and uses spaced repetition (3 → 7 → 14 → 30 days) to resurface solved problems before they fade.

- **Live app:** https://shlokgit-04.github.io/streakforge/
- **Repo:** this one. No backend, no accounts, no API keys.
- **Privacy:** all data (solves, streak, revision schedule) lives in the browser's localStorage and never leaves the device.
- **Installable:** it is a PWA with a service worker and manifest, so it works offline and installs like an app.

## Stack
Vanilla HTML/CSS/JavaScript. 64-problem curated bank across 9 topics (arrays, strings, hashing, two pointers, stack, binary search, trees, dynamic programming, graphs), each linking to the real LeetCode problem.

## Features
1. **Daily plan** — the topic rotates daily; a shuffle button rerolls it. Solved problems are marked with one tap.
2. **Streak + heat grid** — 15 weeks of activity, four intensity levels, tooltip per day.
3. **Revision queue** — solved problems resurface after 3, then 7, then 14 days; reviewing pushes the next due date out.
4. **Problem bank browser** — filter by topic and difficulty, search by title.
5. **Offline + installable** — service worker caches the shell.

## Run locally
Open `index.html` in any browser, or serve the folder (`python3 -m http.server`) so the service worker registers.
