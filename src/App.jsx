import { useState, useEffect, useRef } from "react";
import { parseCSV } from "./utils/csv.js";
import { generateMealPlan, generateRecipe, refreshGroceryList } from "./services/claude.js";
import lidlCatalogRaw from "../scraper/lidl_catalog.csv?raw";

const CSV_PRODUCTS = parseCSV(lidlCatalogRaw);

// ─────────────────────────────────────────────
// ICONS (inline SVG helpers)
// ─────────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none", strokeWidth = 1.75, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const Icons = {
  leaf:      "M12 2C6 2 2 8 2 14c0 3.3 1.6 6.2 4 8 .4-2.8 1.6-5.3 3.4-7.2C10.6 13.2 12 11.2 12 9c0 2.2 1.4 4.2 2.6 5.8C16.4 16.7 17.6 19.2 18 22c2.4-1.8 4-4.7 4-8 0-6-4-12-10-12Z",
  sparkle:   ["M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z", "M5 5l1 1M19 5l-1 1M5 19l1-1M19 19l-1-1"],
  calendar:  "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  shopping:  "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0",
  database:  ["M12 2C8.13 2 5 3.12 5 4.5v15C5 20.88 8.13 22 12 22s7-1.12 7-2.5v-15C19 3.12 15.87 2 12 2z", "M5 4.5C5 5.88 8.13 7 12 7s7-1.12 7-2.5M5 12c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5"],
  user:      "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  chevronR:  "M9 18l6-6-6-6",
  chevronL:  "M15 18l-6-6 6-6",
  chevronD:  "M6 9l6 6 6-6",
  check:     "M20 6 9 17l-5-5",
  x:         "M18 6 6 18M6 6l12 12",
  plus:      "M12 5v14M5 12h14",
  swap:      "M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4",
  fire:      "M12 2c0 0-5 5-5 10a7 7 0 0 0 14 0c0-5-5-10-5-10zM9.5 14.5c.5 1 1.5 1.5 2.5 1.5s2-.5 2.5-1.5",
  clock:     "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2",
  link:      "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  upload:    "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  search:    "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z",
  download:  "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  refresh:   "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  info:      "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-4M12 8h.01",
  target:    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  zap:       "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
  grid:      "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  alertTri:  "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  star:      "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  crescent:  "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  moon:      "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  barChart:  "M18 20V10M12 20V4M6 20v-6",
  ellipsis:  "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  shoppingBag: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18",
};

// ─────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_DATE  = [3, 4, 5, 6, 7, 8, 9]; // March dates

const makeMeal = (name, cal, p, c, f, prep, badges, alt1, alt2) => ({
  name, calories: cal, protein: p, carbs: c, fat: f, prepTime: prep,
  badges, recipeUrl: "#",
  alternatives: [
    { name: alt1[0], calories: alt1[1], protein: alt1[2], carbs: alt1[3], fat: alt1[4] },
    { name: alt2[0], calories: alt2[1], protein: alt2[2], carbs: alt2[3], fat: alt2[4] },
  ]
});

const WEEK_MEALS = {
  Mon: {
    Breakfast: makeMeal("Oatmeal Power Bowl", 540, 18, 74, 16, 10, ["veg"],
      ["Smoothie Bowl with Granola", 490, 14, 70, 15],
      ["Greek Yogurt Parfait", 420, 22, 52, 10]),
    Lunch:     makeMeal("Veggie Buddha Bowl", 690, 25, 90, 22, 20, ["veg","vegan"],
      ["Quinoa & Roasted Veggie Salad", 630, 20, 82, 18],
      ["Falafel Wrap with Hummus", 710, 22, 88, 24]),
    Dinner:    makeMeal("Pasta Primavera", 800, 28, 112, 22, 30, ["veg"],
      ["Veggie Stir-fry + Jasmine Rice", 730, 22, 100, 20],
      ["Chickpea Coconut Curry + Naan", 820, 30, 118, 26]),
    Snack:     makeMeal("Cottage Cheese & Berries", 310, 24, 28, 8, 2, ["veg"],
      ["Protein Yogurt Smoothie", 290, 20, 34, 7],
      ["Avocado Toast with Egg", 390, 16, 38, 20]),
  },
  Tue: {
    Breakfast: makeMeal("Avocado & Egg Toast Stack", 580, 22, 52, 28, 12, ["veg"],
      ["Banana Oat Pancakes", 520, 16, 72, 16],
      ["Vegetable Frittata", 470, 26, 18, 30]),
    Lunch:     makeMeal("Lentil Soup + Sourdough", 620, 30, 94, 10, 25, ["veg","vegan"],
      ["Tomato Basil Soup + Grilled Cheese", 680, 22, 78, 26],
      ["Greek Salad + Pita Bread", 590, 18, 76, 22]),
    Dinner:    makeMeal("Eggplant Parmesan", 760, 26, 92, 28, 45, ["veg"],
      ["Mushroom Risotto", 720, 20, 104, 22],
      ["Cheese-stuffed Bell Peppers", 690, 28, 78, 26]),
    Snack:     makeMeal("Hummus & Veggie Sticks", 280, 10, 32, 12, 5, ["veg","vegan"],
      ["Mixed Seeds & Dried Fruit", 320, 8, 38, 14],
      ["Whole Grain Crackers + Brie", 360, 12, 34, 18]),
  },
  Wed: {
    Breakfast: makeMeal("Smoothie Bowl Supreme", 500, 16, 76, 14, 8, ["veg","vegan"],
      ["Overnight Chia Oats", 480, 18, 70, 12],
      ["Tofu Scramble + Whole Toast", 520, 24, 42, 22]),
    Lunch:     makeMeal("Caprese & Grain Bowl", 650, 24, 80, 24, 15, ["veg"],
      ["Spinach & Feta Quesadilla", 700, 26, 82, 28],
      ["Veggie Sushi Rolls (8pc)", 580, 14, 96, 10]),
    Dinner:    makeMeal("Lentil Walnut Tacos (3)", 770, 28, 98, 26, 30, ["veg","vegan"],
      ["Black Bean Enchiladas", 810, 30, 108, 28],
      ["Tofu Tikka Masala + Basmati", 740, 32, 88, 22]),
    Snack:     makeMeal("Greek Yogurt + Honey", 290, 20, 36, 6, 2, ["veg"],
      ["Rice Cakes with Almond Butter", 340, 8, 44, 14],
      ["Edamame with Sea Salt", 240, 18, 20, 10]),
  },
  Thu: {
    Breakfast: makeMeal("Protein Pancake Stack", 620, 32, 72, 18, 20, ["veg"],
      ["Egg White Omelette + Veggies", 430, 30, 18, 16],
      ["Acai Bowl with Hemp Seeds", 540, 14, 78, 16]),
    Lunch:     makeMeal("Mediterranean Wrap", 660, 22, 86, 22, 18, ["veg"],
      ["Roasted Veggie Grain Bowl", 640, 20, 88, 20],
      ["Pesto Pasta Salad", 700, 18, 90, 26]),
    Dinner:    makeMeal("Mushroom & Spinach Lasagna", 820, 32, 108, 24, 50, ["veg"],
      ["Veggie Shepard's Pie", 780, 26, 104, 22],
      ["Three-Bean Chili + Cornbread", 800, 34, 114, 18]),
    Snack:     makeMeal("Date & Oat Energy Balls (3)", 330, 6, 52, 10, 10, ["veg","vegan"],
      ["Chocolate Banana Nice Cream", 300, 4, 62, 2],
      ["Cheese Platter + Crackers", 390, 14, 32, 22]),
  },
  Fri: {
    Breakfast: makeMeal("Bircher Muesli Bowl", 510, 16, 78, 12, 10, ["veg"],
      ["Egg & Veggie Breakfast Burrito", 570, 26, 64, 20],
      ["Ricotta Toast + Figs", 480, 18, 62, 16]),
    Lunch:     makeMeal("Halloumi & Roasted Veggie Salad", 680, 26, 52, 36, 22, ["veg"],
      ["Tomato & Mozzarella Panini", 640, 24, 74, 24],
      ["Sweet Potato & Black Bean Bowl", 660, 22, 94, 16]),
    Dinner:    makeMeal("Thai Peanut Tofu Noodles", 790, 30, 100, 28, 25, ["veg","vegan"],
      ["Vegetable Pad Thai", 760, 22, 110, 22],
      ["Coconut Curry Ramen", 800, 26, 108, 26]),
    Snack:     makeMeal("Mango Lassi", 320, 12, 52, 6, 5, ["veg"],
      ["Peanut Butter Banana Toast", 400, 12, 54, 16],
      ["Cottage Cheese & Pineapple", 280, 22, 30, 6]),
  },
  Sat: {
    Breakfast: makeMeal("Shakshuka with Feta", 560, 28, 40, 30, 25, ["veg"],
      ["Buttermilk Waffles + Berries", 620, 14, 90, 20],
      ["Smoked Salmon Bagel (sub cream cheese)", 580, 26, 62, 22]),
    Lunch:     makeMeal("BBQ Jackfruit Sliders (2)", 720, 18, 102, 22, 20, ["veg","vegan"],
      ["Veggie Burger + Sweet Potato Fries", 780, 24, 106, 28],
      ["Grilled Halloumi Pitta", 700, 28, 84, 28]),
    Dinner:    makeMeal("Truffle Mushroom Risotto", 830, 24, 116, 26, 40, ["veg"],
      ["Butternut Squash Pasta", 790, 20, 114, 22],
      ["Cheese & Spinach Stuffed Shells", 860, 32, 110, 30]),
    Snack:     makeMeal("Dark Chocolate & Raspberries", 290, 4, 36, 14, 3, ["veg","vegan"],
      ["Baked Cinnamon Pear", 240, 2, 52, 4],
      ["Chocolate Protein Mousse", 310, 22, 28, 12]),
  },
  Sun: {
    Breakfast: makeMeal("Sunday Brunch Eggs Benedict", 640, 30, 52, 32, 30, ["veg"],
      ["Full Veggie Breakfast Plate", 700, 28, 66, 34],
      ["Crepes with Fruit Compote", 580, 14, 86, 18]),
    Lunch:     makeMeal("Roasted Tomato Soup + Gruyère Croutons", 590, 20, 72, 22, 20, ["veg"],
      ["French Onion Soup + Baguette", 630, 18, 80, 22],
      ["Minestrone + Garlic Bread", 560, 18, 78, 16]),
    Dinner:    makeMeal("Butternut Squash Lasagna", 850, 34, 112, 28, 55, ["veg"],
      ["Spinach & Ricotta Cannelloni", 820, 32, 106, 28],
      ["Veggie Moussaka", 800, 28, 98, 32]),
    Snack:     makeMeal("Protein-packed Granola Bar (homemade)", 340, 14, 46, 12, 5, ["veg"],
      ["Apple + Peanut Butter", 350, 8, 50, 14],
      ["Warm Spiced Milk + Dates", 310, 10, 52, 8]),
  },
};

