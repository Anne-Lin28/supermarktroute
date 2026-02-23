/***********************
 * Supermarkt Route App (met autosuggest die werkt in Safari)
 * - Enter voegt item toe
 * - Onbekend product: kies categorie en onthoud (localStorage)
 * - Lijst blijft bewaard na sluiten (localStorage)
 * - Autosuggest onder input (ook in vastgezette Safari app)
 ***********************/

// 1) Loopvolgorde
const CATEGORIE_VOLGORDE = [
  "Ingang","Groente","Fruit","Verse sappen","Kant en klaar maaltijden","Vlees en Vis",
  "Bakkerij","Vleeswaren","Kaas","Tapas en borrelhapjes","Eieren","Zuivel","Boter",
  "Afbakbrood en ontbijt","Zelf bakken en suiker","Thee en koek","Blikgroente",
  "Soep en worst","Wereldkeuken","Sauzen","Vis in blik","Wijn en bier",
  "Chips, toast en nootjes","Fris","Snoep en chocola","Houdbare melk","Sap in pak",
  "HEMA en kaarten","Was en schoonmaak","Plastic zakken","Lamp en kaars","Diepvries",
  "Pijnstillers etc","Bloemen","Overig","Kassa"
];

// Storage keys
const STORAGE_KEY_PRODUCTEN = "supermarkt_product_categorie_map_v1";
const STORAGE_KEY_BOODSCHAPPEN = "supermarkt_boodschappenlijst_v1";

// State
let boodschappen = [];
let productCategorieMap = loadProductMap();

// Autosuggest state
let suggestBoxEl = null;

/* ========= Helpers ========= */

function normalizeProductNaam(s) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
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

/* ========= UI hooks ========= */

function getInputEl() { return document.getElementById("lijst"); }
function getResultaatEl() { return document.getElementById("resultaat"); }

function applyInputStyling() {
  const el = getInputEl();
  if (!el) return;
  el.style.width = "100%";
  el.style.fontSize = "18px";
  el.style.padding = "12px";
  el.style.boxSizing = "border-box";
  el.style.height = "48px";
}

/* ========= Autosuggest (custom list onder input) ========= */

function ensureSuggestBox() {
  const input = getInputEl();
  if (!input) return null;

  let box = document.getElementById("suggestBox");

  // Als je index.html nog geen suggestBox heeft: maak hem automatisch
  if (!box) {
    box = document.createElement("div");
    box.id = "suggestBox";
    input.insertAdjacentElement("afterend", box);
  }

  // Basis styling zodat je het altijd ziet
  box.style.marginTop = "8px";
  box.style.marginBottom = "12px";

  return box;
}

function getKnownProducts() {
  // ✅ combineer geleerde producten + huidige lijst
  const learned = Object.keys(productCategorieMap || {});
  const current = Array.isArray(boodschappen) ? boodschappen : [];
  return [...new Set([...learned, ...current])];
}

