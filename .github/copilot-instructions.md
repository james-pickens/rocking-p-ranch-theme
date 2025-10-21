## Copilot Instructions for Rocking P Ranch Theme

This repository is a Shopify theme with a modular, component-driven architecture. Follow these guidelines to maximize productivity and maintain consistency:

### 1. Architecture Overview
- **Assets**: Contains all JavaScript and CSS for UI logic and styles. Major logic is in `theme.js` (core utilities, event bus, accessibility, responsive breakpoints, and global behaviors).
- **Sections**: Liquid files for Shopify sections. Each section is a self-contained UI block, often paired with a JS/CSS asset of the same name.
- **Snippets**: Reusable Liquid partials (e.g., product cards, icons, buttons). Use snippets to avoid duplication across sections.
- **Templates**: Top-level page templates (e.g., `product.json`, `collection.json`).
- **Config**: Theme settings and schema (`settings_data.json`, `settings_schema.json`).

### 2. Key Patterns & Conventions
- **Naming**: JS/CSS files in `assets/` match their section/snippet for clarity (e.g., `collection-tabs.liquid` ↔ `collection-tabs.js`).
- **Event Bus**: Use `FoxTheme.pubsub` for cross-component communication (see `theme.js`).
- **Utilities**: Use `FoxTheme.utils` for DOM, storage, debounce/throttle, and event delegation helpers.
- **Accessibility**: Use `FoxTheme.a11y` for focus management and keyboard navigation.
- **Responsive**: Media queries and breakpoints are defined in `FoxTheme.config`.
- **Custom Elements**: Some UI (e.g., modals, page transitions) uses Web Components (see `ModalComponent`, `PageTransition` in `theme.js`).

### 3. Developer Workflows
- **No build step**: JS/CSS is written directly in `assets/` and loaded by Shopify. No bundler or transpiler is used.
- **Live reload**: Use Shopify's theme tools (e.g., `shopify theme serve`) for local development and preview.
- **Testing**: Manual browser testing is standard; no automated test suite is present.
- **Debugging**: Use browser devtools. Console logs are present in `theme.js` for theme/version info.

### 4. Integration Points
- **Shopify APIs**: Data is passed via Liquid into JS (e.g., `window.FoxTheme.settings`).
- **Third-party**: Minimal; most logic is custom. Some components (e.g., carousels) may use libraries like Swiper, but are wrapped in `FoxTheme` modules.

### 5. Examples
- To add a new section: create `sections/my-section.liquid`, then add logic in `assets/my-section.js` and styles in `assets/my-section.css`.
- To share state: publish/subscribe to events via `FoxTheme.pubsub`.
- To update UI after AJAX: use `HTMLUpdateUtility.viewTransition` for smooth DOM swaps.

### 6. Special Notes
- Avoid direct DOM manipulation outside of `FoxTheme.utils` or component classes.
- Always match new asset filenames to their section/snippet for discoverability.
- Use Liquid variables to pass config/data from Shopify to JS.

---
For more details, see `assets/theme.js` for core logic and patterns. When in doubt, follow the structure and conventions of existing sections and assets.
