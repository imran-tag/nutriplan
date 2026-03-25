/**
 * Lidl.fr Product Scraper — API-based
 * Fetches products directly from Lidl's internal search API.
 * No browser required. Fast and reliable.
 *
 * Run: node scraper.js
 */

const https = require("https");
const fs = require("fs");

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
  // Category to scrape. "Alimentation & Boissons" = all food & drink products.
  // Set to "" to search all categories instead.
  category: "Alimentation & Boissons",

  // Optional keyword search within the category (e.g. "halal", "bio", "poulet").
  // Leave empty to get every product in the category.
  query: "",

  outputFile: "lidl_catalog.csv",
  groceryListFile: "grocery_list.csv",

  // Pause between API requests in ms (be polite)
  requestDelay: 300,

  // ── USDA FoodData Central nutrition lookup ──────────────────────────────
  // Get a free API key at: https://fdc.nal.usda.gov/api-guide.html
  // Leave as "DEMO_KEY" to test (very rate-limited: ~30 req/hr).
  usdaApiKey: "8HiOXrxOZnaYkOP5hzz3a4Cbg5O5SvLVR8Br6Dma",
};

// ─── API CLIENT ──────────────────────────────────────────────────────────────
const BASE_URL = "https://www.lidl.fr/q/api/search";
const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "fr-FR,fr;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://www.lidl.fr/",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};

