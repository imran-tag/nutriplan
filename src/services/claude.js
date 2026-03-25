// ─────────────────────────────────────────────
// CLAUDE API SERVICE
// Direct browser fetch to Anthropic API
// ─────────────────────────────────────────────

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL   = "claude-sonnet-4-6";

export async function generateMealPlan(apiKey, user, products) {
  const hasPrice = products.some(p => p.price > 0);
  const hasNutrition = products.some(p => p.cal > 0);
  const productList = products.length > 0
    ? products.map(p => {
        const namePart  = p.brand ? `${p.brand} – ${p.name}` : p.name;
        const catPart   = p.rawCategory ? ` [${p.rawCategory}]` : "";
        // Nutrition values are per 100g (from Open Food Facts) — label clearly
        const nutriPart = p.cal > 0
          ? ` | ${p.cal} kcal/100g | P:${p.protein}g C:${p.carbs}g F:${p.fat}g`
          : "";
        // Package size (e.g. "500g", "1L", "6pièce")
        const pkgPart   = p.per && p.per !== "1 serving" ? ` | ${p.per} pack` : "";
        // Price per package + optional price-per-unit for bulk items
        const pricePart = hasPrice && p.price > 0
          ? ` | ${user.currency || "€"}${p.price.toFixed(2)}${p.pricePerUnit > 0 && p.compareUnit ? ` (${user.currency || "€"}${p.pricePerUnit.toFixed(2)}/${p.compareUnit})` : ""}`
          : "";
        return `- ${namePart}${catPart}${nutriPart}${pkgPart}${pricePart}`;
      }).join("\n")
    : "(No product CSV uploaded — use your knowledge of common supermarket products)";

  const prompt = `You are a nutritionist. Generate a 7-day meal plan and grocery list as MINIFIED JSON (no whitespace, no newlines, no markdown, no code fences — pure JSON only).

USER PROFILE:
- Name: ${user.name || "User"}
- Daily calorie target: ${user.calories} kcal
- Goal: ${user.goal}
- Dietary preferences: ${user.dietary?.length ? user.dietary.join(", ") : "none"}
- Allergies/restrictions: ${user.allergies?.length ? user.allergies.join(", ") : "none"}
- Supermarket: ${user.supermarket || "general supermarket"}
- Weekly grocery budget: ${user.budget ? `${user.currency}${user.budget}` : "no specific budget"}
- Currency: ${user.currency || "€"}

AVAILABLE PRODUCTS (${hasNutrition ? "nutrition values are per 100g — scale by pack size and recipe quantities to calculate meal macros" : "no nutrition data — estimate all macros from your knowledge"}):
${productList}

DIETARY RESTRICTIONS (ABSOLUTE — apply to EVERY meal AND every alternative without exception):
${user.dietary?.includes("halal") ? "- HALAL: Zero pork, zero bacon, zero ham, zero lard, zero prosciutto, zero salami, zero pepperoni, zero chorizo, zero alcohol, zero wine-based sauces. Any meat must be halal-certified." : ""}${user.dietary?.includes("vegan") ? "- VEGAN: Zero meat, zero fish, zero eggs, zero dairy, zero honey." : ""}${user.dietary?.includes("vegetarian") ? "- VEGETARIAN: Zero meat, zero fish, zero seafood." : ""}${user.dietary?.includes("gluten-free") ? "- GLUTEN-FREE: Zero wheat, zero barley, zero rye, zero regular bread/pasta." : ""}${user.allergies?.length ? `- ALLERGIES: Never use ${user.allergies.join(", ")} in any meal or alternative.` : ""}

STRICT RULES:
1. badge values MUST only be from: "veg", "vegan", "halal", "gf"
2. category values MUST only be from: "Produce", "Proteins", "Dairy", "Grains", "Pantry", "Snacks"
3. Output MINIFIED JSON only — absolutely no whitespace, newlines, or markdown
4. All numeric values must be numbers, not strings
5. Each meal has exactly 2 alternatives
6. DIETARY RESTRICTIONS ABOVE APPLY TO ALTERNATIVES EQUALLY — alternatives are not exempt
7. CALORIE TARGET: Each day's meals MUST total ${user.calories} kcal — ${user.goal === "gain" ? `reach AT LEAST ${user.calories} kcal per day (being slightly above is fine for weight gain — under-eating defeats the purpose)` : user.goal === "lose" ? `stay AT OR BELOW ${user.calories} kcal per day (a deficit is the goal — do not overshoot)` : `stay within 50 kcal of ${user.calories} per day (maintenance means precision)`}. Plan each meal's calories intentionally so the day total hits this target — do not leave the snack as an afterthought with 100 kcal
8. Keep meal names concise (2–4 words max, e.g. "Oat Power Bowl")
9. Keep alternative names concise (2–4 words max)
10. Keep grocery item names concise (2–4 words max)
${hasPrice ? `11. For each grocery list item, include a "price" field (number) with the estimated cost. Base estimates on product prices provided. If unsure, estimate realistically using ${user.currency || "€"} as the currency.` : `11. For each grocery list item, include a "price" field (number) with a realistic estimated cost in ${user.currency || "€"} for the quantity specified.`}
${user.budget ? `12. IMPORTANT: The total of all groceryList price fields MUST stay within the weekly budget of ${user.currency}${user.budget}. Choose affordable ingredients and reasonable quantities. If needed, simplify meals to stay within budget.` : ""}

JSON schema — output this exact structure, repeating the meal object for every meal type (Breakfast, Lunch, Dinner, Snack) and every day (Mon, Tue, Wed, Thu, Fri, Sat, Sun):
{"mealPlan":{"Mon":{"Breakfast":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Lunch":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Dinner":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Snack":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]}},"Tue":{"Breakfast":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Lunch":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Dinner":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Snack":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]}},"Wed":{"Breakfast":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Lunch":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Dinner":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Snack":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]}},"Thu":{"Breakfast":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Lunch":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Dinner":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Snack":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]}},"Fri":{"Breakfast":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Lunch":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Dinner":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Snack":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]}},"Sat":{"Breakfast":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Lunch":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Dinner":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Snack":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]}},"Sun":{"Breakfast":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Lunch":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Dinner":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]},"Snack":{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"badges":[],"recipeUrl":"#","alternatives":[{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0},{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}]}}},"groceryList":[{"name":"string","qty":"string","unit":"string","category":"Produce","alt":"string","price":0}]}`;

  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    throw new Error(`Network error: ${err.message}. Check your internet connection.`);
  }

  if (response.status === 401) {
    throw new Error("Invalid API key. Check your Anthropic API key and try again.");
  }
  if (response.status === 429) {
    throw new Error("Rate limit exceeded. Please wait a moment and try again.");
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`API error ${response.status}: ${body || response.statusText}`);
  }

  const data = await response.json();

  // Check if output was cut off by token limit
  if (data.stop_reason === "max_tokens") {
    throw new Error("The response was too long and got cut off. Try reducing your product list, or contact support.");
  }

  const rawText = data?.content?.[0]?.text;
  if (!rawText) throw new Error("Empty response from Claude API.");

  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not find JSON in Claude's response.");

  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch (e) {
    throw new Error(`Failed to parse Claude's response as JSON: ${e.message}`);
  }

  if (!parsed.mealPlan || !parsed.groceryList) {
    throw new Error("Claude's response is missing mealPlan or groceryList fields.");
  }

  return parsed;
}

