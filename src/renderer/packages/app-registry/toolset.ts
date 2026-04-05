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

/** A single property from a JSON Schema object */
interface JsonSchemaProperty {
  type?: string
  enum?: string[]
  description?: string
}

/**
 * Convert a JSON Schema to a Zod schema for the Vercel AI SDK's tool() function.
 * Returns ZodObject<any> because the schema shape is determined at runtime from
 * dynamic app manifests — we can't know the shape at compile time.
 */
function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const properties = (schema?.properties || {}) as Record<string, JsonSchemaProperty>
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
    // Only inject tools for approved apps (child-safety gate)
    if (app.reviewStatus && app.reviewStatus !== 'approved') {
      console.debug(`[ChatBridge] Skipping ${app.name} — reviewStatus: ${app.reviewStatus}`)
      continue
    }
    for (const appTool of app.tools) {
      const toolName = `app__${app.id}__${appTool.name}`
      const zodSchema = jsonSchemaToZod(appTool.inputSchema)

      tools[toolName] = tool({
        description: `[${app.name}] ${appTool.description}`,
        inputSchema: zodSchema,
        execute: async (params: Record<string, unknown>) => {
          const state = uiStore.getState()
          if (state.activeAppId !== app.id) {
            state.openApp(app.id, app.uiUrl, app.name)
            await waitForBridge(app.id, 5000)
          }

          const bridge = activeBridges.get(app.id)
          if (!bridge) {
            return { error: `${app.name} app is not connected. The app panel may need to be reopened. Tell the user to try again.` }
          }

          const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          const resultPromise = new Promise<unknown>((resolve) => {
            pendingCalls.set(callId, { resolve, reject: () => {} })
            setTimeout(() => {
              if (pendingCalls.has(callId)) {
                pendingCalls.delete(callId)
                resolve({ error: `${app.name} did not respond within 30 seconds. The app may have crashed. Try asking again or close and reopen the app panel.` })
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
      resolve()
    }, timeoutMs)
  })
}
