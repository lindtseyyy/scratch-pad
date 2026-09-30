# Scratch-Pad — Responsive Improvement Plan

A plan to make the **existing** Scratch-Pad app work well on phones, tablets, laptops and large screens.

This is based on an audit of the current code in `src/`, not a fresh design. No new features are added; only layout, sizing and touch behavior change.

**Implementation status (September 30, 2026):** Sections 3.1–3.7 are implemented, including the optional wide-screen tag sidebar. All 12 browser tests pass across the four projects, including responsive light/dark, landscape-dialog, and enlarged-text checks. Lint, formatting, the build, and all 23 unit tests pass. The physical-device checklist in §4.3 remains pending; browser emulation cannot verify the on-screen keyboard, iPhone safe areas, or native text zoom.

---

## 1. Where the App Stands Today

The app already has a reasonable responsive base. **Keep these; don't rebuild them:**

| Already working                                                                                           | Where                      |
| --------------------------------------------------------------------------------------------------------- | -------------------------- |
| Phone/desktop split at Tailwind's `sm:` (640px)                                                           | Throughout                 |
| Filters collapse behind a **Filters** button on phones                                                    | `LinkToolbar.tsx`          |
| Dialogs become full-screen on phones                                                                      | `primitives.tsx` → `Modal` |
| Inputs are 16px on phones, which prevents iOS zoom-on-focus                                               | `index.css` → `.input`     |
| Hover styles only apply on devices that can hover (Tailwind v4 default)                                   | —                          |
| Reduced-motion support                                                                                    | `index.css`                |
| Content capped at 908px; long URLs truncate                                                               | `.page`, `LinkRow.tsx`     |
| Routes are lazy-loaded                                                                                    | `App.tsx`                  |
| Playwright runs on **desktop + Pixel 7**, with an axe accessibility check and a horizontal-overflow check | `tests/app.spec.ts`        |

### Gaps found

Severity: **High** means it's hard to use on a real device, **Med** means it's awkward, **Low** is polish.

| #   | Gap                                                                                                                                                                                                                                                          | Where                                                                           | Sev            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | -------------- |
| G1  | **Touch targets are too small.** Tag-removal `×` is ~16px, tag chips in rows are ~20px tall, the `⋯` row menu is ~34px, menu items ~36px, and buttons 40px. The usual minimum is 44px.                                                                       | `TagInput.tsx:55`, `index.css` `.tag` / `.menu-item` / `.button`, `LinkRow.tsx` | High           |
| G2  | **Save is hard to reach in the add/edit dialog on phones.** The dialog is full-screen, the buttons are at the very bottom of a long form, and Title is auto-focused, so the keyboard opens and covers them. You must dismiss the keyboard or scroll to save. | `LinkFormDialog.tsx`, `Modal`                                                   | High           |
| G3  | **Tag suggestions can be hidden under the keyboard.** Tags is the last field, and its suggestion list drops down below the input, which is exactly where the phone keyboard sits.                                                                            | `TagInput.tsx`, `LinkFormDialog.tsx` field order                                | High           |
| G4  | **Active filters are invisible on phones when the Filters panel is collapsed.** Tapping a tag chip on a row filters the list, but the only sign is a small dot on the Filters button. "Clear filters" and Sort are hidden too.                               | `LinkToolbar.tsx`                                                               | Med            |
| G5  | **Keyboard hints show on touch tablets.** `/`, `N` and "Ctrl / ⌘ + Enter" hints are hidden by _width_ (`sm:`), so an iPad, which is wider than 640px, shows shortcuts it can't use.                                                                          | `LibraryPage.tsx:114`, `LinkToolbar.tsx:77`, `LinkFormDialog.tsx:179`           | Med            |
| G6  | **Tablets get 14px inputs.** `.input` switches to `sm:text-sm` by width, so touch tablets get 14px fields, which are small and can trigger zoom on some browsers.                                                                                            | `index.css:88`                                                                  | Med            |
| G7  | **Confirmation dialogs take the full screen on phones.** "Delete this link?" with two buttons is shown as a full-height page.                                                                                                                                | `Modal` (all uses), `DeleteLinkDialog.tsx`, `TagsPage.tsx`                      | Med            |
| G8  | **About 45% of the first phone screen is page chrome** before the first link appears: a two-row header, the "Library" title and subtitle, a helper line, and the toolbar.                                                                                    | `AppLayout.tsx`, `LibraryPage.tsx`                                              | Med            |
| G9  | **Search scrolls away.** With 50+ links, you scroll all the way back up to search.                                                                                                                                                                           | `LinkToolbar.tsx`                                                               | Med            |
| G10 | **Login page uses `min-h-screen` (100vh).** On mobile browsers this is taller than the visible area, so the "centered" form is pushed down and the page scrolls.                                                                                             | `AuthPage.tsx:51`                                                               | Low            |
| G11 | **Toast ignores the phone's safe area** and sits in the bottom-right corner, where it can overlap the iPhone home indicator.                                                                                                                                 | `Toast.tsx:17`                                                                  | Low            |
| G12 | **The browser toolbar color doesn't follow dark mode.** `theme-color` is fixed to the light canvas color.                                                                                                                                                    | `index.html`                                                                    | Low            |
| G13 | **Wide screens leave most of the screen empty** (content is 908px wide on a 1440–1920px screen). This is fine for reading, but the space could be used for tags.                                                                                             | Layout                                                                          | Low / optional |
| G14 | **Tests cover only two sizes and no tablet.** There's no 320px check, no touch-tablet check, and the overflow check only runs once on the Library page.                                                                                                      | `playwright.config.ts`, `tests/`                                                | Med            |

