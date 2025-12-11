// Content script: runs on Overleaf pages
// Goal for first iteration:
// - Detect the Overleaf settings modal
// - Locate the editor font family dropdown
// - Log and (optionally) augment the dropdown for debugging

(() => {
  const STORAGE_KEY_FONTS = "overleaf-fonts-plus-fonts";

  const DEFAULT_FONTS = [
    {
      id: "ia-writer-duospace",
      label: "iA Writer Duospace",
      // Try several known local names, then fall back.
      cssFamily:
        '"iA Writer Duospace", "iAWriterDuospace", "iA Writer Mono", monospace',
      enabled: true
    },
    {
      id: "jetbrains-mono-nl",
      label: "JetBrains Mono NL",
      // Try NL variant and the standard JetBrains Mono family names.
      cssFamily:
        '"JetBrains Mono NL", "JetBrainsMonoNL", "JetBrains Mono", "JetBrainsMono Nerd Font", monospace',
      enabled: true
    }
  ];

  let CUSTOM_FONTS = DEFAULT_FONTS.slice();

  function debugLog(...args) {
    // Namespace our logs to make them easy to filter.
    console.log("[Overleaf Fonts+]", ...args);
  }

  function findFontFamilySelect(root = document) {
    // Overleaf uses id="fontFamily" inside the settings modal
    return root.querySelector("#setting-fontFamily select#fontFamily");
  }

  function addCustomOptions(selectEl) {
    if (!selectEl) return;

    // Avoid duplicating options if we run twice.
    const markerAttr = "data-overleaf-fonts-plus";
    if (selectEl.getAttribute(markerAttr) === "1") {
      return;
    }

    CUSTOM_FONTS.forEach((font) => {
      const existing = selectEl.querySelector(
        `option[value="${font.id}"]`
      );
      if (!existing) {
        const opt = document.createElement("option");
        opt.value = font.id;
        opt.textContent = font.label;
        selectEl.appendChild(opt);
      }
    });

    selectEl.setAttribute(markerAttr, "1");
    debugLog("Injected custom font options into Overleaf dropdown.");
  }

  function loadCustomFonts(callback) {
    chrome.storage.sync.get(STORAGE_KEY_FONTS, (data) => {
      const stored = data[STORAGE_KEY_FONTS];
      if (Array.isArray(stored) && stored.length > 0) {
        CUSTOM_FONTS = stored.filter(
          (font) => font && font.enabled !== false
        );
        debugLog(
          "Loaded custom fonts from storage:",
          CUSTOM_FONTS.map((f) => f.label)
        );
      } else {
        CUSTOM_FONTS = DEFAULT_FONTS.slice();
        debugLog(
          "Using default fonts:",
          CUSTOM_FONTS.map((f) => f.label)
        );
      }
      if (typeof callback === "function") {
        callback();
      }
    });
  }

  function applyFontToEditor(fontCssFamily) {
    // Apply CSS overrides directly into any document that hosts an editor.
    // Historically Overleaf used Ace (`.ace_editor`); newer UI uses
    // CodeMirror 6 (`.cm-editor`). We support both.

    const EDITOR_SELECTOR_ACE = ".ace_editor";
    const EDITOR_SELECTOR_CM = ".cm-editor";
    const EDITOR_SELECTOR_ANY = `${EDITOR_SELECTOR_ACE}, ${EDITOR_SELECTOR_CM}`;

    function getEditorDocuments() {
      const docs = [];

      // Main document
      if (document.querySelector(EDITOR_SELECTOR_ANY)) {
        docs.push(document);
      }

      // Any same-origin iframes that contain the editor
      const iframes = Array.from(document.querySelectorAll("iframe"));
      for (const iframe of iframes) {
        try {
          const doc = iframe.contentDocument;
          if (doc && doc.querySelector(EDITOR_SELECTOR_ANY)) {
            docs.push(doc);
          }
        } catch (e) {
          // Cross-origin frame; ignore.
        }
      }

      debugLog("Editor host documents found:", docs.length);
      return docs;
    }

    const docs = getEditorDocuments();
    if (docs.length === 0) {
      debugLog("No Ace editor found yet; will rely on CSS being picked up later.");
    }

    docs.forEach((doc, index) => {
      const styleId = "overleaf-fonts-plus-style";
      let styleEl = doc.getElementById(styleId);
      if (!styleEl) {
        styleEl = doc.createElement("style");
        styleEl.id = styleId;
        doc.head.appendChild(styleEl);
      }

      if (!fontCssFamily) {
        styleEl.textContent = "";
      } else {
        styleEl.textContent = `
          .ace_editor,
          .ace_editor *,
          .cm-editor,
          .cm-editor * {
            font-family: ${fontCssFamily} !important;
          }
        `;
      }

      // Debug: log which font family the browser actually resolves.
      window.setTimeout(() => {
        const editor =
          doc.querySelector(EDITOR_SELECTOR_ACE) ||
          doc.querySelector(EDITOR_SELECTOR_CM);
        if (!editor) return;

        const resolved = doc.defaultView
          .getComputedStyle(editor)
          .fontFamily;
        debugLog(
          `Doc #${index + 1} editor computed font-family:`,
          resolved
        );
      }, 150);
    });

    if (!fontCssFamily) {
      debugLog("Reset custom font styling.");
    } else {
      debugLog("Applied custom font to editor:", fontCssFamily);
    }
  }

  function handleSelectChange(event) {
    const selectEl = event.target;
    if (!selectEl || selectEl.id !== "fontFamily") return;

    const value = selectEl.value;
    const custom = CUSTOM_FONTS.find((f) => f.id === value);
    if (custom) {
      applyFontToEditor(custom.cssFamily);
      chrome.storage.sync.set({ "overleaf-fonts-plus-current": custom.id });
    } else {
      // Let Overleaf handle its own built-in options; we just remove our override.
      applyFontToEditor(null);
      chrome.storage.sync.remove("overleaf-fonts-plus-current");
    }
  }

  function restoreLastSelection(selectEl) {
    if (!selectEl) return;
    chrome.storage.sync.get("overleaf-fonts-plus-current", (data) => {
      const savedId = data["overleaf-fonts-plus-current"];
      const custom = CUSTOM_FONTS.find((f) => f.id === savedId);
      if (!custom) return;

      const option = selectEl.querySelector(`option[value="${custom.id}"]`);
      if (option) {
        selectEl.value = custom.id;
        applyFontToEditor(custom.cssFamily);
        debugLog("Restored custom font selection:", custom.label);
      }
    });
  }

  function initOnceSettingsModalAppears() {
    // We use a MutationObserver to detect the settings modal when it opens.
    const observer = new MutationObserver(() => {
      const selectEl = findFontFamilySelect(document);
      if (selectEl) {
        addCustomOptions(selectEl);
        restoreLastSelection(selectEl);
        observer.disconnect();
        debugLog("Found fontFamily select and wired custom options.");
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // Also try immediately in case the modal is already open.
    const immediateSelect = findFontFamilySelect(document);
    if (immediateSelect) {
      addCustomOptions(immediateSelect);
      restoreLastSelection(immediateSelect);
      debugLog("fontFamily select already present, initialized immediately.");
    }
  }

  function initChangeListener() {
    document.addEventListener("change", handleSelectChange, true);
  }

  function main() {
    debugLog("Content script loaded.");
    loadCustomFonts(() => {
      initChangeListener();
      initOnceSettingsModalAppears();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
