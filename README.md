# noir-mcp-server

MCP server for Noir development — clones and searches Noir documentation, standard library, examples, and community libraries.

## Install

### Claude Code

```bash
claude mcp add noir-mcp -- npx noir-mcp-server@latest
```

### Codex

```bash
codex mcp add noir-mcp -- npx noir-mcp-server@latest
```

### Claude Desktop / Cursor / Windsurf

Add to your MCP config file (e.g. `~/.claude/mcp.json`, `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "noir": {
      "command": "npx",
      "args": ["noir-mcp-server@latest"]
    }
  }
}
```

### OpenCode

Add to your config file (e.g. `~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "noir": {
      "type": "local",
      "command": ["npx", "-y", "noir-mcp-server@latest"],
      "enabled": true,
    },
  },
}
```

### From source

```bash
git clone https://github.com/critesjosh/noir-mcp-server.git
cd noir-mcp-server
npm install && npm run build
```

Then point your MCP config to the built file:

```json
{
  "mcpServers": {
    "noir": {
      "command": "node",
      "args": ["/path/to/noir-mcp-server/dist/index.js"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `noir_sync_repos` | Clone/update repos. Default: core only. Add `categories: ["libraries"]` for packages. |
| `noir_status` | Check repo clone status |
| `noir_search_code` | Search `.nr` files across repos |
| `noir_search_docs` | Search Noir documentation |
| `noir_search_stdlib` | Search standard library |
| `noir_list_examples` | List available examples |
| `noir_read_example` | Read example source |
| `noir_read_file` | Read any file from repos |
| `noir_list_libraries` | List libraries with descriptions & clone status |

## Repository Categories

**Core** (synced by default):
- `noir` — Compiler, stdlib, tooling, docs
- `noir-examples` — Official example circuits

**Libraries** (sync with `categories: ["libraries"]`):
- `noir-bignum` — Big integer arithmetic
- `noir_bigcurve` — Elliptic curve operations
- `noir_json_parser` — JSON parsing (RFC 8259)
- `noir_string_search` — Substring search/proof
- `noir_sort` — Array sorting
- `sparse_array` — Sparse array implementation
- `zk-kit.noir` — Merkle trees, ECDH, and more

**Reference** (sync with `categories: ["reference"]`):
- `awesome-noir` — Curated ecosystem index

## When this server helps (and when it doesn't)

Good fit:
- Writing or editing Noir circuits with an AI agent that would otherwise lean on stale, pre-1.0 syntax from memory. Docs, stdlib, and examples are pinned to a specific Noir release, so the agent works from version-correct source.
- Looking up how a stdlib function, trait, or type is actually defined or used (e.g. `hash`, `Field`, `assert`, `pedersen`).
- Finding real, working example circuits to adapt (`noir-examples`, `noir/examples`).
- Discovering ecosystem libraries and reading their source.
- Grounding an agent so it stops inventing outdated syntax. Pair it with `nargo check` to confirm the result compiles.

Poor fit:
- You want guaranteed-correct, compilable output without verifying it yourself. This server does not compile or run anything; always confirm with `nargo check`.
- You need community libraries to exactly match your pinned compiler. Libraries are cloned at their latest branch, not a release matched to the compiler (see Limitations).
- Conceptual or design questions ("what is the best way to structure a Merkle-membership circuit?"). Search is keyword/regex, not semantic; the model plus the docs site may serve you better.
- Proving-backend workflows beyond reading `bb.js` source.
- Offline use, or environments without `git` (and ideally `ripgrep`) installed.

## Limitations

- **Read-only, no verification.** It surfaces source and docs but does not compile, type-check, or run circuits. It cannot confirm that code is correct; run `nargo check` against a matching toolchain.
- **Only the compiler is version-pinned.** `noir` and `bb.js` are pinned to a tag; community libraries are cloned at their `main`/`master` branch tip, which may be newer or older than the pinned compiler. Noir's `compiler_version` field only expresses a full-release floor (e.g. `>=1.0.0`) and cannot distinguish between betas, so it will not flag a beta-level mismatch. Treat library code as a reference and verify it against your toolchain.
- **Keyword search, not semantic.** Search is ripgrep over files. It excels at finding a known symbol or string and is weak at open-ended "how do I do X" questions.
- **Single-line matches.** Results are matching lines without surrounding context; reading the full function or doc comment usually needs a follow-up `noir_read_file`.
- **Sync required, and the first sync is slow.** Repos are cloned locally over the network before search works. Core is two repos; adding library or reference categories clones more.
- **One version at a time.** The server serves a single pinned Noir line (see Environment Variables). Switching versions means re-syncing with `version`, and library compatibility is still not guaranteed.
- **Snapshot, not live.** Content reflects the pinned tag (docs/stdlib) and your last sync (libraries). Re-sync to pick up updates.
- **Host dependencies.** Requires `git`; uses `ripgrep` when present and falls back to a slower built-in search otherwise.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NOIR_DEFAULT_VERSION` | `v1.0.0-beta.21` | Noir version tag for the main repo |
| `NOIR_MCP_REPOS_DIR` | `~/.noir-mcp` | Base directory for cloned repos |

## Development

```bash
npm run dev    # Watch mode
npm run build  # Build
npm start      # Run server
npm test       # Run the Vitest unit suite
node test.mjs  # Optional live integration smoke test (clones repos)
```
