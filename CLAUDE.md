# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
npm run build          # TypeScript compile (tsc) to dist/
npm run dev            # Watch mode (tsc --watch)
npm start              # Run the MCP server (node dist/index.js)
node test.mjs          # Integration test — syncs core repos, searches, lists examples
```

No linter or unit test framework is configured. The only test is `test.mjs` which does a full integration run (clones repos, searches code, lists examples).

## Architecture

This is an MCP (Model Context Protocol) server that clones Noir ecosystem git repos locally and exposes search/read tools over stdio transport.

**Key flow:** MCP client calls a tool → `src/index.ts` dispatches → tool handler in `src/tools/` → utility in `src/utils/` → returns formatted text.

### Source Layout

- `src/repos/config.ts` — Repository definitions (`BASE_REPOS` array) with URLs, branches, sparse checkout paths, categories (`core`/`libraries`/`reference`), and search patterns. Version tag logic only applies to the main `noir` repo.
- `src/tools/sync.ts` — `syncRepos()` and `getStatus()` — clone/update logic with category/name filtering. Default sync is core-only.
- `src/tools/search.ts` — All search/list/read tool handlers. Thin wrappers that check clone status then delegate to utils.
- `src/utils/git.ts` — Git operations via `simple-git`. Handles sparse checkout, tag/branch/commit checkout, version mismatch detection. Repos stored at `~/.noir-mcp/repos/` (override with `NOIR_MCP_REPOS_DIR`).
- `src/utils/search.ts` — Code search via `rg` (ripgrep) with `globby` fallback. Also handles example discovery and library listing.
- `src/index.ts` — Server setup, tool definitions (input schemas), request handler switch, and all formatting helpers.

### Adding a New Repository

Add an entry to `BASE_REPOS` in `src/repos/config.ts`. Each entry needs: `name`, `url`, `branch`, `description`, `category`, and optionally `sparse` (for partial checkout of large repos) and `searchPatterns`. The version tag system only applies to the repo named `"noir"`.

### Environment Variables

- `NOIR_DEFAULT_VERSION` — Tag for the noir repo (default: `v1.0.0-beta.21`)
- `NOIR_MCP_REPOS_DIR` — Base directory for cloned repos (default: `~/.noir-mcp`)
