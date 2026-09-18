# Attribution

This repository's history is based on [Selat](https://github.com/fajarhide/selat) by
[fajarhide](https://github.com/fajarhide), licensed under Apache-2.0 (see `LICENSE`).
Full commit history from the original project is preserved as-is, with original
authorship intact.

## What's original to this repository

Everything from the commit "feat(sandbox): add sandboxed tool-execution provider +
Agent SDK client" onward:

- `src/adapters/providers/sandbox.ts` and its registration in `boot.ts` — a provider
  that routes agent tool calls into an isolated, network-disabled Docker container
  instead of running them on the host.
- `agent/` — a Claude Agent SDK client that connects to Selat's MCP endpoint and
  drives the sandbox tool.

This is a personal learning and portfolio project built on top of Selat's gateway
architecture, not a claim of authorship over Selat itself.