export async function refreshGroceryList(apiKey, user, mealPlan, products) {
  const hasPrice = products.some(p => p.price > 0);
  const currency = user.currency || "€";

  // Compact meal plan summary: just meal names per day
  const planSummary = Object.entries(mealPlan).map(([day, meals]) =>
    `${day}: ` + Object.entries(meals).map(([type, m]) => `${type}=${m.name}`).join(", ")
  ).join("\n");

  const prompt = `You are a nutritionist. Given this 7-day meal plan, produce a grocery shopping list as MINIFIED JSON array only (no markdown, no explanation, no whitespace outside strings).

MEAL PLAN:
${planSummary}

RULES:
- category values MUST only be from: "Produce","Proteins","Dairy","Grains","Pantry","Snacks"
- Keep item names concise (2–4 words max)
- Consolidate duplicate ingredients across meals
- Include realistic quantities for one week for one person
- "alt" field: suggest a cheaper or similar substitute
${hasPrice ? `- "price" field: realistic cost in ${currency}` : `- "price" field: realistic estimated cost in ${currency}`}
${user.budget ? `- IMPORTANT: total of all price fields must stay within ${currency}${user.budget} weekly budget` : ""}

Return MINIFIED JSON array only:
[{"name":"string","qty":"string","unit":"string","category":"Produce","alt":"string","price":0}]`;

  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    throw new Error(`Network error: ${err.message}`);
  }

  if (response.status === 401) throw new Error("Invalid API key.");
  if (response.status === 429) throw new Error("Rate limit exceeded. Wait a moment and try again.");
  if (!response.ok) throw new Error(`API error ${response.status}`);

  const data = await response.json();
  const rawText = data?.content?.[0]?.text;
  if (!rawText) throw new Error("Empty response from Claude.");

  const match = rawText.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Could not parse grocery list from Claude's response.");

  try {
    return JSON.parse(match[0]);
  } catch (e) {
    throw new Error(`Failed to parse grocery list JSON: ${e.message}`);
  }
}

export async function generateRecipe(apiKey, mealName) {
  const prompt = `Give me a home-cooking recipe for "${mealName}". Return MINIFIED JSON only (no markdown, no explanation):{"ingredients":["string",...],"steps":["string",...]}Rules: 5–8 ingredients with quantities, 4–6 clear concise steps (1 sentence each).`;

  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    throw new Error(`Network error: ${err.message}`);
  }

  if (response.status === 401) throw new Error("Invalid API key.");
  if (response.status === 429) throw new Error("Rate limit exceeded. Wait a moment and try again.");
  if (!response.ok) throw new Error(`API error ${response.status}`);

  const data = await response.json();
  const rawText = data?.content?.[0]?.text;
  if (!rawText) throw new Error("Empty response from Claude.");

  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse recipe from Claude's response.");

  try {
    return JSON.parse(match[0]);
  } catch {
    throw new Error("Failed to parse recipe JSON.");
  }
}
