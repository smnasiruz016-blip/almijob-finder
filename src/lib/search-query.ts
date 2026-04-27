const TOKEN_CORRECTIONS: Record<string, string> = {
  nurs: "nurse",
  nurce: "nurse",
  nursee: "nurse",
  cheff: "chef",
  chefe: "chef",
  sale: "sales",
  selaes: "sales",
  enginer: "engineer",
  developr: "developer"
};

const TOKEN_SYNONYMS: Record<string, string[]> = {
  nurse: ["nurse", "nursing", "rn", "clinical"],
  chef: ["chef", "cook", "culinary", "kitchen"],
  sales: ["sales", "selling", "account", "business", "development"],
  developer: ["developer", "software", "engineering", "engineer"],
  engineer: ["engineer", "engineering", "developer", "software"]
};

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stemToken(token: string) {
  if (token.length > 5 && token.endsWith("ing")) {
    return token.slice(0, -3);
  }

  if (token.length > 4 && token.endsWith("es")) {
    return token.slice(0, -2);
  }

  if (token.length > 3 && token.endsWith("s")) {
    return token.slice(0, -1);
  }

  return token;
}

function tokenize(value: string) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function correctToken(token: string) {
  return TOKEN_CORRECTIONS[token] ?? token;
}

function expandToken(token: string) {
  const corrected = correctToken(token);
  const synonyms = TOKEN_SYNONYMS[corrected] ?? [corrected];
  return [...new Set(synonyms.map((item) => correctToken(item)))];
}

function tokenEquivalent(left: string, right: string) {
  if (left === right) {
    return true;
  }

  const leftStem = stemToken(left);
  const rightStem = stemToken(right);

  if (leftStem === rightStem) {
    return true;
  }

  if (left.length >= 4 && right.startsWith(left)) {
    return true;
  }

  if (right.length >= 4 && left.startsWith(right)) {
    return true;
  }

  return false;
}

export type SearchQueryAssist = {
  original: string;
  corrected: string;
  correctedTokens: string[];
  tokenGroups: string[][];
  hasCorrections: boolean;
};

export function buildSearchQueryAssist(query?: string) {
  const original = (query ?? "").trim();
  const originalTokens = tokenize(original);
  const correctedTokens = originalTokens.map(correctToken);
  const corrected = correctedTokens.join(" ").trim();

  return {
    original,
    corrected,
    correctedTokens,
    tokenGroups: correctedTokens.map(expandToken),
    hasCorrections:
      correctedTokens.length > 0 &&
      (corrected !== normalizeText(original) ||
        correctedTokens.some((token, index) => token !== originalTokens[index]))
  } satisfies SearchQueryAssist;
}

export function getPreferredProviderQuery(query?: string) {
  const assist = buildSearchQueryAssist(query);
  return assist.corrected || (query ?? "").trim();
}

export function matchesSearchQuery(haystack: string, query?: string) {
  const assist = buildSearchQueryAssist(query);

  if (!assist.correctedTokens.length) {
    return true;
  }

  const haystackTokens = tokenize(haystack);
  const normalizedHaystack = normalizeText(haystack);

  if (assist.corrected && normalizedHaystack.includes(assist.corrected)) {
    return true;
  }

  return assist.tokenGroups.every((group) =>
    group.some((candidate) => haystackTokens.some((token) => tokenEquivalent(candidate, token)))
  );
}

export function getSuggestedQueryReplacement(query?: string) {
  const assist = buildSearchQueryAssist(query);

  if (!assist.original || !assist.hasCorrections || !assist.corrected) {
    return null;
  }

  return assist.corrected;
}
