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
