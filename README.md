# Overleaf Editor Fonts+

Overleaf Editor Fonts+ is a small Chrome extension that adds extra developer‑friendly fonts to Overleaf's editor font list and lets you control which custom fonts appear there.

## What it does

- Injects additional font choices into Overleaf's **Menu → Settings → Appearance → Font family** dropdown.
- Applies your selected font to the Overleaf editor (Ace / CodeMirror).
- Lets you configure which fonts are available and their CSS `font-family` stacks from an options page.

## Install (Load unpacked)

1. Clone or download this repository.
2. In Chrome/Chromium‑based browsers, open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the folder that contains `manifest.json` (this repo’s root).

The extension should now appear as **Overleaf Editor Fonts+** in your extensions list.

## Configure fonts (Options page)

1. Go to `chrome://extensions`.
2. Find **Overleaf Editor Fonts+** and click **Details**.
3. Click **Extension options**.
4. In the options page you can:
   - Enable/disable individual custom fonts.
   - Edit the display name shown in Overleaf.
   - Edit the CSS `font-family` stack (e.g. `"JetBrains Mono", "JetBrainsMonoNL", monospace`).
   - Add new custom fonts or restore defaults.
5. Click **Save**, then reload your Overleaf tab and reopen **Menu → Settings → Appearance** to see the updated list.

Note: A font will only render correctly if it is installed/available on your system; otherwise the browser will fall back to a default monospace font.

