#!/usr/bin/env node
/**
 * mind-mcp — MCP server exposing a .mind/ folder to agents.
 *
 * Tools:
 *   mind_read           read a file inside .mind/
 *   mind_route          return INDEX.md routing table
 *   mind_recall         search memory/context by substring
 *   mind_propose_write  create a .mind/diff/*.md proposal
 *   mind_list           list files under a subdirectory of .mind/
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import { z } from "zod";

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const ROOT = resolve(rootIdx >= 0 ? args[rootIdx + 1] : ".");
const MIND = join(ROOT, ".mind");

function safeResolve(rel: string): string {
  const full = resolve(MIND, rel);
  if (!full.startsWith(MIND + sep) && full !== MIND) {
    throw new Error(`Path escapes .mind/: ${rel}`);
  }
  return full;
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
}

const server = new Server(
  { name: "mind-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

const tools = [
  {
    name: "mind_read",
    description: "Read a file inside .mind/ by relative path.",
    inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
  {
    name: "mind_route",
    description: "Return the routing table from INDEX.md.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "mind_recall",
    description: "Search memory/ and context/ files by substring query.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "mind_propose_write",
    description: "Create a .mind/diff/*.md proposing a change to a target file.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string" },
        proposal: { type: "string" },
        reason: { type: "string" },
        confidence: { type: "number" },
      },
      required: ["target", "proposal"],
    },
  },
  {
    name: "mind_list",
    description: "List markdown files under a subdirectory of .mind/.",
    inputSchema: { type: "object", properties: { subdir: { type: "string" } } },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    switch (name) {
      case "mind_read": {
        const p = safeResolve(z.string().parse(args.path));
        return { content: [{ type: "text", text: readFileSync(p, "utf8") }] };
      }
      case "mind_route": {
        const p = safeResolve("INDEX.md");
        return { content: [{ type: "text", text: readFileSync(p, "utf8") }] };
      }
      case "mind_recall": {
        const q = z.string().parse(args.query).toLowerCase();
        const hits: string[] = [];
        for (const f of [...walk(join(MIND, "memory")), ...walk(join(MIND, "context"))]) {
          const raw = readFileSync(f, "utf8");
          if (raw.toLowerCase().includes(q)) hits.push(`## ${relative(MIND, f)}\n\n${raw}\n`);
        }
        return { content: [{ type: "text", text: hits.join("\n---\n") || "No matches." }] };
      }
      case "mind_propose_write": {
        const target = z.string().parse(args.target);
        const proposal = z.string().parse(args.proposal);
        const reason = (args.reason as string) ?? "";
        const confidence = (args.confidence as number) ?? 0.7;
        const diffDir = safeResolve("diff");
        mkdirSync(diffDir, { recursive: true });
        const date = new Date().toISOString().slice(0, 10);
        const seq = String(readdirSync(diffDir).filter((f) => f.startsWith(date)).length + 1).padStart(3, "0");
        const slug = target.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
        const file = join(diffDir, `${date}-${seq}-${slug}.md`);
        writeFileSync(
          file,
          `---\ntype: proposed-write\ntarget: ${target}\nconfidence: ${confidence}\nreason: ${reason}\n---\n\n# Proposed change\n\n${proposal}\n`,
        );
        return { content: [{ type: "text", text: `Created ${relative(ROOT, file)}` }] };
      }
      case "mind_list": {
        const sub = (args.subdir as string) ?? "";
        const p = safeResolve(sub);
        const files = walk(p).map((f) => relative(MIND, f));
        return { content: [{ type: "text", text: files.join("\n") }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e) {
    return { content: [{ type: "text", text: `Error: ${(e as Error).message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
