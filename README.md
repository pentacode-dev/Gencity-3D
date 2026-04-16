# Gencity 3D — Intelligent City Planning Platform

> **Team Pentacode** · A student-led research project applying algorithmic intelligence to real-world urban planning.

Gencity 3D is a browser-based platform that generates, simulates, and visualises cities using procedural generation, graph algorithms, and 3D rendering. Its centrepiece — **Procity** — procedurally builds entire road networks, city blocks, and explorable 3D urban environments in real time.

---

## ✨ Features

- **Procity 3D City Generator** — Real-time procedural city generation with walkable first-person exploration
- **4 Camera Modes** — First Person, Bird Eye, Isometric, Top Down
- **4 Visual Themes** — Cyberpunk, Noir, Soviet, Arctic
- **Animated Particle System** — Interactive canvas background
- **Custom Cursor** — Smooth animated cursor with hover effects
- **Scroll Animations** — Intersection Observer-driven entrance animations
- **Stat Counters** — Animated number counters on scroll
- **Contact Form** — Client-side form submission handler
- **Fully Responsive** — Mobile-first layout with media queries

---

## 📁 Folder Structure

```
gencity-3d/
│
├── index.html              # Main HTML entry point (all pages)
│
├── css/
│   ├── styles.css          # Global styles: reset, variables, layout, components
│   └── procity.css         # Procity module styles: HUD, toolbar, themes, splash
│
├── js/
│   ├── main.js             # App core: routing, cursor, particles, observers, counters
│   └── procity.js          # Procity engine: p5.js generation, Three.js 3D scene, input
│
├── images/                 # Project images (screenshots, OG image, favicons)
│   └── .gitkeep
│
├── assets/
│   └── fonts/              # Self-hosted fonts (if added in future)
│       └── .gitkeep
│
└── README.md               # This file
```

---

## 🚀 How to Run

### Option 1 — Open Directly (simplest)
1. Download or clone the repository
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari)

> **Note:** Some browsers restrict local file access. If Procity doesn't load, use Option 2.

### Option 2 — Local Dev Server (recommended)

**Using VS Code Live Server:**
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `index.html` → **Open with Live Server**

**Using Python:**
```bash
# Python 3
python -m http.server 8080

# Then open: http://localhost:8080
```

**Using Node.js:**
```bash
npx serve .
# Then open the URL shown in terminal
```

---

## 🎮 Procity Controls

| Key / Action | Function |
|---|---|
| `WASD` / Arrow Keys | Move (First Person) |
| `Mouse` | Look around (click canvas to toggle) |
| `Shift` | Sprint |
| `M` | Toggle minimap |
| `R` | Generate new city |
| `1` | First Person view |
| `2` | Bird Eye view |
| `3` | Isometric view |
| `4` | Top Down view |
| `Scroll` | Zoom (Bird Eye / Isometric) |
| `Drag` | Orbit (Bird Eye) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (Custom Properties, Grid, Flexbox, Animations) |
| App Logic | Vanilla JavaScript (ES6+) |
| 3D Rendering | [Three.js r128](https://threejs.org/) |
| 2D Generation | [p5.js 1.9.0](https://p5js.org/) |
| Polygon Clipping | [Clipper.js 6.4.2](https://github.com/junmer/clipper-lib) |
| Fonts | Google Fonts (Rajdhani, Cormorant Garamond, DM Sans, Share Tech Mono) |

---

## 🌿 Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Folders | lowercase, hyphenated | `css/`, `js/`, `images/` |
| HTML files | lowercase, hyphenated | `index.html` |
| CSS files | lowercase, hyphenated, feature-scoped | `styles.css`, `procity.css` |
| JS files | lowercase, hyphenated, feature-scoped | `main.js`, `procity.js` |
| CSS classes | BEM-inspired, kebab-case | `.feat-card`, `.hero-title` |
| JS variables | camelCase | `bgCanvas`, `initObservers` |
| Procity internals | `pc_` prefix to avoid globals | `pc_scene`, `pc_camera` |
| CSS variables | kebab-case with `--` prefix | `--blue-1`, `--void` |

---

## 📤 Pushing to GitHub

```bash
# 1. Initialise a new Git repository
git init

# 2. Add all project files
git add .

# 3. Make the first commit
git commit -m "feat: initial project structure — Gencity 3D by Team Pentacode"

# 4. Create a new repo on GitHub (via github.com), then link it:
git remote add origin https://github.com/YOUR_USERNAME/gencity-3d.git

# 5. Push to GitHub
git branch -M main
git push -u origin main
```

**For subsequent updates:**
```bash
git add .
git commit -m "feat: describe your change here"
git push
```

**Recommended branch strategy:**
```bash
# Feature branches
git checkout -b feature/procity-minimap
# ... make changes ...
git checkout main
git merge feature/procity-minimap
git push
```

---

## 🧩 Scalability Notes

- To add new pages, create a `<div class="page" id="page-yourname">` and add a nav link with `data-page="yourname"`
- To add new CSS modules (e.g. for a blog section), create `css/blog.css` and link it in `<head>`
- To add new JS modules, create `js/module-name.js` and load it before `</body>`
- Images for the project go in `/images/`. Use descriptive names: `procity-screenshot.png`, `og-image.jpg`
- Fonts added in future go in `/assets/fonts/` with corresponding `@font-face` declarations in `styles.css`

---

## 👥 Team

| Member | Role |
|---|---|
| Irfan ul Haq | Frontend Developer |
| Harshini | Frontend Developer |
| Sahana | Backend Developer |
| Jayachandra Sai | Algorithm Architect |
| Anirudh | Backend Developer |

---

## 📄 Licence

© 2026 Gencity 3D · Team Pentacode. All rights reserved.
