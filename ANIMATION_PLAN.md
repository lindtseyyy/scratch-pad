# Scratch-Pad — Motion & Opening Animation Specification Plan

A comprehensive engineering and design plan for smooth opening, closing, and interactive animations across Scratch-Pad.

---

## 1. Executive Summary & Motion Philosophy

In a high-speed personal bookmarking tool like Scratch-Pad, animations must feel **instant, tactile, and purposeful**. Motion should never impede user velocity or introduce perceived lag. Every transition must communicate spatial relationships (where something came from and where it returns) while maintaining 60–120fps performance on mobile devices.

### Motion Principles
1. **Snappy Timings (120ms – 220ms)**: Interactions complete rapidly so navigation feels instantaneous.
2. **Physics & Spatial Directionality**:
   - **Bottom sheets & action menus** slide up from the thumb zone at the bottom of the screen.
   - **Centered dialogs** gently scale up (`scale-95` to `scale-100`) while fading in.
   - **Dropdowns & popovers** unfold downwards from their trigger (`origin-top`).
   - **Collapsible panels** expand with continuous CSS grid-row transitions rather than layout snapping.
3. **GPU-Accelerated Only**: Transitions strictly animate `transform` and `opacity`. Layout properties like `height`, `width`, `top`, or `left` are never animated directly.
4. **Accessibility First (`prefers-reduced-motion`)**: When reduced motion is requested, all transforms and durations collapse to instant 0ms transitions.

---

## 2. Animation Architecture by Component

### 2.1 Dialogs & Full-Screen Modals (`Modal variant="page"`)