---

## 2. Target Sizes

The existing **`sm:` (640px) split stays as the main layout switch.** It already puts phones on one side and tablets/desktops on the other, so migrating everything to `md:` would be churn with no benefit.

| Mode        | Width      | Devices                                  | Layout                                                      |
| ----------- | ---------- | ---------------------------------------- | ----------------------------------------------------------- |
| **Compact** | < 640px    | Phones in portrait (320–430px)           | Current phone layout, improved                              |
| **Regular** | 640–1023px | Tablets, landscape phones, small windows | Current desktop layout, **touch-aware**                     |
| **Wide**    | ≥ 1024px   | Laptops, desktops, landscape tablets     | Current desktop layout, plus an optional tag sidebar (§3.7) |

**The main new idea: size for the input type, not only the screen width.** Two custom variants are added in `index.css`:

```css
@custom-variant touch (@media (pointer: coarse));
@custom-variant fine  (@media (pointer: fine));
```

- `touch:` enlarges hit areas on any touch device: a phone, an iPad, or a touchscreen laptop in tablet mode.
- `fine:` shows keyboard hints only where there's a mouse or trackpad.

The minimum supported width is **320px**, with no horizontal scrolling at any width.

---

## 3. Changes, in Order

Each work package is small, independent and testable. They're ordered by impact.

### 3.1 Foundations _(fixes G6, G10, G11, G12; enables the rest)_

**`index.html`**

- Update the viewport tag to: `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`.
  - `viewport-fit=cover` makes `env(safe-area-inset-*)` return real values.
  - `interactive-widget=resizes-content` makes Android Chrome shrink the page when the keyboard opens, so sticky elements stay visible.
- Replace the single `theme-color` meta with two, using `media="(prefers-color-scheme: light|dark)"`. Also update it in `useTheme` when you pick Light or Dark manually.

**`src/index.css`**

- Add the `touch` and `fine` variants from §2.
- In `.input`, change `sm:text-sm` to `fine:text-sm`. Touch devices of any width keep 16px; mouse users get 14px.
- In `.button`, add `touch:min-h-11` (44px).
- In `.menu-item`, add `touch:py-3`.
- In `.tag`, add `touch:py-1 touch:text-sm` so clickable tags become easier to tap.
- Add a `.tap` utility for small icon buttons: a 44×44px invisible hit area around a small icon, e.g. `relative after:absolute after:-inset-2 after:content-['']`. Use it where enlarging the visible button would look heavy.
- In `.page`, use `pt-5 sm:pt-10` (was `py-8`) to reduce the empty space at the top on phones.
- Add horizontal safe-area padding to `.page` and the header, e.g. `pl-[max(1.25rem,env(safe-area-inset-left))]`, for landscape iPhones with a notch.