const GROCERY_ITEMS = [
  // Produce
  { id: 1,  name: "Bananas (bunch)",           qty: "2",    unit: "bunches",  category: "Produce",  checked: false, alt: "Plantains" },
  { id: 2,  name: "Baby Spinach",              qty: "250",  unit: "g",        category: "Produce",  checked: false, alt: "Kale" },
  { id: 3,  name: "Avocados",                  qty: "4",    unit: "pcs",      category: "Produce",  checked: false, alt: "Guacamole cups" },
  { id: 4,  name: "Cherry Tomatoes",           qty: "400",  unit: "g",        category: "Produce",  checked: false, alt: "Roma tomatoes" },
  { id: 5,  name: "Bell Peppers (mixed)",      qty: "3",    unit: "pcs",      category: "Produce",  checked: false, alt: "Zucchini" },
  { id: 6,  name: "Broccoli",                  qty: "1",    unit: "head",     category: "Produce",  checked: false, alt: "Cauliflower" },
  { id: 7,  name: "Sweet Potatoes",            qty: "4",    unit: "pcs",      category: "Produce",  checked: false, alt: "Butternut squash" },
  { id: 8,  name: "Mushrooms (cremini)",       qty: "300",  unit: "g",        category: "Produce",  checked: false, alt: "Portobello caps" },
  { id: 9,  name: "Eggplant",                  qty: "2",    unit: "pcs",      category: "Produce",  checked: false, alt: "Courgette" },
  { id: 10, name: "Fresh Basil",               qty: "1",    unit: "bunch",    category: "Produce",  checked: false, alt: "Dried basil" },

  // Proteins
  { id: 11, name: "Free-range Eggs",           qty: "12",   unit: "pcs",      category: "Proteins", checked: false, alt: "Liquid egg whites" },
  { id: 12, name: "Firm Tofu",                 qty: "400",  unit: "g",        category: "Proteins", checked: false, alt: "Tempeh" },
  { id: 13, name: "Red Lentils",               qty: "500",  unit: "g",        category: "Proteins", checked: false, alt: "Green lentils" },
  { id: 14, name: "Canned Chickpeas",          qty: "2",    unit: "cans",     category: "Proteins", checked: false, alt: "Canned white beans" },
  { id: 15, name: "Canned Black Beans",        qty: "1",    unit: "can",      category: "Proteins", checked: false, alt: "Canned kidney beans" },

  // Dairy & Eggs
  { id: 16, name: "Greek Yogurt (0% fat)",     qty: "500",  unit: "g",        category: "Dairy",    checked: false, alt: "Skyr" },
  { id: 17, name: "Cottage Cheese",            qty: "250",  unit: "g",        category: "Dairy",    checked: false, alt: "Ricotta" },
  { id: 18, name: "Feta Cheese",               qty: "200",  unit: "g",        category: "Dairy",    checked: false, alt: "Halloumi" },
  { id: 19, name: "Mozzarella (fresh)",        qty: "200",  unit: "g",        category: "Dairy",    checked: false, alt: "Burrata" },
  { id: 20, name: "Whole Milk",                qty: "1",    unit: "litre",    category: "Dairy",    checked: false, alt: "Oat milk" },

  // Grains & Pasta
  { id: 21, name: "Rolled Oats",               qty: "1",    unit: "kg",       category: "Grains",   checked: false, alt: "Steel-cut oats" },
  { id: 22, name: "Penne Pasta",               qty: "500",  unit: "g",        category: "Grains",   checked: false, alt: "Fusilli" },
  { id: 23, name: "Basmati Rice",              qty: "1",    unit: "kg",       category: "Grains",   checked: false, alt: "Jasmine rice" },
  { id: 24, name: "Quinoa",                    qty: "400",  unit: "g",        category: "Grains",   checked: false, alt: "Bulgur wheat" },
  { id: 25, name: "Sourdough Bread",           qty: "1",    unit: "loaf",     category: "Grains",   checked: false, alt: "Whole-grain bread" },
  { id: 26, name: "Whole-wheat Tortillas",     qty: "8",    unit: "pcs",      category: "Grains",   checked: false, alt: "Corn tortillas" },

  // Pantry
  { id: 27, name: "Olive Oil (extra virgin)",  qty: "500",  unit: "ml",       category: "Pantry",   checked: false, alt: "Avocado oil" },
  { id: 28, name: "Coconut Milk (canned)",     qty: "2",    unit: "cans",     category: "Pantry",   checked: false, alt: "Oat cream" },
  { id: 29, name: "Tahini",                    qty: "250",  unit: "g",        category: "Pantry",   checked: false, alt: "Sunflower seed butter" },
  { id: 30, name: "Hummus",                    qty: "200",  unit: "g",        category: "Pantry",   checked: false, alt: "White bean dip" },
  { id: 31, name: "Soy Sauce",                 qty: "1",    unit: "bottle",   category: "Pantry",   checked: false, alt: "Tamari (GF)" },
  { id: 32, name: "Vegetable Stock Cubes",     qty: "12",   unit: "cubes",    category: "Pantry",   checked: false, alt: "Miso paste" },
  { id: 33, name: "Canned Diced Tomatoes",     qty: "3",    unit: "cans",     category: "Pantry",   checked: false, alt: "Passata" },
  { id: 34, name: "Honey (raw)",               qty: "1",    unit: "jar",      category: "Pantry",   checked: false, alt: "Maple syrup" },

  // Snacks
  { id: 35, name: "Dark Chocolate (70%+)",     qty: "100",  unit: "g",        category: "Snacks",   checked: false, alt: "Cacao nibs" },
  { id: 36, name: "Medjool Dates",             qty: "200",  unit: "g",        category: "Snacks",   checked: false, alt: "Dried figs" },
  { id: 37, name: "Granola (low sugar)",       qty: "400",  unit: "g",        category: "Snacks",   checked: false, alt: "Muesli" },
  { id: 38, name: "Protein Powder (vanilla)",  qty: "1",    unit: "tub",      category: "Snacks",   checked: false, alt: "Pea protein" },
];

const PRODUCTS = [
  { id: 1,  name: "TJ's Rolled Oats",               cal: 150, protein: 5,  carbs: 27, fat: 3,  per: "½ cup",  confidence: "high",  source: "USDA" },
  { id: 2,  name: "TJ's Greek Non-Fat Yogurt",       cal: 90,  protein: 17, carbs: 6,  fat: 0,  per: "170g",   confidence: "high",  source: "Nutritionix" },
  { id: 3,  name: "TJ's Organic Baby Spinach",       cal: 20,  protein: 2,  carbs: 3,  fat: 0,  per: "100g",   confidence: "high",  source: "USDA" },
  { id: 4,  name: "TJ's Penne Pasta",                cal: 200, protein: 7,  carbs: 40, fat: 1,  per: "85g dry",confidence: "high",  source: "Package" },
  { id: 5,  name: "TJ's Firm Tofu",                  cal: 80,  protein: 9,  carbs: 2,  fat: 4,  per: "85g",    confidence: "high",  source: "Nutritionix" },
  { id: 6,  name: "TJ's Organic Red Lentils",        cal: 120, protein: 9,  carbs: 21, fat: 1,  per: "¼ cup",  confidence: "high",  source: "USDA" },
  { id: 7,  name: "TJ's Avocados (Hass)",            cal: 160, protein: 2,  carbs: 9,  fat: 15, per: "1 med",  confidence: "high",  source: "USDA" },
  { id: 8,  name: "TJ's Quinoa Blend",               cal: 170, protein: 6,  carbs: 30, fat: 3,  per: "¼ cup",  confidence: "high",  source: "Package" },
  { id: 9,  name: "TJ's Miso Ginger Broth",          cal: 25,  protein: 1,  carbs: 4,  fat: 0,  per: "240ml",  confidence: "med",   source: "Claude AI" },
  { id: 10, name: "TJ's Multigrain Crackers",        cal: 130, protein: 3,  carbs: 22, fat: 4,  per: "16g",    confidence: "med",   source: "Claude AI" },
  { id: 11, name: "TJ's Organic Hummus",             cal: 70,  protein: 2,  carbs: 6,  fat: 5,  per: "2 tbsp", confidence: "high",  source: "Package" },
  { id: 12, name: "TJ's Coconut Milk (canned)",      cal: 180, protein: 1,  carbs: 2,  fat: 19, per: "120ml",  confidence: "high",  source: "Package" },
  { id: 13, name: "TJ's Protein Bar (Choc Almond)",  cal: 200, protein: 20, carbs: 21, fat: 8,  per: "1 bar",  confidence: "med",   source: "Claude AI" },
  { id: 14, name: "TJ's Raw Honey",                  cal: 60,  protein: 0,  carbs: 17, fat: 0,  per: "1 tbsp", confidence: "high",  source: "USDA" },
  { id: 15, name: "TJ's Dark Chocolate 72%",         cal: 170, protein: 2,  carbs: 14, fat: 13, per: "40g",    confidence: "high",  source: "Package" },
  { id: 16, name: "TJ's Organic Feta",               cal: 80,  protein: 4,  carbs: 1,  fat: 6,  per: "28g",    confidence: "high",  source: "Nutritionix" },
  { id: 17, name: "TJ's Sweet Potato Gnocchi",       cal: 210, protein: 5,  carbs: 44, fat: 2,  per: "140g",   confidence: "low",   source: "Claude AI" },
  { id: 18, name: "TJ's Organic Tahini",             cal: 90,  protein: 3,  carbs: 3,  fat: 8,  per: "1 tbsp", confidence: "high",  source: "USDA" },
];

