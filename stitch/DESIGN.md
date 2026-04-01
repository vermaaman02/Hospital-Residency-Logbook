# Design System Document: System Relationship Canvas

## 1. Overview & Creative North Star
**Creative North Star: The Clinical Architect**
The design system for the System Relationship Canvas transcends standard medical interfaces by merging the rigorous precision of clinical data with the high-performance ergonomics of world-class developer tools. It is built to feel like an "Architect’s Workbench"—an environment where complex hierarchies (HODs, Students, Departments) are not just listed, but spatially orchestrated.

We break the "template" look by eschewing rigid boxes in favor of **Intentional Asymmetry** and **Tonal Depth**. By utilizing layered glass surfaces and a "borderless" philosophy, the UI feels like a living digital organism rather than a static spreadsheet. This is professional clinical software reimagined as a premium, high-fidelity instrument.

---

## 2. Colors & Signature Tones
The palette is rooted in the AIIMS Patna legacy—deep blues and clinical whites—enhanced by a vibrant, functional spectrum for node identification.

### The Node Spectrum
Nodes must be instantly recognizable. Use these specific hex values for high-contrast identification:
- **HOD:** Purple (`#8b5cf6`) - The sovereign authority.
- **Teacher:** Blue (`#3b82f6`) - The instructional core.
- **Student:** Green (`#10b981`) - The growth element.
- **Batch:** Orange (`#f59e0b`) - The temporal grouping.
- **Department:** Red (`#ef4444`) - The structural anchor.
- **Form:** Yellow (`#eab308`) - The data gateway.

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.** 
Structural boundaries are defined exclusively through background color shifts. A `surface-container-low` panel must sit on a `surface` background to define its edge. This creates a sophisticated, "editorial" feel that mimics fine paper or frosted glass rather than a wireframe.

### The Glass & Gradient Rule
Floating elements (Sidebars, Toolbars, Minimaps) must use **Glassmorphism**:
- **Background:** `surface-container-lowest` at 70% opacity.
- **Backdrop-blur:** 12px to 20px.
- **Signature Gradient:** Main CTAs should utilize a subtle linear gradient from `primary` (#004fa8) to `primary_container` (#0366d6) at 135 degrees to add visual "soul."

---

## 3. Typography: Editorial Precision
We utilize **Inter** for its neutral, high-legibility clinical feel, paired with **Space Grotesk** for technical labeling to provide a "developer tool" edge.

- **Display (display-lg/md):** Reserved for high-level dashboard metrics. Tight letter-spacing (-0.02em) for an authoritative, "Linear-style" look.
- **Headlines (headline-sm):** Used for node titles and panel headers. Bold weights (700) ensure clarity against complex canvas backgrounds.
- **Body (body-md):** The workhorse for data. Always use `on_surface_variant` for secondary info to maintain hierarchy.
- **Technical Labels (label-md/sm):** Set in **Space Grotesk**. Used for metadata, node IDs, and canvas coordinates. This font shift signals to the user that they are in "utility mode."

---

## 4. Elevation & Depth: The Layering Principle
Depth is achieved through **Tonal Layering** rather than heavy shadows.

- **Surface Hierarchy:** 
  - **Level 0 (Canvas):** `surface` (#f7f9ff).
  - **Level 1 (Nodes):** `surface_container_lowest` (#ffffff).
  - **Level 2 (Side Panels):** `surface_container_low` with glassmorphism.
  - **Level 3 (Modals/Popovers):** `surface_container_high`.

- **Ambient Shadows:** 
  For floating nodes or active elements, use a "Large & Faint" shadow: `0 20px 40px -12px rgba(0, 79, 168, 0.08)`. The tint is derived from the `primary` token, not black, to keep the UI "clinical."

- **The Ghost Border:** 
  If a border is required for node differentiation, use `outline_variant` at **15% opacity**. Never use 100% opaque lines.

---

## 5. Components & Canvas Interaction

### Nodes & Edges
- **Nodes:** Large corner radius (`xl`: 0.75rem). Content should be padded using `spacing-4` (1rem). No borders; use a soft `primary_fixed` glow if selected.
- **Edge - Active:** Solid 2px line using `primary`. Use a triangular directional arrow.
- **Edge - Inactive:** Dashed line using `outline_variant` at 40% opacity.
- **Edge - Alert:** Pulsing animation using a `error` (#ba1a1a) glow effect (`blur-sm`).

### Buttons & Controls
- **Primary FAB:** Circular, `surface_tint` background, `on_primary` icon. Place at bottom-right with `20` (5rem) spacing from edges.
- **Canvas Toolbar:** A floating horizontal bar using `surface_container_highest` glassmorphism. No dividers—use `spacing-2` (0.5rem) gaps between icon buttons.
- **Minimap:** Positioned in the bottom-left. Use `surface_dim` for the background and `primary` for the current viewport indicator.

### Input & Form Nodes
- **Fields:** Never use boxed inputs on the canvas. Use "Underline-only" or "Ghost" inputs where the background is `surface_container_low` and the focus state triggers a `primary` bottom-bar expansion.

---

## 6. Do's and Don'ts

### Do
- **Do** use `Mona Sans VF` for high-level branding and `Inter` for functional data.
- **Do** embrace vertical white space (`spacing-8` or `spacing-10`) to separate node clusters instead of using grid lines.
- **Do** use "Surface Stacking"—placing a white card on a light grey background to create natural depth.

### Don't
- **Don't** use 1px solid black or dark grey borders. This breaks the premium "Clinical Architect" feel.
- **Don't** use standard "drop shadows" (e.g., `0 2px 4px black`). They are too heavy for a modern medical dashboard.
- **Don't** use dividers in lists or panels. Rely on background tonal shifts between `surface_container_low` and `surface_container_lowest`.
- **Don't** crowd the canvas. If a relationship is too complex, use the "Inactive" edge style to fade out secondary connections.

---

## 7. Spacing & Rhythm
Strictly adhere to the 4px-based spacing scale.
- **Node Padding:** `4` (1rem)
- **Panel Insets:** `6` (1.5rem)
- **Canvas Grid Dots:** Spaced at `8` (2rem) intervals using `outline_variant` at 20% opacity.