**`AuthPage.tsx`**

- Change `min-h-screen` to `min-h-dvh`.

**`Toast.tsx`**

- On phones, make the toast full-width at the bottom: `inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))]`.
- From `sm:` up, return to the bottom-right: `sm:left-auto sm:right-5`.
- Make the dismiss button a `.tap` target.

### 3.2 Touch targets and keyboard hints _(fixes G1, G5)_

| Element                                                                                                                  | Change                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Row `⋯` menu button (`LinkRow.tsx`)                                                                                      | `p-2` → `p-2.5 touch:p-3` so it's ≥ 44px on touch                                                 |
| Row tag chips (`LinkRow.tsx`)                                                                                            | Use the enlarged `.tag`; increase the gap to `touch:gap-2` so neighboring chips aren't mis-tapped |
| Tag remove `×` (`TagInput.tsx:55`)                                                                                       | Add the `.tap` utility; icon 12px → `touch:size-4`                                                |
| Theme toggle and account button (`AppLayout.tsx`)                                                                        | `touch:min-w-11 touch:min-h-11`                                                                   |
| Rename/Delete icon buttons (`TagsPage.tsx`)                                                                              | `touch:min-w-11`                                                                                  |
| `N` hint (`LibraryPage.tsx:114`), `/` hint (`LinkToolbar.tsx:77`), "Ctrl / ⌘ + Enter to save" (`LinkFormDialog.tsx:179`) | `hidden sm:inline` → `hidden fine:inline` (and the same for `sm:block`)                           |
| Paste-anywhere and the `/` and `N` shortcuts                                                                             | No change; they're harmless on touch devices                                                      |

### 3.3 Library on phones _(fixes G4, G8, G9)_

**Target layout (compact):**

```
┌──────────────────────────────┐
│ ▢ Scratch-Pad        🖥  👤 ▾ │  ← header row 1 (tighter: py-3)
│ Library   Tags   Settings    │  ← header row 2 (unchanged idea)
├──────────────────────────────┤
│ Library            2 links   │  ← subtitle + helper line hidden
│ [ Paste a link…    ] [+Save] │
│ Add details                  │
├──────────────────────────────┤  ← sticky from here
│ [ 🔍 Search…     ] [Filters•]│
│ backend ×  GitHub ×  Clear   │  ← NEW: active-filter chips
├──────────────────────────────┤
│ A useful video ↗          ⋯ │
│ YouTube · youtu.be           │
│ Sep 30, 2026, 7:28 PM        │
│ video                        │
└──────────────────────────────┘
```

1. **Tighter header (`AppLayout.tsx`).**
   - Keep the current two-row phone header. The second row with Library/Tags/Settings is better than hiding the pages behind a ☰ menu.
   - Use `py-3` instead of `py-4` on phones.
   - Replace the word "Account" with a user icon on phones (`sm:` keeps the username).
2. **Hide decoration on phones (`LibraryPage.tsx`).**
   - Hide the subtitle "Good finds. All in one place." and the helper line "Keep something worth coming back to." with `hidden sm:block`.
   - Keep the "Add details" button and the link count.
   - This saves roughly 70px above the first link.
3. **Active-filter chips (`LinkToolbar.tsx`).**
   - When the Filters panel is collapsed on phones, show one row of the active tags, the source, and a non-default sort, each with a `×`, followed by **Clear**.
   - The row scrolls sideways (`overflow-x-auto`) instead of wrapping.
   - When no filters are active, the row isn't rendered, so it costs no space.
   - The dot on the Filters button becomes a count, e.g. **Filters · 2**.
4. **Sticky search row (compact only).**
   - Make the search input and Filters button `sticky top-0 z-10 bg-canvas`, with a bottom border.
   - Only this row sticks. The expanded Filters panel scrolls normally, so it never covers half the screen.
   - On `sm:` and up, the toolbar stays static; there is enough room there.
5. **Link rows on phones (`LinkRow.tsx`).**
   - Put the date on its own line instead of letting the `·` separators wrap unpredictably at 320–375px.
   - Clamp tags to one line with a `+N` counter when a link has more than about 4 tags. Tapping `+N` expands them.
   - The desktop layout doesn't change.

