/**
 * Repository sync tool - clones and updates Noir repositories
 */

import {
  NOIR_REPOS,
  getNoirRepos,
  DEFAULT_NOIR_VERSION,
  RepoCategory,
} from "../repos/config.js";
import { cloneRepo, getReposStatus, REPOS_DIR } from "../utils/git.js";

export interface SyncResult {
  success: boolean;
  message: string;
  version: string;
  repos: {
    name: string;
    status: string;
    commit?: string;
  }[];
}

/**
 * Sync repositories (clone if missing, update if exists).
 * Default: only syncs core repos. Use categories or repos to expand.
 */
export async function syncRepos(options: {
  force?: boolean;
  repos?: string[];
  version?: string;
  categories?: RepoCategory[];
}): Promise<SyncResult> {
  const { force = false, repos: repoNames, version, categories } = options;

  const configuredRepos = version ? getNoirRepos(version) : NOIR_REPOS;
  const effectiveVersion = version || DEFAULT_NOIR_VERSION;

  let reposToSync;

  if (repoNames && repoNames.length > 0) {
    // Specific repos requested
    reposToSync = configuredRepos.filter((r) => repoNames.includes(r.name));
  } else if (categories && categories.length > 0) {
    // Categories requested
    reposToSync = configuredRepos.filter((r) =>
      categories.includes(r.category)
    );
  } else {
    // Default: core only
    reposToSync = configuredRepos.filter((r) => r.category === "core");
  }

  if (reposToSync.length === 0) {
    return {
      success: false,
      message: "No repositories matched the specified names or categories",
      version: effectiveVersion,
      repos: [],
    };
  }

  // Clone repos in parallel (bounded). Cloning is network/IO bound, so this
  // cuts wall-clock time when syncing many libraries; results preserve the
  // configured order.
  const results = await mapWithConcurrency(reposToSync, 6, async (config) => {
    try {
      const status = await cloneRepo(config, force);
      return { name: config.name, status };
    } catch (error) {
      return {
        name: config.name,
        status: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  });

  const allSuccess = results.every(
    (r) => !r.status.toLowerCase().includes("error")
  );

  return {
    success: allSuccess,
    message: allSuccess
      ? `Successfully synced ${results.length} repositories to ${REPOS_DIR}`
      : "Some repositories failed to sync",
    version: effectiveVersion,
    repos: results,
  };
}

/**
 * Get status of all configured repositories
 */
export async function getStatus(): Promise<{
  reposDir: string;
  repos: {
    name: string;
    description: string;
    category: string;
    cloned: boolean;
    commit?: string;
  }[];
}> {
  const statusMap = await getReposStatus(NOIR_REPOS);

  const repos = NOIR_REPOS.map((config) => {
    const status = statusMap.get(config.name);
    return {
      name: config.name,
      description: config.description,
      category: config.category,
      cloned: status?.cloned || false,
      commit: status?.commit,
    };
  });

  return {
    reposDir: REPOS_DIR,
    repos,
  };
}

/**
 * Map over items with a bounded number of concurrent workers, preserving
 * input order in the results regardless of which task finishes first.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker()
  );
  await Promise.all(workers);

  return results;
}
