// Demo data: 5 customers, 50+ concepts, 6 historical sessions with realistic votes.
// Triggered explicitly via store.loadDemoData() — not auto-seeded.

"use client";

import { Concept, Customer, DataState, Participant, Session, Vote } from "./types";

// Deterministic ID helpers so re-running demo data gives stable IDs (helps re-imports).
const custId = (n: number) => `demo-cust-${n}`;
const conceptId = (n: number) => `demo-concept-${n}`;
const sessId = (n: number) => `demo-sess-${n}`;
const partId = (n: number) => `demo-part-${n}`;

const now = "2025-12-01T12:00:00.000Z"; // fixed so output is stable

// ---------- Customers ----------
const customers: Customer[] = [
  { id: custId(1), name: "Foods R Us", createdAt: "2024-09-12T10:00:00.000Z" },
  { id: custId(2), name: "Big Box Foods", createdAt: "2024-09-18T10:00:00.000Z" },
  { id: custId(3), name: "Sysco Distribution", createdAt: "2024-10-04T10:00:00.000Z" },
  { id: custId(4), name: "US Foods", createdAt: "2024-10-22T10:00:00.000Z" },
  { id: custId(5), name: "Performance Food Group", createdAt: "2024-11-08T10:00:00.000Z" },
];

// ---------- Concepts (60 total, 6 categories) ----------
type ConceptSeed = { name: string; category: string; description: string };