### 3.4 Dialogs _(fixes G2, G3, G7)_

**Split `Modal` into two presentations** by adding a `variant` prop. There's still one component.

|                    | `variant="page"`: add/edit link                                      | `variant="sheet"`: confirmations                                                                     |
| ------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Compact**        | Full-screen, as today, **plus a sticky top bar: `✕ · title · Save`** | **Bottom sheet**: auto height, anchored to the bottom, full-width stacked buttons, safe-area padding |
| **Regular / Wide** | Centered dialog, as today                                            | Centered small dialog, as today                                                                      |

- **Save in the top bar** on phones fixes G2. The top of the screen is never covered by the keyboard, on iOS or Android. The top-bar button targets the form with the HTML `form="link-form"` attribute, so no state moves. The existing footer buttons get `hidden sm:flex`.
- **Title stays auto-focused** on phones, as it is today and as the tests expect. With Save in the top bar, the fastest flow works: paste the URL, type a title, tap Save.
- **Confirmations become bottom sheets** (G7): "Delete this link?" and "Delete tag?" appear near your thumb. **Keep link / Keep tag** stays the auto-focused safe action.

**Link form field order (`LinkFormDialog.tsx`)**

- Change the order from URL → Title → Source → Note → **Tags** to URL → Title → **Tags** → Note → Source.
- Tags are used on almost every save. Source is auto-filled and rarely edited, so it moves to the end.
- This also moves the tag input up, away from the keyboard.

**Tag suggestions on touch devices (`TagInput.tsx`)** _(G3)_

- When the tag field is focused and empty, show your **8 most-used tags as tappable chips** below it. The data is already in `useTags()` (`link_count`). On a phone, tapping a chip is faster than typing.
- When the field receives focus on touch devices, call `scrollIntoView({ block: 'center' })` so the field and its dropdown sit above the keyboard.
- Add `enterKeyHint="done"`, `autoCapitalize="none"` and `autoCorrect="off"` to the tag input. Add `autoCapitalize="none"` and `spellCheck={false}` to the URL inputs.

### 3.5 Tags, Settings and Login pages

These pages already hold up well at 320px. They only need small fixes:

- **Tags page:** apply the §3.2 touch sizes. On phones, the "Create a tag" input becomes full width (`max-w-xs` → `sm:max-w-xs`), and the sort select sits on its own row, right-aligned.
- **Settings:** make the theme buttons equal width on phones (`flex-1 sm:flex-none`). Nothing else needed.
- **Login / Sign up:** `min-h-dvh` (§3.1). Nothing else needed.

### 3.6 Landscape phones and tablets

No separate layout is needed; these are regular-width screens with little height.

- Dialogs already scroll inside themselves. The new sticky top bar keeps Save visible.
- The sticky search row is compact-only, so it doesn't steal height on landscape phones.
- **iPad in portrait (768–834px):** gets the regular layout with touch sizing from §3.2. This is the combination the app currently handles worst (G5, G6).

### 3.7 Wide screens _(optional; G13)_

At `lg:` (≥ 1024px), add a sticky **tag sidebar** of about 220px on the left of the Library:

- It lists every tag with its count, and one click toggles the tag as a filter.
- It reuses `useTags()` and the URL filter state, so there's no new logic.
- The main column keeps its current width, so the page grows to about 1150px.

The app works without it. **Include it only if you want it** (see Open Questions).

---

## 4. Testing

### 4.1 Playwright projects _(G14)_

Add these projects to `playwright.config.ts`:

| Project   | Device                           | Why                                                      |
| --------- | -------------------------------- | -------------------------------------------------------- |
| `desktop` | Desktop Chrome                   | Existing                                                 |
| `mobile`  | Pixel 7 (412px)                  | Existing                                                 |
| `small`   | 320×568, `hasTouch`, `isMobile`  | The smallest supported width                             |
| `tablet`  | iPad Mini (768×1024), `hasTouch` | A touch device at regular width, which catches G5 and G6 |

The existing tests branch on `project.name === 'mobile'` to open the Filters panel. That check becomes **"is the viewport under 640px"**, so `small` reuses the same path.

**Test selectors that change:**

