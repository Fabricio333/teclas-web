# Piano input flow — known gaps

Status: **needs work.** This is a note, not a design. It records what the flow
actually does today so the next pass starts from facts instead of from memory.

## The two things called "input"

They are separate, and nothing reconciles them.

**`settings.inputMode`** — what the student _said_ they would play, chosen once
in `LearnOnboarding` and stored in the progress document
(`lib/progress/schema.ts:98`). One of `unset | acoustic | midi | keyboard`.

**`InputSource`** — what the engine _saw_ them use, tracked per note press
inside `PianoPlayer` (`qwerty | pointer | midi | microphone | system`). It
decides the minimum press duration and the default velocity, and it is what
gets filed with the run in `recordRun`.

A student can declare `acoustic` and play the whole piece on the QWERTY
keyboard. Nothing notices, and nothing should crash — but nothing adapts
either.

## What the declared mode actually changes

Only three things read `inputMode`:

1. `needsCalibration` — `acoustic && !isCalibrated` puts a dot on the Ajustes
   button (`PianoPlayer.tsx:274`).
2. The fullscreen note about which octave the computer keyboard can reach,
   shown only for `keyboard`.
3. Whether `LearnOnboarding` opens by itself on first load.

That is the whole of it. In particular:

- Choosing **acoustic does not turn the microphone on.** The mic is started
  only by the mic button. A student picks "un piano acústico", walks through
  calibration, comes back, plays — and nothing is listening.
- Choosing **midi does not check that a MIDI device is there.** MIDI is probed
  on load for everyone regardless, and the result is shown as a pill.
- Choosing **keyboard does nothing at all** beyond the fullscreen note.

## Scenarios to work through

Each of these should have one obvious next action on screen. Today most do
not.

| Declared | Reality                  | Today                                                           |
| -------- | ------------------------ | --------------------------------------------------------------- |
| acoustic | calibrated, mic off      | silent until they find the mic button                           |
| acoustic | never calibrated         | a dot on Ajustes, easy to miss                                  |
| acoustic | mic permission denied    | the button turns red, no recovery text                          |
| midi     | device connected         | works                                                           |
| midi     | no device connected      | pill says "available", no prompt to plug in                     |
| midi     | browser without Web MIDI | pill says "unsupported", no fallback offered                    |
| keyboard | —                        | works, but the reachable octave is only explained in fullscreen |
| unset    | dismissed the prompt     | plays fine, nothing configured                                  |

Also unresolved:

- **Two hands.** `recordRun` hardcodes `hand: 'right'`
  (`PianoPlayer.tsx`), so a left-hand run overwrites the right-hand personal
  best. The schema has a slot per hand; the caller does not use it.
- **Switching mid-session.** Changing the declared mode does not stop the mic,
  reset the detector, or re-run calibration checks.
- **Calibration staleness.** Calibration is measured once against one room and
  one instrument. Nothing expires it or notices that it no longer matches.

## What would make this coherent

A single place that answers "can this student play right now, and if not what
is the one thing to press". The declared mode should drive setup — start the
mic for acoustic, watch for a device on midi — and the observed source should
correct the declaration when they disagree, rather than the two drifting
apart in silence.
