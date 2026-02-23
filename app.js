/***********************
 * Supermarkt Route App
 ***********************/

// 1) Loopvolgorde
const CATEGORIE_VOLGORDE = [
  "Ingang","Groente","Fruit","Verse sappen","Kant en klaar maaltijden",
  "Vlees en Vis","Bakkerij","Vleeswaren","Kaas","Tapas en borrelhapjes",
  "Eieren","Zuivel","Boter","Afbakbrood en ontbijt","Zelf bakken en suiker",
  "Thee en koek","Blikgroente","Soep en worst","Wereldkeuken","Sauzen",
  "Vis in blik","Wijn en bier","Chips, toast en nootjes","Fris",
  "Snoep en chocola","Houdbare melk","Sap in pak","HEMA en kaarten",
  "Was en schoonmaak","Plastic zakken","Lamp en kaars","Diepvries",
  "Pijnstillers etc","Bloemen","Overig","Kassa"
];

// Storage keys
const STORAGE_KEY_PRODUCTEN = "supermarkt_product_categorie_map_v1";
const STORAGE_KEY_BOODSCHAPPEN = "supermarkt_boodschappenlijst_v1";

let boodschappen = [];
let productCategorieMap = loadProductMap();

/* ================= HELPERS ================= */

function normalizeProductNaam(s){
  return (s||"").trim().toLowerCase().replace(/\s+/g," ");
}

function loadProductMap(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTEN);
    if(!raw) return {};
    return JSON.parse(raw)||{};
  }catch{ return {}; }
}

function saveProductMap(){
  localStorage.setItem(STORAGE_KEY_PRODUCTEN, JSON.stringify(productCategorieMap));
}

function loadBoodschappen(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY_BOODSCHAPPEN);
    if(!raw) return [];
    return JSON.parse(raw)||[];
  }catch{ return []; }
}

function saveBoodschappen(){
  localStorage.setItem(STORAGE_KEY_BOODSCHAPPEN, JSON.stringify(boodschappen));
}

function categorieIndex(cat){
  const i = CATEGORIE_VOLGORDE.indexOf(cat);
  return i===-1?9999:i;
}

function getInputEl(){ return document.getElementById("lijst"); }
function getResultaatEl(){ return document.getElementById("resultaat"); }

/* ================= AUTOSUGGEST ================= */

function updateSuggesties(){
  const datalist = document.getElementById("suggesties");
  if(!datalist) return;

  const learned = Object.keys(productCategorieMap||{});
  const known = new Set([...learned, ...boodschappen]);

  datalist.innerHTML = "";

  [...known]
    .filter(Boolean)
    .sort((a,b)=>a.localeCompare(b,"nl"))
    .forEach(product=>{
      const option = document.createElement("option");
      option.value = product;
      datalist.appendChild(option);
    });
}

/* ================= CATEGORIE KIEZEN ================= */

function vraagCategorieVoorProduct(product){
  let msg = `Nieuw product: "${product}"\n\nKies categorie-nummer:\n`;
  CATEGORIE_VOLGORDE.forEach((cat,idx)=>{
    msg += `${idx+1}. ${cat}\n`;
  });

  const antwoord = prompt(msg);
  if(antwoord===null) return "Overig";

  const n = parseInt(antwoord,10);
  if(!Number.isFinite(n)||n<1||n>CATEGORIE_VOLGORDE.length){
    alert("Ongeldige keuze → Overig");
    return "Overig";
  }
  return CATEGORIE_VOLGORDE[n-1];
}

/* ================= TOEVOEGEN ================= */

function voegToeVanuitInvoer(){
  const input = getInputEl();
  if(!input) return;

  const cleaned = input.value.trim();
  if(!cleaned) return;

  const parts = cleaned.split(",").map(p=>p.trim()).filter(Boolean);
  parts.forEach(p=>addBoodschap(p));

  input.value="";
  maakRoute();
}

function addBoodschap(productNaam){
  const norm = normalizeProductNaam(productNaam);
  if(!norm) return;
  if(boodschappen.includes(norm)) return;

  if(!productCategorieMap[norm]){
    const cat = vraagCategorieVoorProduct(norm);
    productCategorieMap[norm]=cat;
    saveProductMap();
  }

  boodschappen.push(norm);
  saveBoodschappen();
  updateSuggesties();
}

/* ================= ROUTE TONEN ================= */

function maakRoute(){
  const ul = getResultaatEl();
  if(!ul) return;

  const sorted=[...boodschappen].sort((a,b)=>{
    const da=categorieIndex(productCategorieMap[a]||"Overig");
    const db=categorieIndex(productCategorieMap[b]||"Overig");
    if(da!==db) return da-db;
    return a.localeCompare(b,"nl");
  });

  ul.innerHTML="";

  sorted.forEach(product=>{
    const li=document.createElement("li");
    const row=document.createElement("div");
    row.className="item-row";

    const cb=document.createElement("input");
    cb.type="checkbox";
    cb.className="item-check";

    const label=document.createElement("span");
    label.className="item-label";
    label.textContent=product;

    cb.addEventListener("change",()=>{
      label.style.textDecoration=cb.checked?"line-through":"none";
      label.style.opacity=cb.checked?"0.5":"1";
    });

    const wijzigBtn=document.createElement("button");
    wijzigBtn.className="item-btn";
    wijzigBtn.textContent="⚙️";
    wijzigBtn.onclick=()=>{
      const nieuweCat=vraagCategorieVoorProduct(product);
      productCategorieMap[product]=nieuweCat;
      saveProductMap();
      updateSuggesties();
    };

    const verwijderBtn=document.createElement("button");
    verwijderBtn.className="item-btn";
    verwijderBtn.textContent="🗑️";
    verwijderBtn.onclick=()=>{
      boodschappen=boodschappen.filter(x=>x!==product);
      saveBoodschappen();
      updateSuggesties();
      maakRoute();
    };

    row.appendChild(cb);
    row.appendChild(label);
    row.appendChild(wijzigBtn);
    row.appendChild(verwijderBtn);

    li.appendChild(row);
    ul.appendChild(li);
  });
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded",()=>{
  const input=getInputEl();

  if(input){
    input.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){
        e.preventDefault();
        voegToeVanuitInvoer();
      }
    });
  }

  boodschappen=loadBoodschappen();
  maakRoute();
  updateSuggesties();
});

/* Globale functies */
window.voegToeVanuitInvoer=voegToeVanuitInvoer;
window.wisBoodschappenlijst=function(){
  boodschappen=[];
  saveBoodschappen();
  updateSuggesties();
  maakRoute();
};