const CATEGORY_COLORS = {
  Produce:  { bg: "#DCFCE7", text: "#15803D", icon: "🥬" },
  Proteins: { bg: "#FEF3C7", text: "#92400E", icon: "🥚" },
  Dairy:    { bg: "#EFF6FF", text: "#1D4ED8", icon: "🧀" },
  Grains:   { bg: "#FEF9C3", text: "#713F12", icon: "🌾" },
  Pantry:   { bg: "#F3E8FF", text: "#6B21A8", icon: "🫙" },
  Snacks:   { bg: "#FFE4E6", text: "#9F1239", icon: "🍫" },
};

const BADGE_CONFIGS = {
  veg:   { label: "Vegetarian", icon: "🌿", className: "badge-veg" },
  vegan: { label: "Vegan",      icon: "🌱", className: "badge-vegan" },
  halal: { label: "Halal",      icon: "☽",  className: "badge-halal" },
  gf:    { label: "Gluten-Free",icon: "🌾", className: "badge-gf" },
};

// ─────────────────────────────────────────────
// SMALL REUSABLE COMPONENTS
// ─────────────────────────────────────────────

function DietBadge({ type }) {
  const cfg = BADGE_CONFIGS[type];
  if (!cfg) return null;
  return (
    <span className={`diet-badge ${cfg.className}`}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function RingChart({ percentage = 0, color = "#1B4332", size = 88, strokeWidth = 9, label, value, unit = "" }) {
  const radius = (size - strokeWidth) / 2;
  const circ   = 2 * Math.PI * radius;
  const pct    = Math.min(100, Math.max(0, percentage));
  const dash   = (pct / 100) * circ;
  const cx = size / 2, cy = size / 2;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(pct), 80);
    return () => clearTimeout(timer);
  }, [pct]);

  const animatedDash = (animated / 100) * circ;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--cream-dark)" strokeWidth={strokeWidth} />
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={`${animatedDash} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.22,.68,0,1.2)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center" }}>
          <span className="display" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
            {value}
          </span>
          {unit && <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{unit}</span>}
        </div>
      </div>
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
    </div>
  );
}

function MacroBar({ label, current, max, color, unit = "g" }) {
  const pct = Math.min(100, (current / max) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", width: 56, fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, background: "var(--cream-dark)", borderRadius: 100, height: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 100, background: color,
          width: `${pct}%`, transition: "width 0.7s cubic-bezier(.22,.68,0,1.2)" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", minWidth: 48, textAlign: "right" }}>
        {current}{unit}
      </span>
    </div>
  );
}

function SkeletonMealCard() {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 12 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="skeleton" style={{ height: 18, width: "60%" }} />
          <div className="skeleton" style={{ height: 13, width: "40%" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 24, flex: 1, borderRadius: 100 }} />)}
      </div>
    </div>
  );
}

function ConfidenceBadge({ level }) {
  const cfg = {
    high: { label: "High", className: "badge-high" },
    med:  { label: "Medium", className: "badge-med" },
    low:  { label: "Low", className: "badge-low" },
  }[level] || { label: level, className: "badge-med" };
  return <span className={`diet-badge ${cfg.className}`}>{cfg.label}</span>;
}

// ─────────────────────────────────────────────
// RECIPE MODAL
// ─────────────────────────────────────────────
function RecipeModal({ mealName, loading, data, error, onClose, onRetry }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        className="anim-fade-up"
        style={{
          background: "white", borderRadius: 20, width: "100%", maxWidth: 500,
          maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
              color: "var(--forest)", marginBottom: 4 }}>Recipe</div>
            <h3 className="display" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
              {mealName}
            </h3>
          </div>
          <button onClick={onClose}
            style={{ background: "var(--cream)", border: "none", borderRadius: 10, width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Icon d={Icons.x} size={15} stroke="var(--text-secondary)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px 24px" }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "48px 0", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--mint-light)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d={Icons.sparkle} size={22} stroke="var(--forest)" className="anim-spin" />
              </div>
              <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>
                Fetching recipe…
              </p>
            </div>
          )}

          {error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10,
                padding: "12px 16px", display: "flex", gap: 10 }}>
                <Icon d={Icons.alertTri} size={16} stroke="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: "#991B1B", lineHeight: 1.5, margin: 0 }}>{error}</p>
              </div>
              <button className="btn-primary" onClick={onRetry} style={{ alignSelf: "flex-start" }}>
                <Icon d={Icons.refresh} size={14} /> Try Again
              </button>
            </div>
          )}

          {data && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Ingredients */}
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                  color: "var(--text-muted)", marginBottom: 12 }}>Ingredients</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(data.ingredients || []).map((ing, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--forest)",
                        flexShrink: 0, marginTop: 6 }} />
                      <span style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5 }}>{ing}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: "var(--border)" }} />

              {/* Steps */}
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                  color: "var(--text-muted)", marginBottom: 12 }}>Method</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(data.steps || []).map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: "var(--mint-light)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--forest)" }}>{i + 1}</span>
                      </div>
                      <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6, margin: 0, paddingTop: 4 }}>
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "var(--mint-light)", borderRadius: 10, padding: "10px 14px",
                display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Icon d={Icons.sparkle} size={13} stroke="var(--forest)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: "var(--forest-mid)", lineHeight: 1.5 }}>
                  Recipe generated by Claude AI. Adjust seasoning and quantities to taste.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// API KEY SCREEN
// ─────────────────────────────────────────────
function ApiKeyScreen({ onContinue }) {
  const [key, setKey]     = useState("");
  const [show, setShow]   = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;
    localStorage.setItem("nutriplan_api_key", trimmed);
    onContinue(trimmed);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, justifyContent: "center" }}>
          <div style={{ width: 40, height: 40, background: "var(--forest)", borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={Icons.leaf} size={22} stroke="var(--mint)" strokeWidth={2} />
          </div>
          <span className="display" style={{ fontSize: 26, fontWeight: 700, color: "var(--forest)" }}>NutriPlan</span>
        </div>

        <div className="card" style={{ padding: 36 }}>
          <h2 className="display" style={{ fontSize: 24, fontWeight: 700, color: "var(--forest)", marginBottom: 8 }}>
            Connect to Claude AI
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 28, lineHeight: 1.6 }}>
            NutriPlan uses Claude to generate your personalised meal plans. Enter your Anthropic API key to get started.
          </p>

          <form onSubmit={handleSubmit}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Anthropic API Key
            </label>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <input
                className="input-field"
                type={show ? "text" : "password"}
                placeholder="sk-ant-api03-…"
                value={key}
                onChange={e => setKey(e.target.value)}
                style={{ paddingRight: 80 }}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", fontSize: 12,
                  color: "var(--text-muted)", fontWeight: 600, padding: "4px 8px" }}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 28, display: "flex", gap: 6, alignItems: "flex-start" }}>
              <Icon d={Icons.info} size={13} stroke="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
              Key is stored locally in your browser and never sent anywhere except the Anthropic API.
            </p>

            <button className="btn-primary" type="submit" style={{ width: "100%" }}>
              <Icon d={Icons.sparkle} size={16} />
              Save &amp; Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// GENERATING SCREEN
// ─────────────────────────────────────────────
const GEN_STAGES = [
  { label: "Parsing your product list…",   pct: 25  },
  { label: "Crafting personalised meals…", pct: 65  },
  { label: "Building your grocery list…",  pct: 85  },
  { label: "Finalising your plan…",        pct: 100 },
];

function GeneratingScreen({ user, error, onRetry }) {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    if (error) return;
    if (stageIdx >= GEN_STAGES.length - 1) return;
    const timings = [1200, 3500, 2000]; // ms between stage advances
    const t = setTimeout(() => setStageIdx(s => s + 1), timings[stageIdx] || 2000);
    return () => clearTimeout(t);
  }, [stageIdx, error]);

  const stage = GEN_STAGES[Math.min(stageIdx, GEN_STAGES.length - 1)];

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48, justifyContent: "center" }}>
          <div style={{ width: 40, height: 40, background: "var(--forest)", borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={Icons.leaf} size={22} stroke="var(--mint)" strokeWidth={2} className={!error ? "anim-pulse" : ""} />
          </div>
          <span className="display" style={{ fontSize: 26, fontWeight: 700, color: "var(--forest)" }}>NutriPlan</span>
        </div>

        {error ? (
          <div className="card" style={{ padding: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FEE2E2",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Icon d={Icons.alertTri} size={24} stroke="#DC2626" />
            </div>
            <h2 className="display" style={{ fontSize: 22, fontWeight: 700, color: "#DC2626", marginBottom: 12 }}>
              Generation Failed
            </h2>
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 24, textAlign: "left" }}>
              <p style={{ fontSize: 13, color: "#991B1B", lineHeight: 1.6, margin: 0 }}>{error}</p>
            </div>
            <button className="btn-primary" onClick={onRetry} style={{ width: "100%" }}>
              <Icon d={Icons.refresh} size={16} /> Try Again
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 40 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--mint-light)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <Icon d={Icons.sparkle} size={32} stroke="var(--forest)" className="anim-spin" />
            </div>
            <h2 className="display" style={{ fontSize: 24, fontWeight: 700, color: "var(--forest)", marginBottom: 6 }}>
              Building your plan
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 32 }}>
              For {user?.name || "you"} · {(user?.calories || 2000).toLocaleString()} kcal/day target
            </p>

            {/* Progress bar */}
            <div style={{ marginBottom: 20 }}>
              <div className="progress-bar-track" style={{ height: 8, marginBottom: 12 }}>
                <div className="progress-bar-fill" style={{ width: `${stage.pct}%`, transition: "width 0.8s cubic-bezier(.22,.68,0,1.2)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{stage.label}</span>
                <span style={{ color: "var(--forest)", fontWeight: 700 }}>{stage.pct}%</span>
              </div>
            </div>

            {/* Stage steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
              {GEN_STAGES.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    background: i < stageIdx ? "var(--forest)" : i === stageIdx ? "var(--mint-light)" : "var(--cream-dark)",
                    border: i === stageIdx ? "2px solid var(--forest)" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.3s ease",
                  }}>
                    {i < stageIdx
                      ? <Icon d={Icons.check} size={12} stroke="white" strokeWidth={2.5} />
                      : i === stageIdx
                        ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--forest)" }} />
                        : null}
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: i === stageIdx ? 600 : 400,
                    color: i <= stageIdx ? "var(--text-primary)" : "var(--text-muted)",
                    transition: "all 0.3s ease",
                  }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [dir, setDir]   = useState("right"); // slide direction
  const [form, setForm] = useState({
    name: "",
    calories: 2800,
    goal: "gain",
    timeline: "3 months",
    dietary: [],
    allergies: [],
    supermarket: "Lidl",
    budget: "",
    currency: "€",
  });

  const steps = [
    { title: "Your Goals",           subtitle: "Tell us what you're working towards" },
    { title: "Dietary Preferences",  subtitle: "We'll make sure every meal fits your lifestyle" },
    { title: "Allergies & Restrictions", subtitle: "Safety first — we'll never suggest these" },
    { title: "Supermarket Setup",    subtitle: "So we can plan meals from products you can actually buy" },
  ];

  const DIETARY_OPTIONS = [
    { id: "vegetarian", label: "Vegetarian", icon: "🌿" },
    { id: "vegan",      label: "Vegan",      icon: "🌱" },
    { id: "halal",      label: "Halal",      icon: "☽" },
    { id: "kosher",     label: "Kosher",     icon: "✡" },
    { id: "gluten-free",label: "Gluten-Free",icon: "🌾" },
    { id: "dairy-free", label: "Dairy-Free", icon: "🥛" },
    { id: "keto",       label: "Keto",       icon: "🥑" },
    { id: "paleo",      label: "Paleo",      icon: "🦴" },
  ];

  const ALLERGY_OPTIONS = [
    { id: "peanuts",    label: "Peanuts",    icon: "🥜" },
    { id: "tree-nuts",  label: "Tree Nuts",  icon: "🌰" },
    { id: "dairy",      label: "Dairy",      icon: "🧀" },
    { id: "eggs",       label: "Eggs",       icon: "🥚" },
    { id: "shellfish",  label: "Shellfish",  icon: "🦐" },
    { id: "fish",       label: "Fish",       icon: "🐟" },
    { id: "soy",        label: "Soy",        icon: "🫘" },
    { id: "gluten",     label: "Gluten",     icon: "🍞" },
    { id: "sesame",     label: "Sesame",     icon: "🌿" },
    { id: "sulfites",   label: "Sulfites",   icon: "🍷" },
  ];

  const GOAL_OPTIONS = [
    { id: "gain",     label: "Weight Gain",     icon: "📈", desc: "Build mass and muscle" },
    { id: "lose",     label: "Weight Loss",     icon: "📉", desc: "Caloric deficit approach" },
    { id: "maintain", label: "Maintenance",     icon: "⚖️",  desc: "Stay at current weight" },
  ];

  const toggle = (field, val) =>
    setForm(f => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val],
    }));

  const goNext = () => { setDir("right"); setStep(s => s + 1); };
  const goBack = () => { setDir("left");  setStep(s => s - 1); };

  const animClass = dir === "right" ? "anim-slide-r" : "anim-slide-l";

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex" }}>
      {/* Left panel — decorative */}
      <div style={{
        width: 380, flexShrink: 0, background: "var(--forest)",
        display: "flex", flexDirection: "column", padding: "48px 40px",
        position: "sticky", top: 0, height: "100vh",
      }} className="hidden-mobile">
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 56 }}>
          <div style={{ width: 36, height: 36, background: "var(--mint)", borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={Icons.leaf} size={20} stroke="var(--forest)" strokeWidth={2} />
          </div>
          <span className="display" style={{ fontSize: 22, fontWeight: 700, color: "white" }}>NutriPlan</span>
        </div>

        {/* Steps list */}
        <div style={{ flex: 1 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 14, marginBottom: 32, opacity: i <= step ? 1 : 0.4, transition: "opacity 0.3s ease" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: i < step ? "var(--mint)" : i === step ? "white" : "transparent",
                border: i === step ? "2px solid white" : i > step ? "2px solid rgba(255,255,255,0.3)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s ease",
              }}>
                {i < step
                  ? <Icon d={Icons.check} size={14} stroke="var(--forest)" strokeWidth={2.5} />
                  : <span style={{ fontSize: 13, fontWeight: 700, color: i === step ? "var(--forest)" : "rgba(255,255,255,0.5)" }}>{i + 1}</span>
                }
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: i === step ? "white" : "rgba(255,255,255,0.6)", marginBottom: 2 }}>{s.title}</div>
                {i === step && <div style={{ fontSize: 12, color: "var(--mint)", opacity: 0.9 }}>{s.subtitle}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 24 }}>
          <p className="display-italic" style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
            "Let food be thy medicine and medicine be thy food."
          </p>
          <p style={{ fontSize: 12, color: "var(--mint)", marginTop: 8, fontWeight: 500 }}>— Hippocrates</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 24px" }}>
        {/* Mobile logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "24px 0 0", marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, background: "var(--forest)", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={Icons.leaf} size={14} stroke="var(--mint)" strokeWidth={2} />
          </div>
          <span className="display" style={{ fontSize: 18, fontWeight: 700, color: "var(--forest)" }}>NutriPlan</span>
        </div>

        <div style={{ maxWidth: 540, margin: "0 auto", width: "100%", flex: 1, display: "flex", flexDirection: "column",
          paddingTop: 40, paddingBottom: 40 }}>
          {/* Progress */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Step {step + 1} of {steps.length}</span>
              <span style={{ fontSize: 13, color: "var(--forest)", fontWeight: 700 }}>{Math.round(((step + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
            </div>
          </div>

          {/* Step content */}
          <div key={step} className={animClass} style={{ flex: 1 }}>
            <h2 className="display" style={{ fontSize: 32, fontWeight: 700, color: "var(--forest)", marginBottom: 8 }}>
              {steps[step].title}
            </h2>
            <p style={{ fontSize: 16, color: "var(--text-secondary)", marginBottom: 36, lineHeight: 1.6 }}>
              {steps[step].subtitle}
            </p>

            {/* ---- STEP 0: Goals ---- */}
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Your Name
                  </label>
                  <input className="input-field" placeholder="e.g. Sarah" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Weight Goal
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {GOAL_OPTIONS.map(g => (
                      <button key={g.id} onClick={() => setForm(f => ({ ...f, goal: g.id }))}
                        style={{
                          padding: "16px 12px", borderRadius: 14, border: "1.5px solid",
                          borderColor: form.goal === g.id ? "var(--forest)" : "var(--border)",
                          background: form.goal === g.id ? "var(--mint-light)" : "white",
                          cursor: "pointer", textAlign: "center", transition: "all 0.18s ease",
                        }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{g.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: form.goal === g.id ? "var(--forest)" : "var(--text-primary)", marginBottom: 2 }}>{g.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{g.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Daily Calorie Target
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <input type="range" min={1200} max={4000} step={50} value={form.calories}
                      onChange={e => setForm(f => ({ ...f, calories: +e.target.value }))}
                      style={{ flex: 1, accentColor: "var(--forest)", height: 4 }} />
                    <div style={{ background: "var(--forest)", color: "white", borderRadius: 10,
                      padding: "8px 16px", fontSize: 16, fontWeight: 700, minWidth: 80, textAlign: "center" }}>
                      {form.calories.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>1,200 kcal</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>4,000 kcal</span>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Timeline
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["1 month", "3 months", "6 months", "12 months"].map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, timeline: t }))}
                        className={`toggle-chip ${form.timeline === t ? "selected" : ""}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ---- STEP 1: Dietary ---- */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Select all that apply to you</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {DIETARY_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => toggle("dietary", opt.id)}
                      className={`toggle-chip ${form.dietary.includes(opt.id) ? "selected" : ""}`}
                      style={{ justifyContent: "flex-start", padding: "12px 16px", borderRadius: 12 }}>
                      <span style={{ fontSize: 18 }}>{opt.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{opt.label}</span>
                      {form.dietary.includes(opt.id) && <span style={{ marginLeft: "auto" }}><Icon d={Icons.check} size={14} /></span>}
                    </button>
                  ))}
                </div>
                {form.dietary.length === 0 && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    <Icon d={Icons.info} size={14} />
                    <span>If none apply, we'll plan balanced omnivore meals</span>
                  </div>
                )}
              </div>
            )}

            {/* ---- STEP 2: Allergies ---- */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ background: "#FEF9C3", border: "1px solid #FDE68A", borderRadius: 12,
                  padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Icon d={Icons.alertTri} size={16} stroke="#92400E" />
                  <p style={{ fontSize: 13, color: "#92400E", lineHeight: 1.5 }}>
                    We take allergies seriously. Selected items will <strong>never</strong> appear in your meal plans.
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {ALLERGY_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => toggle("allergies", opt.id)}
                      className={`toggle-chip ${form.allergies.includes(opt.id) ? "selected" : ""}`}
                      style={{
                        justifyContent: "flex-start", padding: "12px 16px", borderRadius: 12,
                        borderColor: form.allergies.includes(opt.id) ? "var(--coral)" : "var(--border)",
                        background: form.allergies.includes(opt.id) ? "#FEE2E2" : "white",
                        color: form.allergies.includes(opt.id) ? "#991B1B" : "var(--text-secondary)",
                      }}>
                      <span style={{ fontSize: 18 }}>{opt.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{opt.label}</span>
                      {form.allergies.includes(opt.id) && (
                        <span style={{ marginLeft: "auto" }}>
                          <Icon d={Icons.x} size={14} stroke="#991B1B" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ---- STEP 3: Supermarket ---- */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Supermarket Name
                  </label>
                  <input className="input-field" placeholder="e.g. Trader Joe's, Whole Foods, Kroger"
                    value={form.supermarket} onChange={e => setForm(f => ({ ...f, supermarket: e.target.value }))} />
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                    We'll tailor your meal plans to products available at your store.
                  </p>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Weekly Grocery Budget <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      value={form.currency}
                      onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                      className="input-field"
                      style={{ width: 80, flexShrink: 0 }}>
                      {["€","$","£","¥","A$","C$","CHF","₹"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      className="input-field"
                      type="number"
                      min="0"
                      step="5"
                      placeholder="e.g. 150"
                      value={form.budget}
                      onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                    Claude will select ingredients and meals that fit within your weekly spend.
                  </p>
                </div>

                <div style={{ background: "var(--mint-light)", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 12 }}>
                  <Icon d={Icons.info} size={16} stroke="var(--forest)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 13, color: "var(--forest-mid)", lineHeight: 1.5 }}>
                    <strong>{CSV_PRODUCTS.length} products</strong> loaded from your Lidl catalogue. Claude will use these to build your meal plan.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            {step > 0
              ? <button className="btn-secondary" onClick={goBack}>
                  <Icon d={Icons.chevronL} size={16} /> Back
                </button>
              : <div />}

            {step < steps.length - 1
              ? <button className="btn-primary" onClick={goNext}>
                  Continue <Icon d={Icons.chevronR} size={16} />
                </button>
              : <button className="btn-primary" onClick={() => onComplete(form)}>
                  <Icon d={Icons.sparkle} size={16} />
                  Generate My Plan
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MEAL PLAN VIEW
// ─────────────────────────────────────────────
function MealCard({ meal, mealType, onSwap, isGenerating, onViewRecipe }) {
  const [showAlts, setShowAlts] = useState(false);
  const mealTypeColors = {
    Breakfast: { bg: "#FEF3C7", text: "#92400E", emoji: "🌅" },
    Lunch:     { bg: "#DCFCE7", text: "#15803D", emoji: "☀️" },
    Dinner:    { bg: "#EDE9FE", text: "#5B21B6", emoji: "🌙" },
    Snack:     { bg: "#FFE4E6", text: "#9F1239", emoji: "🍎" },
  };
  const cfg = mealTypeColors[mealType] || mealTypeColors.Snack;

  if (isGenerating) return <SkeletonMealCard />;

  return (
    <div className="card card-hover anim-fade-up" style={{ overflow: "hidden" }}>
      <div className="meal-card-inner" style={{ padding: 20 }}>
        <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
          {/* Meal type icon */}
          <div style={{ width: 52, height: 52, borderRadius: 14, background: cfg.bg,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 22 }}>{cfg.emoji}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: cfg.text }}>
                  {mealType}
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginTop: 2 }}>
                  {meal.name}
                </h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <Icon d={Icons.clock} size={12} stroke="var(--text-muted)" />
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{meal.prepTime}m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Macros row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--cream)", borderRadius: 100, padding: "4px 10px" }}>
            <Icon d={Icons.fire} size={12} stroke="var(--coral)" fill="none" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{meal.calories}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>kcal</span>
          </div>
          {[
            { label: "P", value: meal.protein, color: "#3B82F6" },
            { label: "C", value: meal.carbs, color: "#F59E0B" },
            { label: "F", value: meal.fat, color: "#EF4444" },
          ].map(m => (
            <div key={m.label} style={{ display: "flex", gap: 3, alignItems: "center", background: "var(--cream)", borderRadius: 100, padding: "4px 10px" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: m.color }}>{m.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{m.value}g</span>
            </div>
          ))}
        </div>

        {/* Dietary badges */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
          {meal.badges.map(b => <DietBadge key={b} type={b} />)}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }}
            onClick={() => onViewRecipe && onViewRecipe(meal.name)}>
            <Icon d={Icons.link} size={13} /> Recipe
          </button>
          <button className="btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }}
            onClick={() => setShowAlts(v => !v)}>
            <Icon d={Icons.swap} size={13} />
            {showAlts ? "Hide" : "Alternatives"}
            <Icon d={Icons.chevronD} size={12} style={{ transform: showAlts ? "rotate(180deg)" : "none", transition: "transform 0.25s" }} />
          </button>
        </div>
      </div>

      {/* Alternatives panel */}
      <div className={`alternatives-panel ${showAlts ? "open" : ""}`}>
        <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ height: 1, background: "var(--border)", marginBottom: 4 }} />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 4 }}>
            Alternative Options
          </p>
          {meal.alternatives.map((alt, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
              background: "var(--cream)", borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{alt.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {alt.calories} kcal · P {alt.protein}g · C {alt.carbs}g · F {alt.fat}g
                </div>
              </div>
              <button className="btn-ghost" style={{ fontSize: 12, padding: "6px 10px", flexShrink: 0 }}
                onClick={() => onSwap(alt)}>
                <Icon d={Icons.swap} size={12} /> Swap
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MealPlanView({ user, mealPlan, onRegenerate, onMealSwap, apiKey }) {
  const [activeDay, setActiveDay] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Recipe modal state
  const [recipe, setRecipe] = useState({ open: false, mealName: "", loading: false, data: null, error: null });

  const handleViewRecipe = async (mealName) => {
    setRecipe({ open: true, mealName, loading: true, data: null, error: null });
    try {
      const data = await generateRecipe(apiKey, mealName);
      setRecipe(prev => ({ ...prev, loading: false, data }));
    } catch (e) {
      setRecipe(prev => ({ ...prev, loading: false, error: e.message }));
    }
  };

  const closeRecipe = () => setRecipe(prev => ({ ...prev, open: false }));

  const handleExport = () => {
    const rows = [["Day", "Meal", "Name", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Prep Time (min)"]];
    for (const day of DAYS_SHORT) {
      for (const mealType of ["Breakfast", "Lunch", "Dinner", "Snack"]) {
        const m = (mealPlan || WEEK_MEALS)[day]?.[mealType];
        if (m) rows.push([day, mealType, m.name, m.calories, m.protein, m.carbs, m.fat, m.prepTime || ""]);
      }
    }
    const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "meal-plan.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const basePlan = mealPlan || WEEK_MEALS;
  const [dayMeals, setDayMeals] = useState({ ...basePlan });

  // Sync when a new mealPlan comes in (after regenerate)
  useEffect(() => {
    setDayMeals({ ...(mealPlan || WEEK_MEALS) });
  }, [mealPlan]);

  const dayKey = DAYS_SHORT[activeDay];
  const meals  = dayMeals[dayKey] || {};

  const totalCals = Object.values(meals).reduce((s, m) => s + (m.calories || 0), 0);
  const totalProt = Object.values(meals).reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarb = Object.values(meals).reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat  = Object.values(meals).reduce((s, m) => s + (m.fat || 0), 0);
  const target    = user?.calories || 2800;

  const handleSwap = (mealType, altMeal) => {
    setDayMeals(prev => {
      const updated = {
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          [mealType]: { ...prev[dayKey][mealType], name: altMeal.name, calories: altMeal.calories,
            protein: altMeal.protein, carbs: altMeal.carbs, fat: altMeal.fat },
        },
      };
      onMealSwap?.(updated);
      return updated;
    });
  };

  const handleRegenerate = async () => {
    if (onRegenerate) {
      setIsGenerating(true);
      try {
        await onRegenerate();
      } finally {
        setIsGenerating(false);
      }
    } else {
      setIsGenerating(true);
      setTimeout(() => setIsGenerating(false), 2600);
    }
  };

  // Weekly stats
  const weeklyCalTotal = DAYS_SHORT.reduce((s, d) =>
    s + Object.values(dayMeals[d] || {}).reduce((ss, m) => ss + (m.calories || 0), 0), 0);

  return (
    <>
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 className="display" style={{ fontSize: 30, fontWeight: 700, color: "var(--forest)", marginBottom: 4 }}>
            This Week's Plan
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            Personalized for {user?.name || "you"} · {target.toLocaleString()} kcal/day target
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" style={{ fontSize: 13, padding: "9px 18px" }} onClick={handleExport}>
            <Icon d={Icons.download} size={14} /> Export
          </button>
          <button className="btn-primary" style={{ fontSize: 13, padding: "9px 18px" }} onClick={handleRegenerate}>
            <Icon d={Icons.sparkle} size={14} className={isGenerating ? "anim-spin" : ""} />
            {isGenerating ? "Generating…" : "Regenerate Plan"}
          </button>
        </div>
      </div>

      {/* Generating bar */}
      {isGenerating && <div className="gen-bar" style={{ marginBottom: 24 }} />}

      {/* Weekly stat chips */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
        {[
          { icon: Icons.target, label: "Weekly Avg", value: Math.round(weeklyCalTotal / 7).toLocaleString() + " kcal", color: "var(--forest)" },
          { icon: Icons.zap,    label: "vs Target", value: `${totalCals > target ? "+" : ""}${totalCals - target} today`, color: totalCals > target ? "#D97706" : "#15803D" },
          { icon: Icons.barChart, label: "On Track", value: "6 / 7 days", color: "#15803D" },
          { icon: Icons.star,   label: "Variety Score", value: "94 / 100", color: "#7C3AED" },
        ].map((chip, i) => (
          <div key={i} className="stat-chip anim-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--cream-dark)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon d={chip.icon} size={15} stroke={chip.color} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{chip.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: chip.color }}>{chip.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 28, alignItems: "start" }}>
        {/* Left: Day selector + meals */}
        <div>
          {/* Day selector */}
          <div className="card" style={{ padding: "16px 20px", marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 4, justifyContent: "space-between" }}>
              {DAYS_SHORT.map((d, i) => {
                const dayTotal = Object.values(dayMeals[d] || {}).reduce((s, m) => s + (m.calories || 0), 0);
                const isOver = dayTotal > target * 1.05;
                return (
                  <button key={d} className={`day-pill ${activeDay === i ? "active" : ""}`}
                    onClick={() => setActiveDay(i)}>
                    <span className="day-label" style={{ color: activeDay === i ? "var(--mint)" : "var(--text-muted)" }}>{d}</span>
                    <span className="day-num" style={{ color: activeDay === i ? "white" : "var(--text-primary)" }}>{DAYS_DATE[i]}</span>
                    {isOver && activeDay !== i && (
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meal cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {["Breakfast", "Lunch", "Dinner", "Snack"].map((type, i) => (
              <div key={`${dayKey}-${type}`} style={{ animationDelay: `${i * 80}ms` }}>
                <MealCard
                  meal={meals[type]}
                  mealType={type}
                  onSwap={(alt) => handleSwap(type, alt)}
                  isGenerating={isGenerating}
                  onViewRecipe={handleViewRecipe}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Macro summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Ring charts */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon d={Icons.target} size={15} stroke="var(--forest)" />
              Daily Nutrition
            </h3>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <RingChart
                percentage={Math.round((totalCals / target) * 100)}
                color="var(--forest)"
                size={110}
                strokeWidth={11}
                label="Calories"
                value={totalCals.toLocaleString()}
                unit="kcal"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 24 }}>
              <RingChart percentage={Math.min(100, Math.round((totalProt / 160) * 100))} color="#3B82F6" size={72} strokeWidth={7} label="Protein" value={`${totalProt}g`} />
              <RingChart percentage={Math.min(100, Math.round((totalCarb / 350) * 100))} color="#F59E0B" size={72} strokeWidth={7} label="Carbs" value={`${totalCarb}g`} />
              <RingChart percentage={Math.min(100, Math.round((totalFat / 80) * 100))}  color="#EF4444" size={72} strokeWidth={7} label="Fat"   value={`${totalFat}g`} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <MacroBar label="Calories" current={totalCals} max={target}    color="var(--forest)" unit="" />
              <MacroBar label="Protein"  current={totalProt} max={160}       color="#3B82F6" />
              <MacroBar label="Carbs"    current={totalCarb} max={350}       color="#F59E0B" />
              <MacroBar label="Fat"      current={totalFat}  max={80}        color="#EF4444" />
            </div>
          </div>

          {/* Target vs actual */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>
              Goal Progress
            </h3>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <span className="display" style={{ fontSize: 36, fontWeight: 700, color: "var(--forest)" }}>
                {totalCals.toLocaleString()}
              </span>
              <span style={{ fontSize: 14, color: "var(--text-muted)", marginLeft: 4 }}>/ {target.toLocaleString()} kcal</span>
            </div>
            <div className="progress-bar-track" style={{ marginBottom: 8 }}>
              <div className="progress-bar-fill" style={{ width: `${Math.min(100, (totalCals / target) * 100)}%` }} />
            </div>
            <div style={{ fontSize: 12, color: target - totalCals > 0 ? "var(--gold)" : "var(--forest-light)", textAlign: "center", fontWeight: 600 }}>
              {target - totalCals > 0
                ? `${(target - totalCals).toLocaleString()} kcal remaining`
                : `${(totalCals - target).toLocaleString()} kcal over target`}
            </div>
          </div>

          {/* Quick tips */}
          <div style={{ background: "var(--mint-light)", border: "1px solid var(--mint)", borderRadius: 16, padding: 18 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <Icon d={Icons.sparkle} size={14} stroke="var(--forest)" fill="none" />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--forest)" }}>AI Tip</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--forest-mid)", lineHeight: 1.6 }}>
              You're {Math.round((totalCals / target) * 100)}% to your daily target. Add a high-calorie snack like avocado toast to close the gap before dinner.
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* Recipe modal */}
    {recipe.open && (
      <RecipeModal
        mealName={recipe.mealName}
        loading={recipe.loading}
        data={recipe.data}
        error={recipe.error}
        onClose={closeRecipe}
        onRetry={() => handleViewRecipe(recipe.mealName)}
      />
    )}
    </>
  );
}

// ─────────────────────────────────────────────
// GROCERY LIST VIEW
// ─────────────────────────────────────────────
function GroceryView({ groceryList, user, updating, onItemsChange }) {
  const [items, setItems]         = useState(groceryList || GROCERY_ITEMS);

  // Sync when groceryList prop changes (after regenerate)
  useEffect(() => {
    if (groceryList) setItems(groceryList);
  }, [groceryList]);

  // Propagate item changes (checks, swaps) back up for persistence
  useEffect(() => {
    onItemsChange?.(items);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const [search, setSearch]       = useState("");
  const [activeFilter, setFilter] = useState("All");
  const [swappingId, setSwappingId] = useState(null);

  const handleExportPDF = () => {
    const currency = user?.currency || "€";
    const totalCost = items.reduce((s, i) => s + (i.price || 0), 0);
    const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const byCategory = Object.keys(CATEGORY_COLORS).reduce((acc, cat) => {
      const catItems = items.filter(i => i.category === cat);
      if (catItems.length) acc[cat] = catItems;
      return acc;
    }, {});
    const tableRows = Object.entries(byCategory).map(([cat, catItems]) =>
      `<tr style="background:#e8f5e9"><td colspan="4" style="padding:8px 12px;font-weight:700;font-size:13px;color:#1B4332">${esc(cat).toUpperCase()}</td></tr>` +
      catItems.map(i =>
        `<tr style="border-bottom:1px solid #f0f0f0">` +
        `<td style="padding:7px 12px;font-size:13px">${esc(i.name)}</td>` +
        `<td style="padding:7px 12px;font-size:13px;color:#555">${esc(i.qty || "")} ${esc(i.unit || "")}</td>` +
        `<td style="padding:7px 12px;font-size:13px;color:#555">${i.alt ? "Alt: " + esc(i.alt) : ""}</td>` +
        `<td style="padding:7px 12px;font-size:13px;text-align:right">${i.price > 0 ? esc(currency) + i.price.toFixed(2) : ""}</td>` +
        `</tr>`
      ).join("")
    ).join("");

    const html = [
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Grocery List</title>",
      "<style>body{font-family:sans-serif;margin:0;padding:24px;color:#222}",
      "h1{font-size:22px;margin-bottom:4px}p{font-size:13px;color:#666;margin-bottom:20px}",
      "table{width:100%;border-collapse:collapse}",
      "th{text-align:left;padding:8px 12px;font-size:12px;color:#888;border-bottom:2px solid #ddd}",
      ".total{margin-top:16px;text-align:right;font-size:14px;font-weight:700}",
      "@media print{body{padding:0}}</style></head><body>",
      "<h1>Grocery List</h1>",
      `<p>NutriPlan &middot; ${items.length} items &middot; Est. total: ${esc(currency)}${totalCost.toFixed(2)}</p>`,
      "<table><thead><tr><th>Item</th><th>Quantity</th><th>Substitute</th><th style='text-align:right'>Price</th></tr></thead>",
      `<tbody>${tableRows}</tbody></table>`,
      `<div class="total">Estimated total: ${esc(currency)}${totalCost.toFixed(2)}</div>`,
      "<script>window.addEventListener('load',function(){window.print();});<\/script>",
      "</body></html>"
    ].join("");

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) win.addEventListener("afterprint", () => URL.revokeObjectURL(url));
  };

  const categories = ["All", ...Object.keys(CATEGORY_COLORS)];
  const filtered   = items.filter(item => {
    const matchesCat = activeFilter === "All" || item.category === activeFilter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });
  const grouped = categories.slice(1).reduce((acc, cat) => {
    const catItems = filtered.filter(i => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {});

  const checked    = items.filter(i => i.checked).length;
  const total      = items.length;
  const pct        = Math.round((checked / total) * 100);

  // Price totals (only when at least one item has a price)
  const hasPrices     = items.some(i => i.price > 0);
  const totalCost     = items.reduce((s, i) => s + (i.price || 0), 0);
  const checkedCost   = items.filter(i => i.checked).reduce((s, i) => s + (i.price || 0), 0);
  const currency      = user?.currency || "€";
  const fmt           = (n) => `${currency}${n.toFixed(2)}`;
  const budget        = user?.budget || null;
  const budgetPct     = budget ? Math.min(110, (totalCost / budget) * 100) : 0;
  const budgetColor   = budgetPct > 100 ? "var(--coral)" : budgetPct > 85 ? "#D97706" : "var(--forest)";

  const toggle = (id) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, checked: !it.checked } : it));

  const handleSwap = (id) => {
    setSwappingId(id);
    setTimeout(() => {
      setItems(prev => prev.map(it => {
        if (it.id !== id) return it;
        return { ...it, name: it.alt, alt: it.name };
      }));
      setSwappingId(null);
    }, 600);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      {/* Updating banner */}
      {updating && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#EFF6FF",
          border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 16px", marginBottom: 20,
          fontSize: 14, color: "#1D4ED8", fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ flexShrink: 0, animation: "spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Updating grocery list to match your meal swaps…
        </div>
      )}
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 className="display" style={{ fontSize: 30, fontWeight: 700, color: "var(--forest)", marginBottom: 4 }}>
            Grocery List
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            Week of Mar 3–9 · {total} items · Trader Joe's
          </p>
        </div>
        <button className="btn-secondary" style={{ fontSize: 13, padding: "9px 18px" }} onClick={handleExportPDF}>
          <Icon d={Icons.download} size={14} /> Export PDF
        </button>
      </div>

      {/* Progress */}
      <div className="card anim-fade-up" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <span className="display" style={{ fontSize: 28, fontWeight: 700, color: "var(--forest)" }}>{pct}%</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>complete</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
            {checked} / {total} items
          </span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        {pct === 100 && (
          <div style={{ marginTop: 10, fontSize: 14, color: "var(--forest)", fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}>
            <Icon d={Icons.check} size={16} stroke="var(--forest)" /> All done! Enjoy your shopping trip 🎉
          </div>
        )}
        {hasPrices && (
          <>
            <div style={{ display: "flex", gap: 12, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--cream-dark)" }}>
              <div style={{ flex: 1, background: "var(--cream)", borderRadius: 12, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                  color: "var(--text-muted)", marginBottom: 4 }}>Basket so far</div>
                <div className="display" style={{ fontSize: 20, fontWeight: 700, color: "var(--forest)" }}>
                  {fmt(checkedCost)}
                </div>
              </div>
              <div style={{ flex: 1, background: "var(--cream)", borderRadius: 12, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                  color: "var(--text-muted)", marginBottom: 4 }}>Est. total</div>
                <div className="display" style={{ fontSize: 20, fontWeight: 700, color: budget ? budgetColor : "var(--text-primary)" }}>
                  {fmt(totalCost)}
                </div>
              </div>
              {budget && (
                <div style={{ flex: 1, background: "var(--cream)", borderRadius: 12, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                    color: "var(--text-muted)", marginBottom: 4 }}>Weekly budget</div>
                  <div className="display" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                    {fmt(budget)}
                  </div>
                </div>
              )}
            </div>
            {budget && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--cream-dark)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                    {totalCost <= budget
                      ? `${fmt(budget - totalCost)} remaining in budget`
                      : `${fmt(totalCost - budget)} over budget`}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: budgetColor }}>
                    {Math.round((totalCost / budget) * 100)}%
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{
                    width: `${Math.min(100, budgetPct)}%`,
                    background: budgetColor,
                    transition: "width 0.7s cubic-bezier(.22,.68,0,1.2)",
                  }} />
                </div>
                {totalCost > budget && (
                  <p style={{ fontSize: 12, color: "var(--coral)", marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                    <Icon d={Icons.alertTri} size={13} stroke="var(--coral)" />
                    Over budget — try swapping some items for cheaper alternatives
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Search & filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Icon d={Icons.search} size={16} stroke="var(--text-muted)"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input className="input-field" placeholder="Search items…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {categories.map(cat => {
            const cfg = CATEGORY_COLORS[cat];
            return (
              <button key={cat} onClick={() => setFilter(cat)}
                className="category-chip"
                style={{
                  background: activeFilter === cat ? (cfg?.bg || "var(--forest)") : "white",
                  color:      activeFilter === cat ? (cfg?.text || "white") : "var(--text-secondary)",
                  border:     `1.5px solid ${activeFilter === cat ? (cfg?.text || "var(--forest)") : "var(--border)"}`,
                }}>
                {cfg?.icon && <span>{cfg.icon}</span>}
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {Object.entries(grouped).map(([cat, catItems]) => {
          const cfg = CATEGORY_COLORS[cat];
          const catChecked = catItems.filter(i => i.checked).length;
          const catCost    = catItems.reduce((s, i) => s + (i.price || 0), 0);
          return (
            <div key={cat} className="card anim-fade-up">
              <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--cream-dark)",
                display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: cfg.text }}>{cat}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                    {catChecked}/{catItems.length}
                  </span>
                </div>
                {hasPrices && catCost > 0 && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: cfg.text }}>{fmt(catCost)}</span>
                )}
              </div>
              <div>
                {catItems.map((item, idx) => (
                  <div key={item.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
                      borderBottom: idx < catItems.length - 1 ? "1px solid var(--cream-dark)" : "none",
                      background: item.checked ? "var(--cream)" : "white",
                      transition: "background 0.2s ease, opacity 0.2s ease",
                      opacity: swappingId === item.id ? 0.4 : 1,
                    }}>
                    <input type="checkbox" className="custom-checkbox" checked={item.checked}
                      onChange={() => toggle(item.id)} />
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: 15, fontWeight: 500,
                        color: item.checked ? "var(--text-muted)" : "var(--text-primary)",
                        textDecoration: item.checked ? "line-through" : "none",
                        transition: "all 0.2s ease",
                      }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>
                        {item.qty} {item.unit}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {item.price > 0 && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)",
                          background: "var(--cream)", borderRadius: 8, padding: "3px 8px" }}>
                          {fmt(item.price)}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Alt: {item.alt}</span>
                      <button className="btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }}
                        onClick={() => handleSwap(item.id)}>
                        <Icon d={Icons.swap} size={11} />
                        {swappingId === item.id ? "Swapping…" : "Swap"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {Object.keys(grouped).length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>No items found</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Try adjusting your search or filter</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PRODUCTS VIEW
// ─────────────────────────────────────────────
function ProductsView({ products: productsProp }) {
  const [products, setProducts]   = useState(productsProp || PRODUCTS);

  useEffect(() => {
    if (productsProp) setProducts(productsProp);
  }, [productsProp]);
  const [search, setSearch]       = useState("");
  const [sortCol, setSortCol]     = useState("name");
  const [sortDir, setSortDir]     = useState("asc");
  // Detect whether CSV products have extra fields
  const hasLinks      = products.some(p => p.link);
  const hasBrands     = products.some(p => p.brand);
  const hasNutrition  = products.some(p => p.cal > 0);

  const filtered = products
    .filter(p => {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q)
        || (p.brand || "").toLowerCase().includes(q)
        || (p.rawCategory || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <Icon d={Icons.chevronD} size={12} stroke="var(--text-muted)" />;
    return <Icon d={sortDir === "asc" ? Icons.chevronD : "M6 15l6-6 6 6"} size={12} stroke="var(--forest)" />;
  };

  const avgConfidence = {
    high: products.filter(p => p.confidence === "high").length,
    med:  products.filter(p => p.confidence === "med").length,
    low:  products.filter(p => p.confidence === "low").length,
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 className="display" style={{ fontSize: 30, fontWeight: 700, color: "var(--forest)", marginBottom: 4 }}>
            Product Database
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            {products.length} products{hasNutrition ? "" : " · Nutrition estimated by Claude AI"}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "High Confidence", value: avgConfidence.high, badge: "badge-high", desc: "From USDA/Nutritionix" },
          { label: "AI Estimated",    value: avgConfidence.med + avgConfidence.low, badge: "badge-med", desc: "Generated by Claude AI" },
          { label: "Avg Calories",    value: Math.round(products.reduce((s, p) => s + p.cal, 0) / products.length), badge: "badge-ai", desc: "Per serving" },
        ].map((s, i) => (
          <div key={i} className="card anim-fade-up" style={{ padding: 18, animationDelay: `${i * 80}ms` }}>
            <span className={`diet-badge ${s.badge}`} style={{ marginBottom: 10, display: "inline-flex" }}>{s.label}</span>
            <div className="display" style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Icon d={Icons.search} size={16} stroke="var(--text-muted)"
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
        <input className="input-field" placeholder="Search products…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 40 }} />
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--cream)" }}>
                <th onClick={() => handleSort("name")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Product Name <SortIcon col="name" /></div>
                </th>
                {hasNutrition && <>
                  <th onClick={() => handleSort("per")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Serving <SortIcon col="per" /></div>
                  </th>
                  <th onClick={() => handleSort("cal")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Calories <SortIcon col="cal" /></div>
                  </th>
                  <th onClick={() => handleSort("protein")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Protein <SortIcon col="protein" /></div>
                  </th>
                  <th onClick={() => handleSort("carbs")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Carbs <SortIcon col="carbs" /></div>
                  </th>
                  <th onClick={() => handleSort("fat")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Fat <SortIcon col="fat" /></div>
                  </th>
                </>}
                <th onClick={() => handleSort("price")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Price <SortIcon col="price" /></div>
                </th>
                <th onClick={() => handleSort("confidence")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Confidence <SortIcon col="confidence" /></div>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className="anim-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                  <td>
                    <div>
                      {hasLinks && p.link
                        ? <a href={p.link} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 14, fontWeight: 600, color: "var(--forest)", textDecoration: "none",
                              display: "flex", alignItems: "center", gap: 5 }}>
                            {p.name}
                            <Icon d={Icons.link} size={11} stroke="var(--forest)" style={{ opacity: 0.6 }} />
                          </a>
                        : <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</span>
                      }
                      {(p.brand || p.rawCategory) && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                          {[p.brand, p.rawCategory].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {p.priceDiscount > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: "#FEF9C3", color: "#92400E",
                          padding: "1px 6px", borderRadius: 100, marginTop: 2, display: "inline-block" }}>
                          Lidl+ price
                        </span>
                      )}
                    </div>
                  </td>
                  {hasNutrition && <>
                    <td><span style={{ fontSize: 13 }}>{p.per}</span></td>
                    <td>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--coral)" }}>{p.cal}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 2 }}>kcal</span>
                    </td>
                    <td><span style={{ color: "#3B82F6", fontWeight: 600, fontSize: 13 }}>{p.protein}g</span></td>
                    <td><span style={{ color: "#F59E0B", fontWeight: 600, fontSize: 13 }}>{p.carbs}g</span></td>
                    <td><span style={{ color: "#EF4444", fontWeight: 600, fontSize: 13 }}>{p.fat}g</span></td>
                  </>}
                  <td>
                    {p.price > 0
                      ? <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                          €{p.price.toFixed(2)}
                        </span>
                      : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>
                    }
                  </td>
                  <td><ConfidenceBadge level={p.confidence} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      {hasLinks && p.link
                        ? <a href={p.link} target="_blank" rel="noopener noreferrer"
                            className="btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }}>
                            View
                          </a>
                        : null
                      }
                      <button className="btn-ghost" style={{ padding: "4px 8px", fontSize: 11, color: "var(--coral)" }}>
                        <Icon d={Icons.x} size={11} stroke="var(--coral)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🥦</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)" }}>No products found</div>
            </div>
          )}
        </div>
      </div>

      {/* AI notice */}
      <div style={{ background: "var(--mint-light)", border: "1px solid var(--mint)", borderRadius: 14,
        padding: "14px 18px", marginTop: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Icon d={Icons.sparkle} size={16} stroke="var(--forest)" style={{ marginTop: 2 }} />
        <div style={{ fontSize: 13, color: "var(--forest-mid)", lineHeight: 1.6 }}>
          <strong>About AI-estimated nutrition data:</strong> Products marked "AI Estimated" have nutritional values generated by Claude AI based on typical product composition. Values marked "High" confidence come from verified databases (USDA FoodData Central, Nutritionix). Always verify against product labels for critical dietary needs.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
const TABS = [
  { id: "plan",     label: "Meal Plan",   icon: Icons.calendar },
  { id: "grocery",  label: "Grocery List",icon: Icons.shopping },
  { id: "products", label: "Products",    icon: Icons.database },
];

function AppShell({ user, onReset, mealPlan, groceryList, groceryUpdating, onGroceryChange, csvProducts, onRegenerate, onMealSwap, apiKey }) {
  const [activeTab, setActiveTab] = useState("plan");

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      {/* Top nav */}
      <header style={{
        background: "white", borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 8px rgba(27,67,50,0.06)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px",
          display: "flex", alignItems: "center", gap: 0 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 40, padding: "14px 0" }}>
            <div style={{ width: 30, height: 30, background: "var(--forest)", borderRadius: 9,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon d={Icons.leaf} size={16} stroke="var(--mint)" strokeWidth={2} />
            </div>
            <span className="display" style={{ fontSize: 18, fontWeight: 700, color: "var(--forest)" }}>NutriPlan</span>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 28, flex: 1, borderBottom: "none" }}>
            {TABS.map(tab => (
              <button key={tab.id} className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Icon d={tab.icon} size={15} stroke={activeTab === tab.id ? "var(--forest)" : "var(--text-muted)"} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* User chip */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
              background: "var(--cream)", borderRadius: 100, border: "1px solid var(--border)" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--forest)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mint)" }}>
                  {(user?.name || "U")[0].toUpperCase()}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.2 }}>
                  {user?.name || "User"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {(user?.calories || 2800).toLocaleString()} kcal/day
                </div>
              </div>
            </div>
            <button className="btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={onReset}>
              <Icon d={Icons.refresh} size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* Tab content */}
      <main key={activeTab} className="anim-fade-in">
        {activeTab === "plan"     && <MealPlanView user={user} mealPlan={mealPlan} onRegenerate={onRegenerate} onMealSwap={onMealSwap} apiKey={apiKey} />}
        {activeTab === "grocery"  && <GroceryView  user={user} groceryList={groceryList} updating={groceryUpdating} onItemsChange={onGroceryChange} />}
        {activeTab === "products" && <ProductsView products={csvProducts} />}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "20px 24px", background: "white", marginTop: 40 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon d={Icons.leaf} size={14} stroke="var(--forest)" />
            <span className="display" style={{ fontSize: 14, fontWeight: 600, color: "var(--forest)" }}>NutriPlan</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· AI-powered meal planning</span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Not a substitute for professional dietary advice. Always consult a registered dietitian.
          </span>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────
export default function NutriPlan() {
  // Resolve API key: env var → localStorage
  const envKey = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
  const storedKey = localStorage.getItem("nutriplan_api_key") || "";
  const initialKey = envKey || storedKey;

  // Rehydrate persisted state
  const savedUser         = JSON.parse(localStorage.getItem("nutriplan_user") || "null");
  const savedMealPlan     = JSON.parse(localStorage.getItem("nutriplan_meal_plan") || "null");
  const savedGroceryList  = JSON.parse(localStorage.getItem("nutriplan_grocery_list") || "null");
  const hasSession        = !!(initialKey && savedUser && savedMealPlan);

  const [screen, setScreen]   = useState(hasSession ? "app" : initialKey ? "onboarding" : "setup");
  const [apiKey, setApiKey]   = useState(initialKey);
  const [user, setUser]       = useState(savedUser);

  // Data from generation
  const [csvProducts] = useState(CSV_PRODUCTS);
  const [generatedMealPlan, setGeneratedMealPlan]   = useState(savedMealPlan);
  const [generatedGroceryList, setGeneratedGroceryList] = useState(savedGroceryList);
  const [generationError, setGenerationError]   = useState(null);
  const [groceryUpdating, setGroceryUpdating]   = useState(false);

  // Persist state changes to localStorage
  useEffect(() => { if (user) localStorage.setItem("nutriplan_user", JSON.stringify(user)); }, [user]);
  useEffect(() => { if (generatedMealPlan) localStorage.setItem("nutriplan_meal_plan", JSON.stringify(generatedMealPlan)); }, [generatedMealPlan]);
  useEffect(() => { if (generatedGroceryList) localStorage.setItem("nutriplan_grocery_list", JSON.stringify(generatedGroceryList)); }, [generatedGroceryList]);

  // Store form data so we can regenerate with same inputs
  const lastFormData = useRef(savedUser ? { userData: savedUser } : null);

  const handleApiKey = (key) => {
    setApiKey(key);
    setScreen("onboarding");
  };

  const runGeneration = async (userData, products, key) => {
    setGenerationError(null);
    setScreen("generating");
    try {
      const result = await generateMealPlan(key || apiKey, userData, products);
      // Add checked: false to grocery items
      const groceryWithChecked = (result.groceryList || []).map((item, i) => ({
        ...item,
        id: i + 1,
        checked: false,
      }));
      setGeneratedMealPlan(result.mealPlan);
      setGeneratedGroceryList(groceryWithChecked);
      setScreen("app");
    } catch (err) {
      setGenerationError(err.message);
      // Stay on generating screen to show error
    }
  };

  const handleComplete = async (formData) => {
    const userData = {
      name: formData.name || "User",
      calories: formData.calories,
      goal: formData.goal,
      dietary: formData.dietary,
      allergies: formData.allergies,
      supermarket: formData.supermarket,
      budget: formData.budget ? parseFloat(formData.budget) : null,
      currency: formData.currency || "€",
    };
    setUser(userData);
    lastFormData.current = { userData, formData };

    await runGeneration(userData, CSV_PRODUCTS, apiKey);
  };

  const handleRegenerate = async () => {
    if (!lastFormData.current) return;
    const { userData } = lastFormData.current;
    await runGeneration(userData, csvProducts || [], apiKey);
  };

  const handleMealSwap = async (updatedMealPlan) => {
    if (!user) return;
    setGroceryUpdating(true);
    try {
      const newList = await refreshGroceryList(apiKey, user, updatedMealPlan, csvProducts || []);
      const withChecked = newList.map((item, i) => ({ ...item, id: i + 1, checked: false }));
      setGeneratedGroceryList(withChecked);
    } catch {
      // Silently fail — grocery list stays as-is
    } finally {
      setGroceryUpdating(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem("nutriplan_user");
    localStorage.removeItem("nutriplan_meal_plan");
    localStorage.removeItem("nutriplan_grocery_list");
    setUser(null);
    setGeneratedMealPlan(null);
    setGeneratedGroceryList(null);
    setGenerationError(null);
    lastFormData.current = null;
    setScreen("onboarding");
  };

  if (screen === "setup") {
    return <ApiKeyScreen onContinue={handleApiKey} />;
  }

  if (screen === "onboarding") {
    return <Onboarding onComplete={handleComplete} />;
  }

  if (screen === "generating") {
    return (
      <GeneratingScreen
        user={user}
        error={generationError}
        onRetry={() => {
          if (lastFormData.current) {
            const { userData } = lastFormData.current;
            runGeneration(userData, csvProducts || [], apiKey);
          } else {
            setScreen("onboarding");
          }
        }}
      />
    );
  }

  return (
    <AppShell
      user={user}
      onReset={handleReset}
      mealPlan={generatedMealPlan}
      groceryList={generatedGroceryList}
      groceryUpdating={groceryUpdating}
      onGroceryChange={setGeneratedGroceryList}
      csvProducts={csvProducts}
      onRegenerate={handleRegenerate}
      onMealSwap={handleMealSwap}
      apiKey={apiKey}
    />
  );
}
