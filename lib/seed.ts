"use client";

// One-time seed of example concepts and customers, only if state is empty.
// Kept tiny — just enough to demo the app, not a real concept library.

import { DataState } from "./types";

export function seedIfEmpty(state: DataState): DataState {
  if (state.customers.length > 0 || state.concepts.length > 0) return state;

  const now = new Date().toISOString();

  const customers = [
    { id: "seed-cust-1", name: "Foods R Us", createdAt: now },
    { id: "seed-cust-2", name: "Big Box Foods", createdAt: now },
    { id: "seed-cust-3", name: "Taco Bueno", createdAt: now },
  ];

  const conceptNames = [
    "Spicy Maple BBQ Sauce",
    "Korean Gochujang Glaze",
    "Smoked Black Pepper Rub",
    "Honey Sriracha Drizzle",
    "Cajun Lime Butter",
    "Roasted Garlic Aioli",
    "Chipotle Honey Mustard",
    "Miso Caramel Coating",
    "Truffle Parmesan Dust",
    "Espresso Chili Rub",
    "Brown Butter Sage",
    "Yuzu Kosho Marinade",
    "Ancho Cocoa Glaze",
    "Pineapple Habanero",
    "Bourbon Vanilla Glaze",
    "Harissa Yogurt",
    "Za'atar Olive Oil",
    "Mole Negro Sauce",
    "Cranberry Black Pepper",
    "Apple Cider Vinegar Reduction",
    "Coconut Curry Glaze",
    "Lemongrass Ginger",
    "Pesto Rosso Swirl",
    "Balsamic Fig Drizzle",
    "Smoked Paprika Cream",
    "Toasted Sesame Soy",
    "Maple Bourbon Bacon",
    "Chimichurri Verde",
    "Saffron Aioli",
    "Black Garlic Glaze",
  ];

  const categories = ["Sauces", "Rubs", "Glazes", "Drizzles", "Marinades", "Finishing"];

  const concepts = conceptNames.map((name, i) => ({
    id: `seed-concept-${i + 1}`,
    name,
    description: `Sample concept #${i + 1} for demo purposes.`,
    category: categories[i % categories.length],
    suppressedFor: [] as string[],
    createdAt: now,
  }));

  return {
    ...state,
    customers,
    concepts,
  };
}
