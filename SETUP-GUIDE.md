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

## C. Order emails (new)

The script now emails you every new order, and sends the customer a "we received your order" email when they typed an email address.
Orders are still saved to the Sheet and Drive first; if an email fails the order is not lost.

Turn it on (the web app URL and token stay the same, so `js/main.js` does not change):

1. In the Apps Script project, replace the code with the new `google-apps-script/Code.gs`.
2. At the top, check `MAIL.ownerEmail` is the inbox you want the "New order" emails in.
3. Select `testEmail` in the function list and press **Run**. Press **Allow** when Google asks for permission to send email. A test email arrives within a minute (check Spam).
4. **Deploy -> Manage deployments** -> the pencil next to the web app -> **Version: New version** -> **Deploy**. This step is needed or the website keeps using the old code.
5. Place a test order and check the inbox.

Notes:
- A free Gmail account can send about 100 emails a day. The last 20 are always kept for your own "New order" emails.
- Emails come from the Google account that owns the script. Customer replies go to `MAIL.ownerEmail`.
- To stop customer emails but keep yours, set `confirmCustomer: false`.

## What the script protects against

Because the token is in public code, treat it as a "please don't" sign, not a lock. The script therefore also:
- rejects files that are not PNG, JPG, WebP or PDF, and takes the saved file extension from the checked type
- limits files per item, size per file and size per order
- limits orders per hour for the whole site and per phone/email
- cleans every text field and blocks spreadsheet formulas
- uses a lock so two orders cannot write at once

If you ever see spam in the Sheet, run `rotateToken` and lower the limits at the top of `Code.gs`.