- Clicking **Filters** must match "Filters · 2": use `/^Filters/`.
- "Clear filters" can now also appear in the chip row; the tests already use `.first()`.
- The dialog's Save button on phones now lives in the top bar and keeps the same accessible name "Save link". Only one Save button is visible per size, so `getByRole` still finds exactly one.

### 4.2 New `tests/responsive.spec.ts`

For every project, seed a few links (including a 300-character title, a long URL and a link with 8 tags), then visit **Login, Library, the add dialog, the delete sheet, Tags and Settings** and check:

1. **No horizontal overflow:** `document.documentElement.scrollWidth <= clientWidth`.
2. **Touch targets ≥ 44px** on `hasTouch` projects: check the bounding box of every visible button, link and `[role=menuitem]`. Inline text links inside paragraphs are allowed to be smaller.
3. **Keyboard hints hidden** on touch projects: no visible `kbd` elements, and no "Ctrl / ⌘" text.
4. **On compact sizes:** the Save button in the dialog is visible without scrolling, the active-filter chip row appears after tapping a row's tag, and the search row stays visible after scrolling 2,000px.
5. **Screenshots** of each screen, saved to `.local/responsive/<project>-<screen>.png`, in light and dark mode.

### 4.3 Real devices (required once per work package)

Automated tests can't reproduce the on-screen keyboard. Check on your actual phone:

```bash
npx vite --host 0.0.0.0   # then open http://<computer-ip>:5173 on the phone
```

(`npm run dev` is bound to `127.0.0.1`, which the phone can't reach.)

**Manual checklist**

- [ ] Add a link using only the phone: paste, type a title, add a tag, save. **Save is reachable with the keyboard open.**
- [ ] Tag suggestions and most-used chips are visible above the keyboard
- [ ] Delete sheet: both buttons are within thumb reach and clear the home indicator
- [ ] No input zooms the page on focus (iPhone)
- [ ] Toast doesn't overlap the home indicator
- [ ] Landscape: the dialog scrolls and Save stays visible
- [ ] Browser toolbar color matches light and dark mode
- [ ] 200% browser text zoom on desktop: no overlap or cut-off text

---

## 5. Implementation Order and Effort

| Step | Work package                                                                                              | Fixes       | Effort |
| ---- | --------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| 1    | Test projects + `responsive.spec.ts`, **written first**, so you can watch them go from failing to passing | G14         | ½ day  |
| 2    | Foundations (§3.1)                                                                                        | G6, G10–G12 | ½ day  |
| 3    | Touch targets + keyboard hints (§3.2)                                                                     | G1, G5      | ½ day  |
| 4    | Dialogs: `Modal` variants, top-bar Save, field order, tag suggestions (§3.4)                              | G2, G3, G7  | 1 day  |
| 5    | Library on phones: header, chips, sticky search, rows (§3.3)                                              | G4, G8, G9  | 1 day  |
| 6    | Tags / Settings / Login touch-ups (§3.5)                                                                  | —           | ¼ day  |
| 7    | Real-device pass and fixes (§4.3)                                                                         | —           | ½ day  |
| 8    | _(Optional)_ Wide-screen tag sidebar (§3.7)                                                               | G13         | ½ day  |

**Total: about 4–5 days, plus ½ day for the optional sidebar.**

Each step ends with `npm run lint`, `npm run build`, `npm test` and `npm run test:e2e` passing.

---

## 6. Not Included

- A bottom tab bar, hamburger menu or floating "+" button. The current header and quick-add bar already do the job.
- A separate mobile component tree. Everything stays one set of components with responsive classes.
- Swipe gestures and pull-to-refresh.
- PWA install and share target. That is the next mobile feature (listed under "Later" in `DEVELOPMENT_PLAN.md`) rather than a responsive fix, and it builds on the safe-area work done here.

---

## Open Questions

- [ ] **Your main phone:** iOS or Android? The real-device pass will focus on it.
- [ ] **Do you use a tablet?** If not, the `tablet` test project stays, but manual tablet checks can be skipped.
- [x] **Wide-screen tag sidebar (§3.7):** included, as requested.
- [x] **Field order change (§3.4):** Tags moved above Note and Source on all screen sizes as part of the approved implementation.
