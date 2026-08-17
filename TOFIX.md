# TOFIX

Scratch list of bugs found while working on this fork. Not committed.

---

## 1. Lovelace resource auto-registration silently no-ops on HA 2026.8

**Symptom:** After install + config on HA **2026.8.1**, none of the custom cards
(`stremio-continue-watching-card`, etc.) appear in the card picker. The JS bundle
is served fine — `GET /stremio/stremio-card-bundle.js` → **200** — but it is never
added to the Lovelace resource list (`lovelace/resources` shows mushroom /
scheduler-card / etc. but **no stremio entry**).

**Impact:** Cards are unusable out of the box; user must add the resource by hand.

**Where:** `custom_components/stremio/frontend/__init__.py` → `async_register()`.
Registration is gated on:

```python
if mode == "storage" and resources is not None:
    await self._async_wait_for_lovelace_resources()
else:
    _LOGGER.info("Lovelace mode is '%s'. Add resources manually ...")
```

`lovelace_mode` / `lovelace_resources` read `hass.data.get("lovelace")` and probe
for `.mode` / `.resources` attributes. On 2026.8 this appears to fall through
(mode not detected as `"storage"`, or the `hass.data["lovelace"]` shape changed),
so it takes the `else` branch and skips registration. Note the gate keys off the
**default/Overview dashboard's** Lovelace mode, not per-dashboard — a user whose
default dashboard isn't storage-mode is skipped even though storage resources work.

**Root cause: NOT yet confirmed** (was mid-diagnosis when paused — enabling debug
logging + reloading the entry to capture the `"Lovelace data type: ... value: ..."`
and `"Lovelace mode: %s, resources available: %s"` debug lines. `/config/home-assistant.log`
wasn't present at that path on this host; use `ha core logs` or the correct log path).

**Workaround applied on the live box (not a code fix):** registered the resource
manually via WebSocket `lovelace/resources/create`
(`{res_type: "module", url: "/stremio/stremio-card-bundle.js?v=<version>"}`).

**Fix direction:** make `lovelace_mode`/`lovelace_resources` robust to the 2026.8
`hass.data["lovelace"]` shape; consider registering the resource regardless of the
*default* dashboard mode as long as the storage resource collection is available.
Branch started: `fix/lovelace-resource-registration` (off master).

---

## 2. Off-by-one in the season/episode picker — seasons start at 0

**Symptom:** The episode picker lists seasons starting at **Season 0**. For
*Fallout* (a 2-season show: S1, S2) the tabs render **Season 0 / Season 1 / Season 2**.
Seasons appear zero-indexed; the first real season should be Season 1.

(Episode rows themselves render E01/E02/E03 correctly under the selected season, so
the off-by-one is on the **season** axis / season indexing, surfaced as a spurious
"Season 0" tab. If "Season 0" is meant to be Cinemeta *specials*, it's at least
mislabeled/misordered as the leading tab.)

**Where:** `custom_components/stremio/frontend/stremio-episode-picker.js` (season tab
construction) and/or the season/episode data the card feeds it. Check whether the
season list is built with a 0-based range/index instead of using the actual season
numbers from Cinemeta metadata, and how `season 0` (specials) is handled.

**Repro:** open the Continue Watching card → tap *Fallout* → episode picker shows a
leading "Season 0" tab.

---

## 3. [Design] "Resume in Stremio" should offer a target: Stremio / Apple TV / Fire TV

**Idea:** Instead of a single hardcoded destination, the resume/open action should
let the user pick **where** to play: **Stremio (this device)**, **Apple TV**, or
**Fire TV**. Today it's binary — the current fix sends to Fire TV when
`fire_tv_entity` is set, otherwise opens the local deep link — which doesn't scale
to a household with both an Apple TV and a Fire TV.

**Shape:** a target selector (split button / dropdown next to the primary action,
or a small device row), driven by whichever handover targets are configured
(`apple_tv_entity`, `fire_tv_entity`) plus "this device". Each target maps to:
- Stremio (local) → `window.open('stremio://…')`
- Apple TV → `stremio.handover_to_apple_tv`
- Fire TV → `stremio.handover_to_fire_tv`

**Applies to more than one button:** the same treatment should cover **"Open in
Stremio"** wherever it appears (not just "Resume in Stremio" on the Continue
Watching card) — e.g. the media-details / library / browse cards. Ideally factor a
shared "play target" helper so every card offers a consistent target picker.

