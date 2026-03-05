# Session 178 - Mobile Movement Tracking Fix (2026-03-05)

## Summary
Fixed the broken mobile Movement Tracking panel from session 177. The previous approach tried to insert the tracking panel between the content area and footer in a flex column layout, which caused the footer to be squeezed off-screen.

## Changes

### SearchPanel.tsx
1. **Removed broken mobile tracking code:** Deleted `mobileTrackingRef`, `mobileTopRef` refs, the squeezed-between panel, and scroll-into-view logic
2. **New approach — content replacement:** When "Tracking" toggle is active on mobile, the tracking panel replaces the search results area (`lg:hidden flex-1 overflow-auto`), while results get `hidden lg:flex`. Desktop is unaffected.
3. **h-dvh fix:** Changed outer container from `h-screen` to `h-dvh` to account for mobile browser chrome (address bar/bottom toolbar). Desktop keeps `lg:h-[calc(100vh-72px)]`.
4. **Footer buttons:** "Tracking" toggle + "+ Create Workout" side by side, centered (`justify-center`), both auto-sized to content.

### Key Technical Decisions
- **Content replacement vs. overlay:** Chose to hide results and show tracking in the same flex slot, avoiding all layout complexity. Simpler than absolute positioning or restructuring the flex layout.
- **`h-dvh` over `h-screen`:** `100dvh` dynamically adjusts to visible viewport on mobile browsers, preventing footer from being hidden behind browser chrome.

## Files Modified
- `components/coach/SearchPanel.tsx`
- `memory-bank/memory-bank-activeContext.md`
