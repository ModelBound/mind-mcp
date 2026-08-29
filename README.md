# @modelbound/mind-mcp

An [MCP](https://modelcontextprotocol.io) server that exposes a `.mind/` folder to any MCP-capable agent (Claude, Cursor, custom).

## Tools

| Tool | Description |
|------|-------------|
| `mind_read` | Read a `.mind/` file. Skills under `skills/` return a served payload with `trust_score`, `scanner_version`, `review_state`, and `review_meta`. |
| `mind_route` | Return the routing table from `INDEX.md`. |
| `mind_recall` | Search memory/context for a query. |
| `mind_propose_write` | Create a `.mind/diff/*.md` proposing a change. |
| `mind_trust` | Score a skill with deterministic trust heuristics (scanner **h5**) and return confidence trend. |
| `mind_list` | List files under a subdirectory of `.mind/`. |

## Served skill payload

When reading `.mind/skills/*.md`, `mind_read` includes:

- `version`, `trust_score`, `scanner_version`
- `review_state`, `review_meta`
- `confidence` (pass rate, trust delta, trend)

Field names match the hosted ModelBound product for round-trip compatibility.

## Install

```bash
npm i -g @modelbound/mind-mcp
```

## Run

```bash
mind-mcp --root /path/to/project
```

## Migration (0.1 → 0.2)

- Skill reads now return JSON payloads for paths under `skills/` (not raw markdown only).
- Add `mind_trust` for explicit trust scoring without a full read.
- Pair with `@modelbound/mind-cli` for review lifecycle (`mind review approve`, `mind review gate`).

## Security

The server refuses any path that escapes the `--root` directory. Writes only ever create files under `.mind/diff/`.

## License

Apache 2.0.
