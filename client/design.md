me: TYPE_STRIKE Focus Monospace
description: A high-performance, minimalist typing interface designed for maximum focus and competitive multiplayer racing. Inspired by Monkeytype's aesthetic, it uses a dark, terminal-like color palette and monospace typography.
---

## Visual Language

### Color Palette (Dark Mode)
- **Background (Surface):** `#111416` (Deep charcoal/black for zero-distraction focus)
- **Primary (Accent):** `#e2b714` (High-visibility yellow for active cursors, primary progress, and brand highlights)
- **Secondary (Inactive):** `#37393c` (Muted gray for untyped text and background elements)
- **Success:** `#e2b714` (Used for correctly typed characters to maintain a monochrome-plus-accent feel)
- **Error:** `#ca4754` (Subtle but clear red for typos)

### Typography
- **Primary Font:** `JetBrains Mono` (or any high-quality monospace font like Roboto Mono)
- **Sizes:**
  - **Hero/Race Text:** 32px - 48px (Large, breathable text for high legibility during speed typing)
  - **UI Labels/Stats:** 14px - 16px (Small, technical labels for WPM, ACC, and Player counts)
  - **Navigation:** 16px (Clean, uppercase labels)

### Components & Layout

#### 1. Top Navigation Bar
- **Logo:** `TYPE_STRIKE` in bold yellow monospace.
- **Links:** Minimal text links (Multiplayer, Solo, Leaderboard, Settings) with a simple underline for the active state.
- **Account:** Minimal icon at the far right.

#### 2. Race Track Progress (Top)
- A horizontal "track" consisting of parallel lines.
- **Markers:** Small vertical bars representing the 8 players.
- **Player Marker:** The local player is highlighted in the accent yellow; others are muted gray/white.
- **Progress:** A single yellow line showing the lead player's progress relative to the finish.

#### 3. Main Typing Area
- **Visibility:** 100% visibility of the entire sentence/paragraph. No masking or fading.
- **Character States:**
  - **Typed:** Accent yellow.
  - **Current:** Flashing vertical cursor.
  - **Untyped:** Muted dark gray.
- **Line Spacing:** Generous (1.5x - 1.8x) to ensure clear separation between lines.

#### 4. Integrated Chat (Overlay/Side)
- **Style:** Semi-transparent dark background (`rgba(0,0,0,0.5)`).
- **Text:** Technical, log-like format (e.g., `root_usr: 150wpm target`).
- **Interaction:** Small input field at the bottom, dismissible with a 'X' or 'Escape'.

#### 5. Footer
- Fixed bottom bar with technical metadata: `Server Status: Online`, `Version v1.0.4`, and legal links.

## Design Principles
1. **Focus First:** Minimize animations and unnecessary UI chrome.
2. **Competitive Clarity:** Show opponent progress through the dedicated track, not by cluttering the typing zone.
3. **High Contrast Rhythm:** Ensure the active word and cursor are the most salient elements on the screen.
4. **Terminal Aesthetic:** Maintain the feel of a high-end developer tool or terminal emulator.

