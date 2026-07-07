# @modelbound/mind-mcp

An [MCP](https://modelcontextprotocol.io) server that exposes a `.mind/` folder to any MCP-capable agent (Claude, Cursor, custom).

## Tools

| Tool | Description |
|------|-------------|
| `mind_read` | Read a file inside `.mind/` by relative path. |
| `mind_route` | Return the routing table from `INDEX.md` for the current intent. |
| `mind_recall` | Search memory/context for a query (basic substring; embeddings optional). |
| `mind_propose_write` | Create a `.mind/diff/*.md` proposing a change to a target file. |
| `mind_list` | List files under a subdirectory of `.mind/`. |

## Install

```bash
npm i -g @modelbound/mind-mcp
```

## Run

```bash
mind-mcp --root /path/to/project
```

Or add to your Claude Desktop / MCP client config:

```json
{
  "mcpServers": {
    "mind": {
      "command": "npx",
      "args": ["-y", "@modelbound/mind-mcp", "--root", "."]
    }
  }
}
```

## Security

The server refuses any path that escapes the `--root` directory. Writes only ever create files under `.mind/diff/` — the accept/reject step is left to the human or a trusted CI step.

## License

Apache 2.0.
