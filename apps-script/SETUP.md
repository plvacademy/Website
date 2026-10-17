# Registration backend — setup (Google Apps Script)

The website posts the registration form to your Apps Script web app. The success screen appears **only** after the
script confirms the row was saved (`{ "ok": true, "saved": true, "success": true }`).

> My environment cannot reach script.google.com or your spreadsheet, so `Registration.gs` was tested only against a
> simulated Sheets environment . A real save must be tested by you (step 4).

## 1. Install the code (one file, replaces the old script)
1. Open the Apps Script project behind your web app (the deployment is named *PLV Schedule API*).
2. **Delete the old code** (every file in the project) and paste the whole of `Registration.gs` into one file.
   Two copies of the same functions (`doGet`, `doPost`, `AREA_SHEETS`…) make the project fail to save.
3. Set the spreadsheet: either put its ID in `CONFIG.spreadsheetId` at the top of the file, or
   *Project Settings → Script properties → Add* `SPREADSHEET_ID` = the ID from the sheet URL (`/d/<ID>/edit`).
4. The old "Schedule" tab is never read or written by this script.

## 2. Create the three tabs (one time)
Choose the function `setupRegistrationSheets` → **Run** → approve the permissions.
You get the tabs **New Cairo**, **Heliopolis**, **Nasr City**, each with row 1 = `Timestamp | Full Name | Mobile | Age | Position`.
If a tab already exists with different headers, the script refuses to save (error `setup_error`) instead of guessing.

## 3. Deploy — keep your current URL
*Deploy → Manage deployments → ✏️ edit the existing Web app → Version: **New version** → Deploy.*
- **Execute as: Me** · **Who has access: Anyone** ("Anyone" only lets people *send* a registration; the sheet stays private).
- Use the URL that ends with **`/exec`** in `js/config.js` (`REGISTRATION_API_URL`). The `/dev` URL is a private test URL and cannot be used by the site.
- After every code change you must deploy a **new version**, otherwise the old code keeps answering `/exec`.
- Check: open the `/exec` URL in a browser → you should see `"service":"PLV Academy Registration API"`.

## 4. Real test (please do this)
1. Open the website → Programs → pick an area → register `TEST Delete Me` with a valid number.
2. A new row must appear in the matching tab only, with a server timestamp.
3. Repeat for the other two areas, then delete the test rows by hand.
4. If the site shows "We couldn't submit…", open *Apps Script → Executions* for the error, and press F12 on the site: the console line starting with `[PLV:registration]` names the failure type.

## What the backend checks
Area must be one of the three allowed names (the worksheet is chosen on the server) · name, mobile (Egyptian formats + international `+…`),
age 1–99 and position are re-validated · the timestamp is created on the server · a retry of the same request, or the same
area+name+mobile within 10 minutes, is confirmed without saving a second row · hidden honeypot field, minimum fill time, and a cap of
60 submissions per 10 minutes · rows are always appended below existing data · text cells are stored as text so `+20…` or `=…` can't become formulas ·
errors return generic codes; details only appear in the Apps Script log.

## Limits (honest)
The URL is public, so these protections are basic, not authentication. For stronger protection later, add a CAPTCHA
(e.g. Cloudflare Turnstile) verified inside the script. Do not rely on a hidden URL or an Origin check.

## Editing branches, coaches and gallery from a separate "PLV Website Content" sheet

Create a second spreadsheet (e.g. **PLV Website Content**) and put its ID in Project Settings -> Script properties as `CONTENT_SPREADSHEET_ID`. (Without it the registration spreadsheet is used.) Registrations stay in the private registration sheet. Run `setupRegistrationSheets` once: it creates the three tabs with headers and starter rows, and never edits a tab that already exists.

- **Areas** — `id, name, name_ar, active, order` (IDs L001, L002 ...). `active = TRUE` shows it. `name` must be English; it is also the registration tab name (created on the first registration).
- **Coaches** — `id, name, name_ar, role, role_ar, intro, intro_ar, image, slug, published, order` (IDs C001 ...).
- **Gallery** — `id, src, alt, alt_ar, published, order` (IDs G001 ...).

Rows are ordered by `order` when filled, otherwise by ID. Only rows with TRUE in `active` / `published` leave the sheet. Changes show on the site within about a minute (plus the browser cache). After pasting a new script, deploy a **new version** of the existing deployment.

### Photos from Google Drive

`CONFIG.driveFolders` points to two Drive folders (`coaches`, `gallery`). In the sheet write only the **file name** (e.g. `Coach1.jpg`) in `image` (Coaches) or `src` (Gallery); the script finds it in the folder. A Drive share link, a bare file ID, an `https://` link or a site path (`assets/images/...`) also work. Files must be shared "Anyone with the link" (Viewer). The first run after this change asks for permission to read Drive: run `setupRegistrationSheets` again and approve; the log tells whether each folder is readable. Deploy a **new version** afterwards.


## Feedback page (separate script, bound to the "PLV Feedback" sheet)
- Paste `apps-script/Feedback.gs` into Extensions -> Apps Script of the feedback sheet (tab `Feedback`), run `setupFeedback` once,
  then Deploy -> Web app (Execute as: Me, Access: Anyone). Put the `/exec` URL in `js/config.js` as `FEEDBACK_API_URL`.
- After changing the script: Deploy -> Manage deployments -> edit -> Version: New version (the URL stays the same).
- Columns: Feedback ID, Timestamp, Name, Type, Mobile, Rating, Feedback, Follow-up Required, Follow-up Status, Visibility,
  Show on Home, Display Order, Admin Notes. (`Show on Home` is optional; the others are required, matched by name.)
- New submissions are saved as `Visibility = Hidden`; set `Visible` to publish, `Show on Home = YES` to also show it on the Home page.
- Mobile numbers are saved as plain text in the `Mobile` column. They are never sent to the website. Keep the spreadsheet private (share it only with people who may see them).
