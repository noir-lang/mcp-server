/**
 * Search utilities for finding content in cloned repositories
 */

import { execFileSync } from "child_process";
import { existsSync, readFileSync, realpathSync } from "fs";
import { join, relative, extname, resolve, isAbsolute } from "path";
import { globbySync } from "globby";
import { REPOS_DIR, getRepoPath, isRepoCloned } from "./git.js";
import { NOIR_REPOS, RepoCategory } from "../repos/config.js";

export interface SearchResult {
  file: string;
  line?: number;
  content: string;
  repo: string;
}

export interface FileInfo {
  path: string;
  name: string;
  repo: string;
  type: "circuit" | "test" | "typescript" | "docs" | "other";
}

export interface LibraryInfo {
  name: string;
  description: string;
  category: RepoCategory;
  url: string;
  cloned: boolean;
}

/**
 * Search code using ripgrep (falls back to manual search if rg not available)
 */
export function searchCode(
  query: string,
  options: {
    filePattern?: string;
    repo?: string;
    maxResults?: number;
    caseSensitive?: boolean;
  } = {}
): SearchResult[] {
  const {
    filePattern = "*.nr",
    repo,
    maxResults = 50,
    caseSensitive = false,
  } = options;

  const searchPath = repo ? getRepoPath(repo) : REPOS_DIR;

  if (!existsSync(searchPath)) {
    return [];
  }

  try {
    // Pass args as an array (no shell) to avoid injection and shell glob
    // expansion of the file pattern. -m bounds matches per file (buffer
    // safety); the total result count is then capped by parseRgOutput.
    const args = [
      ...(caseSensitive ? [] : ["-i"]),
      "-n",
      "--no-heading",
      "-g",
      filePattern,
      "-m",
      String(maxResults * 2),
      "-e",
      query,
      searchPath,
    ];

    const result = execFileSync("rg", args, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    });

    return parseRgOutput(result, maxResults);
  } catch {
    return manualSearch(
      query,
      searchPath,
      filePattern,
      maxResults,
      caseSensitive
    );
  }
}

/**
 * Search Noir documentation files
 */
export function searchDocs(
  query: string,
  options: {
    section?: string;
    maxResults?: number;
  } = {}
): SearchResult[] {
  const { section, maxResults = 30 } = options;

  let repo: string | undefined;
  if (section) {
    const docsPath = join(REPOS_DIR, "noir", "docs", section);
    if (existsSync(docsPath)) {
      repo = `noir/docs/${section}`;
    }
  }

  return searchCode(query, {
    filePattern: "*.{md,mdx}",
    repo: repo || "noir",
    maxResults,
  });
}

/**
 * Search the Noir standard library (.nr files in noir_stdlib)
 */
export function searchStdlib(
  query: string,
  options: {
    maxResults?: number;
  } = {}
): SearchResult[] {
  const { maxResults = 30 } = options;

  const stdlibPath = join(getRepoPath("noir"), "noir_stdlib");
  if (!existsSync(stdlibPath)) {
    return [];
  }

  // Search within noir_stdlib using the repo-relative path
  const searchPath = "noir/noir_stdlib";

  return searchCode(query, {
    filePattern: "*.nr",
    repo: searchPath,
    maxResults,
  });
}

/**
 * List example circuits
 */
export function listExamples(category?: string): FileInfo[] {
  const examples: FileInfo[] = [];

  // Search in noir-examples
  const examplesPath = getRepoPath("noir-examples");
  if (existsSync(examplesPath)) {
    const circuits = findCircuits(examplesPath, "noir-examples");
    examples.push(...circuits);
  }

  // Search in noir/examples
  const noirExamplesPath = join(getRepoPath("noir"), "examples");
  if (existsSync(noirExamplesPath)) {
    const circuits = findCircuits(noirExamplesPath, "noir");
    examples.push(...circuits);
  }

  if (category) {
    const lowerCategory = category.toLowerCase();
    return examples.filter(
      (e) =>
        e.name.toLowerCase().includes(lowerCategory) ||
        e.path.toLowerCase().includes(lowerCategory)
    );
  }

  return examples;
}

/**
 * List library repos with their metadata and clone status
 */
export function listLibraries(category?: RepoCategory): LibraryInfo[] {
  const categoriesToShow: RepoCategory[] = category
    ? [category]
    : ["libraries", "reference"];

  return NOIR_REPOS.filter((r) => categoriesToShow.includes(r.category)).map(
    (r) => ({
      name: r.name,
      description: r.description,
      category: r.category,
      url: r.url,
      cloned: isRepoCloned(r.name),
    })
  );
}