const conceptSeeds: ConceptSeed[] = [
  // Sauces
  { name: "Spicy Maple BBQ", category: "Sauces", description: "Smoky-sweet with real maple syrup, slow-heat finish." },
  { name: "Korean Gochujang Glaze", category: "Sauces", description: "Fermented chili paste with rice wine and brown sugar." },
  { name: "Chipotle Honey Mustard", category: "Sauces", description: "Smoky chipotle blended with whole-grain mustard and wildflower honey." },
  { name: "Mole Negro Sauce", category: "Sauces", description: "20-ingredient Oaxacan mole with cocoa and pasilla chiles." },
  { name: "Harissa Yogurt", category: "Sauces", description: "North African chili paste swirled into Greek yogurt." },
  { name: "Apple Cider Vinegar Reduction", category: "Sauces", description: "Slow-reduced ACV with thyme and black pepper." },
  { name: "Saffron Aioli", category: "Sauces", description: "Spanish saffron threads folded into garlic aioli." },
  { name: "Black Garlic Glaze", category: "Sauces", description: "Aged black garlic with balsamic and brown sugar." },
  { name: "Sweet Soy Tamarind", category: "Sauces", description: "Indonesian-style kecap manis with tamarind pulp." },
  { name: "Dijon Cream Reduction", category: "Sauces", description: "Whole-grain Dijon simmered in heavy cream." },

  // Rubs
  { name: "Smoked Black Pepper Rub", category: "Rubs", description: "Coarse Tellicherry pepper with smoked sea salt." },
  { name: "Espresso Chili Rub", category: "Rubs", description: "Dark espresso, ancho chile, cocoa, brown sugar." },
  { name: "Ancho Cocoa Rub", category: "Rubs", description: "Sweet ancho chile with Dutch-processed cocoa." },
  { name: "Za'atar Spice Rub", category: "Rubs", description: "Toasted sesame, sumac, thyme, oregano." },
  { name: "Coffee Cocoa Crust", category: "Rubs", description: "Cold-brew coffee grounds with cocoa and demerara sugar." },
  { name: "Smoked Paprika Cumin", category: "Rubs", description: "Spanish smoked paprika, toasted cumin, garlic." },
  { name: "Lemon Pepper Dry Rub", category: "Rubs", description: "Dried lemon zest and cracked black peppercorn." },
  { name: "Cajun Blackening Spice", category: "Rubs", description: "Classic Louisiana blackening: paprika, thyme, oregano, cayenne." },
  { name: "Fennel Pollen Salt", category: "Rubs", description: "Wild fennel pollen with flake salt." },
  { name: "Berbere Spice Mix", category: "Rubs", description: "Ethiopian chili blend with fenugreek and cardamom." },

  // Glazes
  { name: "Honey Sriracha Glaze", category: "Glazes", description: "Raw honey with Huy Fong sriracha and lime." },
  { name: "Miso Caramel Glaze", category: "Glazes", description: "White miso folded into caramelized sugar." },
  { name: "Pineapple Habanero Glaze", category: "Glazes", description: "Fresh pineapple juice reduction with orange habaneros." },
  { name: "Bourbon Vanilla Glaze", category: "Glazes", description: "Kentucky bourbon, Madagascar vanilla, brown butter." },
  { name: "Pomegranate Molasses", category: "Glazes", description: "Reduced pomegranate juice, lemon, and a touch of honey." },
  { name: "Maple Bourbon Bacon", category: "Glazes", description: "Pure maple syrup, bourbon, rendered bacon fat." },
  { name: "Teriyaki Reduction", category: "Glazes", description: "Classic shoyu-mirin-sake-sugar reduction." },
  { name: "Fig Balsamic Glaze", category: "Glazes", description: "Black mission figs with aged balsamic." },
  { name: "Honey Ginger Glaze", category: "Glazes", description: "Wildflower honey with fresh ginger and soy." },
  { name: "Cherry Chipotle Glaze", category: "Glazes", description: "Tart cherries with smoky chipotle in adobo." },

  // Drizzles
  { name: "Cajun Lime Butter", category: "Drizzles", description: "Compound butter with Cajun spices and lime zest." },
  { name: "Roasted Garlic Aioli", category: "Drizzles", description: "Slow-roasted garlic confit blended with egg yolk and oil." },
  { name: "Truffle Parmesan Dust", category: "Drizzles", description: "Black truffle salt with aged Parmigiano-Reggiano." },
  { name: "Pesto Rosso Swirl", category: "Drizzles", description: "Sun-dried tomato and almond pesto." },
  { name: "Balsamic Fig Drizzle", category: "Drizzles", description: "Aged balsamic with fig preserves." },
  { name: "Smoked Paprika Cream", category: "Drizzles", description: "Crème fraîche with smoked Spanish paprika." },
  { name: "Chimichurri Verde", category: "Drizzles", description: "Argentine herb sauce with parsley, oregano, capers." },
  { name: "Lemon Caper Brown Butter", category: "Drizzles", description: "Browned butter with lemon and brined capers." },
  { name: "Salsa Verde", category: "Drizzles", description: "Italian-style green sauce with anchovy and garlic." },
  { name: "Hot Honey Drizzle", category: "Drizzles", description: "Infused honey with Calabrian chilies." },

  // Marinades
  { name: "Yuzu Kosho Marinade", category: "Marinades", description: "Japanese fermented chili-citrus paste." },
  { name: "Coconut Curry Marinade", category: "Marinades", description: "Coconut milk, Madras curry powder, ginger, garlic." },
  { name: "Lemongrass Ginger", category: "Marinades", description: "Fresh lemongrass, ginger, fish sauce, lime." },
  { name: "Tandoori Yogurt Marinade", category: "Marinades", description: "Greek yogurt with tandoori spice blend." },
  { name: "Mojo Marinade", category: "Marinades", description: "Cuban citrus-garlic marinade with sour orange." },
  { name: "Adobo Marinade", category: "Marinades", description: "Chipotle in adobo with vinegar and oregano." },
  { name: "Korean Bulgogi Marinade", category: "Marinades", description: "Soy, sesame, garlic, pear, gochugaru." },
  { name: "Jerk Marinade", category: "Marinades", description: "Scotch bonnet, allspice, thyme, scallion." },
  { name: "Chimichurri Marinade", category: "Marinades", description: "Red wine vinegar, parsley, garlic, chili flakes." },
  { name: "Miso Sake Marinade", category: "Marinades", description: "White miso, sake, mirin, brown sugar." },

  // Finishing
  { name: "Brown Butter Sage", category: "Finishing", description: "Nutty brown butter with crispy sage leaves." },
  { name: "Toasted Sesame Soy", category: "Finishing", description: "Toasted sesame oil with shoyu and rice vinegar." },
  { name: "Sea Salt Flake Finish", category: "Finishing", description: "Maldon sea salt with a touch of lemon." },
  { name: "Citrus Zest Gremolata", category: "Finishing", description: "Lemon zest, parsley, garlic — bright finishing touch." },
  { name: "Cracked Pink Peppercorn", category: "Finishing", description: "Whole pink peppercorns, lightly cracked." },
  { name: "Aged Balsamic Pearls", category: "Finishing", description: "12-year balsamic in pearl form for plating." },
  { name: "Toasted Nori Crumble", category: "Finishing", description: "Crispy nori pieces with sesame seeds." },
  { name: "Fleur de Sel & Lemon", category: "Finishing", description: "French finishing salt with Meyer lemon zest." },
  { name: "Microgreens & Truffle Oil", category: "Finishing", description: "Baby arugula with white truffle oil." },
  { name: "Shaved Pecorino & Honey", category: "Finishing", description: "Aged pecorino with a drizzle of wildflower honey." },
];