Used by: **[`LinkFormDialog`](file:///home/lindtseyxvii/Codes/scratch-pad/src/features/links/LinkFormDialog.tsx)** (Add Link / Edit Link).

```
┌──────────────────────────────────────────────────────────────┐
│ MOBILE (Page Variant)                                        │
│                                                              │
│  ▲ [DialogPanel slides up from bottom: translate-y-full → 0] │
│  │                                                           │
│  │ Backdrop: opacity-0 → opacity-100 (duration: 200ms)       │
└──────────────────────────────────────────────────────────────┘
```

#### Transition Specifications
- **Backdrop (`DialogBackdrop`)**:
  - `transition-opacity duration-200 ease-out`
  - `data-closed:opacity-0`
  - Background: `bg-black/40`
- **Panel (`DialogPanel`)**:
  - **Mobile (`< sm:`)**:
    - Slides in from bottom: `transition-transform duration-200 ease-out`
    - `data-closed:translate-y-full` → `translate-y-0`
  - **Desktop (`>= sm:`)**:
    - Scales and fades: `sm:transition-all sm:duration-150 sm:ease-out`
    - `sm:data-closed:scale-95 sm:data-closed:opacity-0` → `sm:scale-100 sm:opacity-100`

---

### 2.2 Bottom Sheets (`Modal variant="sheet"`)

Used by:
- **[`ViewNoteDialog`](file:///home/lindtseyxvii/Codes/scratch-pad/src/features/links/ViewNoteDialog.tsx)** (Read full link description)
- **[`LinkActionSheet`](file:///home/lindtseyxvii/Codes/scratch-pad/src/features/links/LinkActionSheet.tsx)** (Mobile actions for `⋯`)
- **[`DeleteLinkDialog`](file:///home/lindtseyxvii/Codes/scratch-pad/src/features/links/DeleteLinkDialog.tsx)** (Delete confirmation)
- **[`TagsPage`](file:///home/lindtseyxvii/Codes/scratch-pad/src/features/tags/TagsPage.tsx)** (Delete tag confirmation)

```
Mobile Bottom Sheet:
  ┌──────────────────────────────────────────────────┐
  │  ─── (Drag / Grab Indicator Handle)              │
  │  Title / Favicon Header                          │
  │  Action buttons or full note body                │
  └──────────────────────────────────────────────────┘
  ▲ Starts: translate-y-full (off-screen below)
  │ Ends:   translate-y-0    (snug at bottom safe-area)
  │ Timing: 200ms cubic-bezier(0.16, 1, 0.3, 1) [spring ease]
```

#### Transition Specifications
- **Mobile (`< sm:`)**:
  - Slide up from bottom: `transition-transform duration-200 ease-out data-closed:translate-y-full`
  - Top rounded corners: `rounded-t-2xl`
  - Clamped max height: `max-h-[85dvh]` with smooth internal scrolling
- **Desktop (`>= sm:`)**:
  - Centered modal scale-fade: `sm:data-closed:scale-95 sm:data-closed:opacity-0 sm:data-closed:translate-y-0`
  - Timing: 150ms ease-out

---

### 2.3 Note Viewer Modal (`ViewNoteDialog`)

When a user taps `[more]` under a link entry's description preview:
1. Instead of stretching the card inline and shifting feed layout, a dedicated sheet modal opens.
2. **Opening Sequence**:
   - 0ms: Backdrop fades in to `bg-black/40`
   - 0–200ms: Bottom sheet slides smoothly into the lower half of the screen
   - Note body is displayed with high-legibility typography, clear quote styling, and quick **Copy Note** / **Edit Link** actions.
3. **Closing Sequence**:
   - 150ms: Sheet slides back down off-screen, focus restores to the `[more]` trigger.

---

### 2.4 Dropdowns, Selects & Comboboxes (`dropdown-panel`)

Used by:
- **[`Select`](file:///home/lindtseyxvii/Codes/scratch-pad/src/components/ui/primitives.tsx)** (Source and Sort filters)
- **[`TagInput`](file:///home/lindtseyxvii/Codes/scratch-pad/src/features/tags/TagInput.tsx)** (Autocomplete tag dropdown)
- Desktop **`Menu`** (Row actions)

#### Transition Classes
```tsx
<MenuItems
  transition
  className="dropdown-panel origin-top transition duration-120 ease-out data-closed:scale-95 data-closed:opacity-0 data-closed:-translate-y-1"
>
```
- **Scale**: `scale-95` → `scale-100`
- **Fade**: `opacity-0` → `opacity-100`
- **Transform Origin**: `origin-top` (or `origin-bottom` if anchored upward)
- **Timing**: 120ms enter, 75ms exit

---

### 2.5 Collapsible Filters Panel (`LinkToolbar`)

Currently toggled between `block` and `hidden` when tapping the **Filters** button.

#### Proposed Smooth Accordion Expansion
Using the modern CSS Grid animation technique (zero JavaScript height measurements):

```html
<!-- Wrapper container -->
<div className={`grid transition-all duration-200 ease-out ${expanded ? 'grid-rows-[1fr] opacity-100 mb-3' : 'grid-rows-[0fr] opacity-0 mb-0'}`}>
  <div className="overflow-hidden">
    <!-- Filters content (Source dropdown, Sort dropdown, Tag filters) -->
  </div>
</div>
```
- Completely eliminates visual snapping and layout jumps.
- Fluidly slides down on reveal and collapses up on dismiss.

---

### 2.6 Micro-interactions & Tactile Feedback

1. **Card Press State (`LinkRow.tsx`)**:
   - `active:scale-[0.995] active:bg-soft/40 transition-transform duration-75`
   - Provides instant tactile response before browser tab navigation.
2. **Quick Copy Button Feedback**:
   - Tapping **Copy Link** or **Copy Note** triggers gentle haptic buzz (`navigator.vibrate?.(10)`).
   - Icon briefly transitions from `Copy` to `Check` with green accent highlight for 1.2s before reverting.
3. **Active Filter Chip Dismissal**:
   - Removing a filter chip fades out and collapses width (`transition-all duration-150 data-removed:scale-75 data-removed:opacity-0`).

---

## 3. Reduced Motion & Performance Guarantees

In [src/index.css](file:///home/lindtseyxvii/Codes/scratch-pad/src/index.css):
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
  }
}
```
- When active, Headless UI and custom transitions complete in `0ms` with zero transforms.
- All hardware-accelerated animations run on the GPU compositor thread without triggering layout recalcs (no `layout thrashing`).

---

## 4. Implementation Steps & Verification

1. **Primitive Transitions**: Verify `DialogBackdrop` and `DialogPanel` `transition` directives in `primitives.tsx`.
2. **Dropdown Transitions**: Equip `ListboxOptions` and `MenuItems` with `transition` and `data-closed:*` classes.
3. **Filter Accordion**: Implement `grid-rows-[0fr]` to `grid-rows-[1fr]` in `LinkToolbar.tsx`.
4. **Note Modal Animation**: Verify opening and closing of `ViewNoteDialog` via Playwright.
5. **Testing**: Run Playwright test suite to ensure animation timings do not cause test timeouts or selector race conditions.
