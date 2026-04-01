/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppBridge } from '../AppBridge'
import type { ToolCallMessage, ToolResultMessage, ContextUpdateMessage, CompletionMessage } from '../../app-registry/types'

// Mock iframe contentWindow
function createMockIframe(): HTMLIFrameElement {
  const postMessage = vi.fn()
  return {
    contentWindow: {
      postMessage,
    },
  } as unknown as HTMLIFrameElement
}

// Simulate receiving a postMessage from an iframe
function simulateMessage(data: unknown) {
  const event = new MessageEvent('message', { data })
  window.dispatchEvent(event)
}

describe('AppBridge', () => {
  let bridge: AppBridge
  let iframe: HTMLIFrameElement

  beforeEach(() => {
    iframe = createMockIframe()
    bridge = new AppBridge(iframe)
  })

  afterEach(() => {
    bridge.destroy()
  })

  describe('sendToolCall', () => {
    it('should post a tool_call message to the iframe', () => {
      bridge.sendToolCall('call-1', 'start_game', { color: 'white' })

      expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
        {
          type: 'tool_call',
          id: 'call-1',
          name: 'start_game',
          params: { color: 'white' },
        },
        '*'
      )
    })

    it('should post with empty params if none provided', () => {
      bridge.sendToolCall('call-2', 'get_board_state', {})

      expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
        {
          type: 'tool_call',
          id: 'call-2',
          name: 'get_board_state',
          params: {},
        },
        '*'
      )
    })
  })

  describe('sendError', () => {
    it('should post an error message to the iframe', () => {
      bridge.sendError('timeout', 'App did not respond')

      expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
        {
          type: 'error',
          code: 'timeout',
          message: 'App did not respond',
        },
        '*'
      )
    })
  })

  describe('receiving tool_result', () => {
    it('should call onToolResult callback with valid messages', () => {
      const callback = vi.fn()
      bridge.onToolResult(callback)

      simulateMessage({
        type: 'tool_result',
        id: 'call-1',
        result: { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR' },
      })

      expect(callback).toHaveBeenCalledWith({
        type: 'tool_result',
        id: 'call-1',
        result: { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR' },
      })
    })

    it('should call onToolResult callback for error results', () => {
      const callback = vi.fn()
      bridge.onToolResult(callback)

      simulateMessage({
        type: 'tool_result',
        id: 'call-1',
        error: { code: 'invalid_move', message: 'e2 to e5 is not legal' },
      })

      expect(callback).toHaveBeenCalledWith({
        type: 'tool_result',
        id: 'call-1',
        error: { code: 'invalid_move', message: 'e2 to e5 is not legal' },
      })
    })
  })

  describe('receiving context_update', () => {
    it('should call onContextUpdate callback', () => {
      const callback = vi.fn()
      bridge.onContextUpdate(callback)

      simulateMessage({
        type: 'context_update',
        data: { board_state: 'some-fen', last_move: 'e2e4' },
      })

      expect(callback).toHaveBeenCalledWith({
        type: 'context_update',
        data: { board_state: 'some-fen', last_move: 'e2e4' },
      })
    })
  })

  describe('receiving completion', () => {
    it('should call onCompletion callback', () => {
      const callback = vi.fn()
      bridge.onCompletion(callback)

      simulateMessage({
        type: 'completion',
        result: { winner: 'white', moves: 42 },
      })

      expect(callback).toHaveBeenCalledWith({
        type: 'completion',
        result: { winner: 'white', moves: 42 },
      })
    })

    it('should call onCompletion callback without result', () => {
      const callback = vi.fn()
      bridge.onCompletion(callback)

      simulateMessage({ type: 'completion' })

      expect(callback).toHaveBeenCalledWith({ type: 'completion' })
    })
  })

  describe('message validation', () => {
    it('should ignore messages with unknown types', () => {
      const toolResult = vi.fn()
      const contextUpdate = vi.fn()
      const completion = vi.fn()
      bridge.onToolResult(toolResult)
      bridge.onContextUpdate(contextUpdate)
      bridge.onCompletion(completion)

      simulateMessage({ type: 'unknown_type', data: 'malicious' })

      expect(toolResult).not.toHaveBeenCalled()
      expect(contextUpdate).not.toHaveBeenCalled()
      expect(completion).not.toHaveBeenCalled()
    })

    it('should ignore messages that are not objects', () => {
      const callback = vi.fn()
      bridge.onToolResult(callback)

      simulateMessage('just a string')
      simulateMessage(42)
      simulateMessage(null)

      expect(callback).not.toHaveBeenCalled()
    })

    it('should ignore messages without a type field', () => {
      const callback = vi.fn()
      bridge.onToolResult(callback)

      simulateMessage({ id: 'call-1', result: {} })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('should stop receiving messages after destroy', () => {
      const callback = vi.fn()
      bridge.onToolResult(callback)
      bridge.destroy()

      simulateMessage({ type: 'tool_result', id: 'call-1', result: {} })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('rate limiting', () => {
    it('should drop messages when rate limit is exceeded', () => {
      const callback = vi.fn()
      bridge.onContextUpdate(callback)

      // Send 25 messages rapidly (limit is 20/sec)
      for (let i = 0; i < 25; i++) {
        simulateMessage({ type: 'context_update', data: { i } })
      }

      // First 20 should be received, rest dropped
      expect(callback).toHaveBeenCalledTimes(20)
    })
  })
})
