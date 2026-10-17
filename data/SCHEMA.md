# Data model (one canonical source per content type)

All files are `{ "items": [ ... ] }` (a plain array or `{ "status": "ok", "data": [ ... ] }` also works).
The Home Page, and every future dedicated page, must read these same records — never copy them.

## Common rules
- `id` — required, stable and unique per file. Never reuse or change it (links depend on it).
- `slug` — optional URL-friendly identifier (e.g. `coach-1`); links use `slug`, falling back to `id`.
- `published` — must be explicitly `true` (or `status: "published"`) to appear. A missing field means **hidden**.
  `active: false` also hides a record.
- Feedback needs `approved: true` (or `status: "approved"`); a missing field is **not** approval.
- Arabic text: add `<field>_ar` next to any text field (`title_ar`, `intro_ar`…).
- There is no item limit anywhere: every public record is rendered.

## coaches.json
| Field | Home card | Notes |
|---|---|---|
| `id`, `slug`, `name`, `published` | yes (name) | required: id, name, published |
| `role` (or `specialty`) | yes | |
| `intro` | yes | one short sentence |
| `image` | yes | e.g. `assets/images/Coach1.jpg` |
| `bio`, `qualifications[]`, `experience`, `specialties[]`, `ageGroups[]`, `achievements[]`, `photos[]`, `programIds[]`, `contact{}` | no | future directory / profile page. Show only what exists. |

## programs.json
`id`, `title`, `published` (required) · `slug`, `ageRange`, `tagline`, `image`, `url` (a real page; otherwise the card is not a link)

## gallery.json
`id`, `src`, `published` (required) · `alt`, `caption`

## Feedback
Feedback is not a JSON file any more: it lives in the private "PLV Feedback" Google Sheet and is served by the feedback web app
(`CONFIG.FEEDBACK_API_URL`). Only rows with `Visibility = Visible` are returned, with public fields only:
`id`, `name`, `type` (Parent/Player), `rating` (1-5 in 0.5 steps), `message`, `date`, `order`, `home`. See `apps-script/SETUP.md`.

## Coaches page and coach pages (read from the "Coaches" tab, same tab as the Home page)
Required: `id`, `name`, `published`. Existing columns still used: `name_ar`, `role`, `role_ar`, `intro`, `intro_ar`, `image`, `slug`, `order`.
Optional columns you can add to the same tab (empty = that block simply does not show; every cell is limited to 400 characters):

| Column | What it is |
|---|---|
| `kind` | `head` or `assistant` (the first row counts as head coach when empty) |
| `specialization`, `specialization_ar`, `experience`, `experience_ar` | one line each, shown under the name |
| `bio`, `bio_ar` | full biography for the coach page (the card shows `intro`) |
| `philosophy`, `philosophy_ar` | short text |
| `specializations`, `qualifications` (+ `_ar`) | items separated by `|` |
| `stats` (+ `stats_ar`) | `12 Years as a player | 2 Years as a coach`: a number, then the label |
| `achievements` (+ `_ar`) | `1st Academies Tournament | 2nd Girls Tournament`: the place, then the title |
| `timeline` (+ `_ar`) | `2019: First title | 2025: Founded the academy` |
| `about_photo`, `photos` | `https://...` or a site path (`assets/images/...`); `photos` takes several separated by `|`. Drive share links are not converted for these two columns |

One published row = one coach card. With no published rows the Coaches page shows a short "announced soon" message.

Home page selection (optional columns): `show_on_home` (TRUE = this coach also appears on Home) and `home_order` (1, 2, 3... order on Home). Without a `show_on_home` column, Home shows every published coach.
