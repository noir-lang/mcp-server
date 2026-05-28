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
node test.mjs  # Run tests
```
