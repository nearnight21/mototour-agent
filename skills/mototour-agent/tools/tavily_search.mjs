#!/usr/bin/env node
// Tavily MCP 调用封装
// 用法: node tavily_search.mjs "query" [max_results] [depth]
import { ProxyAgent, fetch } from "undici";

const proxyUri = "http://127.0.0.1:10808";
const endpoint = "https://tavily-proxy.xiaobai1423.workers.dev/mcp";
const apiKey = "tavily-proxy-auth-key-2026";

const query = process.argv[2];
const maxResults = parseInt(process.argv[3] || "8", 10);
const depth = process.argv[4] || "advanced";

if (!query) {
  console.error("Usage: node tavily_search.mjs <query> [max_results] [search_depth]");
  process.exit(1);
}

const dispatcher = new ProxyAgent({ uri: proxyUri });

const body = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "tavily-search",
    arguments: {
      query: query,
      max_results: maxResults,
      search_depth: depth,
      include_answer: true
    }
  }
};

try {
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "x-api-key": apiKey
    },
    body: JSON.stringify(body),
    dispatcher
  });
  const text = await resp.text();
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      try {
        const json = JSON.parse(data);
        if (json.result && json.result.content) {
          for (const c of json.result.content) {
            if (c.type === "text") {
              const inner = JSON.parse(c.text);
              console.log("=== ANSWER ===");
              console.log(inner.answer || "(no answer)");
              console.log("\n=== RESULTS ===");
              for (const r of inner.results || []) {
                console.log(`\n[${r.url}]`);
                console.log(`TITLE: ${r.title}`);
                console.log(`CONTENT: ${(r.content || "").slice(0, 600)}`);
              }
            }
          }
        } else if (json.error) {
          console.error("ERROR:", JSON.stringify(json.error));
          process.exit(2);
        }
      } catch (e) {}
    }
  }
} catch (e) {
  console.error("FETCH ERROR:", e.message);
  process.exit(3);
}