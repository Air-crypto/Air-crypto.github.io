# Up next tracker

This folder is a buildless static page. It uses the existing `data.json` and does not require a backend or new dependencies.

## Local review

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory up-next-a8d2ca51
node --test up-next-a8d2ca51/time.test.cjs
```

Open `http://127.0.0.1:8765`. The page retains the timeline, calendar, details, filters, existing source links, and email review. Filters and email review start collapsed. On small screens the calendar also starts collapsed. Native modal details support keyboard focus and Escape; colors follow the device appearance.

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

## Completion and publication

Completion uses the existing `upnext-done` localStorage key and unchanged item IDs. Labels explicitly say device-local. There is no cross-device synchronization. A storage failure reports that the check only lasts for the current page session.

Hosting uses the existing public GitHub Pages configuration without a login. Completion is device-local. Existing source data is preserved except for the verified AfterQuery end correction; this redesign adds no meeting links, private mail content, services, permissions, or credentials.

The external updater may change this folder independently. It has not been operated or modified. Before publishing updates, fetch upstream, compare this folder against the current base, preserve fresh records, and apply the AfterQuery correction only to its matching existing event. Reconcile conflicting page edits instead of replacing the whole folder. The updater must preserve the new `app.js`, `time.js`, and `styles.css` references if it rewrites `index.html`.

`.local-review/` is ignored and contains local screenshots, before snapshots, test output, and the review patch. Do not publish or upload those artifacts with private data. Keep tracker source changes confined to this folder and preserve unrelated site files.
