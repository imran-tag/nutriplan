// ─────────────────────────────────────────────
// CSV PARSER
// Detects columns by common name variants, handles quoted values
// ─────────────────────────────────────────────

function parseCSVRow(line) {
  const cols = [];
  let inQuote = false;
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      cols.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

const COL_MAP = {
  name:          ["name", "product", "product name", "item", "description"],
  cal:           ["calories", "cal", "kcal", "energy", "cals"],
  protein:       ["protein", "proteins", "prot"],
  carbs:         ["carbs", "carbohydrates", "carbohydrate", "carb", "cho"],
  fat:           ["fat", "fats", "total fat", "lipids"],
  per:           ["serving", "serving size", "portion", "size", "per"],
  price:         ["price", "cost", "unit price", "retail price", "retail", "sale price", "price/unit", "unit cost"],
  lidlPlusPrice: ["lidlplusprice", "lidl plus price", "plus price", "member price", "discount price"],
  brand:         ["brand", "manufacturer", "maker", "vendor", "producer"],
  link:          ["link", "url", "product url", "product link", "href", "website"],
  rawCategory:   ["category", "cat", "type", "department", "section", "aisle"],
  packagingQty:  ["packagingqty", "packaging qty", "pack qty", "quantity", "package quantity"],
  packagingUnit: ["packagingunit", "packaging unit", "pack unit", "package unit"],
  compareUnit:   ["compareunit", "compare unit", "comparison unit"],
  pricePerUnit:  ["priceperunit", "price per unit", "compare price", "unit rate"],
};

function detectColumn(header, field) {
  const h = header.toLowerCase().trim();
  return COL_MAP[field].includes(h);
}

const parsePrice = (str) => {
  if (!str) return 0;
  const v = parseFloat(str.replace(/[^0-9.]/g, ""));
  return isNaN(v) ? 0 : v;
};

const str = (cols, idx) => (idx !== -1 && cols[idx]) ? cols[idx] : "";

export function parseCSV(text) {
  // Normalise Windows line endings
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]);

  // Build column index map
  const colIdx = {};
  for (const field of Object.keys(COL_MAP)) {
    colIdx[field] = headers.findIndex(h => detectColumn(h, field));
  }

  if (colIdx.name === -1) return []; // Can't do anything without a name column

  const nutritionFields = ["cal", "protein", "carbs", "fat"];

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    if (!cols[colIdx.name]) continue;

    const missingNutrition = nutritionFields.some(f => colIdx[f] === -1 || !cols[colIdx[f]]);
    const confidence = missingNutrition ? "med" : "high";

    const num = (f) => {
      if (colIdx[f] === -1) return 0;
      const v = parseFloat(cols[colIdx[f]]);
      return isNaN(v) ? 0 : v;
    };

    // Prefer Lidl Plus price when available, otherwise use regular price
    const regularPrice    = parsePrice(str(cols, colIdx.price));
    const discountPrice   = parsePrice(str(cols, colIdx.lidlPlusPrice));
    const price           = discountPrice > 0 ? discountPrice : regularPrice;
    const priceDiscount   = discountPrice > 0 ? discountPrice : 0;

    // Build package size string from packagingQty + packagingUnit when available
    const pkgQtyRaw  = str(cols, colIdx.packagingQty);
    const pkgUnit    = str(cols, colIdx.packagingUnit);
    const pkgQty     = pkgQtyRaw ? parseFloat(pkgQtyRaw) : 0;
    const perFromPkg = pkgQty > 0 && pkgUnit ? `${pkgQty}${pkgUnit}` : "";
    const perFromCol = colIdx.per !== -1 && cols[colIdx.per] ? cols[colIdx.per] : "";
    const per        = perFromPkg || perFromCol || "1 serving";

    const compareUnit  = str(cols, colIdx.compareUnit);
    const pricePerUnit = parsePrice(str(cols, colIdx.pricePerUnit));

    results.push({
      id: i,
      name:        cols[colIdx.name],
      brand:       str(cols, colIdx.brand),
      rawCategory: str(cols, colIdx.rawCategory),
      link:        str(cols, colIdx.link),
      cal:         num("cal"),
      protein:     num("protein"),
      carbs:       num("carbs"),
      fat:         num("fat"),
      per,
      price,
      priceDiscount,
      packagingQty:  pkgQty,
      packagingUnit: pkgUnit,
      compareUnit,
      pricePerUnit,
      confidence,
      source: "CSV Upload",
    });
  }

  return results;
}
