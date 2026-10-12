# BRANCH_INVENTORY.md — what Jahanvi's frontend actually contains

**Status: EMPTY — task I.1 fills this in.**

Nobody has read her code yet. This file is the shared map. Every later task reads
it instead of re-exploring the repo, which is the single biggest context saving
available in this project.

Fill every `<fill in>`. If something does not exist, write `NONE` — that is
information too, and "I couldn't find it" is not the same as "it isn't there."
Be specific: real file paths, real component names, real prop names.

---

## I.1.a — File map

List every file under `frontend/src` with one line on what it does.

```
<fill in>
path/to/File.jsx — what it renders / what it owns
```

Framework and tooling actually in use (check `package.json`, do not assume):

- Build tool: `<fill in>` (Vite? Next? CRA?)
- Styling: `<fill in>` (Tailwind / CSS modules / styled-components / plain CSS)
- 3D stack: `<fill in>` (@react-three/fiber + drei versions)
- State: `<fill in>` (useState / context / zustand / redux)
- Data fetching: `<fill in>` (fetch / axios / react-query / none yet)
- Anything unexpected: `<fill in>`

---

## I.1.b — Where the prediction data enters

This decides how the real API gets wired in.

- File and line where prediction data is currently produced: `<fill in>`
- Is it a mock function, a hardcoded object, or already a fetch? `<fill in>`
- **The exact shape of the object her components consume** — paste the real
  object, not a summary:

```json
<fill in>
```

- Which components read it, and which fields each one reads: `<fill in>`
- Is there a loading state already? An error state? `<fill in>`

### Contract reconciliation
Compare the shape above against `API_CONTRACT.md` and fill this table. This is
the deliverable of I.1 — task I.2 is driven entirely by it.

| her field | contract field | same? | decision |
|---|---|---|---|
| `<fill in>` | `<fill in>` | yes/no | adapt in frontend / rename hers / change contract (log it) |

Default decision when they differ: **write an adapter function in the frontend**
that maps the contract response into her shape. One function, one file, easy to
delete later. Do not scatter renames through her components, and do not change
the backend — the backend is already tested against the contract.

---

## I.1.c — The 3D heart

- Component file: `<fill in>`
- GLB path and how it is loaded: `<fill in>`
- Node names she reads for the arteries: `<fill in>`
  (do these match `LAD` / `LCX` / `RCA` / `LeftMain` / `Veins` / `Conduction` /
  `Heart`? If she renamed them, note the mapping)
- How colour is applied to a vessel: `<fill in>`
- Does she use `color_hex` from the payload, or compute colour client-side?
  `<fill in>` — if she computes it, note it; the contract says the payload
  decides, and that is a spec-wins item only because the thresholds live server
  side. Discuss in `QUESTIONS.md` before changing her code.
- Camera / OrbitControls setup, including `autoRotate` and any axis rotations
  already applied to the group: `<fill in>`
- Is there a heartbeat animation? Where: `<fill in>`

---

## I.1.d — Patient selection

- Is there a dropdown or patient picker at all? `<fill in>`
- Where does its list come from (hardcoded array / mock / fetch)? `<fill in>`
- How many entries does it show today? `<fill in>`
- Is there any "add new patient" path? `<fill in>`
- Which input fields exist in her form, grouped as she grouped them: `<fill in>`
- Are Age / Sex / Typical Chest Pain / HTN / DM present, and are they editable
  after a recorded patient is selected? `<fill in>`

---

## I.1.e — What she already built from the old UI_SPEC

Walk `UI_SPEC.md` and mark each numbered item against *her* build, not the old
one. This tells Phase K what is actually left.

| spec id | present in her build? | notes |
|---|---|---|
| 1.1–1.7 empty state | `<fill in>` | |
| 2.x patient input | `<fill in>` | |
| 3.x request lifecycle | `<fill in>` | |
| 4.x results display | `<fill in>` | |
| 5.x 3D | `<fill in>` | |
| 6.x vessel inspection | `<fill in>` | |
| 9.7 disclaimer | `<fill in>` | **pass/fail requirement — check carefully** |

---

## I.1.f — Things that will bite

Note anything that will make integration awkward, however small:

- Hardcoded values that need to become dynamic: `<fill in>`
- Places where mock data shape is assumed deep inside a component: `<fill in>`
- Console errors or warnings on a clean `npm run dev`: `<fill in>`
- Node version / install problems: `<fill in>`
- Does `npm run dev` even start cleanly on her branch? Paste the output:
  `<fill in>`

---

## I.1.g — Verified running

Before marking I.1 done:

```bash
cd frontend && npm install && npm run dev
```

- It starts: yes/no `<fill in>`
- The heart renders in the browser: yes/no `<fill in>`
- Console is clean: yes/no, paste any errors `<fill in>`

If her branch does not run, **stop and log it.** Do not start modifying code on
top of a build that was already broken — you will not be able to tell your
breakage from hers.
