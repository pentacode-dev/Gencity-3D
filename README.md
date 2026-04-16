

# Gencity 3D — Intelligent City Planning Platform

**Team Pentacode** | A first-year engineering project by five students who wanted to build something that actually looked cool.

Gencity 3D is a browser-based platform that generates and visualises entire cities using procedural generation, graph algorithms, and 3D rendering. The main feature — **Procity** — builds full road networks, city blocks, and a walkable 3D environment right in your browser, no installation needed.

We built this for our semester project. It's not perfect, but we're genuinely proud of it.

---

## Features

- **Procity 3D City Generator** — Generates a new city procedurally every time. You can walk around in first-person mode.
- **4 Camera Modes** — First Person, Bird Eye, Isometric, Top Down
- **4 Visual Themes** — Cyberpunk, Noir, Soviet, Arctic
- **Animated Particle System** — The background canvas has moving particles (took longer than expected to get right)
- **Custom Cursor** — Small detail but it makes the site feel more alive
- **Scroll Animations** — Elements animate in as you scroll down the page
- **Stat Counters** — Numbers count up when they come into view
- **Contact Form** — Basic client-side form handler
- **Fully Responsive** — Works on mobile too, though first-person mode is best on desktop

---

## Folder Structure

```
gencity-3d/
│
├── index.html              # Main HTML file — all pages are in here
│
├── css/
│   ├── styles.css          # Global styles: reset, variables, layout, components
│   └── procity.css         # Styles specific to the Procity module
│
├── js/
│   ├── main.js             # Core app logic: routing, cursor, particles, counters
│   └── procity.js          # The city engine: p5.js generation + Three.js 3D scene
│
├── images/                 # Screenshots and other images go here
│   └── .gitkeep
│
├── assets/
│   └── fonts/              # Reserved for self-hosted fonts later
│       └── .gitkeep
│
└── README.md               # This file
```

---

## How to Run

### Option 1 — Just open the file (simplest)
1. Download or clone the repo
2. Open `index.html` in Chrome, Firefox, Edge, or Safari

> Note: Some browsers block local file access. If Procity doesn't load, use Option 2.

### Option 2 — Local server (recommended)

**VS Code Live Server:**
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `index.html` and choose "Open with Live Server"

**Python (if you have it installed):**
```bash
python -m http.server 8080
# Then open http://localhost:8080 in your browser
```

**Node.js:**
```bash
npx serve .
```

---

## Procity Controls

| Key / Action | What it does |
|---|---|
| WASD / Arrow Keys | Move around (First Person mode) |
| Mouse | Look around — click the canvas to start |
| Shift | Sprint |
| M | Toggle the minimap |
| R | Generate a completely new city |
| 1 | Switch to First Person view |
| 2 | Switch to Bird Eye view |
| 3 | Switch to Isometric view |
| 4 | Switch to Top Down view |
| Scroll | Zoom in/out (Bird Eye and Isometric) |
| Drag | Orbit the camera (Bird Eye) |

---

## Tech Stack

| Layer | What we used |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (Custom Properties, Grid, Flexbox, Animations) |
| Logic | Vanilla JavaScript (ES6+) |
| 3D Rendering | Three.js r128 |
| 2D Generation | p5.js 1.9.0 |
| Polygon Clipping | Clipper.js 6.4.2 |
| Fonts | Google Fonts (Rajdhani, Cormorant Garamond, DM Sans, Share Tech Mono) |

We intentionally kept it dependency-light. No React, no build tools, no bundler. It runs straight from the HTML file.

---

## Naming Conventions

We tried to keep the code readable for everyone on the team, including people who don't normally do frontend.

| Type | Convention | Example |
|---|---|---|
| Folders | lowercase, hyphenated | `css/`, `js/`, `images/` |
| HTML files | lowercase, hyphenated | `index.html` |
| CSS files | lowercase, hyphenated | `styles.css`, `procity.css` |
| JS files | lowercase, hyphenated | `main.js`, `procity.js` |
| CSS classes | BEM-inspired, kebab-case | `.feat-card`, `.hero-title` |
| JS variables | camelCase | `bgCanvas`, `initObservers` |
| Procity internals | `pc_` prefix | `pc_scene`, `pc_camera` |
| CSS variables | `--` prefix | `--blue-1`, `--void` |

The `pc_` prefix on Procity variables was something we added after running into a naming conflict early on. Lesson learned.

---

## Pushing to GitHub

```bash
# First time setup
git init
git add .
git commit -m "feat: initial project structure — Gencity 3D by Team Pentacode"
git remote add origin https://github.com/YOUR_USERNAME/gencity-3d.git
git branch -M main
git push -u origin main
```

```bash
# After making changes
git add .
git commit -m "feat: describe what you changed"
git push
```

If you're working on something big, use a feature branch:
```bash
git checkout -b feature/procity-minimap
# make your changes
git checkout main
git merge feature/procity-minimap
git push
```

---

## Adding to the Project

A few notes for anyone who wants to extend this later:

- To add a new page, create a `<div class="page" id="page-yourname">` and add a nav link with `data-page="yourname"`. The router in `main.js` handles the rest.
- New CSS sections go in their own file (e.g. `css/blog.css`) and get linked in `<head>`.
- New JS modules go in `js/` and should be loaded before `</body>`.
- Images go in `/images/` — use descriptive filenames like `procity-screenshot.png`.

---

## Team

| Name | Role |
|---|---|
| Irfan ul Haq | Frontend Developer |
| Harshini | Frontend Developer |
| Sahana | Backend Developer |
| Jayachandra Sai | Algorithm Architect |
| Anirudh | Backend Developer |

---

## Licence

© 2026 Gencity 3D · Team Pentacode. All rights reserved.
