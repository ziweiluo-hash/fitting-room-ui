---
name: ff-ui-image-guidelines
description: Use when Codex needs to generate, edit, evaluate, or write AI image prompts for Free Fire game UI screens, event pages, lobby panels, popups, navigation, buttons, item cards, rarity frames, system icons, or interface art direction that should follow Free Fire UI visual guidelines, grid rules, color palette, typography, and icon style.
---

# Free Fire UI Image Guidelines

Use this skill to write, refine, or review AI image prompts for Free Fire UI screens and icons. Keep outputs aligned with Free Fire's interface language: sharp, light, cool, high-contrast, modular, cyber-styled, readable, and game-ready.

## Core Workflow

1. Identify the output type: standard UI screen, event UI screen, popup, navigation component, button set, item card, rarity frame, or icon.
2. Start from the Free Fire base style, then add only the function-specific theme needed by the request.
3. Constrain layout with the 1500x750 working canvas and Free Fire grid logic.
4. Apply the palette, typography, spacing, component, and icon rules below.
5. Add negative constraints to block generic mobile-game UI, overdecorated fantasy UI, round soft UI, excessive glow, unreadable text, or off-brand colors.
6. Before finalizing, check that the result is usable UI: clear hierarchy, aligned modules, enough empty space, readable labels, and components that look interactive.

## Base Visual Style

Describe Free Fire UI as:

- Modern battle royale game interface with cyber, tactical, and esports energy.
- Cool and light visual feeling: sharp structure, fast rhythm, clean contrast, restrained decoration.
- Angular geometry, bevels, diagonal cuts, sawtooth details, matrix-like diagonal line patterns, and hard-edged panels.
- Dark functional surfaces with yellow accents, white or gray text, and limited auxiliary colors.
- Thin-to-medium line-and-surface construction; avoid heavy ornamental frames.
- Layered but not cluttered: panels, cards, icons, and background art must have clear depth and priority.

Avoid:

- Soft casual mobile-game style, cute rounded cards, toy-like buttons, luxury casino UI, medieval fantasy UI, or realistic skeuomorphic controls.
- Large round corners, complete circular outer frames, excessive arcs, glossy plastic, heavy gradients, repeated glow or shadow effects, and dense decoration.
- Too many independent colors outside the Free Fire palette.

## Canvas And Grid

- Use 1500x750 as the primary UI design canvas.
- Treat 1334x750, 1752x750, and 1834x750 as adaptations of the same centered grid system.
- Keep main content aligned to Free Fire grid modules; grid gutter is 8px.
- Do not place window outer frames inside gutter-only areas.
- Let content cross gutters when necessary, but align panel outer frames to module edges.
- Prefer aligning by panel corners first, then edge centers, then center lines.
- Use top and bottom bars as reserved structural areas when designing full-screen UI.
- For wide aspect ratios, extend left and right edges while keeping the grid center aligned.
- Keep notch and special-screen safety in mind; avoid critical content at extreme left and right edges.

## Brand Elements

- Use Free Fire yellow as the strongest brand accent.
- Use diagonal and sawtooth visual language where suitable, often around trims, separators, corner cuts, or small pattern fills.
- Keep logo and background contrast at 50% or higher when a logo is part of the image.
- Do not distort the logo, use it as a vague texture, or bury it in similar-value backgrounds.
- Use brand motifs as accents, not as wallpaper that competes with content.

## Color Palette

Main palette:

- Brand yellow: `#FABF00`, `#FFBA00`, `#FDDA25`
- Deep dark UI surface: `#151215`, `#2C2A2A`, `#333333`
- Bright text and contrast: `#FAF5F5`, `#FFFFFF`
- Neutral gray text and surfaces: `#D1D1D1`, `#D9D8D6`, `#DADADA`, `#707070`
- Purple accent for small details: `#7532BD`, `#6C00FF`
- Orange accent: `#FDA225`, `#F15A24`
- Green accent: `#22B57E`

Mode or special-use colors:

- CS mode blue: `#1B92D6`
- Infection or teal accent: `#1E8C9B`
- Rampage red: `#C40F04`
- Pet mode orange: `#E17236`

Rarity frame colors:

- Common gray: `#B1B1B1`
- Red: `#FC141A`
- Pink or magenta: `#FD39FC`
- Cyan: `#1AAAC7`
- Green: `#27B21E`
- Gold: `#FED639`

