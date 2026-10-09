# Install the Scratch-Pad extension

The extension is ready to load from the `extension/` folder. No build, API key, or separate extension login is needed. It opens [Scratch-Pad](https://scratch-pad-omega.vercel.app) in a small window using your browser profile's existing login. If you're signed out, log in in that window and the link you were saving will follow you.

## Chrome, Edge, or Brave

1. Open `chrome://extensions` in Chrome, `edge://extensions` in Edge, or `brave://extensions` in Brave.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository's **extension** folder, which contains `manifest.json`. Select the folder itself, rather than the repository root or the manifest file.
5. Open the browser's Extensions menu and pin **Scratch-Pad** to the toolbar.

This is the [standard Chrome unpacked installation flow](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-an-unpacked-extension). The shared manifest requires Chrome 121 or newer.

Keep the folder in place: the browser loads the extension from it. After updating its files, click **Reload** on the Scratch-Pad card on the Extensions page.

## Use it

- **Save the current page:** click the Scratch-Pad toolbar icon or press **Alt+Shift+S**.
- **Save a link:** right-click it and choose **Save link to Scratch-Pad**.
- **Save a page from its menu:** right-click the page background and choose **Save page to Scratch-Pad**.
- **Save a link in text:** select text containing a web URL, right-click, and choose **Save link in selection**. Scratch-Pad extracts the first URL.
- **Open your library:** right-click the toolbar icon and choose **Open Scratch-Pad**.

Review the title, tags, and note in the add dialog, then choose **Save**. The success message appears briefly before the window closes. **Cancel**, **Escape**, and the dialog's close button also close the window. Browser settings and other non-web pages open a blank add dialog.

To change the shortcut in Chromium browsers, open their `extensions/shortcuts` page, such as `chrome://extensions/shortcuts`.

## Firefox

Firefox 140 or newer is required by this extension's data-consent declaration.

For a temporary installation:

1. Open `about:debugging`.
2. Choose **This Firefox → Load Temporary Add-on**.
3. Select `extension/manifest.json`.

Temporary installations are removed when Firefox restarts. For a permanent installation in regular Firefox, Mozilla must sign the add-on; see its [signing and distribution guide](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

Create an addons.mozilla.org developer account and API credentials, set `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` in your terminal, then run these commands from the repository root:

```sh
npx web-ext lint -s extension --ignore-files '**/*.test.js'
npx web-ext sign -s extension --channel=unlisted --ignore-files '**/*.test.js' --api-key="$WEB_EXT_API_KEY" --api-secret="$WEB_EXT_API_SECRET"
```

Open `about:addons`, choose the gear menu's **Install Add-on From File**, and select the signed `.xpi` in `web-ext-artifacts/`. The extension is unlisted. Increase the manifest version before signing each subsequent update. Credentials and generated signing artifacts stay out of Git.

## Local development and checks

The extension defaults to the hosted app. To use your local app, change `APP_URL` in `extension/share-url.js` to `http://127.0.0.1:5173`, run `npm run dev`, and reload the extension. Restore the hosted URL when you're done.

Unit tests run with `npm test`. To test a loaded extension against local Supabase:

```sh
npm run db:start
npx playwright install chromium
npm run test:extension
```

The browser tests use an isolated Chromium profile and a disposable extension copy pointing at the test server on port 5174. They invoke the registered background handlers inside the loaded extension and exercise real browser popup creation, login, saved links, duplicate editing, session reuse, Cancel/Escape, and window closing. They leave the installed extension and the production URL untouched. Physical toolbar clicks, right-click menus, and shortcut gestures remain manual checks.

The extension requests only `activeTab` and `contextMenus`. It sends the URL/title or text you choose to Scratch-Pad when invoked; it has no content scripts or host permissions.
