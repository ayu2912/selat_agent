import { query } from '@anthropic-ai/claude-agent-sdk'

const SELAT_URL = process.env.SELAT_URL ?? 'http://localhost:8080/mcp'
const SELAT_TOKEN = process.env.SELAT_TOKEN
if (!SELAT_TOKEN) throw new Error('Set SELAT_TOKEN to a Selat gateway credential')

for await (const message of query({
  prompt: 'Use the sandbox tool to run a shell command that proves you are isolated: no network access and a read-only filesystem outside /tmp. Report what you observe.',
  options: {
    mcpServers: {
      selat: {
        type: 'http',
        url: SELAT_URL,
        headers: { Authorization: `Bearer ${SELAT_TOKEN}` },
      },
    },
    allowedTools: ['mcp__selat__sandbox__run_code'],
  },
})) {
  if (message.type === 'system' && message.subtype === 'init') {
    console.log('MCP servers:', message.mcp_servers)
  }
  if (message.type === 'assistant') {
    for (const block of message.message.content) {
      if (block.type === 'text') console.log('\n[claude]', block.text)
      if (block.type === 'tool_use') console.log('\n[tool call]', block.name, JSON.stringify(block.input))
    }
  }
  if (message.type === 'result' && message.subtype === 'success') {
    console.log('\n[done]', message.result)
  }
}