function renderSuggesties(query) {
  if (!suggestBoxEl) return;

  const q = normalizeProductNaam(query);
  const all = getKnownProducts();

  // Maak box leeg
  suggestBoxEl.innerHTML = "";

  // Als je nog niks geleerd hebt, laat dat zien
  if (all.length === 0) {
    const msg = document.createElement("div");
    msg.textContent = "Nog geen suggesties. Voeg eerst een paar producten toe 🙂";
    msg.style.fontSize = "16px";
    msg.style.opacity = "0.7";
    msg.style.padding = "6px 2px";
    suggestBoxEl.appendChild(msg);
    return;
  }

  // Als input leeg is: laat top 6 zien (handig op mobiel)
  let matches;
  if (!q) {
    matches = all.sort((a, b) => a.localeCompare(b, "nl")).slice(0, 6);
  } else {
    // ✅ contains-match (ruimer dan startsWith)
    matches = all
      .filter(p => p.includes(q))
      .sort((a, b) => a.localeCompare(b, "nl"))
      .slice(0, 6);
  }

  if (matches.length === 0) {
    const msg = document.createElement("div");
    msg.textContent = "Geen suggesties voor deze invoer.";
    msg.style.fontSize = "16px";
    msg.style.opacity = "0.7";
    msg.style.padding = "6px 2px";
    suggestBoxEl.appendChild(msg);
    return;
  }

  matches.forEach(p => {
    const item = document.createElement("div");
    item.textContent = p;

    item.style.background = "white";
    item.style.border = "1px solid #ddd";
    item.style.borderRadius = "10px";
    item.style.padding = "10px 12px";
    item.style.marginTop = "8px";
    item.style.fontSize = "18px";

    item.addEventListener("click", () => {
      const input = getInputEl();
      input.value = p;
      // na selecteren: verberg de suggesties
      suggestBoxEl.innerHTML = "";
      input.focus();
    });

    suggestBoxEl.appendChild(item);
  });
}

function setupAutosuggest() {
  const input = getInputEl();
  if (!input) return;

  suggestBoxEl = ensureSuggestBox();
  if (!suggestBoxEl) return;

  // Toon meteen suggesties als je in het veld tikt (handig op mobiel)
  input.addEventListener("focus", () => renderSuggesties(input.value));

  // Bij typen: update
  input.addEventListener("input", () => renderSuggesties(input.value));

  // Klik buiten: leegmaken (met kleine delay zodat click werkt)
  input.addEventListener("blur", () => setTimeout(() => {
    if (suggestBoxEl) suggestBoxEl.innerHTML = "";
  }, 150));
}

/* ========= Categorie kiezen ========= */

function vraagCategorieVoorProduct(product) {
  let msg = `Nieuw product: "${product}"\n\nKies een categorie-nummer:\n`;
  CATEGORIE_VOLGORDE.forEach((cat, idx) => { msg += `${idx + 1}. ${cat}\n`; });
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

/* ========= Toevoegen ========= */

function voegToeVanuitInvoer() {
  const input = getInputEl();
  if (!input) return;

  const cleaned = input.value.trim();
  if (!cleaned) return;

  const parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);
  parts.forEach(p => addBoodschap(p));

  input.value = "";
  if (suggestBoxEl) suggestBoxEl.innerHTML = "";
  maakRoute();
}

function addBoodschap(productNaam) {
  const norm = normalizeProductNaam(productNaam);
  if (!norm) return;

  if (boodschappen.includes(norm)) return;

  if (!productCategorieMap[norm]) {
    const cat = vraagCategorieVoorProduct(norm);
    productCategorieMap[norm] = cat;
    saveProductMap();
  }

  boodschappen.push(norm);
  saveBoodschappen();

  // ✅ suggestions updaten (zodat nieuwe items meteen suggesties worden)
  if (suggestBoxEl) renderSuggesties(getInputEl().value);
}

/* ========= Route tonen ========= */

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
    label.textContent = product;

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
      if (suggestBoxEl) renderSuggesties(getInputEl().value);
    });

    row.appendChild(cb);
    row.appendChild(label);
    row.appendChild(wijzigBtn);
    row.appendChild(verwijderBtn);

    li.appendChild(row);
    ul.appendChild(li);
  });
}

/* ========= Extra ========= */

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

/* ========= Init ========= */

document.addEventListener("DOMContentLoaded", () => {
  applyInputStyling();

  const input = getInputEl();
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        voegToeVanuitInvoer();
      }
    });
  }

  boodschappen = loadBoodschappen();
  maakRoute();

  setupAutosuggest();
});

// Expose to HTML
window.maakRoute = maakRoute;
window.voegToeVanuitInvoer = voegToeVanuitInvoer;
window.wisBoodschappenlijst = wisBoodschappenlijst;
window.wisGeleerdeProducten = wisGeleerdeProducten;
