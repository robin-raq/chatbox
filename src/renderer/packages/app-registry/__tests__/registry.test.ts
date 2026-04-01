import { beforeEach, describe, expect, it } from 'vitest'
import { AppRegistry } from '../registry'
import type { AppManifest } from '../types'

const chessManifest: AppManifest = {
  id: 'chess',
  name: 'Chess',
  description: 'Play chess with the chatbot',
  uiUrl: '/apps/chess/index.html',
  authTier: 'internal',
  tools: [
    {
      name: 'start_game',
      description: 'Start a new chess game',
      inputSchema: {
        type: 'object',
        properties: { color: { type: 'string', enum: ['white', 'black'] } },
      },
    },
    {
      name: 'make_move',
      description: 'Make a chess move',
      inputSchema: {
        type: 'object',
        properties: { from: { type: 'string' }, to: { type: 'string' } },
        required: ['from', 'to'],
      },
    },
    {
      name: 'get_board_state',
      description: 'Get the current board position',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}

const grokipediaManifest: AppManifest = {
  id: 'grokipedia',
  name: 'Grokipedia',
  description: 'Search an AI encyclopedia',
  uiUrl: '/apps/grokipedia/index.html',
  authTier: 'external_public',
  tools: [
    {
      name: 'search_articles',
      description: 'Search for articles by topic',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  ],
}

describe('AppRegistry', () => {
  let registry: AppRegistry

  beforeEach(() => {
    registry = new AppRegistry()
  })

  describe('registerApp', () => {
    it('should register an app and retrieve it by ID', () => {
      registry.registerApp(chessManifest)
      const app = registry.getApp('chess')
      expect(app).toEqual(chessManifest)
    })

    it('should register multiple apps', () => {
      registry.registerApp(chessManifest)
      registry.registerApp(grokipediaManifest)
      expect(registry.getAllApps()).toHaveLength(2)
    })

    it('should overwrite an existing app with the same ID', () => {
      registry.registerApp(chessManifest)
      const updated = { ...chessManifest, description: 'Updated chess' }
      registry.registerApp(updated)

      expect(registry.getApp('chess')?.description).toBe('Updated chess')
      expect(registry.getAllApps()).toHaveLength(1)
    })
  })

  describe('getApp', () => {
    it('should return undefined for unknown app IDs', () => {
      expect(registry.getApp('nonexistent')).toBeUndefined()
    })
  })

  describe('getAllApps', () => {
    it('should return empty array when no apps registered', () => {
      expect(registry.getAllApps()).toEqual([])
    })

    it('should return all registered apps', () => {
      registry.registerApp(chessManifest)
      registry.registerApp(grokipediaManifest)

      const apps = registry.getAllApps()
      expect(apps).toHaveLength(2)
      expect(apps.map((a) => a.id)).toContain('chess')
      expect(apps.map((a) => a.id)).toContain('grokipedia')
    })
  })

  describe('unregisterApp', () => {
    it('should remove a registered app', () => {
      registry.registerApp(chessManifest)
      registry.unregisterApp('chess')
      expect(registry.getApp('chess')).toBeUndefined()
      expect(registry.getAllApps()).toHaveLength(0)
    })

    it('should not throw when removing a nonexistent app', () => {
      expect(() => registry.unregisterApp('nonexistent')).not.toThrow()
    })
  })

  describe('getToolsForApp', () => {
    it('should return tool definitions for a specific app', () => {
      registry.registerApp(chessManifest)
      const tools = registry.getToolsForApp('chess')
      expect(tools).toHaveLength(3)
      expect(tools.map((t) => t.name)).toEqual(['start_game', 'make_move', 'get_board_state'])
    })

    it('should return empty array for unknown app', () => {
      expect(registry.getToolsForApp('nonexistent')).toEqual([])
    })
  })

  describe('getAllToolNames', () => {
    it('should return namespaced tool names for all apps', () => {
      registry.registerApp(chessManifest)
      registry.registerApp(grokipediaManifest)

      const names = registry.getAllToolNames()
      expect(names).toContain('app__chess__start_game')
      expect(names).toContain('app__chess__make_move')
      expect(names).toContain('app__chess__get_board_state')
      expect(names).toContain('app__grokipedia__search_articles')
      expect(names).toHaveLength(4)
    })
  })
})
