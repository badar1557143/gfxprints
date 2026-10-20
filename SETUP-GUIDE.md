# Order intake setup (Google Apps Script)

The checkout sends each order and its print files to a Google Apps Script web app. The script saves
the details in a Google Sheet and the files in a Drive folder.

## A. Replace the old deployment (do this first, the old token was public)

1. Open the existing Apps Script project at script.google.com.
2. **Deploy -> Manage deployments** -> the active web app -> **Archive** (this switches the old URL off).
3. Replace the project code with `google-apps-script/Code.gs` from this repo.
4. Select `setup` in the function list and press **Run**. Allow the permissions.
   Open **Execution log**: it prints the new `ORDER_TOKEN`, the Sheet link and the Drive folder link.
   (If you want to keep your existing Sheet and folder, instead set the script properties
   `SHEET_ID` and `FOLDER_ID` by hand in Project Settings and only run `rotateToken`.)
5. **Deploy -> New deployment -> Web app**. Execute as **Me**, access **Anyone**. Copy the `/exec` URL.
6. In `js/main.js` set `ORDER_ENDPOINT` to that URL and `ORDER_TOKEN` to the new token.
7. Run `sh tools/build.sh`, then publish the site.

## B. Changing the token later

Run `rotateToken` in the editor, paste the new token into `js/main.js`, rebuild and publish. The old token stops
working immediately; no new deployment is needed.

## What the script protects against

Because the token is in public code, treat it as a "please don't" sign, not a lock. The script therefore also:
- rejects files that are not PNG, JPG, WebP or PDF, and takes the saved file extension from the checked type
- limits files per item, size per file and size per order
- limits orders per hour for the whole site and per phone/email
- cleans every text field and blocks spreadsheet formulas
- uses a lock so two orders cannot write at once

If you ever see spam in the Sheet, run `rotateToken` and lower the limits at the top of `Code.gs`.
