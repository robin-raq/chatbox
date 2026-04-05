/**
 * ChatBridge Plugin Contract
 *
 * These types define the entire communication protocol between the platform
 * and third-party apps. Both sides must conform to these types.
 *
 * Message flow:
 *   Platform → App:  tool_call, error
 *   App → Platform:  tool_result, context_update, completion
 */

// ─── postMessage Protocol ────────────────────────────────────────────────────

export type BridgeMessageType =
  | 'tool_call'
  | 'tool_result'
  | 'context_update'
  | 'completion'
  | 'error'

/** Platform sends this to tell an app to execute a tool. */
export interface ToolCallMessage {
  type: 'tool_call'
  id: string
  name: string
  params: Record<string, unknown>
}

/** App sends this after executing a tool (success or failure). */
export interface ToolResultMessage {
  type: 'tool_result'
  id: string
  result?: unknown
  error?: {
    code: string
    message: string
  }
}

/** App sends this to share state without ending the interaction. */
export interface ContextUpdateMessage {
  type: 'context_update'
  data: Record<string, unknown>
}

/** App sends this to signal it's done. Platform can remove the iframe. */
export interface CompletionMessage {
  type: 'completion'
  result?: unknown
}

/** Platform sends this to notify the app of an error. */
export interface ErrorMessage {
  type: 'error'
  code: string
  message: string
}

export type BridgeMessage =
  | ToolCallMessage
  | ToolResultMessage
  | ContextUpdateMessage
  | CompletionMessage
  | ErrorMessage

// ─── App Manifest ────────────────────────────────────────────────────────────

/** A single tool that an app exposes to the chatbot. */
export interface AppToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown> // JSON Schema object
}

/** Auth tier determines how credentials are managed. */
export type AuthTier = 'internal' | 'external_public' | 'external_authenticated'

/** Age rating for child-safety compliance */
export type AgeRating = 'all-ages' | '6+' | '10+' | '13+' | '18+'

/** Review status for app registration */
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

/**
 * The manifest a developer submits to register their app.
 * This is the contract between the app developer and the platform.
 */
export interface AppManifest {
  id: string
  name: string
  description: string
  icon?: string
  uiUrl: string
  authTier: AuthTier
  tools: AppToolDefinition[]

  // Child-safety & compliance fields (optional for MVP, required for production)
  ageRating?: AgeRating
  learningOutcome?: string
  dataCollected?: string[]
  privacyPolicyUrl?: string
  reviewStatus?: ReviewStatus
}