const concepts: Concept[] = conceptSeeds.map((seed, i) => ({
  id: conceptId(i + 1),
  name: seed.name,
  description: seed.description,
  category: seed.category,
  imageUrl: undefined,
  suppressedFor: [],
  createdAt: "2024-09-01T10:00:00.000Z",
}));

// ---------- Sessions ----------
type SessionSeed = {
  customerId: string;
  date: string;
  yesCap: number;
  conceptNames: string[]; // references into conceptSeeds by name
  participantCount: number;
  participantAliases: string[];
  status: "open" | "closed";
};

const sessionSeeds: SessionSeed[] = [
  {
    customerId: custId(1), // Foods R Us
    date: "2025-01-15",
    yesCap: 10,
    status: "closed",
    participantCount: 22,
    participantAliases: [
      "Anna", "Brian", "Carla", "Diego", "Elena", "Frank", "Grace", "Hiro",
      "Iris", "Jamal", "Kira", "Liam", "Maya", "Noah", "Olivia", "Priya",
      "Quinn", "Ravi", "Sofia", "Tomas", "Uma", "Victor",
    ],
    // Top 10: index 0-9, Bottom 10: index 10-19
    conceptNames: [
      "Spicy Maple BBQ", "Korean Gochujang Glaze", "Honey Sriracha Glaze",
      "Miso Caramel Glaze", "Pineapple Habanero Glaze", "Bourbon Vanilla Glaze",
      "Yuzu Kosho Marinade", "Lemongrass Ginger", "Coconut Curry Marinade",
      "Tandoori Yogurt Marinade",
      // bottom 10
      "Fennel Pollen Salt", "Berbere Spice Mix", "Salsa Verde",
      "Hot Honey Drizzle", "Toasted Nori Crumble", "Cracked Pink Peppercorn",
      "Aged Balsamic Pearls", "Microgreens & Truffle Oil",
      "Shaved Pecorino & Honey", "Sea Salt Flake Finish",
    ],
  },
  {
    customerId: custId(2), // Big Box Foods
    date: "2025-02-08",
    yesCap: 12,
    status: "closed",
    participantCount: 14,
    participantAliases: [
      "Aiden", "Beatrice", "Carlos", "Diana", "Ethan", "Fiona",
      "George", "Hannah", "Ivan", "Julia", "Keith", "Luna", "Marcus", "Nina",
    ],
    conceptNames: [
      "Cajun Lime Butter", "Truffle Parmesan Dust", "Smoked Black Pepper Rub",
      "Espresso Chili Rub", "Ancho Cocoa Rub", "Za'atar Spice Rub",
      "Chimichurri Verde", "Lemon Caper Brown Butter", "Brown Butter Sage",
      "Toasted Sesame Soy",
      // bottom 10
      "Saffron Aioli", "Black Garlic Glaze", "Sweet Soy Tamarind",
      "Dijon Cream Reduction", "Cajun Blackening Spice", "Lemon Pepper Dry Rub",
      "Honey Ginger Glaze", "Fig Balsamic Glaze", "Korean Bulgogi Marinade",
      "Jerk Marinade",
    ],
  },
  {
    customerId: custId(3), // Sysco Distribution
    date: "2025-04-22",
    yesCap: 8,
    status: "closed",
    participantCount: 9,
    participantAliases: [
      "Owen", "Petra", "Quentin", "Rosa", "Samir", "Tara",
      "Umar", "Vera", "Wesley",
    ],
    conceptNames: [
      "Chipotle Honey Mustard", "Mole Negro Sauce", "Apple Cider Vinegar Reduction",
      "Roasted Garlic Aioli", "Pesto Rosso Swirl", "Balsamic Fig Drizzle",
      "Smoked Paprika Cream", "Citrus Zest Gremolata", "Fleur de Sel & Lemon",
      "Cracked Pink Peppercorn",
      // bottom 10
      "Miso Sake Marinade", "Chimichurri Marinade", "Adobo Marinade",
      "Mojo Marinade", "Tandoori Yogurt Marinade", "Coconut Curry Marinade",
      "Lemongrass Ginger", "Yuzu Kosho Marinade", "Hot Honey Drizzle",
      "Salsa Verde",
    ],
  },
  {
    customerId: custId(1), // Foods R Us — SECOND session (Q3)
    date: "2025-08-14",
    yesCap: 10,
    status: "closed",
    participantCount: 18,
    participantAliases: [
      "Anna", "Brian", "Carla", "Diego", "Elena", "Frank", "Grace", "Hiro",
      "Iris", "Jamal", "Kira", "Liam", "Maya", "Noah", "Olivia", "Priya",
      "Quinn", "Ravi",
    ],
    // Different concepts than Q1 — repeat some top performers, add new ones
    conceptNames: [
      "Spicy Maple BBQ", "Korean Gochujang Glaze", "Harissa Yogurt",
      "Chipotle Honey Mustard", "Miso Caramel Glaze", "Pomegranate Molasses",
      "Maple Bourbon Bacon", "Tandoori Yogurt Marinade", "Korean Bulgogi Marinade",
      "Brown Butter Sage",
      // bottom 10
      "Miso Sake Marinade", "Adobo Marinade", "Salsa Verde",
      "Toasted Nori Crumble", "Hot Honey Drizzle", "Cracked Pink Peppercorn",
      "Aged Balsamic Pearls", "Microgreens & Truffle Oil",
      "Sea Salt Flake Finish", "Fleur de Sel & Lemon",
    ],
  },
  {
    customerId: custId(4), // US Foods
    date: "2025-09-05",
    yesCap: 12,
    status: "closed",
    participantCount: 12,
    participantAliases: [
      "Xander", "Yara", "Zoe", "Adan", "Bea", "Caleb",
      "Dahlia", "Esteban", "Fern", "Gita", "Hugo", "Indira",
    ],
    conceptNames: [
      "Smoked Black Pepper Rub", "Ancho Cocoa Rub", "Coffee Cocoa Crust",
      "Espresso Chili Rub", "Za'atar Spice Rub", "Cajun Blackening Spice",
      "Chimichurri Verde", "Lemon Caper Brown Butter", "Bourbon Vanilla Glaze",
      "Maple Bourbon Bacon",
      // bottom 10
      "Black Garlic Glaze", "Sweet Soy Tamarind", "Saffron Aioli",
      "Dijon Cream Reduction", "Honey Ginger Glaze", "Fig Balsamic Glaze",
      "Teriyaki Reduction", "Hot Honey Drizzle", "Salsa Verde",
      "Fennel Pollen Salt",
    ],
  },
  {
    customerId: custId(5), // Performance Food Group
    date: "2025-11-19",
    yesCap: 10,
    status: "open", // open so admin can see different statuses
    participantCount: 7,
    participantAliases: [
      "Jonah", "Kira2", "Linus", "Mira", "Niko", "Oksana", "Pax",
    ],
    conceptNames: [
      "Spicy Maple BBQ", "Honey Sriracha Glaze", "Pineapple Habanero Glaze",
      "Cajun Lime Butter", "Lemon Caper Brown Butter", "Chimichurri Verde",
      "Smoked Paprika Cream", "Korean Bulgogi Marinade", "Brown Butter Sage",
      "Mole Negro Sauce",
      // bottom 10
      "Mojo Marinade", "Adobo Marinade", "Miso Sake Marinade",
      "Jerk Marinade", "Salsa Verde", "Hot Honey Drizzle",
      "Cracked Pink Peppercorn", "Microgreens & Truffle Oil",
      "Sea Salt Flake Finish", "Fennel Pollen Salt",
    ],
  },
];

