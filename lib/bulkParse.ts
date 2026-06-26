// Smart parser for pasted concept lists.
// One concept per line. Optional " | " separators for category / description.
// Examples:
//   Spicy Maple BBQ
//   Spicy Maple BBQ | Sauces
//   Spicy Maple BBQ | Sauces | Smoky-sweet with real maple syrup

export type ParsedConcept = {
  name: string;
  category?: string;
  description?: string;
};

export type ParseResult = {
  parsed: ParsedConcept[];
  errors: Array<{ line: number; text: string; reason: string }>;
};

/**
 * Parse a multi-line string into individual concepts.
 * Returns parsed entries plus any line-level errors (e.g. empty name).
 */
export function parseBulkConcepts(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const parsed: ParsedConcept[] = [];
  const errors: ParseResult["errors"] = [];

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    // Skip empty lines and comments.
    if (line === "" || line.startsWith("#")) return;

    const parts = line.split("|").map((p) => p.trim());
    const name = parts[0] ?? "";
    if (!name) {
      errors.push({ line: idx + 1, text: line, reason: "missing concept name" });
      return;
    }
    const category = parts[1] && parts[1].length > 0 ? parts[1] : undefined;
    const description = parts[2] && parts[2].length > 0 ? parts[2] : undefined;
    parsed.push({ name, category, description });
  });

  return { parsed, errors };
}

/**
 * Detect which parsed concepts are duplicates of existing ones (case-insensitive
 * match on name). Returns the unique ones to create, plus a list of duplicates.
 */
export function splitDuplicates(
  parsed: ParsedConcept[],
  existingNames: string[]
): { unique: ParsedConcept[]; duplicates: ParsedConcept[] } {
  const existingLower = new Set(existingNames.map((n) => n.toLowerCase()));
  const seenInThisBatch = new Set<string>();
  const unique: ParsedConcept[] = [];
  const duplicates: ParsedConcept[] = [];

  for (const p of parsed) {
    const lower = p.name.toLowerCase();
    if (existingLower.has(lower) || seenInThisBatch.has(lower)) {
      duplicates.push(p);
    } else {
      unique.push(p);
      seenInThisBatch.add(lower);
    }
  }

  return { unique, duplicates };
}