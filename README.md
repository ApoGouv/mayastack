# MayaStack

![MayaStack Logo](./favicon.svg)


[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/ApoGouv/mayastack)](https://github.com/ApoGouv/mayastack/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/ApoGouv/mayastack)](https://github.com/ApoGouv/mayastack/commits/main)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Visit-blue?logo=github&logoColor=white)](https://apogouv.github.io/mayastack/)


**MayaStack – Dot. Bar. Shell. Stack your numbers the Mayan way.**

Explore and convert numbers or dates into Mayan numeral glyphs. MayaStack brings ancient math to life with visual dot, bar, and shell stacks, letting you dive into the fascinating Mayan numeral system interactively.

---

## 🚀 Features

- Convert numbers and dates into authentic Mayan numeral representations
- Convert whole numbers of up to 500 digits exactly (leading zeros aside; the input itself can be at most 1,000 characters)
- Number mode starts at 0, shown with the shell zero glyph. Clear returns it to 0, a count shows the number's significant digits, and while the input has focus the Up and Down arrow keys add or subtract 1, from 0 up to the 500-digit maximum. Leading zeros typed or pasted before a whole number are removed, so typing 5 after the initial 0 gives 5
- Interactive visual stacks using dots, bars, and shells
- Export numeral stacks as SVG or PNG for sharing or printing
- SVG export works at every size. PNG export is limited to 32,767 px in width and height and 8,192 × 8,192 pixels in total, because larger images fail or need too much memory in some browsers; sizes beyond that are marked unavailable. A PNG within these limits can still fail on some browsers or devices (notably mobile), in which case the app says so and suggests a smaller size or SVG
- Supports custom export sizes and flexible display options
- Dark mode support for comfortable viewing
- Lightweight, modern React + Vite stack with TypeScript

---

## 🌐 Demo

Try it live here: [https://apogouv.github.io/mayastack/](https://apogouv.github.io/mayastack/)

---

## ⚙️ Installation & Development

```bash
git clone https://github.com/ApoGouv/mayastack.git
cd mayastack
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to see the app during development.

---

## 🧪 Testing

```bash
npm test                          # unit and component tests (Vitest)
npx playwright install chromium   # once, to download the browser for the browser tests
npm run test:e2e                  # browser tests (Playwright) against a production build
```

To use an already installed Chromium instead, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its path.

---

## 📦 Build & Deploy

```bash
npm run deploy
```

This will build the app and deploy it to GitHub Pages using the `gh-pages` package.

---

## 🛠️ Technologies and Packages Used

* React 19
* TypeScript
* Vite
* Tailwind CSS
* React Colorful
* React Date Picker
* React Hot Toast
* React Tooltip
* And more...

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

### Development tooling

Routine Git and GitHub workflow helpers are available under `scripts/git/`. See the [Git workflow guide](scripts/git/README.md) for usage and safety details.

---

## 📄 License

MIT © 2025 MayaStack by Apostolos Gouvalas

### Third-party font

Headings use [Playfair Display](https://github.com/clauseggers/Playfair) by Claus Eggers Sørensen, Copyright 2017 The Playfair Display Project Authors, licensed under the [SIL Open Font License 1.1](public/fonts/playfair-display/OFL.txt). The unmodified font file is self-hosted with its licence and FONTLOG in [`public/fonts/playfair-display/`](public/fonts/playfair-display/); see [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) for its provenance.