function fetchPage(query, category, offset) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      assortment: "FR",
      locale: "fr_FR",
      version: "v2.0.0",
      q: query,
      offset: String(offset),
    });
    if (category) params.set("category", category);

    const url = `${BASE_URL}?${params}`;
    https
      .get(url, { headers: HEADERS }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for offset=${offset}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse error at offset=${offset}: ${e.message}`));
          }
        });
      })
      .on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── FRENCH → ENGLISH FOOD NAME TRANSLATOR ───────────────────────────────────

// Compound phrases first (order matters — longer phrases before sub-words)
const FR_EN_PHRASES = [
  ["côtes de porc", "pork ribs"], ["sauté de porc", "pork stew"], ["rôti de porc", "pork roast"],
  ["escalopes de porc", "pork cutlets"], ["paupiettes de porc", "pork rolls"],
  ["crépinettes de porc", "pork patties"], ["filet de porc", "pork tenderloin"],
  ["filets de poulet", "chicken breast"], ["hauts de cuisse de poulet", "chicken thighs"],
  ["cuisses de poulet", "chicken thighs"], ["pilons de poulet", "chicken drumsticks"],
  ["médaillons de poulet", "chicken medallions"],
  ["steak haché", "ground beef"], ["viande hachée", "ground beef"],
  ["faux-filet", "sirloin steak"], ["gigot d'agneau", "leg of lamb"],
  ["magret de canard", "duck breast"], ["filet de canard", "duck breast"],
  ["filet de saumon", "salmon fillet"], ["saumon fumé", "smoked salmon"],
  ["saumon gravlax", "gravlax"], ["truite fumée", "smoked trout"],
  ["filets de poisson", "fish fillets"], ["bâtonnets de poisson", "fish sticks"],
  ["panés au cabillaud", "cod fish cakes"], ["anneaux de calmars", "calamari rings"],
  ["crevettes cuites", "cooked shrimp"], ["crevettes décortiquées", "peeled shrimp"],
  ["moules farcies", "stuffed mussels"],
  ["pomme de terre", "potato"], ["frites four", "oven fries"], ["pommes duchesse", "duchess potatoes"],
  ["petits pois", "green peas"], ["haricots verts", "green beans"],
  ["chou blanc", "white cabbage"], ["chou-fleur", "cauliflower"],
  ["salade verte", "lettuce"], ["jeunes pousses", "baby greens"],
  ["pain de mie", "white sandwich bread"], ["pain rustique", "rustic bread"],
  ["pain au seigle", "rye bread"], ["pain épeautre", "spelt bread"],
  ["pain pita", "pita bread"], ["demi baguette", "baguette"],
  ["pains au chocolat", "chocolate croissant"], ["pain aux céréales", "multigrain bread"],
  ["thé glacé", "iced tea"], ["café grain", "coffee beans"],
  ["lait concentré", "condensed milk"], ["lait demi-écrémé", "semi-skimmed milk"],
  ["crème fraîche", "sour cream"], ["fromage de chèvre", "goat cheese"],
  ["mozzarella râpée", "shredded mozzarella"], ["emmental", "emmental cheese"],
  ["riz thai", "jasmine rice"], ["riz blanc", "white rice"],
  ["pâte feuilletée", "puff pastry"],
  ["yaourt grec", "greek yogurt"], ["yaourt nature", "plain yogurt"],
  ["poudre d'amande", "almond flour"], ["amandes décortiquées", "almonds"],
  ["amandes chocolatées", "chocolate almonds"],
  ["filets de limande", "sole fillets"], ["navarin de la mer", "seafood stew"],
  ["wraps vegan", "vegan wraps"], ["wraps aux légumes", "veggie wraps"],
  ["nems au poulet", "chicken spring rolls"], ["gyozas au poulet", "chicken dumplings"],
  ["poke bowl", "poke bowl"], ["sushi", "sushi"], ["onigiri", "onigiri"],
  ["confiture de figue", "fig jam"], ["miel bio", "organic honey"],
  ["sirop de dattes", "date syrup"], ["crème de pistache", "pistachio cream"],
  ["bloc de foie gras", "foie gras"], ["escargots", "snails"],
];

// Single word replacements (applied after phrases)
const FR_EN_WORDS = {
  "poulet": "chicken", "bœuf": "beef", "boeuf": "beef", "porc": "pork",
  "agneau": "lamb", "veau": "veal", "canard": "duck", "caille": "quail",
  "saumon": "salmon", "thon": "tuna", "cabillaud": "cod", "limande": "sole",
  "crevettes": "shrimp", "moules": "mussels", "calmars": "squid",
  "truite": "trout", "jambon": "ham", "saucisse": "sausage",
  "amandes": "almonds", "noix": "walnuts", "cacahuètes": "peanuts",
  "lait": "milk", "beurre": "butter", "fromage": "cheese", "crème": "cream",
  "yaourt": "yogurt", "œufs": "eggs", "oeufs": "eggs",
  "pain": "bread", "baguette": "baguette", "brioche": "brioche",
  "riz": "rice", "pâtes": "pasta", "couscous": "couscous", "quinoa": "quinoa",
  "tomate": "tomato", "oignon": "onion", "carotte": "carrot",
  "pomme": "apple", "banane": "banana", "poire": "pear", "fraise": "strawberry",
  "orange": "orange", "citron": "lemon", "raisin": "grapes",
  "café": "coffee", "chocolat": "chocolate", "sucre": "sugar",
  "huile": "oil", "miel": "honey", "farine": "flour",
  "épinards": "spinach", "champignons": "mushrooms", "courgette": "zucchini",
  "concombre": "cucumber", "salade": "lettuce", "céleri": "celery",
  "lentilles": "lentils", "haricots": "beans", "pois": "peas",
  "raclette": "raclette cheese", "camembert": "camembert", "brie": "brie",
  "mascarpone": "mascarpone", "ricotta": "ricotta", "parmesan": "parmesan",
  "ketchup": "ketchup", "moutarde": "mustard", "mayonnaise": "mayonnaise",
  "nutella": "hazelnut spread", "confiture": "jam", "compote": "applesauce",
  "chips": "potato chips", "gaufres": "waffles", "madeleine": "madeleine",
  "croissant": "croissant", "biscuits": "cookies", "gâteau": "cake",
  "bière": "beer", "vin": "wine", "champagne": "champagne",
  "andouillette": "andouillette sausage", "andouille": "andouille sausage",
  "foie": "liver", "ris": "sweetbreads",
};

const FR_STOPWORDS = new Set([
  "de", "du", "des", "la", "le", "les", "l", "au", "aux", "avec", "en",
  "et", "ou", "par", "sur", "sous", "un", "une", "d", "à", "a", "se",
  "bio", "aop", "igp", "msc", "asc", "label", "rouge", "nature", "entier",
  "frais", "fraîche", "cru", "cuite", "cuit", "cuits",
  "petit", "grande", "grand", "mini", "maxi", "extra",
  "traditionnel", "artisanal", "artisanale", "saveur", "arôme",
]);

function translateToEnglish(frenchName) {
  let name = frenchName.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // strip accents
    .replace(/[®©™]/g, "").replace(/\s+/g, " ").trim();

  // Apply compound phrases
  for (const [fr, en] of FR_EN_PHRASES) {
    const frNorm = fr.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (name.includes(frNorm)) {
      name = name.replace(frNorm, en);
    }
  }

  // Apply single-word replacements
  const words = name.split(/\s+/);
  const translated = words
    .filter(w => !FR_STOPWORDS.has(w) && w.length > 1)
    .map(w => FR_EN_WORDS[w] || w);

  return [...new Set(translated)].join(" ").trim() || frenchName;
}

// ─── USDA FOODDATA CENTRAL NUTRITION LOOKUP ──────────────────────────────────
// Free API, get key at: https://fdc.nal.usda.gov/api-guide.html
// Set CONFIG.usdaApiKey above (DEMO_KEY works but is limited to ~30 req/hr).

const NUTRITION_CACHE_FILE = "lidl_nutrition_cache.json";

function loadNutritionCache() {
  try {
    return JSON.parse(fs.readFileSync(NUTRITION_CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveNutritionCache(cache) {
  fs.writeFileSync(NUTRITION_CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

// Nutrient IDs in USDA FoodData Central search API responses:
// 1008 = Energy (kcal), 1003 = Protein, 1004 = Total fat, 1005 = Carbs
const USDA_NUTRIENT_IDS = { cal: 1008, protein: 1003, fat: 1004, carbs: 1005 };

/**
 * Fetch nutrition data from USDA FoodData Central.
 * Returns { cal, protein, carbs, fat } per 100g, or null if not found.
 */
function fetchNutrition(name) {
  const params = new URLSearchParams({
    query: name,
    api_key: CONFIG.usdaApiKey || "DEMO_KEY",
    pageSize: "3",
    // Prefer SR Legacy (generic foods) then Foundation, then Branded
    dataType: "SR Legacy,Foundation,Branded",
  });
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?${params}`;

  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { "Accept": "application/json" },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          if (res.statusCode === 429) { resolve({ rateLimited: true }); return; }
          const json = JSON.parse(data);
          for (const food of (json.foods || [])) {
            const nutrients = {};
            for (const n of (food.foodNutrients || [])) {
              for (const [key, id] of Object.entries(USDA_NUTRIENT_IDS)) {
                if (n.nutrientId === id && n.value != null) nutrients[key] = n.value;
              }
            }
            if (!nutrients.cal) continue;
            return resolve({
              cal:     Math.round(nutrients.cal),
              protein: Math.round((nutrients.protein || 0) * 10) / 10,
              carbs:   Math.round((nutrients.carbs || 0) * 10) / 10,
              fat:     Math.round((nutrients.fat || 0) * 10) / 10,
              source:  food.description, // for debug
            });
          }
          resolve(null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

/**
 * Enrich products array with nutrition data from Open Food Facts.
 * Uses a local cache file to avoid re-fetching on subsequent runs.
 */
async function enrichWithNutrition(products) {
  const cache = loadNutritionCache();
  let fetched = 0;
  let hits = 0;

  // Non-food category/name patterns — skip USDA lookup for these
  const NON_FOOD_CATS = ["plantes & fleurs"];
  const NON_FOOD_NAMES = [
    "lessive", "détergent", "savon liquide", "recharge savon",
    "couche", "pampers", "always discreet", "catsan", "essuie-tout",
    "nivea", "signal pro", "oral-b", "l'oreal", "loreal", "revitalift",
    "briochin", "destop", "fairy platinum", "dash liquide", "ariel original",
    "sanex", "peluche avec",
  ];
  const isNonFood = (p) => {
    const cat = (p.rawCategory || "").toLowerCase();
    const name = (p.name || "").toLowerCase();
    return NON_FOOD_CATS.some(k => cat.includes(k)) ||
           NON_FOOD_NAMES.some(k => name.includes(k));
  };

  console.log("\n🥗 Fetching nutrition data from USDA FoodData Central…");

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const cacheKey = p.link || p.name;

    if (isNonFood(p)) {
      p.nutrition = null;
      cache[cacheKey] = null;
      continue;
    }

    if (cache[cacheKey] !== undefined) {
      // null means "looked up, no data found" — still skip re-fetching
      if (cache[cacheKey]) hits++;
      p.nutrition = cache[cacheKey];
      continue;
    }

    const englishName = translateToEnglish(p.name);
    process.stdout.write(`  [${i + 1}/${products.length}] ${p.name.slice(0, 40).padEnd(40)} `);
    const nutrition = await fetchNutrition(englishName);

    // If rate-limited, pause and retry once
    if (nutrition && nutrition.rateLimited) {
      console.log("⏳ Rate limited — waiting 65s…");
      await sleep(65000);
      const retry = await fetchNutrition(p.name);
      p.nutrition = retry?.rateLimited ? null : retry;
    } else {
      p.nutrition = nutrition;
    }
    cache[cacheKey] = p.nutrition; // store null too, so we don't retry
    p.nutrition = cache[cacheKey];

    if (p.nutrition) {
      hits++;
      console.log(`✓ ${p.nutrition.cal} kcal`);
    } else {
      console.log(`– not found`);
    }

    fetched++;
    if (fetched % 10 === 0) saveNutritionCache(cache);
    await sleep(500);
  }

  saveNutritionCache(cache);
  console.log(`✅ Nutrition: ${hits}/${products.length} products enriched (${products.length - fetched} from cache)\n`);
  return products;
}

// ─── PRODUCT EXTRACTOR ───────────────────────────────────────────────────────

/**
 * Parse packaging size from the API's packaging field.
 * Returns { quantity, unit } where unit is e.g. "g", "kg", "L", "ml", "cl", "pièce".
 * Returns null if not parseable.
 *
 * Examples:
 *   "397 g"    → { quantity: 397, unit: "g" }
 *   "1 kg"     → { quantity: 1, unit: "kg" }
 *   "1,5 L"    → { quantity: 1.5, unit: "L" }
 *   "L'unité"  → { quantity: 1, unit: "pièce" }
 */
function parsePackaging(text) {
  if (!text) return null;
  const t = text.trim();

  // "L'unité" / "l'unité"
  if (/l'unit/i.test(t)) return { quantity: 1, unit: "pièce" };

  // Number + unit, e.g. "397 g", "1 kg", "1,5 L", "500 ml"
  const m = t.match(/^([\d,\.]+)\s*(kg|g|L|ml|cl|pièce|unité|lot)\b/i);
  if (m) {
    const quantity = parseFloat(m[1].replace(",", "."));
    return { quantity, unit: m[2] };
  }

  return null;
}

/**
 * Parse the reference/comparison price from basePrice text.
 * Returns { compareUnit, pricePerUnit } or null.
 *
 * Examples:
 *   "1 kg = 4,26 €"  → { compareUnit: "kg", pricePerUnit: 4.26 }
 *   "1 L = 0,41 €"   → { compareUnit: "L", pricePerUnit: 0.41 }
 *   "1 kg = 5.94"    → { compareUnit: "kg", pricePerUnit: 5.94 }
 */
function parseBasePrice(text) {
  if (!text) return null;
  const m = text.match(/1\s*(kg|g|L|ml|cl)\s*=\s*([\d,\.]+)/i);
  if (!m) return null;
  return {
    compareUnit: m[1],
    pricePerUnit: parseFloat(m[2].replace(",", ".")),
  };
}

function extractProduct(item) {
  const d = item.gridbox?.data;
  if (!d) return null;

  const name = d.fullTitle || d.keyfacts?.fullTitle || "";
  if (!name) return null;

  const category = d.category || d.keyfacts?.analyticsCategory || "";
  const brand = d.brand?.name || "";

  // Regular price: on d.price.price for standard items,
  // or d.lidlPlus[0].price.oldPrice for Lidl Plus items.
  let price = d.price?.price ?? null;
  let lidlPlusPrice = null;
  if (d.lidlPlus?.length > 0) {
    const lp = d.lidlPlus[0].price;
    lidlPlusPrice = lp?.price ?? null;
    if (price === null) price = lp?.oldPrice ?? null;
  }

  // Packaging size (e.g. "397 g", "1 kg", "1,5 L")
  const packagingRaw =
    d.price?.packaging?.text ||
    (d.price?.packaging?.amount != null
      ? `${d.price.packaging.amount} ${d.price.packaging.unit || ""}`.trim()
      : null);
  const packaging = parsePackaging(packagingRaw);

  // Reference/comparison price (e.g. "1 kg = 4,26 €")
  const basePriceRaw =
    d.price?.basePrice?.text ||
    null;
  const basePrice = parseBasePrice(basePriceRaw);

  const link = d.canonicalUrl
    ? `https://www.lidl.fr${d.canonicalUrl}`
    : item.url
    ? `https://www.lidl.fr${item.url}`
    : "";

  return {
    name,
    brand,
    category,
    price,
    lidlPlusPrice,
    // Packaging: how much is in the pack
    packagingQty: packaging?.quantity ?? null,
    packagingUnit: packaging?.unit ?? null,
    // Reference price: standardised cost per kg / L / etc.
    compareUnit: basePrice?.compareUnit ?? null,
    pricePerUnit: basePrice?.pricePerUnit ?? null,
    link,
  };
}

// ─── SCRAPER ─────────────────────────────────────────────────────────────────
async function scrapeAll() {
  const label = CONFIG.query
    ? `"${CONFIG.query}" in ${CONFIG.category || "all categories"}`
    : CONFIG.category || "all categories";
  console.log(`🚀 Fetching Lidl.fr products: ${label}`);

  const products = [];
  const seen = new Set();
  let offset = 0;
  let total = null;
  let pageSize = 36;

  while (true) {
    process.stdout.write(`  ↳ Fetching offset ${offset}${total ? `/${total}` : ""}...`);
    const page = await fetchPage(CONFIG.query, CONFIG.category, offset);

    if (total === null) {
      total = page.numFound;
      pageSize = page.fetchsize || 36;
      console.log(` (${total} total products)`);
    } else {
      console.log("");
    }

    const items = page.items || [];
    if (items.length === 0) break;

    for (const item of items) {
      const p = extractProduct(item);
      if (p && !seen.has(p.link || p.name)) {
        seen.add(p.link || p.name);
        products.push(p);
      }
    }

    offset += items.length;
    if (offset >= total) break;

    await sleep(CONFIG.requestDelay);
  }

  console.log(`✅ Collected ${products.length} products`);
  return products;
}

// ─── CSV HELPER ───────────────────────────────────────────────────────────────
function toCsv(rows) {
  const headers = [
    "name", "brand", "category",
    "price", "lidlPlusPrice",
    "packagingQty", "packagingUnit", "compareUnit", "pricePerUnit",
    "cal", "protein", "carbs", "fat",
    "link",
  ];
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const row of rows) {
    const flat = {
      ...row,
      cal:     row.nutrition?.cal     ?? "",
      protein: row.nutrition?.protein ?? "",
      carbs:   row.nutrition?.carbs   ?? "",
      fat:     row.nutrition?.fat     ?? "",
    };
    lines.push(headers.map((h) => escape(flat[h])).join(","));
  }
  return lines.join("\n");
}

// ─── GROCERY LIST BUILDER ────────────────────────────────────────────────────
function buildGroceryList(products, keywords) {
  if (keywords.length === 0) return products.map((p) => ({ ...p, matched: true }));

  const normalize = (s) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return products
    .map((p) => {
      const name = normalize(p.name);
      const matched = keywords.find((k) => name.includes(normalize(k)));
      return { ...p, matched: !!matched, matchedKeyword: matched || null };
    })
    .filter((p) => p.matched);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const products = await scrapeAll();
  await enrichWithNutrition(products);

  fs.writeFileSync(CONFIG.outputFile, toCsv(products), "utf-8");
  console.log(`💾 Full catalog saved to ${CONFIG.outputFile}`);

  const myGroceryKeywords = [
    "lait", "beurre", "fromage", "yaourt",       // dairy
    "pain", "farine",                             // bakery
    "poulet", "boeuf", "porc", "saumon", "thon",  // meat/fish
    "halal",                                      // halal items
    "tomate", "carotte", "salade", "oignon",      // vegetables
    "pomme", "banane", "orange",                  // fruits
    "pâtes", "riz", "quinoa",                     // dry goods
    "jus", "eau", "café", "thé",                  // drinks
  ];

  const matched = buildGroceryList(products, myGroceryKeywords);
  fs.writeFileSync(CONFIG.groceryListFile, toCsv(matched), "utf-8");

  console.log("\n🛒 ═══════════════════════════════════════════");
  console.log("   YOUR LIDL GROCERY LIST");
  console.log("═══════════════════════════════════════════════\n");

  if (matched.length === 0) {
    console.log("😕 No keywords matched. Check lidl_catalog.csv for all products.");
  } else {
    matched.forEach((item) => {
      const price = item.price != null ? `${item.price.toFixed(2)} €` : "prix N/A";
      const plus = item.lidlPlusPrice != null ? ` (Lidl+ ${item.lidlPlusPrice.toFixed(2)} €)` : "";
      const pkg =
        item.packagingQty != null && item.packagingUnit
          ? ` [${item.packagingQty} ${item.packagingUnit}]`
          : "";
      const ref =
        item.pricePerUnit != null && item.compareUnit
          ? `  → ${item.pricePerUnit.toFixed(2)} €/${item.compareUnit}`
          : "";
      console.log(`  ✔ ${item.name.padEnd(42)} ${price}${plus}${pkg}${ref}`);
    });
    console.log(`\n  📦 ${matched.length} item(s) found`);
    console.log(`  💾 Saved to ${CONFIG.groceryListFile}`);
  }
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
