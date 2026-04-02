/**
 * Converts registered app tools into a Vercel AI SDK ToolSet.
 *
 * Each tool's execute function:
 * 1. Opens the app panel if not already open
 * 2. Sends a tool_call via postMessage to the iframe
 * 3. Returns a Promise that resolves when tool_result comes back
 */
import { tool, type ToolSet } from 'ai'
import z from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { uiStore } from '@/stores/uiStore'
import { AppBridge } from '../app-bridge/AppBridge'
import { appRegistry } from './registry'
import type { AppManifest, AppToolDefinition } from './types'

/** Active bridges keyed by app ID */
const activeBridges = new Map<string, AppBridge>()

/** Pending tool call resolvers keyed by call ID */
const pendingCalls = new Map<string, { resolve: (result: unknown) => void; reject: (err: Error) => void }>()

/** Connect a bridge to an app's iframe after it loads */
export function connectBridge(appId: string, iframe: HTMLIFrameElement): void {
  // Destroy existing bridge if any
  activeBridges.get(appId)?.destroy()

  const bridge = new AppBridge(iframe)

  bridge.onToolResult((msg) => {
    const pending = pendingCalls.get(msg.id)
    if (!pending) return
    pendingCalls.delete(msg.id)
    if (msg.error) {
      pending.resolve({ error: msg.error.message })
    } else {
      pending.resolve(msg.result)
    }
  })

  bridge.onContextUpdate((msg) => {
    console.debug(`[ChatBridge] context_update from ${appId}:`, msg.data)
    // Auto-trigger AI response for chess moves
    if (appId === 'chess' && msg.data && msg.data.last_move) {
      autoRespondToMove(msg.data)
    }
  })

  bridge.onCompletion((msg) => {
    console.debug(`[ChatBridge] completion from ${appId}:`, msg.result)
  })

  activeBridges.set(appId, bridge)
}

/** Disconnect a bridge when an app is closed */
export function disconnectBridge(appId: string): void {
  activeBridges.get(appId)?.destroy()
  activeBridges.delete(appId)
}

/** Convert a JSON Schema to a Zod schema. Matches the pattern used by web_search tool. */
function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodObject<any> {
  const properties = (schema?.properties || {}) as Record<string, Record<string, unknown>>
  const required = (schema?.required || []) as string[]

  const shape: Record<string, z.ZodTypeAny> = {}
  for (const [key, prop] of Object.entries(properties)) {
    let field: z.ZodTypeAny
    switch (prop.type) {
      case 'string':
        field = prop.enum ? z.enum(prop.enum as [string, ...string[]]) : z.string()
        break
      case 'number':
      case 'integer':
        field = z.number()
        break
      case 'boolean':
        field = z.boolean()
        break
      default:
        field = z.string()
    }
    if (prop.description) field = field.describe(prop.description as string)
    if (!required.includes(key)) field = field.optional()
    shape[key] = field
  }

  // Always include at least one field — Zod v4 + zod-to-json-schema
  // produces invalid JSON Schema for completely empty z.object({})
  if (Object.keys(shape).length === 0) {
    shape._unused = z.string().optional().describe('unused')
  }

  return z.object(shape)
}

/** Build a Vercel AI SDK ToolSet from all registered apps. */
export function getAppToolSet(): ToolSet {
  const tools: ToolSet = {}

  for (const app of appRegistry.getAllApps()) {
    for (const appTool of app.tools) {
      const toolName = `app__${app.id}__${appTool.name}`
      const zodSchema = jsonSchemaToZod(appTool.inputSchema)

      tools[toolName] = tool({
        description: `[${app.name}] ${appTool.description}`,
        inputSchema: zodSchema,
        execute: async (params: Record<string, unknown>) => {
          // Ensure the app panel is open
          const state = uiStore.getState()
          if (state.activeAppId !== app.id) {
            state.openApp(app.id, app.uiUrl, app.name)
            // Wait for iframe to load and bridge to connect
            await waitForBridge(app.id, 5000)
          }

          const bridge = activeBridges.get(app.id)
          if (!bridge) {
            return { error: `App ${app.name} is not connected` }
          }

          // Send tool call and wait for result
          const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          const resultPromise = new Promise<unknown>((resolve, reject) => {
            pendingCalls.set(callId, { resolve, reject })
            setTimeout(() => {
              if (pendingCalls.has(callId)) {
                pendingCalls.delete(callId)
                resolve({ error: `Tool call timed out after 30 seconds` })
              }
            }, 30000)
          })

          bridge.sendToolCall(callId, appTool.name, params)
          return resultPromise
        },
      })
    }
  }

  return tools
}

/** Auto-respond to a chess move by injecting a user message and triggering AI generation */
async function autoRespondToMove(data: Record<string, unknown>) {
  try {
    const { submitNewUserMessage } = await import('@/stores/session/messages')
    const { currentSessionIdAtom } = await import('@/stores/atoms/sessionAtoms')
    const jotai = await import('jotai')

    // Get current session ID from the jotai atom store
    // We need to access it through the default store
    const { getDefaultStore } = jotai
    const store = getDefaultStore()
    const sessionId = store.get(currentSessionIdAtom)
    if (!sessionId) return

    const move = data.last_move || 'unknown'
    const turn = data.turn || ''

    // Create a user message describing the move
    const userMsg = {
      id: uuidv4(),
      role: 'user' as const,
      contentParts: [{ type: 'text' as const, text: `I played ${move}. Your turn.` }],
    }

    console.debug(`[ChatBridge] Auto-submitting move message: "I played ${move}"`)

    await submitNewUserMessage(sessionId, {
      newUserMsg: userMsg as any,
      needGenerating: true,
    })
  } catch (err) {
    console.error('[ChatBridge] Auto-respond error:', err)
  }
}

/** Wait for a bridge to be connected (iframe loaded) */
function waitForBridge(appId: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (activeBridges.has(appId)) {
      resolve()
      return
    }
    const interval = setInterval(() => {
      if (activeBridges.has(appId)) {
        clearInterval(interval)
        resolve()
      }
    }, 100)
    setTimeout(() => {
      clearInterval(interval)
      resolve() // resolve anyway, the execute function will handle missing bridge
    }, timeoutMs)
  })
}