Use auxiliary colors only for small-area details, status, rarity, or mode identity. Do not let auxiliary colors replace the base Free Fire yellow, dark, and white structure unless designing a major event page with an approved theme color.

## Typography

- Prefer Garena Free Fire NeoSans for English, numbers, and UI labels.
- Keep Free Fire typography unchanged in event UI; do not replace it with decorative display fonts.
- Use medium, bold, demi bold, or black weights for UI hierarchy.
- Use uppercase English on buttons, nav labels, popups, and menu labels when appropriate.
- Typical text sizes:
- Title text: 22, 24, 28, 30pt; full-screen popup title may use 36pt.
- Body text: 20 or 22pt.
- Auxiliary text: 18 or 20pt.
- Tab text: 22, 24, or 26pt.
- Button text: 24, 26, or 28pt.
- Menu text: 20, 22, 24, or 26pt.
- Keep text readable and avoid fake microtext unless it is clearly placeholder decoration.

## Standard UI Screens

For standard game interface screens:

- Keep Free Fire main visual language around 70% of the visual identity; function-specific theme elements around 30%.
- Background art or replacement background should occupy about 40% to 60% of visual impact and must not reduce readability.
- Extract theme elements in a way that feels cool and light.
- Keep auxiliary graphics minimal.
- Prefer vector-like shapes and transparent PNG-style elements.
- Avoid randomly adding colors outside the palette.
- Avoid repeated outer glow, inner glow, inner shadow, and outer shadow stacks.
- Design with the Free Fire grid enabled.

Prompt phrase:

```text
Free Fire game UI, sharp cyber tactical interface, dark modular panels, FF yellow accent, angular bevels, diagonal sawtooth trims, clean grid alignment, readable NeoSans-style uppercase labels, restrained auxiliary graphics, high contrast, game-ready mobile UI
```

## Event UI Screens

For events, battle passes, legendary weapons, virtual brands, and large campaign pages:

- Event visual elements may reach about 70% of the page, while Free Fire core visual language remains visible at about 30%.
- If key art exists, derive shapes, colors, and motifs from it instead of inventing unrelated decorations.
- Activity colors should feel transparent and breathable; avoid overly saturated clutter.
- Leave space in the composition. Avoid piling up characters, rewards, buttons, labels, and effects.
- Major events may use independent theme colors, but keep Free Fire yellow where it helps usability and brand recognition.
- Keep Free Fire button proportions and typography.
- Avoid repeated glow or shadow stacks and excessive Photoshop-style effects.

Prompt phrase:

```text
Free Fire event UI screen, cinematic key art integrated with modular cyber UI, breathable composition, sharp angular reward cards, dark panels, FF yellow interaction accents, clean hierarchy, not overcrowded
```

## Buttons And Controls

Use standard button hierarchy:

- Primary button: 168x52px, 24pt label, yellow fill, strong call to action.
- Secondary button: 146x46px, 22pt label, neutral or dark style; multiple can appear together.
- Tertiary button: 100x36px, 20pt label.
- System buttons such as close, confirm, cancel, and arrows should be compact, sharp, and consistent.
- Arrow indicator button: 32x32px; arrow graphic around 10x16px.
- Form text and selection controls should use around 20pt text, with crisp square or beveled interaction shapes.
- Same screen should avoid too many primary yellow buttons; one dominant yellow action is preferred.

Prompt constraints:

- Buttons must look tappable, rectangular, compact, angular, and aligned.
- Use yellow only for primary action or selected state.
- Avoid large pill buttons, round capsule buttons, glassmorphism, and soft neumorphic controls.

## Popups

Use popup layouts as structured windows:

- Large and medium popups use about 48px main margins with 32px internal spacing zones.
- Small popups use tighter spacing such as 32px, 40px, 24px, and 16px.
- Popup titles often use 30pt uppercase bold text; full-screen popup titles may use 36pt.
- Body text around 20pt, line height around 24pt, medium weight.
- Title color commonly uses dark text on light or bright header areas or white text on dark full-screen panels.
- Body text commonly uses `#D1D1D1` on dark panels.
- Pure text popups may be centered or left-aligned; mixed content layouts should use left alignment.
- Overlay mask: black with about 85% opacity.

Visual direction:

- Black or dark translucent panel surface, crisp borders, purple or yellow accents, diagonal corner details.
- Clear close button, confirm or cancel action area, and enough breathing room.

## Navigation, Tabs, Menus

