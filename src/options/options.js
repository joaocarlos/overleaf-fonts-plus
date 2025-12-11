(() => {
  const STORAGE_KEY_FONTS = "overleaf-fonts-plus-fonts";

  const DEFAULT_FONTS = [
    {
      id: "ia-writer-duospace",
      label: "iA Writer Duospace",
      cssFamily:
        '"iA Writer Duospace", "iAWriterDuospace", "iA Writer Mono", monospace',
      enabled: true
    },
    {
      id: "jetbrains-mono-nl",
      label: "JetBrains Mono NL",
      cssFamily:
        '"JetBrains Mono NL", "JetBrainsMonoNL", "JetBrains Mono", "JetBrainsMono Nerd Font", monospace',
      enabled: true
    }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(message, kind) {
    const el = $("status");
    el.textContent = message || "";
    el.classList.remove("status--ok", "status--error");
    if (kind === "ok") {
      el.classList.add("status--ok");
    } else if (kind === "error") {
      el.classList.add("status--error");
    }
  }

  function slugifyId(base) {
    const slug = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const rand = Math.random().toString(36).slice(2, 7);
    return slug ? `custom-${slug}-${rand}` : `custom-${rand}`;
  }

  function createRow(font) {
    const tr = document.createElement("tr");
    tr.dataset.id = font.id;

    const tdEnabled = document.createElement("td");
    const enabledInput = document.createElement("input");
    enabledInput.type = "checkbox";
    enabledInput.checked = font.enabled !== false;
    tdEnabled.appendChild(enabledInput);

    const tdName = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = font.label || "";
    nameInput.placeholder = "Display name (e.g. JetBrains Mono)";
    tdName.appendChild(nameInput);

    const tdFamily = document.createElement("td");
    const familyInput = document.createElement("input");
    familyInput.type = "text";
    familyInput.value = font.cssFamily || "";
    familyInput.placeholder =
      '"My Font", "My Font Alt", monospace';
    tdFamily.appendChild(familyInput);

    const meta = document.createElement("div");
    meta.className = "font-row-meta";
    meta.textContent = "Used as a CSS font-family stack.";
    tdFamily.appendChild(meta);

    tr.appendChild(tdEnabled);
    tr.appendChild(tdName);
    tr.appendChild(tdFamily);
    return tr;
  }

  function renderFonts(fonts) {
    const tbody = $("fonts-tbody");
    tbody.textContent = "";
    fonts.forEach((font) => {
      tbody.appendChild(createRow(font));
    });
  }

  function collectFontsFromUI() {
    const tbody = $("fonts-tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));
    const fonts = [];

    rows.forEach((tr) => {
      const id = tr.dataset.id || slugifyId("font");
      const [enabledInput] = tr.querySelectorAll('input[type="checkbox"]');
      const textInputs = tr.querySelectorAll('input[type="text"]');
      const nameInput = textInputs[0];
      const familyInput = textInputs[1];

      const label = (nameInput.value || "").trim();
      const cssFamily = (familyInput.value || "").trim();

      if (!label || !cssFamily) {
        return;
      }

      fonts.push({
        id,
        label,
        cssFamily,
        enabled: !!enabledInput.checked
      });
    });

    return fonts;
  }

  function loadFonts() {
    chrome.storage.sync.get(STORAGE_KEY_FONTS, (data) => {
      const stored = data[STORAGE_KEY_FONTS];
      if (Array.isArray(stored) && stored.length > 0) {
        renderFonts(stored);
      } else {
        renderFonts(DEFAULT_FONTS);
      }
      setStatus("", null);
    });
  }

  function saveFonts() {
    const fonts = collectFontsFromUI();
    if (fonts.length === 0) {
      setStatus("Please configure at least one font before saving.", "error");
      return;
    }
    chrome.storage.sync.set({ [STORAGE_KEY_FONTS]: fonts }, () => {
      setStatus("Saved fonts. Reload Overleaf tabs to apply changes.", "ok");
    });
  }

  function restoreDefaults() {
    renderFonts(DEFAULT_FONTS);
    setStatus("Restored default fonts. Click Save to apply.", "ok");
  }

  function addEmptyFontRow() {
    const tbody = $("fonts-tbody");
    const font = {
      id: slugifyId("font"),
      label: "",
      cssFamily: "",
      enabled: true
    };
    tbody.appendChild(createRow(font));
  }

  function main() {
    $("add-font").addEventListener("click", addEmptyFontRow);
    $("restore-defaults").addEventListener("click", restoreDefaults);
    $("save").addEventListener("click", saveFonts);
    loadFonts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();

