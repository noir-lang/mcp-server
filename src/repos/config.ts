/**
 * Configuration for Noir repositories to clone and search
 */

export type RepoCategory = "core" | "libraries" | "reference";

export interface RepoConfig {
  /** Unique name for the repo */
  name: string;
  /** Git URL to clone from */
  url: string;
  /** Branch to checkout (defaults to main/master) */
  branch?: string;
  /** Tag to checkout (overrides branch if specified) */
  tag?: string;
  /** Specific commit to checkout (overrides tag and branch) */
  commit?: string;
  /** Sparse checkout paths - if set, only these paths are checked out */
  sparse?: string[];
  /** Description of what this repo contains */
  description: string;
  /** Category for grouping repos */
  category: RepoCategory;
  /** File patterns to search (for categorization) */
  searchPatterns?: {
    code?: string[];
    docs?: string[];
  };
}

/** Default Noir version (tag) to use - only applies to noir-lang/noir repo */
export const DEFAULT_NOIR_VERSION =
  process.env.NOIR_DEFAULT_VERSION || "v1.0.0-beta.21";

/** Default bb.js version (tag) to use - only applies to aztec-packages repo */
export const DEFAULT_BB_VERSION =
  process.env.BB_DEFAULT_VERSION || "v5.0.0-nightly.20260324";

/**
 * Base Noir repository configurations (without version tag)
 */
const BASE_REPOS: Omit<RepoConfig, "tag">[] = [
  // --- Core ---
  {
    name: "noir",
    url: "https://github.com/noir-lang/noir",
    branch: "master",
    sparse: ["docs", "noir_stdlib", "tooling", "examples"],
    description:
      "Noir language compiler, standard library, tooling, and documentation",
    category: "core",
    searchPatterns: {
      code: ["*.nr", "*.rs"],
      docs: ["*.md", "*.mdx"],
    },
  },
  {
    name: "noir-examples",
    url: "https://github.com/noir-lang/noir-examples",
    branch: "master",
    description: "Official Noir example circuits and projects",
    category: "core",
    searchPatterns: {
      code: ["*.nr", "*.ts"],
      docs: ["*.md"],
    },
  },

  // --- Libraries ---
  {
    name: "noir-bignum",
    url: "https://github.com/noir-lang/noir-bignum",
    branch: "main",
    description:
      "Big integer arithmetic — foundational for most crypto operations",
    category: "libraries",
    searchPatterns: { code: ["*.nr"] },
  },
  {
    name: "noir_bigcurve",
    url: "https://github.com/noir-lang/noir_bigcurve",
    branch: "main",
    description: "Elliptic curve operations over arbitrary prime fields",
    category: "libraries",
    searchPatterns: { code: ["*.nr"] },
  },
  {
    name: "noir_json_parser",
    url: "https://github.com/noir-lang/noir_json_parser",
    branch: "main",
    description: "JSON string parsing (RFC 8259) in Noir",
    category: "libraries",
    searchPatterns: { code: ["*.nr"] },
  },
  {
    name: "noir_string_search",
    url: "https://github.com/noir-lang/noir_string_search",
    branch: "main",
    description: "Substring search and proof in Noir",
    category: "libraries",
    searchPatterns: { code: ["*.nr"] },
  },
  {
    name: "noir_sort",
    url: "https://github.com/noir-lang/noir_sort",
    branch: "main",
    description: "Array sorting in Noir",
    category: "libraries",
    searchPatterns: { code: ["*.nr"] },
  },
  {
    name: "poseidon",
    url: "https://github.com/noir-lang/poseidon",
    branch: "master",
    description: "Poseidon hash function implementation for Noir",
    category: "libraries",
    searchPatterns: { code: ["*.nr"] },
  },
  {
    name: "sparse_array",
    url: "https://github.com/noir-lang/sparse_array",
    branch: "master",
    description: "Sparse array implementation for Noir",
    category: "libraries",
    searchPatterns: { code: ["*.nr"] },
  },
  {
    name: "zk-kit.noir",
    url: "https://github.com/privacy-scaling-explorations/zk-kit.noir",
    branch: "main",
    description:
      "Algorithm & utility collection (Merkle trees, ECDH, etc.) for Noir",
    category: "libraries",
    searchPatterns: { code: ["*.nr"] },
  },
  {
    name: "bb.js",
    url: "https://github.com/AztecProtocol/aztec-packages",
    branch: "next",
    sparse: ["barretenberg/ts"],
    description:
      "Aztec Barretenberg TypeScript/JavaScript bindings for proving backends",
    category: "libraries",
    searchPatterns: { code: ["*.ts", "*.js"] },
  },

  // --- Reference ---
  {
    name: "awesome-noir",
    url: "https://github.com/noir-lang/awesome-noir",
    branch: "main",
    description:
      "Curated ecosystem index — searchable for finding libraries & projects",
    category: "reference",
    searchPatterns: { docs: ["*.md"] },
  },
];

/**
 * Get Noir repositories configured for a specific version.
 * Version tag only applies to the main noir repo.
 */
export function getNoirRepos(version?: string): RepoConfig[] {
  const tag = version || DEFAULT_NOIR_VERSION;

  return BASE_REPOS.map((repo) => ({
    ...repo,
    tag:
      repo.name === "noir"
        ? tag
        : repo.name === "bb.js"
          ? DEFAULT_BB_VERSION
          : undefined,
  }));
}

/**
 * Noir repositories with default version
 */
export const NOIR_REPOS: RepoConfig[] = getNoirRepos();

/**
 * Get repos filtered by category
 */
export function getReposByCategory(
  category: RepoCategory,
  version?: string
): RepoConfig[] {
  const repos = version ? getNoirRepos(version) : NOIR_REPOS;
  return repos.filter((r) => r.category === category);
}

/**
 * Get all available category names
 */
export function getCategoryNames(): RepoCategory[] {
  return ["core", "libraries", "reference"];
}

/**
 * Get repo config by name
 */
export function getRepoConfig(name: string): RepoConfig | undefined {
  return NOIR_REPOS.find((repo) => repo.name === name);
}

/**
 * Get all repo names
 */
export function getRepoNames(): string[] {
  return NOIR_REPOS.map((repo) => repo.name);
}
