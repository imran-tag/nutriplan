# 🛒 Lidl.fr Catalog Scraper

Scrapes the full Lidl.fr food catalog and enriches it with exact calorie/macro data from USDA FoodData Central.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Get a free USDA nutrition API key (takes ~30 seconds)
#    → https://fdc.nal.usda.gov/api-guide.html
#    Set it in scraper.js: CONFIG.usdaApiKey = "YOUR_KEY"

# 3. Run the scraper
npm start
```

## What it does

1. Fetches all "Alimentation & Boissons" products from the Lidl.fr search API
2. Looks up exact nutrition data (kcal, protein, carbs, fat per 100g) from USDA FoodData Central
3. Outputs `lidl_catalog.csv` used by the NutriPlan app

## Output: `lidl_catalog.csv`

| Column | Description |
|--------|-------------|
| `name` | Product name |
| `brand` | Brand name |
| `category` | Lidl product category |
| `price` | Regular price (€) |
| `lidlPlusPrice` | Lidl+ member price (€) |
| `packagingQty` | Package quantity (e.g. 500) |
| `packagingUnit` | Package unit (e.g. g, L, pièce) |
| `compareUnit` | Unit for price comparison (e.g. kg) |
| `pricePerUnit` | Price per compare unit |
| `cal` | Calories per 100g (from USDA) |
| `protein` | Protein per 100g (g) |
| `carbs` | Carbohydrates per 100g (g) |
| `fat` | Fat per 100g (g) |
| `link` | Lidl.fr product URL |

## Nutrition cache

Results from USDA are cached in `lidl_nutrition_cache.json`. Re-running the scraper only fetches nutrition for new products — existing entries are reused instantly.

## Config

In `scraper.js`, edit the `CONFIG` object:

```js
const CONFIG = {
  category: "Alimentation & Boissons", // category to scrape
  query: "",                            // optional keyword filter
  usdaApiKey: "...",                    // from fdc.nal.usda.gov
};
```

## Notes

- The USDA DEMO_KEY works but is rate-limited (~30 req/hr). Get a free key for unlimited access.
- Products without a USDA match get no nutrition data — Claude will estimate those.
- Run at most once per day to be polite to both APIs.