- Full-screen navigation bar height: about 64px.
- Nav icon size: 32x32px.
- Full-screen nav normal width: about 280px; selected width about 260px.
- Selected nav may use a yellow line around 180x2px.
- Nav labels: 24pt uppercase, medium weight, 30pt line height.
- Generic tag tab title: 20pt uppercase; total tab group width should not exceed about 500px.
- Sidebars should use clear selected versus normal states; avoid more than 7 large sidebar entries on screen.
- Secondary sidebar may support up to about 8 entries; use compact widths for 16:9 if crowded.
- Red notification dot: about 10x10px, color around `#FF8400`, aligned to the right edge of the button frame.

## Item Cards And Rarity Frames

- Large rarity frame: about 140x180px.
- Small rarity frame: about 80x80px.
- Use 4px and 8px spacing logic for small internal structure.
- Rarity color should frame the item and status clearly without overpowering the artwork.
- Status tags such as `NEW`, `HOT`, and `LIMITED` should be compact, uppercase, and aligned to the card structure.
- Use item art as the focus; frame graphics should support recognition, not hide the item.

## Icon Design

For system and lobby icons:

- Style must be modern, cyber, sharp, and game-like.
- Prefer line-and-plane construction; keep line thickness consistent within one icon.
- Avoid adding 3D perspective to new or refreshed icons.
- Avoid shapes or strokes smaller than 2px.
- Avoid sharp angles below 30 degrees unless the shape specifically requires it.
- Avoid corner radius above 8px.
- Avoid heavy use of arcs.
- Avoid complete circular outer frames.
- Use chamfers and beveled cuts to express hardness and thickness.
- Keep icons legible at small size and suitable for SVG or vector-style output.

Prompt phrase:

```text
Free Fire system icon, cyber tactical line-and-plane symbol, consistent stroke weight, angular bevels, sharp silhouette, limited FF yellow highlight, no 3D perspective, no round outer frame, vector-style SVG-ready icon
```

Negative icon prompt:

```text
no soft rounded app icon, no glossy 3D, no circular badge frame, no tiny sub-2px details, no excessive arcs, no cute casual style, no fantasy ornament
```

## Prompt Template For UI Screens

```text
Create a Free Fire-style [screen/component type] for [feature/event].
Visual style: modern cyber tactical battle royale UI, cool and light, dark modular panels, sharp angular geometry, diagonal cuts, sawtooth accents, FF yellow primary action color, restrained gray/white text, high contrast.
Layout: 1500x750 mobile game UI canvas, aligned to modular grid, clear top/bottom structure, readable hierarchy, enough empty space, no critical content near extreme edges.
Components: [buttons/popups/nav/cards/icons] follow Free Fire proportions, compact rectangular controls, uppercase NeoSans-style labels, selected state in yellow.
Theme: [specific theme] appears as controlled supporting visual elements, not clutter.
Quality: game-ready UI concept, crisp edges, clean spacing, readable labels, vector-like interface assets.
Avoid: soft casual style, large rounded corners, pill buttons, complete circular frames, excessive glow/shadow, random colors, clutter, unreadable text, fake generic mobile game UI.
```

## Prompt Template For Icons

```text
Create a Free Fire-style [icon subject] system icon.
Style: cyber tactical, modern esports, line-and-plane construction, consistent stroke weight, sharp silhouette, angular chamfers, small FF yellow accent on dark or white variant.
Technical feel: vector-style, SVG-ready, readable at 32x32, no 3D perspective, no tiny sub-2px lines, no large round corners, no complete circle frame.
Background: transparent or simple dark UI tile depending on request.
```

## Review Checklist

Before returning an AI image prompt or judging generated output, verify:

- The result clearly feels like Free Fire UI, not a generic mobile game skin.
- Layout follows a 1500x750-style grid and has clear alignment.
- Main colors stay within Free Fire yellow, dark surfaces, white or gray text, and limited auxiliary colors.
- Typography is bold or medium, readable, and game-like.
- Buttons have the right hierarchy and do not overuse yellow.
- Panels are angular and sharp; large round corners and circular frames are avoided.
- Decoration is restrained and does not crowd content.
- Icons use consistent strokes, no 3D perspective, and no tiny unreadable details.
- Event themes enhance the screen but do not erase Free Fire identity.
- Negative prompts explicitly block glow stacks, random colors, soft rounded UI, clutter, and unreadable text.
