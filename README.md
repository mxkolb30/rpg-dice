# OpenDice

OpenDice is a responsive web-based dice roller for tabletop RPGs. It features a Material Design interface optimized for both mobile and desktop use.

![OpenDice Screenshot](screenshot.png)

## Features

- **Smart Input:** Automatically groups identical dice (e.g. 2d6) and handles summing between different dice types and constants.
- **Custom Dice:** Support for dN dice where the number of sides can be manually entered.
- **Dynamic Theming:** The interface color palette updates in real-time based on the first die type in the current formula.
- **History and Favorites:** Persistent storage for previous rolls and frequently used formulas. History entries can be clicked to re-roll.
- **PWA Support:** Installable as a Progressive Web App with offline functionality via Service Workers.
- **Mobile Optimized:** Designed for modern tall phone screens with bottom navigation and safe-area support.

## Getting Started

OpenDice is a static web application. No build process is required.

### Local Development

Open `index.html` in a web browser, or serve the directory using a local web server:

```bash
# Node.js
npx serve .

# Python
python3 -m http.server 8000
```

## Technical Stack

- Vanilla JavaScript (ES6+)
- Modern CSS (Flexbox, Variables, Safe-area insets)
- SVG icons
- LocalStorage API for persistence
- Service Worker API for offline PWA support
