### [2026-10-11] seeded by planning — one-click patient report
Added `07_PATIENT_REPORT.md` (Phase U). A "Download report (PDF)" button that
prints the on-screen result: patient inputs, predicted outcome, contributing
factors with the patient's own values, model limitations, date/time stamp.
Not directly scored. It sits under step 10 "Everything else" of the re-weighted
order in `03`. Build AFTER N.1, R.2, T and P.1/P.4/P.5, and BEFORE Phase V.
Decision: browser print-to-PDF with a print-only `ReportView` mounted through a
portal. The portal target `#report-root` must sit OUTSIDE `#root` in index.html,
or the print rule that hides `#root` hides the report too. Do NOT use
html2canvas + jsPDF unless U.7 shows the print route failing.
Footer: use a repeating `<tfoot>`, not `position: fixed`. A fixed footer repeats
but overprints the body text.
Hard rules: built from the SAME adapted prediction object as the screen (no second
API call); disabled while stale/loading/empty/error; disclaimer on EVERY printed
page (9.7); NO treatment advice; no names or identifiers; client-side only.
MODIFIED means what `02` M.1 says (a What-If slider moved). J.4 is superseded. A
MODIFIED report prints the mandatory What-If caveat and omits the catheterisation
row; that row also appears only for an unmodified recorded patient.
Heart image: render-then-draw through a `SnapshotBridge`, composited onto a dark
backing because the shell is translucent. No `preserveDrawingBuffer`.
Limitations text comes from `/api/model-info` (Phase P), never typed in. Report id
uses a helper with a fallback, because `crypto.randomUUID` needs a secure context
and a demo over a LAN IP is not one.
Treatment grep: the ONLY permitted match is the mandatory What-If caveat.
NEXT AGENT STARTS AT: unchanged — the earliest unfinished task in the re-weighted
order. U.0 is reached only after N.1, R.2, T and P.1/P.4/P.5 are done.

### [2026-10-11] seeded by planning — saved snapshots, history and comparison
Added `08_PATIENT_HISTORY.md` (Phase V). PRIORITY: LOW. Last in the build order,
after Phase U. Not directly scored.
Honesty rule: the dataset is cross-sectional, so "history" only means "the model's
output changed because inputs were edited". Name it "Saved snapshots". Show the
differing inputs beside every change. Neutral wording and colour on deltas — no
"improved"/"worsened", no green-good/red-bad. A snapshot taken while MODIFIED is
tagged as what-if values, never as the patient's recorded values.
Privacy rules: nothing stored until the user consents; saving is an explicit
`Save snapshot` click, never automatic; no identifiers or free text; the
catheterisation label, heart image and assumed fields are never stored; storage is
this-device only (no server, no network call from history code); `Delete all` is
always visible; 30-day purge; 20-entry cap; every storage call in try/catch.
Layout: Save/History buttons live in the RESULTS column; the history drawer
overlays the page and must not change left-column or canvas height (05).
Cut-down version if time is short: V.1, V.3, V.4, V.5 with IN-MEMORY storage only.
No consent dialog is then needed because nothing persists.
Needs no backend change: thresholds are stored per snapshot, and a mismatch shows
a "different model settings" warning in the compare view.
NEXT AGENT STARTS AT: unchanged — do NOT start Phase V until I, J.1, N.1, M/R, T,
P.1/P.4/P.5 and U are all ticked.