/**
 * Read a specific file, constrained to the repos directory.
 * Rejects any path (via `..`, an absolute path, or a symlink) that resolves
 * outside REPOS_DIR. Absolute paths that stay inside REPOS_DIR are allowed.
 */
export function readFile(filePath: string): string | null {
  const fullPath = isAbsolute(filePath)
    ? resolve(filePath)
    : resolve(REPOS_DIR, filePath);

  // Lexical containment: the resolved path must stay inside REPOS_DIR.
  if (!isInside(REPOS_DIR, fullPath)) {
    return null;
  }

  if (!existsSync(fullPath)) {
    return null;
  }

  // Real-path containment: defeat symlinks that point outside the repos dir.
  try {
    if (!isInside(realpathSync(REPOS_DIR), realpathSync(fullPath))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    return readFileSync(fullPath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Find an example circuit by name
 */
export function findExample(name: string): FileInfo | null {
  const examples = listExamples();
  const lowerName = name.toLowerCase();

  let match = examples.find((e) => e.name.toLowerCase() === lowerName);

  if (!match) {
    match = examples.find(
      (e) =>
        e.name.toLowerCase().includes(lowerName) ||
        e.path.toLowerCase().includes(lowerName)
    );
  }

  return match || null;
}

// --- Helper functions ---

/** True if `target` is `root` itself or nested inside it (no `..` escape). */
function isInside(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function parseRgOutput(output: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  const lines = output.split("\n").filter(Boolean);

  for (const line of lines) {
    if (results.length >= maxResults) break;

    const match = line.match(/^(.+?):(\d+):(.*)$/);
    if (match) {
      const [, filePath, lineNum, content] = match;
      const relativePath = relative(REPOS_DIR, filePath);
      const repoPart = relativePath.split("/")[0];

      results.push({
        file: relativePath,
        line: parseInt(lineNum, 10),
        content: content.trim(),
        repo: repoPart,
      });
    }
  }

  return results;
}

export function manualSearch(
  query: string,
  searchPath: string,
  filePattern: string,
  maxResults: number,
  caseSensitive: boolean
): SearchResult[] {
  const results: SearchResult[] = [];
  const pattern = filePattern.replace("*.", "**/*.");

  try {
    const files = globbySync(pattern, {
      cwd: searchPath,
      absolute: true,
      ignore: ["**/node_modules/**", "**/.git/**"],
    });

    let searchRegex: RegExp;
    try {
      searchRegex = new RegExp(query, caseSensitive ? "g" : "gi");
    } catch {
      searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), caseSensitive ? "g" : "gi");
    }

    for (const file of files) {
      if (results.length >= maxResults) break;

      try {
        const content = readFileSync(file, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          if (results.length >= maxResults) break;

          if (searchRegex.test(lines[i])) {
            const relativePath = relative(REPOS_DIR, file);
            const repoPart = relativePath.split("/")[0];

            results.push({
              file: relativePath,
              line: i + 1,
              content: lines[i].trim(),
              repo: repoPart,
            });
          }

          searchRegex.lastIndex = 0;
        }
      } catch {
        // Skip files that can't be read
      }
    }
  } catch {
    // Globby error, return empty
  }

  return results;
}

export function findCircuits(basePath: string, repoName: string): FileInfo[] {
  const circuits: FileInfo[] = [];

  try {
    const files = globbySync("**/src/main.nr", {
      cwd: basePath,
      absolute: true,
      ignore: ["**/node_modules/**", "**/.git/**"],
    });

    for (const file of files) {
      const relativePath = relative(REPOS_DIR, file);
      const parts = relativePath.split("/");
      const srcIndex = parts.indexOf("src");
      const name =
        srcIndex > 0 ? parts[srcIndex - 1] : parts[parts.length - 2];

      circuits.push({
        path: relativePath,
        name,
        repo: repoName,
        type: "circuit",
      });
    }
  } catch {
    // Ignore errors
  }

  return circuits;
}

/**
 * Get file type from path
 */
export function getFileType(
  filePath: string
): "circuit" | "test" | "typescript" | "docs" | "other" {
  const ext = extname(filePath).toLowerCase();
  const lowerPath = filePath.toLowerCase();

  if (ext === ".nr") {
    if (lowerPath.includes("test")) return "test";
    return "circuit";
  }
  if (ext === ".ts" || ext === ".tsx") return "typescript";
  if (ext === ".md" || ext === ".mdx") return "docs";

  return "other";
}
