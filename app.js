/***********************
 * Supermarkt Route App (met autosuggest)
 * - Enter voegt item toe
 * - Onbekend product: kies categorie en onthoud (localStorage)
 * - Lijst blijft bewaard na sluiten (localStorage)
 * - Autosuggest onder input (werkt ook in “vastgezette” Safari app)
 ***********************/

// 1) Stel hier jouw loopvolgorde in
const CATEGORIE_VOLGORDE = [
  "Ingang",
  "Groente",
  "Fruit",
  "Verse sappen",
  "Kant en klaar maaltijden",
  "Vlees en Vis",
  "Bakkerij",
  "Vleeswaren",
  "Kaas",
  "Tapas en borrelhapjes",
  "Eieren",
  "Zuivel",
  "Boter",
  "Afbakbrood en ontbijt",
  "Zelf bakken en suiker",
  "Thee en koek",
  "Blikgroente",
  "Soep en worst",
  "Wereldkeuken",
  "Sauzen",
  "Vis in blik",
  "Wijn en bier",
  "Chips, toast en nootjes",
  "Fris",
  "Snoep en chocola",
  "Houdbare melk",
  "Sap in pak",
  "HEMA en kaarten",
  "Was en schoonmaak",
  "Plastic zakken",
  "Lamp en kaars",
  "Diepvries",
  "Pijnstillers etc",
  "Bloemen",
  "Overig",
  "Kassa"
];

// 2) Storage keys
const STORAGE_KEY_PRODUCTEN = "supermarkt_product_categorie_map_v1";
const STORAGE_KEY_BOODSCHAPPEN = "supermarkt_boodschappenlijst_v1";

// 3) State
let boodschappen = []; // array van strings (producten)
let productCategorieMap = loadProductMap();

// Autosuggest state
let suggestBoxEl = null;
let activeSuggestionIndex = -1;
let currentSuggestions = [];

/* ================= Helpers ================= */

function normalizeProductNaam(s) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function categorieIndex(cat) {
  const i = CATEGORIE_VOLGORDE.indexOf(cat);
  return i === -1 ? 9999 : i;
}

function loadProductMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTEN);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveProductMap() {
  localStorage.setItem(STORAGE_KEY_PRODUCTEN, JSON.stringify(productCategorieMap));
}

function loadBoodschappen() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOODSCHAPPEN);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBoodschappen() {
  localStorage.setItem(STORAGE_KEY_BOODSCHAPPEN, JSON.stringify(boodschappen));
}

/* ================= UI hooks ================= */

function getInputEl() {
  return document.getElementById("lijst");
}

function getResultaatEl() {
  return document.getElementById("resultaat");
}

function applyInputStyling() {
  const el = getInputEl();
  if (!el) return;

  el.style.width = "100%";
  el.style.fontSize = "18px";
  el.style.padding = "12px";
  el.style.boxSizing = "border-box";
  el.style.height = "48px";
}

/* ================= Autosuggest UI (custom) ================= */

function ensureSuggestBox() {
  const input = getInputEl();
  if (!input) return null;

  // Bestaat er al een suggestBox in HTML? Gebruik die.
  let box = document.getElementById("suggestBox");

  // Zo niet: maak er eentje direct onder het inputveld (dan hoef jij index.html niet aan te passen)
  if (!box) {
    box = document.createElement("div");
    box.id = "suggestBox";
    input.insertAdjacentElement("afterend", box);
  }

  // Basis styling (zodat het ook werkt zonder extra CSS)
  box.style.marginTop = "8px";
  box.style.marginBottom = "12px";

  return box;
}

function getKnownProducts() {
  // alleen producten die je al kent (geleerd). Je kunt ook boodschappen meenemen, maar meestal is dit genoeg.
  return Object.keys(productCategorieMap || []);
}

