# Landing page — copy corrections & missing sections

Written 2026-08-01, alongside the visual/animation pass on `/` (Hero →
AboutTeacher → AboutAcademy → Philosophy → Inscription).

**Nothing in Part 1 has been applied.** `CLAUDE.md` forbids editing user-facing
marketing copy on the landing pages, so every wording change below is written
out as an exact find/replace for you to approve. The visual work shipped
independently — no rendered string changed. Once you approve a row, applying it
is a literal copy/paste.

Line numbers are as of commit `90d4311` **plus** the visual pass, i.e. the
current working tree.

---

## Part 1 — Text to correct

### 1.1 Blocking: mixed _voseo_ / _tuteo_

This is the one real error on the page, and it runs through every section. The
site addresses the reader with Argentine **voseo** in some places ("Conocé",
"el pianista que hay en vos") and with peninsular/neutral **tuteo** in others
("Domina", "Aprende", "Únete", "que llevas dentro"). Both forms appear inside a
single sentence in the hero. For a neighbourhood academy in Buenos Aires, voseo
is the correct register throughout, and it is what the footer and the
"Conocé tu instructora" heading already use.

| #   | File : line                               | Current                                                                                                  | Proposed                                                                                                     | Why                                                                                                           |
| --- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| A1  | `components/Hero/index.tsx:28-30`         | Domina el arte del piano con clases presenciales diseñadas para sacar al pianista que **llevas** dentro. | **Dominá** el arte del piano con clases presenciales diseñadas para sacar al pianista que **llevás** dentro. | `Domina`/`llevas` are tuteo; the footer already says "el pianista que hay en vos".                            |
| A2  | `components/Hero/index.tsx:35`            | **Comienza** hoy mismo                                                                                   | **Comenzá** hoy mismo                                                                                        | Same. This is the primary CTA.                                                                                |
| A3  | `components/AboutAcademy/index.tsx:47-48` | **Aprende** de instructores experimentados…                                                              | **Aprendé** de instructores experimentados…                                                                  | Same.                                                                                                         |
| A4  | `components/AboutAcademy/index.tsx:60-61` | **Únete** a una comunidad de pianistas…                                                                  | **Sumate** a una comunidad de pianistas…                                                                     | `Únete` is tuteo; the voseo imperative `Unite` is correct but reads stiff — `Sumate` is the natural register. |
| A5  | `components/Inscription/index.tsx:19-21`  | **Únete** a nuestra academia hoy y **descubre** la alegría de tocar el piano con la guía de expertos.    | **Sumate** a nuestra academia hoy y **descubrí** la alegría de tocar el piano con la guía de expertos.       | Two tuteo verbs in the final CTA paragraph.                                                                   |
| A6  | `components/Philosophy/index.tsx:38-39`   | **Sigue** tu pasión y **comienza** a tocar la música que siempre **soñaste** interpretar.                | **Seguí** tu pasión y **comenzá** a tocar la música que siempre soñaste interpretar.                         | `soñaste` is already correct in both forms; only the two imperatives change.                                  |
| A7  | `components/AboutAcademy/index.tsx:34-35` | Clases adaptadas a **tu** nivel…                                                                         | _(no change)_                                                                                                | Listed only to confirm it is already correct — possessives are identical in both forms.                       |

### 1.2 Grammar

| #   | File : line                               | Current                                       | Proposed                                               | Why                                                                                                                                                                                             |
| --- | ----------------------------------------- | --------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | `components/AboutTeacher/index.tsx:25`    | Conocé tu instructora                         | Conocé **a** tu instructora                            | Missing the personal _a_, which Spanish requires before a human direct object. "Conocé tu instructora" is ungrammatical.                                                                        |
| B2  | `components/AboutTeacher/index.tsx:40-41` | …en niveles preescolar, primaria y secundaria | …en **los** niveles **inicial**, primario y secundario | Two issues: the article is missing, and the adjectives disagree with the masculine `niveles`. `inicial` is also the current name of that level in the Argentine system (`preescolar` is dated). |

### 1.3 Consistency & precision

