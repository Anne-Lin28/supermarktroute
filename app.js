/***********************
 * Supermarkt Route App
 * - Enter voegt item toe
 * - Onbekende producten: vraag categorie en onthoud (localStorage)
 * - Sorteer op loopvolgorde (categorievolgorde)
 ***********************/

// 1) Stel hier jouw loopvolgorde in (pas gerust aan / breid uit)
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

// 2) Key voor opslag in browser (blijft bewaard op dit apparaat)
const STORAGE_KEY_PRODUCTEN = "supermarkt_product_categorie_map_v1";

// 3) In-memory state van de lijst van vandaag
let boodschappen = []; // array van strings (producten)

// 4) Product -> categorie map (geladen uit localStorage)
let productCategorieMap = loadProductMap();

/** Helpers **/
function normalizeProductNaam(s) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " "); // dubbele spaties weg
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

function categorieIndex(cat) {
  const i = CATEGORIE_VOLGORDE.indexOf(cat);
  return i === -1 ? 9999 : i;
}

/** UI hooks **/
function getInputEl() {
  return document.getElementById("lijst"); // jouw index.html gebruikt id="lijst"
}

function getResultaatEl() {
  return document.getElementById("resultaat");
}

/** Maak inputveld groter (zonder CSS te hoeven wijzigen) **/
function applyInputStyling() {
  const el = getInputEl();
  if (!el) return;

  // Als het een <input> is, maken we 'm "groter" qua hoogte/lettertype
  el.style.width = "100%";
  el.style.fontSize = "18px";
  el.style.padding = "12px";
  el.style.boxSizing = "border-box";

  // Hoogte werkt niet altijd mooi op input; als je later naar <textarea> gaat, werkt dit nog beter.
  el.style.height = "48px";
}

/** Onbekend product: vraag gebruiker om categorie te kiezen */
function vraagCategorieVoorProduct(product) {
  // Bouw prompt met nummers (simpel maar werkt overal)
  let msg = `Nieuw product: "${product}"\n\nKies een categorie-nummer:\n`;
  CATEGORIE_VOLGORDE.forEach((cat, idx) => {
    msg += `${idx + 1}. ${cat}\n`;
  });
  msg += `\nTyp een nummer (1-${CATEGORIE_VOLGORDE.length}) en druk OK.`;

  const antwoord = prompt(msg);
  if (antwoord === null) {
    // gebruiker annuleert
    return "Overig";
  }

  const n = parseInt(antwoord, 10);
  if (!Number.isFinite(n) || n < 1 || n > CATEGORIE_VOLGORDE.length) {
    alert("Geen geldig nummer. Ik zet dit product tijdelijk in 'Overig'.");
    return "Overig";
  }

  return CATEGORIE_VOLGORDE[n - 1];
}

/** Voeg 1 of meerdere producten toe vanuit invoerveld */
function voegToeVanuitInvoer() {
  const input = getInputEl();
  if (!input) return;

  const raw = input.value;
  const cleaned = raw.trim();
  if (!cleaned) return;

  // Handig: als iemand toch komma’s plakt, ondersteunen we dat ook
  const parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);

  parts.forEach(p => addBoodschap(p));

  // invoer leegmaken
  input.value = "";

  // direct route updaten
  maakRoute();
}

/** Voeg één product toe + categorie leren indien onbekend */
function addBoodschap(productNaam) {
  const norm = normalizeProductNaam(productNaam);
  if (!norm) return;

  // Niet dubbel toevoegen (optioneel). Wil je wél dubbel kunnen (2x melk)? haal dit weg.
  if (boodschappen.includes(norm)) return;

  // Als we dit product nog niet kennen: vraag categorie en onthoud
  if (!productCategorieMap[norm]) {
    const cat = vraagCategorieVoorProduct(norm);
    productCategorieMap[norm] = cat;
    saveProductMap();
  }

  boodschappen.push(norm);
}

/** Sorteer boodschappen op categorievolgorde + toon lijst */
function maakRoute() {
  const ul = getResultaatEl();
  if (!ul) return;

  // Sorteer: eerst op categorie-index, dan alfabetisch
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

    // Compacte rij: checkbox + product + 2 kleine knoppen
    const row = document.createElement("div");
    row.className = "item-row";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "item-check";

    const label = document.createElement("span");
    label.className = "item-label";
    label.textContent = product; // ✅ GEEN categorie meer tonen

    cb.addEventListener("change", () => {
      label.style.textDecoration = cb.checked ? "line-through" : "none";
      label.style.opacity = cb.checked ? "0.5" : "1";
    });

    const wijzigBtn = document.createElement("button");
    wijzigBtn.type = "button";
    wijzigBtn.className = "item-btn";
    wijzigBtn.textContent = "⚙️"; // compact (tandwiel)
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
    verwijderBtn.textContent = "🗑️"; // compact (prullenbak)
    verwijderBtn.title = "Verwijder";
    verwijderBtn.addEventListener("click", () => {
      boodschappen = boodschappen.filter(x => x !== product);
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

/** Optioneel: wis alleen lijst van vandaag (niet je geleerde producten) */
function wisBoodschappenlijst() {
  boodschappen = [];
  maakRoute();
}

/** Optioneel: wis ook alle geleerde productcategorieën */
function wisGeleerdeProducten() {
  const ok = confirm("Weet je zeker dat je ALLE geleerde producten wilt wissen?");
  if (!ok) return;
  productCategorieMap = {};
  saveProductMap();
  alert("Geleerde producten zijn gewist.");
  maakRoute();
}

/** Init: koppel Enter-toevoegen + maak invoerveld groter */
document.addEventListener("DOMContentLoaded", () => {
  applyInputStyling();

  const input = getInputEl();
  if (input) {
    // Enter = toevoegen
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        voegToeVanuitInvoer();
      }
    });
  }

  // Als je de oude knop "Maak route" gebruikt met onclick="maakRoute()":
  // dan werkt dat nog steeds. Alleen voegt die knop niets toe.
  // Daarom: als je liever knop gebruikt om toe te voegen, zet in index.html onclick="voegToeVanuitInvoer()"
  // (zie tip hieronder)
});

// Zorg dat deze functies vanuit HTML aanroepbaar zijn
window.maakRoute = maakRoute;
window.voegToeVanuitInvoer = voegToeVanuitInvoer;
window.wisBoodschappenlijst = wisBoodschappenlijst;
window.wisGeleerdeProducten = wisGeleerdeProducten;

