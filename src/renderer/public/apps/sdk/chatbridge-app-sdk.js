/**
 * ChatBridge App SDK
 *
 * Lightweight SDK for third-party apps running inside ChatBridge.
 * Include via <script src="/apps/sdk/chatbridge-app-sdk.js"></script>
 *
 * Usage:
 *   ChatBridge.onToolCall('start_game', (params) => {
 *     // handle the tool call
 *     return { board: '...', fen: '...' }
 *   })
 *
 *   ChatBridge.sendContextUpdate({ board_state: '...', last_move: 'e2e4' })
 *   ChatBridge.sendCompletion({ winner: 'white', moves: 42 })
 */
;(function () {
  'use strict'

  var toolHandlers = {}
  var pendingCallId = null

  /** Register a handler for a specific tool call. */
  function onToolCall(toolName, handler) {
    toolHandlers[toolName] = handler
  }

  /** Send a tool result back to the platform. */
  function sendResult(id, result) {
    window.parent.postMessage(
      { type: 'tool_result', id: id, result: result },
      '*'
    )
  }

  /** Send a tool error back to the platform. */
  function sendError(id, code, message) {
    window.parent.postMessage(
      { type: 'tool_result', id: id, error: { code: code, message: message } },
      '*'
    )
  }

  /** Send a context update (app is still running, sharing state). */
  function sendContextUpdate(data) {
    window.parent.postMessage(
      { type: 'context_update', data: data },
      '*'
    )
  }

  /** Signal that the app is done. Platform can remove the iframe. */
  function sendCompletion(result) {
    window.parent.postMessage(
      { type: 'completion', result: result || null },
      '*'
    )
  }

  /** Listen for messages from the platform. */
  window.addEventListener('message', function (event) {
    var data = event.data
    if (!data || typeof data !== 'object' || !data.type) return

    if (data.type === 'tool_call') {
      var handler = toolHandlers[data.name]
      if (!handler) {
        sendError(data.id, 'unknown_tool', 'No handler registered for tool: ' + data.name)
        return
      }

      pendingCallId = data.id

      try {
        var result = handler(data.params || {})

        // Support async handlers (Promises)
        if (result && typeof result.then === 'function') {
          result
            .then(function (res) {
              sendResult(data.id, res)
            })
            .catch(function (err) {
              sendError(data.id, 'handler_error', err.message || String(err))
            })
        } else {
          sendResult(data.id, result)
        }
      } catch (err) {
        sendError(data.id, 'handler_error', err.message || String(err))
      }
    }
  })

  // Expose the public API
  window.ChatBridge = {
    onToolCall: onToolCall,
    sendResult: sendResult,
    sendError: sendError,
    sendContextUpdate: sendContextUpdate,
    sendCompletion: sendCompletion,
  }
})()
