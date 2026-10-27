# 🚀 Galactic Space Shooter

A fast-paced top-down sci-fi space shooter web game built with pure vanilla JavaScript, HTML5 Canvas, and the Web Audio API. Pilot your fighter craft across deep cosmos sectors, blast through rotating asteroid belts, engage armed enemy cruisers, trigger screen-clearing EMP bombs, and defeat alien mothership flagships.

Part of the [Gamility](https://mahesh-yennam.github.io/Gamility/) web games collection. Fully configured to run as an **independent standalone repository** or embedded directly within the Gamility portal.

---

## 📁 Repository Structure

```text
galactic-space-shooter/
├── index.html        # Game markup, HUD, overlays, touch controls & Schema.org JSON-LD
├── style.css         # Responsive sci-fi space styling & mobile touch controls
├── game.js           # 60FPS Canvas engine, synthesized Web Audio SFX & local high score
├── favicon.svg       # Dedicated starfighter vector SVG favicon
├── site.webmanifest  # Progressive Web App (PWA) manifest for mobile install
├── robots.txt        # Search engine crawler configuration
├── sitemap.xml       # Standalone XML sitemap
├── .gitignore        # Standard web gitignore
└── README.md         # Documentation & deployment guide
```

---

## 🎮 How to Play

- **Objective:** Survive as long as possible across cosmic sectors, destroy hostile alien invaders and asteroid belts, and rack up the highest score.
- **Desktop Controls:**
  - `Arrow Keys` or `WASD`: Steer Starship (X and Y axes)
  - `Spacebar`: Fire Dual Lasers (Auto-fire enabled by default)
  - **Mouse / Trackpad:** Hover and drag your cursor across the canvas for fluid precision flight
  - `P`: Pause / Resume
- **Mobile Controls:**
  - On-Screen **D-Pad** (`▲`, `▼`, `◀`, `▶`) + `BLASTER` button
  - Or simply drag your finger anywhere across the screen to glide the starship

### ⚡ Power-Ups & Arsenal

| Item | Symbol | Effect |
| :--- | :---: | :--- |
| **Triple Blaster** | ⚡ | Upgrades primary laser cannons to 3-way spread plasma for 8 seconds. |
| **Force Shield** | 🛡️ | Deploys an energy barrier that absorbs 1 collision or enemy projectile. |
| **EMP Shockwave** | 💣 | Screen-wide bomb that obliterates all standard targets instantly. |
| **Hull Repair** | 🔧 | Restores +1 starship hull integrity point (up to 5 maximum). |

### 👾 Enemy Units

| Target | Description | Points |
| :--- | :--- | :--- |
| **Scout Drone** | Agile light fighters that dive in swift zig-zag arcs. | +50 Pts |
| **Armored Asteroid** | Rotating space boulders that shatter into dust upon laser impact. | +30 Pts |
| **Heavy Cruiser** | Armored gunships with dual cannons that fire red plasma bolts downward. | +150 Pts |
| **Alien Mothership** | Massive sector boss with high durability and multi-laser volleys. | +800 Pts |

---

## ✨ Features

- **Pure Vanilla Web Tech:** Zero dependencies, zero external libraries, zero build steps.
- **Hardware-Accelerated Canvas:** Smooth 60 FPS rendering with 3-layer parallax starfields, engine particle trails, and screen-shake physics.
- **Synthesized Web Audio:** Authentic arcade laser blasts, explosive rumbles, powerup chimes, and alarms generated via Web Audio API oscillators — 100% self-contained with no external `.mp3` files needed.
- **SEO & PWA Ready:** Includes dedicated `favicon.svg`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, and Google-recognized `VideoGame` Schema.org structured data.
- **Persistent High Scores:** Automatically saves your personal best score in `localStorage`.
- **Fully Responsive:** Adapts cleanly to desktop monitors, tablets, and mobile screens with custom on-screen touch controls.

---

## 💻 Local Development

Run with any local static HTTP server or simply double-click `index.html`:

```bash
# Using Python
python -m http.server 8080

# Using Node.js npx
npx serve .
```

Then visit `http://localhost:8080` in your web browser.

---

## 📄 Copyright & Terms

Copyright © 2026 Gamility. All rights reserved.
This repository and its source code are proprietary. Unauthorized copying, distribution, or commercial reuse without explicit permission is strictly prohibited.
