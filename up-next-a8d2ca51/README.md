# Up next tracker

This folder is a buildless static page. It uses the existing `data.json` and does not require a backend or new dependencies. Runtime asset URLs carry a shared version token; bump it when changing the markup/script contract so returning visitors do not mix cached assets from different layouts.

## Local review

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory up-next-a8d2ca51
node --test up-next-a8d2ca51/time.test.cjs up-next-a8d2ca51/calendar.test.cjs up-next-a8d2ca51/prompt.test.cjs
```

Open `http://127.0.0.1:8765`. The page retains the timeline, calendar, details, filters, existing source links, and email review. Filters and email review start collapsed. On small screens the calendar also starts collapsed. Native modal details support keyboard focus and Escape. The palette uses cream, sand, and terracotta, with a warm dark appearance.

## Time contract

- `date`, `start`, and `end` are wall times in `America/Chicago`, not the viewer's timezone. The header, item details, calendar dates, and countdowns use that contract.
- Known event ends keep an event eligible for Next up until the end instant. Active events take priority. The hero refreshes at start/end boundaries and on returning to the tab.
- A missing end means unknown duration. Such items remain eligible through their Chicago date and are labeled as unknown after starting, rather than claiming to be in progress. Assignments and attendance use a due-time label. A missing start says “Time not specified.” Only `allDay: true` explicitly means all day.
- An end earlier than its start means the following day. An optional `endDate` can specify a later end date. Equal or invalid intervals are rejected.
- Modern Chicago IANA rules validate CST/CDT offsets. Nonexistent spring-forward wall times are rejected. Repeated fall-back times select the earlier occurrence; a source needing the second occurrence must be resolved explicitly before adding it.
- ICS exports timed events as absolute UTC instants, using the Chicago DST offset on each endpoint. Known durations get `DTEND`; unknown durations omit both `DTEND` and `DURATION` and explain that uncertainty in the description. Calendar clients may choose their own display duration for such entries.
- An item without a start exports as a date-only placeholder with an exclusive next-day end. Unless explicitly all day, its description says the time is unspecified.
- Existing `opens`, `closes`, and update timestamps carry explicit offsets and display in Chicago time.

The October 19, 2026 AfterQuery end is corrected to the verified 11:50 AM CDT (16:50 UTC), with its 11:30 AM start preserved. This is the only data-field change.

## Seven-day calendar

The right panel starts on Chicago today and shows the following six days. Previous/next move by seven days; Today returns to the rolling current week. The left timeline is preserved. The calendar stays collapsed initially on phones and scrolls horizontally within its own panel when all seven columns do not fit.

Recorded intervals become proportional duration bars. Overlaps share the day column side by side. Overnight intervals split at Chicago midnight. Assignment/attendance due times use diamond points; unknown end times use open-circle points with no duration. Explicit all-day records and records with unspecified times appear in the date-only section with distinct labels. No duration is guessed.

The time grid includes all hours and initially scrolls to 8 AM. Scroll vertically for earlier or later events. Positions use elapsed minutes, so DST days contain 23 or 25 hours; affected columns show their actual local clock labels and a DST explanation. Ranges crossing a DST change label both endpoint zones.

## Ask ChatGPT

The button opens an editable prompt review inside the details panel. The prompt includes the existing item's title, date, notes, details, and exact source URL when recorded. URLs are never guessed or truncated. Missing item links are explicitly flagged; a course page is not substituted for an assignment URL. No-AI restrictions found in existing records for the same course are carried into the prompt and override requests for drafting.

Copy prompt copies the full reviewed text. If clipboard access fails, the text is selected for manual copying. Open ChatGPT opens `https://chatgpt.com/` in a separate tab without a prompt query or automatic sending. Paste the prompt into a new ChatGPT chat, or into the current dot conversation to continue there. The page does not insert text into an existing dot, control the connected Mac, operate Canvas, or submit work.

The [official site-tools documentation](https://learn.chatgpt.com/docs/webmcp) describes its Open in ChatGPT example as opening a new chat with a prompt ready to send. It does not establish a generic public prefill link for this tracker or a way to address an existing dot; this implementation uses the explicit copy/paste handoff instead.

## Completion and publication

Completion uses the existing `upnext-done` localStorage key and unchanged item IDs. Labels explicitly say device-local. There is no cross-device synchronization. A storage failure reports that the check only lasts for the current page session.

Hosting uses the existing public GitHub Pages configuration without a login. Completion is device-local. Existing source data is preserved except for the verified AfterQuery end correction; this redesign adds no meeting links, private mail content, services, permissions, or credentials.

The external updater may change this folder independently. It has not been operated or modified. Before publishing updates, fetch upstream, compare this folder against the current base, preserve fresh records, and apply the AfterQuery correction only to its matching existing event. Reconcile conflicting page edits instead of replacing the whole folder. The updater must preserve the `app.js`, `time.js`, `calendar.js`, `prompt.js`, and `styles.css` references if it rewrites `index.html`.

`.local-review/` is ignored and contains local screenshots, before snapshots, test output, and the review patch. Do not publish or upload those artifacts with private data. Keep tracker source changes confined to this folder and preserve unrelated site files.
