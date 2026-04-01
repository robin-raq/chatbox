import type {
  ToolCallMessage,
  ToolResultMessage,
  ContextUpdateMessage,
  CompletionMessage,
  ErrorMessage,
  BridgeMessageType,
} from '../app-registry/types'

const VALID_INCOMING_TYPES: BridgeMessageType[] = ['tool_result', 'context_update', 'completion']
const RATE_LIMIT = 20 // messages per second

type ToolResultCallback = (msg: ToolResultMessage) => void
type ContextUpdateCallback = (msg: ContextUpdateMessage) => void
type CompletionCallback = (msg: CompletionMessage) => void

export class AppBridge {
  private iframe: HTMLIFrameElement
  private toolResultCallbacks: ToolResultCallback[] = []
  private contextUpdateCallbacks: ContextUpdateCallback[] = []
  private completionCallbacks: CompletionCallback[] = []
  private messageListener: ((event: MessageEvent) => void) | null = null
  private messageCount = 0
  private rateLimitTimer: ReturnType<typeof setInterval> | null = null

  constructor(iframe: HTMLIFrameElement) {
    this.iframe = iframe
    this.startListening()
    this.startRateLimitTimer()
  }

  sendToolCall(id: string, name: string, params: Record<string, unknown>): void {
    const msg: ToolCallMessage = { type: 'tool_call', id, name, params }
    this.iframe.contentWindow?.postMessage(msg, '*')
  }

  sendError(code: string, message: string): void {
    const msg: ErrorMessage = { type: 'error', code, message }
    this.iframe.contentWindow?.postMessage(msg, '*')
  }

  onToolResult(callback: ToolResultCallback): void {
    this.toolResultCallbacks.push(callback)
  }

  onContextUpdate(callback: ContextUpdateCallback): void {
    this.contextUpdateCallbacks.push(callback)
  }

  onCompletion(callback: CompletionCallback): void {
    this.completionCallbacks.push(callback)
  }

  destroy(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener)
      this.messageListener = null
    }
    if (this.rateLimitTimer) {
      clearInterval(this.rateLimitTimer)
      this.rateLimitTimer = null
    }
    this.toolResultCallbacks = []
    this.contextUpdateCallbacks = []
    this.completionCallbacks = []
  }

  private startListening(): void {
    this.messageListener = (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object' || !('type' in data)) return
      if (!VALID_INCOMING_TYPES.includes(data.type)) return

      if (this.messageCount >= RATE_LIMIT) return
      this.messageCount++

      switch (data.type) {
        case 'tool_result':
          this.toolResultCallbacks.forEach((cb) => cb(data as ToolResultMessage))
          break
        case 'context_update':
          this.contextUpdateCallbacks.forEach((cb) => cb(data as ContextUpdateMessage))
          break
        case 'completion':
          this.completionCallbacks.forEach((cb) => cb(data as CompletionMessage))
          break
      }
    }
    window.addEventListener('message', this.messageListener)
  }

  private startRateLimitTimer(): void {
    this.rateLimitTimer = setInterval(() => {
      this.messageCount = 0
    }, 1000)
  }
}
