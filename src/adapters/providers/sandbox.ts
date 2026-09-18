import { spawn } from 'node:child_process'
import { GatewayError } from '../../domain/errors.ts'
import type { ProviderAdapter, ToolDef } from './registry.ts'

const RUN_CODE_TIMEOUT_MS = 10_000
const SANDBOX_IMAGE = 'alpine:3.20'

type RunCodeArgs = { code?: string }

/**
 * Runs a shell command inside a throwaway Docker container instead of on the
 * host process. --network none is the point: a tool an agent decided to call
 * gets no path to exfiltrate anything or reach out further, even if the code
 * itself is hostile. Everything else (memory/pids/cpu caps, read-only root,
 * a hard wall-clock timeout) bounds how much damage it can do to itself or to
 * the Docker host in the time it has.
 */
function runInContainer(code: string): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'docker',
      [
        'run',
        '--rm',
        '--network',
        'none',
        '--memory',
        '128m',
        '--cpus',
        '0.5',
        '--pids-limit',
        '64',
        '--read-only',
        '--tmpfs',
        '/tmp',
        SANDBOX_IMAGE,
        'sh',
        '-c',
        code,
      ],
      { timeout: RUN_CODE_TIMEOUT_MS },
    )

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (exitCode, signal) => {
      if (signal === 'SIGTERM') {
        stderr += `\n[sandbox] killed after exceeding ${RUN_CODE_TIMEOUT_MS}ms`
      }
      resolve({ stdout, stderr, exitCode })
    })
  })
}

export function sandboxProvider(): ProviderAdapter {
  const tools: ToolDef[] = [
    {
      name: 'run_code',
      description:
        'Run a shell command in an isolated container with no network access. Returns stdout, stderr, and exit code.',
      inputSchema: {
        type: 'object',
        properties: { code: { type: 'string', description: 'Shell command to run inside the sandbox' } },
        required: ['code'],
      },
      write: true,
    },
  ]

  return {
    id: 'sandbox',
    prefix: 'sandbox',
    grantId: 'sandbox',
    maturity: 'experimental',
    scopes: [],
    credential: 'none',
    listTools: () => tools,

    async callTool(_ctx, tool, args) {
      if (tool !== 'run_code') {
        throw new GatewayError('tool_not_found', `sandbox has no tool ${tool}`, { provider: 'sandbox' })
      }
      const code = (args as RunCodeArgs).code
      if (!code) {
        throw new GatewayError('invalid_arguments', 'code is required', { provider: 'sandbox' })
      }

      const { stdout, stderr, exitCode } = await runInContainer(code)
      return {
        content: { stdout, stderr, exitCode },
        nextCursor: null,
        hasMore: false,
      }
    },

    mapError(err) {
      if (err instanceof GatewayError) return err
      return new GatewayError('upstream_error', 'sandbox provider failed', { provider: 'sandbox' })
    },
  }
}