function buildSuggestions(query) {
  if (!query) return [];
  const all = getKnownProducts();
  // startsWith voor “begin met typen”; wil je “bevat” dan kun je startsWith vervangen door includes.
  return all
    .filter(p => p.startsWith(query))
    .sort((a, b) => a.localeCompare(b, "nl"))
    .slice(0, 6);
}

function clearSuggestions() {
  if (!suggestBoxEl) return;
  suggestBoxEl.innerHTML = "";
  currentSuggestions = [];
  activeSuggestionIndex = -1;
}

function renderSuggestions(list) {
  if (!suggestBoxEl) return;
  clearSuggestions();
  currentSuggestions = list;

  list.forEach((text, idx) => {
    const item = document.createElement("div");
    item.textContent = text;

    // Styling: compact, goed klikbaar
    item.style.background = "white";
    item.style.border = "1px solid #ddd";
    item.style.borderRadius = "10px";
    item.style.padding = "10px 12px";
    item.style.marginTop = "8px";
    item.style.fontSize = "18px";

    item.addEventListener("click", () => {
      const input = getInputEl();
      if (!input) return;
      input.value = text;
      clearSuggestions();
      input.focus();
    });

    suggestBoxEl.appendChild(item);
  });
}

function setActiveSuggestion(index) {
  activeSuggestionIndex = index;
  if (!suggestBoxEl) return;
  const children = Array.from(suggestBoxEl.children);
  children.forEach((child, i) => {
    child.style.outline = i === index ? "2px solid #2c7be5" : "none";
  });
}

function setupAutosuggest() {
  const input = getInputEl();
  if (!input) return;

  suggestBoxEl = ensureSuggestBox();
  if (!suggestBoxEl) return;

  // Typen = suggesties tonen
  input.addEventListener("input", () => {
    const q = normalizeProductNaam(input.value);
    if (!q) {
      clearSuggestions();
      return;
    }
    const list = buildSuggestions(q);
    if (list.length === 0) {
      clearSuggestions();
      return;
    }
    renderSuggestions(list);
  });

  // Pijltjes omhoog/omlaag + Enter om suggestie te kiezen (optioneel maar handig)
  input.addEventListener("keydown", (e) => {
    if (!currentSuggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(activeSuggestionIndex + 1, currentSuggestions.length - 1);
      setActiveSuggestion(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(activeSuggestionIndex - 1, 0);
      setActiveSuggestion(prev);
    } else if (e.key === "Tab") {
      // Tab = kies actieve suggestie (als er eentje actief is)
      if (activeSuggestionIndex >= 0) {
        e.preventDefault();
        input.value = currentSuggestions[activeSuggestionIndex];
        clearSuggestions();
      }
    }
  });

  // Klik buiten = suggesties weg (kleine delay zodat click op item nog werkt)
  input.addEventListener("blur", () => setTimeout(clearSuggestions, 150));
}

/* ================= Categorie kiezen ================= */

function vraagCategorieVoorProduct(product) {
  let msg = `Nieuw product: "${product}"\n\nKies een categorie-nummer:\n`;
  CATEGORIE_VOLGORDE.forEach((cat, idx) => {
    msg += `${idx + 1}. ${cat}\n`;
  });
  msg += `\nTyp een nummer (1-${CATEGORIE_VOLGORDE.length}) en druk OK.`;

  const antwoord = prompt(msg);
  if (antwoord === null) return "Overig";

  const n = parseInt(antwoord, 10);
  if (!Number.isFinite(n) || n < 1 || n > CATEGORIE_VOLGORDE.length) {
    alert("Geen geldig nummer. Ik zet dit product tijdelijk in 'Overig'.");
    return "Overig";
  }
  return CATEGORIE_VOLGORDE[n - 1];
}

/* ================= Toevoegen ================= */

function voegToeVanuitInvoer() {
  const input = getInputEl();
  if (!input) return;

  const cleaned = input.value.trim();
  if (!cleaned) return;

  // Ondersteun ook comma-separated plakken
  const parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);
  parts.forEach(p => addBoodschap(p));

  input.value = "";
  clearSuggestions();
  maakRoute();
}