| #   | File : line                               | Current                                                                                    | Proposed                                                                       | Why                                                                                                                                                                                                                                      |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `components/AboutAcademy/index.tsx:47-48` | Aprende de **instructores experimentados** con formación académica y experiencia escénica. | Aprendé de **una instructora** con formación académica y experiencia escénica. | The academy is one teacher — Roxana — as the section directly above states. Plural "instructores" (also masculine) contradicts it and reads as filler. **Decide this one before the others: it is a factual claim, not a style choice.** |
| C2  | `components/AboutAcademy/index.tsx:60-61` | …con recitales regulares y oportunidades de actuación.                                     | …con recitales **periódicos** y oportunidades de **tocar en vivo**.            | "regulares" is a false friend here (reads as "average/so-so"); "oportunidades de actuación" is a literal rendering of "performance opportunities" and sounds like acting, not playing.                                                   |
| C3  | `components/AboutAcademy/index.tsx:14`    | ¿Por qué elegir nuestra academia?                                                          | _(no change)_                                                                  | Confirmed correct.                                                                                                                                                                                                                       |
| C4  | `components/Footer/index.tsx:21`          | Blvd. F.i.n.c.a 6142 Local 12                                                              | _(no change)_                                                                  | Verified against the embedded Google Maps tile in the same page — the street really is spelled "Blvd. F.i.n.c.a". Looks like a typo; is not one.                                                                                         |
| C5  | `components/Hero/index.tsx:22-24`         | Clases de Piano / Ciudad Jardín, Buenos Aires                                              | _(no change)_                                                                  | Matches `homeMetadata` and the LocalBusiness JSON-LD. Do not touch — see the SEO rule in `CLAUDE.md`.                                                                                                                                    |

### 1.4 Structural (no text changes, listed for completeness)

| #   | File : line                               | Issue  | Proposed |
| --- | ----------------------------------------- | ------ | -------- |
| D1  | `components/AboutTeacher/index.tsx:25`    | `<h1>` | → `<h2>` |
| D2  | `components/AboutAcademy/index.tsx:13-15` | `<h1>` | → `<h2>` |

The page currently renders **three** `<h1>`s: the hero title plus these two.
Exactly one `<h1>` per document is the rule search engines and screen-reader
rotors both assume, and the hero is unambiguously the right one to keep. This
changes no visible text — `.sectionTitle` sets the size, not the tag — but it
does touch heading structure, which `CLAUDE.md` puts under the SEO freeze, so
it is parked here rather than applied. **Recommended.**

---

## Part 2 — Sections the landing page is missing

Ordered by what each is worth against the effort to build it. Sections 2.1 and
2.2 are the two that most directly move enrolments.

### 2.1 Testimonials / social proof — **highest value, currently absent**

The page asks for a commitment (a Google Form, then money and a weekly time
slot) with zero third-party evidence behind it. The Google Business profile
embedded in the map already shows **5.0 ★ from 6 reviews** — that rating is on
the page today, in an iframe, at 11px, unreadable and unattributed.

- **Placement:** between `AboutAcademy` and `Philosophy` — after the reasons,
  before the manifesto.
- **Content:** 3 quotes, each with a first name, the student's age or "mamá de
  {nombre}", and how long they have been studying. Parents of young children
  are the buying audience; quotes from parents outperform quotes from students.
- **Build:** `components/Testimonials/` (`index.tsx` + `.module.scss`), same
  card treatment as `AboutAcademy` — reuse `.featureCard`'s radius/border/hover
  rather than inventing a second card style. Wrap each in `<Reveal>` with a
  110ms stagger, as the feature cards do.
- **SEO:** worth adding a `Review`/`AggregateRating` JSON-LD block in
  `lib/seo/` next to `localBusiness.ts` — but **only** with real, attributable
  reviews. Fabricated ratings are a manual-action risk.
- **Blocked on:** you supplying real quotes with permission to publish.

### 2.2 Pricing & class formats — **highest-intent question, unanswered**

Nothing on the site says what a class costs, how long it lasts, how often it
runs, or whether there are trial classes. This is the single most common reason
a visitor leaves a music-school page. `/faq` may cover some of it, but that is
two clicks from the decision point.

- **Placement:** between `Philosophy` and `Inscription`, so the price is
  answered immediately before the CTA.
- **Content:** 2–3 plan cards — e.g. _Individual_, _Dúo_, _Prueba_. Each with
  duration, frequency, who it suits, and a price (or an explicit "consultá el
  valor" if you would rather not publish numbers, which is still better than
  silence).
