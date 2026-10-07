# Scratch-Pad — Mobile Entry Design & Experience Plan

A comprehensive design and engineering specification for redesigning link entries in **phone view** for Scratch-Pad.

---

## 1. Executive Summary & Context

Scratch-Pad is a high-speed personal link library built with React 19, TypeScript, Vite, Tailwind CSS v4, Headless UI, and Supabase. While the initial responsive foundation established 44px touch targets and full-screen dialogs (documented in [RESPONSIVE_PLAN.md](file:///home/lindtseyxvii/Codes/scratch-pad/RESPONSIVE_PLAN.md)), **the visual presentation of link entries on mobile devices remains rigid, low-density, and visually undifferentiated**.

On a smartphone screen (320px–412px width), each saved entry is currently rendered as an identical gray-bordered card with a thick green left border, raw text, and oversized tag blocks. Only 2 to 3 entries fit on a standard phone viewport, scanning is slowed down by the absence of visual anchors (favicons or brand logos), and key mobile workflows—such as copying a link or sharing it—require navigating through desktop-oriented menus.

This plan specifies a **mobile-first redesign of link entries**, focusing on:
1. **Immediate Visual Recognition**: Favicon and source badges to scan bookmarks in milliseconds.
2. **High Information Density & Clean Layout**: Eliminating nested container borders and double-padding.
3. **Scannable Metadata & Relative Time**: Human-friendly relative dates ("2h ago", "Yesterday") that don't wrap awkwardly.
4. **Refined Tag Ergonomics**: Streamlined tag rails that maintain 44px tap comfort without visually ballooning.
5. **Interactive Note Previews**: Inline expand/collapse toggles for personal notes.
6. **Thumb-Zone Action Sheets**: Native-feeling bottom sheet with 1-tap Copy URL and Web Share API.
7. **Dual-Density Support**: An optional toggle between **Detailed Cards** and **Compact Rows**.

---

## 2. Mobile Audit: Current Gaps in Entry Display

Based on an inspection of the current UI (`mobile-library-light.png`, `small-library-light.png`, and `mobile-active-filters-light.png`) and [LinkRow.tsx](file:///home/lindtseyxvii/Codes/scratch-pad/src/features/links/LinkRow.tsx):

| # | Gap / Flaw | Technical Cause | User Impact on Phone | Severity |
|---|---|---|---|---|
| **G-E1** | **Nested Double-Boxing** | Outer `.page > div` has `border border-line bg-surface p-3`, and each `article` has `border border-line bg-canvas/40 p-3`. | Wastes ~48px of horizontal width. Cards look enclosed inside another card; muddy off-white/gray contrast. | **High** |
| **G-E2** | **Lack of Visual Anchors** | Only text is displayed. No favicons, no source icons, no color cues. | All links look like uniform walls of text; users must read full titles to identify sites like YouTube or GitHub. | **High** |
| **G-E3** | **Ballooned Tag Pills** | `index.css` applies `touch:min-h-11` (44px) to `button.tag`. | Tag pills swell to 44px height, dominating the card and pushing content down. 3 tags occupy half the card height. | **High** |
| **G-E4** | **Awkward Timestamps** | `LinkRow.tsx:79` applies `basis-full sm:basis-auto` with verbose formatting (`Oct 4, 2026, 2:37 PM`). | Timestamp wraps to its own dedicated line, adding ~24px height per entry without adding quick-scan value. | **Med** |
| **G-E5** | **Note / Description Dead End** | `line-clamp-2` with no expand toggle or note icon. | Long notes are cut off with no way to read them on mobile without opening the full edit dialog. | **Med** |
| **G-E6** | **Inert Card Tap Zone** | Only the 15px title `<a>` tag opens the link. The rest of the card surface is dead space. | Tapping slightly outside the title text does nothing; users struggle to hit the link while on the move. | **Med** |
| **G-E7** | **Hidden Mobile Actions** | Only a `⋯` menu button at top-right; no quick copy or native OS share. | Copying a URL requires entering Edit mode or opening the URL in a browser tab first. | **High** |
| **G-E8** | **Arbitrary Left Accent Bar** | `border-l-4 border-l-accent/60` on every entry. | Visual noise that doesn't convey state, importance, or category; crowds small 320px screens. | **Low** |
| **G-E9** | **Low Viewport Density** | Each card takes 130–170px height. | A standard phone screen fits only 2.5 entries before needing to scroll. | **Med** |

---

## 3. Visual Anatomy & Layout Comparison

### 3.1 Current Phone View vs. Proposed Phone View

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│ CURRENT MOBILE ENTRY (145px tall)    │     │ PROPOSED MOBILE ENTRY (Detailed)     │
├──────────────────────────────────────┤     ├──────────────────────────────────────┤
│ ▌ Saved reference 1 ↗            ⋯   │     │ 🌐 github.com · GitHub · 2h ago   ⋯  │
│ ▌                                    │     │ Building Modern Web Apps at Scale ↗  │
│ ▌ example.com                        │     │ 📝 "Great guide on optimizing Vite    │
│ ▌ Oct 4, 2026, 2:37 PM               │     │     bundle sizes..." [more]          │
│ ▌ ┌────────┐ ┌────────┐ ┌────────┐   │     │ 🏷️ [frontend] [vite] [performance]  │
│ ▌ │backend │ │ docs   │ │  +5    │   │     │ ──────────────────────────────────── │
│ ▌ └────────┘ └────────┘ └────────┘   │     │ 📋 Copy Link       ↗️ Share           │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
      (Bloated tags, rigid date,                   (Favicon anchor, relative date,
       no favicon, dead tap zones)                  expandable notes, quick actions)
```

### 3.2 Compact Mode Anatomy (For Fast Skimming)

```
┌────────────────────────────────────────────────────────┐
│ PROPOSED COMPACT ROW (48px tall — 8 entries per screen)│
├────────────────────────────────────────────────────────┤
│ 🌐 Building Modern Web Apps at Scale...   github.com ⋯ │
├────────────────────────────────────────────────────────┤
│ ▶️ Learn React 19 in 20 Minutes...         youtube.com ⋯ │
├────────────────────────────────────────────────────────┤
│ 📄 Tailwind CSS v4 Migration Guide...     tailwindcss ⋯ │
└────────────────────────────────────────────────────────┘
```

---

## 4. Architectural Design Pillars

### Pillar 1: Visual Identity & Favicon Engine
Every link entry will feature a **Domain Favicon / Brand Anchor** on mobile:
1. **Source-Specific Icons**: High-fidelity SVG badges for common sources:
   - YouTube, GitHub, Reddit, X (Twitter), Stack Overflow, Hacker News, Substack, Medium, etc. (already detected in [source.ts](file:///home/lindtseyxvii/Codes/scratch-pad/src/lib/source.ts)).
2. **Universal Favicon Fallback Service**:
   - Primary: Google Favicon CDN (`https://www.google.com/s2/favicons?domain=${domain}&sz=64`)
   - Backup: DuckDuckGo Favicon CDN (`https://icons.duckduckgo.com/ip3/${domain}.ico`)
3. **Monogram / Fallback Badge**:
   - If offline or unresolvable, display a 24×24px rounded badge with the first letter of the domain and a deterministic pastel hue, or a clean `Globe` icon.
4. **Performance & Privacy**:
   - `loading="lazy"` and `decoding="async"`.
   - `onError` event handler seamlessly swaps to the monogram icon without layout shift.

### Pillar 2: Information Hierarchy & Relative Time
- **Header Line (Metadata First or Title First)**:
  - Domain displayed in clean sans-serif text (`text-xs font-medium text-secondary`), paired with detected source badge (e.g., `GitHub`).
  - **Relative Time Formatter**:
    - `< 1 min` → "Just now"
    - `< 1 hr` → "Xm ago"
    - `< 24 hr` → "Xh ago"
    - `< 7 days` → "Xd ago" (e.g. "2d ago")
    - Older → "Oct 4" (or "Oct 4, 2025" if previous year)
    - Full timestamp preserved in `title` tooltip and in the mobile action sheet.
  - This metadata line easily fits on one row alongside the favicon, saving ~24px of vertical height per entry.
- **Title**:
  - `text-[15px] font-semibold leading-snug text-ink line-clamp-2`.
  - External link icon `ExternalLink` kept subtle (`size-3 text-muted`).

### Pillar 3: Refined Tag System (Fixing the 44px Bloat)
- **The Issue**: In `index.css`, `button.tag { @apply touch:min-h-11 touch:min-w-11; }` caused individual tag chips inside link rows to become giant 44px blocks.
- **The Solution**:
  1. Distinguish **standalone form/filter tags** from **embedded row tag chips**.
  2. Embedded row tags adopt a sleek visual height (`h-6 sm:h-5 text-xs px-2 py-0.5 rounded-full bg-soft text-secondary`).
  3. Touch comfort is maintained via:
     - Minimum horizontal gap (`gap-1.5`).
     - Invisible tap target expansion (`relative before:absolute before:-inset-1`).
     - Or a horizontal-scrolling tag rail (`overflow-x-auto no-scrollbar flex items-center`) that lets users swipe through tags smoothly without dynamic DOM calculation jitter.
  4. Removes the heavy `ResizeObserver` DOM measurement logic from `LinkRow.tsx`.

### Pillar 4: Interactive Note / Description Preview
- Links with descriptions (`link.description`) receive a dedicated note card treatment:
  - Styling: `mt-2 rounded-md bg-soft/50 border-l-2 border-accent/60 px-2.5 py-1.5 text-xs text-secondary leading-relaxed`.
  - Icon: Miniature note icon (`StickyNote` or `MessageSquare` size 12).
  - Expand toggle: If description exceeds 2 lines, display an inline `[more]` / `[less]` button allowing instant expansion without leaving the library view.

### Pillar 5: Thumb-Zone Mobile Action Sheet (`Modal variant="sheet"`)
On mobile devices (`< sm:`), replace the top-right desktop popover dropdown with an ergonomic **Action Sheet** anchored at the bottom of the screen:
- **Trigger**: Tapping the `⋯` button or long-pressing the entry card.
- **Sheet Header**: Favicon + Title preview + Domain.
- **Action Grid / List**:
  1. 🌐 **Open in Browser** (`link.url`)
  2. 📋 **Copy Link Address** (copies to clipboard, triggers haptic + toast notification)
  3. ↗️ **Share Link…** (uses Web Share API `navigator.share` on supported mobile browsers, fallback to copy)
  4. 🏷️ **Filter by Tags** (quick toggle of tags attached to this link)
  5. ✏️ **Edit Details** (opens `LinkFormDialog`)
  6. 🗑️ **Delete Link** (opens `DeleteLinkDialog` with red confirmation)

### Pillar 6: Container Edge-to-Edge Fluidity
- **Eliminate Double-Boxing on Mobile**:
  - In [LibraryPage.tsx](file:///home/lindtseyxvii/Codes/scratch-pad/src/features/links/LibraryPage.tsx), the content box currently has `rounded-lg border border-line bg-surface p-3 sm:p-6`.
  - On mobile (`< sm:`), remove the outer border and container padding: `max-sm:border-0 max-sm:bg-transparent max-sm:p-0`.
  - Each entry card becomes a crisp standalone card on `bg-canvas`:
    - Light: `bg-surface border border-line/80 rounded-xl shadow-xs`
    - Dark: `bg-surface border border-line/50 rounded-xl`
  - Gains 24px of horizontal reading space for long titles and tags.

### Pillar 7: Dual Density Support (Detailed Cards vs. Compact Rows)
Provide a visual density switcher in the search/filter toolbar:
- **Detailed Mode (Default)**: Favicon, 2-line title, source/domain, relative date, note snippet, tag pills, quick actions.
- **Compact Mode**: 1-line title, domain, favicon, and a tag count badge.
- Saved in `localStorage` under `scratchpad:view-density` (`'detailed' | 'compact'`).

---

## 5. Technical Specification & Implementation Plan

### Phase 1: Foundation Helpers & Components
1. **Favicon Component (`src/components/ui/Favicon.tsx`)**:
   - Accepts `url: string`, `domain: string`, `size?: number`.
   - Renders image with Google Favicon CDN with fallback to initials avatar.
   - Handles offline state and broken image links cleanly.
2. **Date Utility (`src/lib/date.ts`)**:
   - `formatRelativeTime(dateString: string): string`
   - Handles "Just now", "Xm ago", "Xh ago", "Xd ago", "MMM D", "MMM D, YYYY".
3. **Copy & Share Helpers (`src/lib/clipboard.ts` & `src/lib/share.ts`)**:
   - `copyToClipboard(text: string): Promise<boolean>`
   - `shareLink({ title, url }): Promise<boolean>`

### Phase 2: Refactoring `LinkRow.tsx`
1. Rebuild `LinkRow` with mobile-first card architecture:
   - Header: Favicon + domain badge + relative time + `⋯` trigger.
   - Body: Title link + expandable note snippet.
   - Footer: Tag pill rail + quick action bar (Copy & Share).
2. Replace desktop `Menu` with adaptive rendering:
   - On `>= sm:` viewports: keep Headless UI `Menu` dropdown.
   - On `< sm:` viewports: open `LinkActionSheet` (bottom sheet using `Modal variant="sheet"`).
3. Add inline note expansion state (`expandedNote: boolean`).
4. Replace rigid tag measurement `ResizeObserver` with native smooth CSS scroll rail.

### Phase 3: Optimizing `LibraryPage.tsx` Layout & Density Switcher
1. Update mobile container classes in `LibraryPage.tsx`:
   - `min-w-0 max-sm:border-0 max-sm:bg-transparent max-sm:p-0 sm:rounded-lg sm:border sm:border-line sm:bg-surface sm:p-6`
2. Add View Mode Toggle (`Compact` vs `Detailed`) to `LinkToolbar.tsx`:
   - Subtle segmented control icon button (`LayoutList` vs `Rows3`).
3. Render compact row variant when mode is `compact`.

### Phase 4: CSS & Touch Refinements in `index.css`
1. Update `.tag` rules in `index.css`:
   - Preserve 44px hit targets on interactive tag filters while scoping embedded row tags to clean visual height (`h-6 sm:h-5`).
2. Add `.no-scrollbar` utility for smooth swipeable tag rails:
   ```css
   .no-scrollbar::-webkit-scrollbar { display: none; }
   .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
   ```
3. Add micro-interaction active states:
   ```css
   .card-interactive:active {
     transform: scale(0.995);
     transition: transform 80ms ease-out;
   }
   ```

---

## 6. Testing, Accessibility & Verification Plan

### 6.1 Playwright Test Enhancements (`tests/responsive.spec.ts`)
1. **Touch Target Verification**:
   - Verify all interactive controls (card tap, `⋯` button, copy button, tag pills) maintain `>= 44×44px` bounding box on `small` (320px) and `mobile` (Pixel 7).
2. **Horizontal Overflow Check**:
   - Ensure `document.documentElement.scrollWidth <= document.documentElement.clientWidth` across all viewports (320px, 375px, 412px, 768px).
3. **Mobile Action Sheet Verification**:
   - Test clicking `⋯` on mobile opens the bottom sheet with Copy, Share, Edit, and Delete actions.
   - Test Copy action triggers toast confirmation.
4. **Visual Regression Screenshots**:
   - Update baseline screenshots in `.local/responsive/`:
     - `small-library-detailed-light.png` & `small-library-compact-light.png`
     - `mobile-library-detailed-light.png` & `mobile-library-detailed-dark.png`
     - `mobile-entry-action-sheet-light.png` & `mobile-entry-action-sheet-dark.png`

### 6.2 Accessibility (WCAG 2.1 AA) Compliance
- High text contrast ratios (`text-ink` on `bg-surface` is > 10:1; `text-secondary` is > 4.5:1).
- Screen readers announce "External link: [Title], from [Domain], created [Relative Time]".
- Action sheet traps focus properly and closes on Escape or backdrop tap.

---

## 7. Implementation Checklist & Order of Work

```
[ ] Phase 1: Utility & Primitives
    [ ] 1.1 Create src/components/ui/Favicon.tsx with fallback avatar engine
    [ ] 1.2 Create src/lib/date.ts with relative time formatting
    [ ] 1.3 Add clipboard and Web Share helpers in src/lib/share.ts

[ ] Phase 2: Link Row Redesign
    [ ] 2.1 Refactor LinkRow.tsx layout (Favicon + Domain + Relative Time + Title)
    [ ] 2.2 Add expandable note preview with [more]/[less] toggle
    [ ] 2.3 Refactor tag chips into smooth horizontal scroll rail
    [ ] 2.4 Build LinkActionSheet.tsx using Modal variant="sheet"
    [ ] 2.5 Add 1-tap Copy URL quick action

[ ] Phase 3: Page & Container Polish
    [ ] 3.1 Remove double-boxing container on mobile in LibraryPage.tsx
    [ ] 3.2 Add density toggle (Detailed vs Compact) in LinkToolbar.tsx
    [ ] 3.3 Style compact row presentation

[ ] Phase 4: CSS & Token Alignment
    [ ] 4.1 Update tag styling in index.css to prevent 44px pill bloat
    [ ] 4.2 Add .no-scrollbar and micro-interaction active states

[ ] Phase 5: Verification
    [ ] 5.1 Run npm test (unit tests)
    [ ] 5.2 Run Playwright responsive tests across mobile, small, and tablet
    [ ] 5.3 Verify light/dark screenshots in .local/responsive/
```
