# QUESTIONS.md — agent → human

Append questions here. The human reads this between sessions and writes answers
inline. Mention in your `PROGRESS_LOG.md` entry that questions are waiting.

## Rules

1. **Do not stall.** Ask, then pick the safer default, log the choice, keep
   working. A blocked session is a wasted session.
2. **The safer default is almost always "change less of Jahanvi's code."**
3. Do not ask what `BRANCH_INVENTORY.md` would answer if you read her code.
4. Do not ask about code style, file placement, or naming — decide and log.
5. Mark a question `[BLOCKING]` only if it is genuinely irreversible and you
   truly cannot proceed on anything else. Check whether another task is
   unblocked first.
6. When answered, mark `ANSWERED` and leave it — do not delete. The history is
   why a decision was made.

## Format

```
### Q<n> — <one-line question>   [status: OPEN | ANSWERED | BLOCKING]
Context: <why this came up, which task>
Options: a) <...>  b) <...>
I proceeded with: <the default you chose, so work continued>
Reversible: yes/no — <how hard to undo>
---
ANSWER: <human writes here>
```

---

## Open questions

### Q1 — Which 5 patients for the demo dropdown?   [status: OPEN]
Context: task J.2. I need a clear-CAD case, a clear-normal case, a borderline
case, a single-vessel case, and one the model gets wrong.
I proceeded with: ran the model over the dataset and picked candidates that fit
each slot; ids recorded in `backend/demo_patients.json`.
Reversible: yes — one line of JSON.
---
ANSWER:

### Q2 — Keep the deliberately-wrong patient in the dropdown?   [status: OPEN]
Context: task J.2, slot 5. Showing a failure case builds far more credibility
with clinical judges than five wins, but it is the human's call whether to put a
miss on stage.
I proceeded with: included it.
Reversible: yes.
---
ANSWER:

---

## Answered

_(move answered questions here)_