- **Build:** `components/Plans/`. Mark one card as recommended with the
  `--grad-green` treatment already used by `.btnPrimary`.
- **Note:** if prices are published, they need a review cadence — a stale price
  is worse than none. Argentine inflation makes this a real maintenance cost;
  "desde $X" or a per-term figure ages better than an exact monthly number.

### 2.3 How a class actually works / method

`Philosophy` explains the _values_; nothing explains the _mechanics_. A parent
wants to know: what happens in the first class, does the child need a piano at
home, what age can they start, how long until they play a recognisable song.

- **Placement:** after `AboutAcademy`.
- **Content:** a 4-step horizontal timeline — _Clase de prueba → Diagnóstico →
  Plan personalizado → Primer recital_.
- **Build:** `components/HowItWorks/`. Numbered steps with a connecting line;
  the alternating brand colours from `.accentBlue/.accentPurple/.accentOrange`
  already give you the palette.

### 2.4 Student work — audio or video

A piano school with no sound on its landing page is a missed trick, and the
YouTube channel (`@roxanaarena618`) is already linked but never surfaced.

- **Placement:** after the testimonials.
- **Content:** 2–3 embedded student performances, or a single reel.
- **Build:** lazy `<iframe>` behind a poster image — a bare YouTube embed adds
  ~500KB and a third-party cookie to a page that currently ships ~115KB. Use
  `youtube-nocookie.com`.
- **Note:** needs written parental consent for any identifiable minor.

### 2.5 FAQ preview

`/faq` exists as a separate page. The three or four highest-intent questions
(age, home piano, trial class, location/parking) belong on the landing page as
an accordion, with a link through to the full page.

- **Placement:** after the plans, before the final CTA.
- **Build:** reuse the existing `app/faq` item component rather than writing a
  second accordion.

### 2.6 Contact form

Every CTA on the page — the hero, the nav, the final band — points at the same
external Google Form. That is a hard exit off the site, it breaks the visual
flow, and it drops the analytics trail at exactly the conversion point.

- **Options:** (a) keep the form but add WhatsApp as a parallel, lower-friction
  path — the FAB exists but is never mentioned in the copy; (b) inline the
  fields with `react-hook-form` + `zod` (both already dependencies) posting to a
  static-friendly endpoint (Formspree, Web3Forms). `output: 'export'` rules out
  a Next.js route handler.

### 2.7 Trust strip

One quiet row under the hero: years teaching, number of students, conservatory
affiliation, "a X cuadras de la estación". Cheap to build, and it front-loads
credibility above the fold where it currently does the most work.

---

## Part 3 — What the visual pass already changed

Recorded so this document reads as a complete picture of the page. All of this
is applied and in the tree; none of it altered a rendered string.

- **Buttons** moved from `styles/_components.scss` into `styles/globals.scss`
  and were rebuilt: `.btnPrimary` (brand-green gradient, `--green-900` label,
  5.7:1), `.btnSecondary` (blue), and a new `.btnLight` for coloured bands. The
  old `.btnSecondary` was pale lilac on white — the lowest-contrast element on
  the page was the final call to action.
- **Two new green tokens**, `--green-800` and `--green-900`. Same hue as
  `--green-500`; they exist because the brand green cannot carry white text at
  AA on its own (`--green-700` is 4.2:1, `--green-900` is 10.6:1).
- **`components/AmbientNotes/`** — the drifting white SVG field, on all five
  sections. Masked away from the reading column on desktop and dropped to 30%
  on mobile; switched off entirely under `prefers-reduced-motion`.
- **`components/Reveal/`** — scroll-triggered entrances, one-shot. The hidden
  start state is gated behind `@media (scripting: enabled)` so a JS failure can
  never leave the page blank.
- **The `Inscription` band is now deep green** rather than white, which is what
  makes the white ambient glyphs legible there and gives the page a green
  bookend (header → CTA → footer).
- **Fixed along the way:** the hero title overflowed the viewport at ≤390px
  (`white-space: nowrap` against a fixed 1.75rem); the footer's social hover was
  yellow-on-green at 1.4:1; `Inscription` was marked `'use client'` without
  needing to be.