// ---------- Synthesize votes ----------
//
// Goal: for each session, top 10 concepts should get ~75% yes, bottom 10 should
// get ~25% yes. Implementation: for each concept, iterate participants and
// decide "yes" or "no" with a probability that varies by rank.
//
// The pattern: top 10 get random yes probability ~ 0.7-0.85
//              bottom 10 get random yes probability ~ 0.15-0.30
// This yields a clean visual split without being too uniform (it's still random).
function synthesizeVotes(session: Session, seed: SessionSeed): Vote[] {
  const votes: Vote[] = [];
  const participants: Participant[] = seed.participantAliases.map((alias, i) => ({
    id: `${session.id}-p${i + 1}`,
    alias,
    createdAt: new Date(session.createdAt).toISOString(),
  }));
  // We need to attach participants to the state too, so return them.
  // For now, just include them via the participantId embedded in votes.

  // Simple deterministic PRNG for repeatable demo data.
  let rngState = hashCode(session.id);
  const rand = () => {
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
    return rngState / 0x7fffffff;
  };

  const sessionParticipantIds = participants.map((p) => p.id);

  seed.conceptNames.forEach((conceptName, idx) => {
    const concept = concepts.find((c) => c.name === conceptName);
    if (!concept) return;

    // Yes-probability for this concept: high for top 10, low for bottom 10.
    const rankInTop10 = idx < 10 ? idx : 9 - (idx - 10); // top 10: 0..9, bottom 10: 9..0
    const yesProb = idx < 10
      ? 0.85 - rankInTop10 * 0.015   // 0.85, 0.835, 0.82, ... down to ~0.715
      : 0.30 - rankInTop10 * 0.015;  // 0.30, 0.285, 0.27, ... down to ~0.165

    // For open sessions, only ~half the participants have voted.
    const votersAvailable = seed.status === "open"
      ? Math.ceil(sessionParticipantIds.length * 0.6)
      : sessionParticipantIds.length;

    for (let p = 0; p < votersAvailable; p++) {
      const participantId = sessionParticipantIds[p];
      const isYes = rand() < yesProb;
      votes.push({
        sessionId: session.id,
        participantId,
        conceptId: concept.id,
        value: isYes ? "yes" : "no",
        votedAt: new Date(session.createdAt).toISOString(),
      });
    }
  });

  return votes;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ---------- Build sessions + participants + votes ----------
const sessions: Session[] = sessionSeeds.map((seed, i) => {
  const conceptIds = seed.conceptNames
    .map((name) => concepts.find((c) => c.name === name)?.id)
    .filter((id): id is string => Boolean(id));
  return {
    id: sessId(i + 1),
    code: `DEMO${String(i + 1).padStart(2, "0")}`,
    customerId: seed.customerId,
    date: seed.date,
    conceptIds,
    status: seed.status,
    yesCap: seed.yesCap,
    createdAt: new Date(seed.date).toISOString(),
  };
});

const allParticipants: Participant[] = [];
const allVotes: Vote[] = [];

sessionSeeds.forEach((seed, i) => {
  const session = sessions[i];
  seed.participantAliases.forEach((alias, p) => {
    allParticipants.push({
      id: `${session.id}-p${p + 1}`,
      alias,
      createdAt: new Date(session.createdAt).toISOString(),
    });
  });
  const votes = synthesizeVotes(session, seed);
  allVotes.push(...votes);
});

// ---------- Public export ----------
export function buildDemoState(): DataState {
  return {
    schemaVersion: 2,
    concepts,
    customers,
    participants: allParticipants,
    sessions,
    votes: allVotes,
  };
}

// Exposed for tests / debugging.
export const __demoInternals = {
  concepts,
  customers,
  sessions,
  allVotes,
  allParticipants,
};