function addBoodschap(productNaam) {
  const norm = normalizeProductNaam(productNaam);
  if (!norm) return;

  // geen dubbele items
  if (boodschappen.includes(norm)) return;

  // onbekend → vraag categorie
  if (!productCategorieMap[norm]) {
    const cat = vraagCategorieVoorProduct(norm);
    productCategorieMap[norm] = cat;
    saveProductMap();
  }

  boodschappen.push(norm);
  saveBoodschappen();
}

/* ================= Route tonen ================= */

function maakRoute() {
  const ul = getResultaatEl();
  if (!ul) return;

  const sorted = [...boodschappen].sort((a, b) => {
    const ca = productCategorieMap[a] || "Overig";
    const cb = productCategorieMap[b] || "Overig";
    const da = categorieIndex(ca);
    const db = categorieIndex(cb);
    if (da !== db) return da - db;
    return a.localeCompare(b, "nl");
  });

  ul.innerHTML = "";

  sorted.forEach(product => {
    const li = document.createElement("li");

    const row = document.createElement("div");
    row.className = "item-row";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "item-check";

    const label = document.createElement("span");
    label.className = "item-label";
    label.textContent = product; // geen categorie tonen

    cb.addEventListener("change", () => {
      label.style.textDecoration = cb.checked ? "line-through" : "none";
      label.style.opacity = cb.checked ? "0.5" : "1";
    });

    const wijzigBtn = document.createElement("button");
    wijzigBtn.type = "button";
    wijzigBtn.className = "item-btn";
    wijzigBtn.textContent = "⚙️";
    wijzigBtn.title = "Wijzig categorie";
    wijzigBtn.addEventListener("click", () => {
      const nieuweCat = vraagCategorieVoorProduct(product);
      productCategorieMap[product] = nieuweCat;
      saveProductMap();
      // autosuggest heeft nu ook nieuw “geleerd” item → hoeft niets te doen tot je weer typt
      maakRoute();
    });

    const verwijderBtn = document.createElement("button");
    verwijderBtn.type = "button";
    verwijderBtn.className = "item-btn";
    verwijderBtn.textContent = "🗑️";
    verwijderBtn.title = "Verwijder";
    verwijderBtn.addEventListener("click", () => {
      boodschappen = boodschappen.filter(x => x !== product);
      saveBoodschappen();
      maakRoute();
    });

    row.appendChild(cb);
    row.appendChild(label);
    row.appendChild(wijzigBtn);
    row.appendChild(verwijderBtn);

    li.appendChild(row);
    ul.appendChild(li);
  });
}

/* ================= Extra (optioneel) ================= */

function wisBoodschappenlijst() {
  boodschappen = [];
  saveBoodschappen();
  maakRoute();
}

function wisGeleerdeProducten() {
  const ok = confirm("Weet je zeker dat je ALLE geleerde producten wilt wissen?");
  if (!ok) return;
  productCategorieMap = {};
  saveProductMap();
  alert("Geleerde producten zijn gewist.");
  maakRoute();
}

/* ================= Init ================= */

document.addEventListener("DOMContentLoaded", () => {
  applyInputStyling();

  const input = getInputEl();
  if (input) {
    // Enter = toevoegen (maar als er een suggestie “actief” is, laat Enter gewoon toevoegen wat er in het veld staat)
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        voegToeVanuitInvoer();
      }
    });
  }

  // lijst terugzetten
  boodschappen = loadBoodschappen();
  maakRoute();

  // autosuggest klaarzetten
  setupAutosuggest();
});

// Expose functies voor HTML knoppen
window.maakRoute = maakRoute;
window.voegToeVanuitInvoer = voegToeVanuitInvoer;
window.wisBoodschappenlijst = wisBoodschappenlijst;
window.wisGeleerdeProducten = wisGeleerdeProducten;
