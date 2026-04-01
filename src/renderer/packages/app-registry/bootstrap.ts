/**
 * Registers all built-in ChatBridge apps.
 * Called once on app startup.
 */
import { appRegistry } from './registry'
import type { AppManifest } from './types'

const CHESS_MANIFEST: AppManifest = {
  id: 'chess',
  name: 'Chess',
  description: 'Play an interactive chess game against the user. A visual board appears in the side panel — never render the board as text. When the user makes a move on the board, you will receive a context update. You should then call get_board_state to see the position, then call make_move to play your move as the opponent. Play at a casual/intermediate level. Always describe moves in natural language.',
  icon: '♟',
  uiUrl: '/apps/chess/index.html',
  authTier: 'internal',
  tools: [
    {
      name: 'start_game',
      description: 'Start a new chess game. A visual board appears automatically in the side panel. Do not render the board as text — just tell the user the game has started and they can make moves by clicking pieces on the board.',
      inputSchema: {
        type: 'object',
        properties: {
          color: {
            type: 'string',
            enum: ['white', 'black'],
            description: 'The color the user plays as. Defaults to white.',
          },
        },
      },
    },
    {
      name: 'make_move',
      description: 'Make a chess move on the board.',
      inputSchema: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Source square (e.g., "e2")' },
          to: { type: 'string', description: 'Destination square (e.g., "e4")' },
        },
        required: ['from', 'to'],
      },
    },
    {
      name: 'get_board_state',
      description: 'Get the current chess board position, whose turn it is, and the move history.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_legal_moves',
      description: 'Get all legal moves available in the current position.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}

const GROKIPEDIA_MANIFEST: AppManifest = {
  id: 'grokipedia',
  name: 'Grokipedia',
  description: 'Search and display articles from Grokipedia, an AI encyclopedia. Use this when students want to research or learn about a topic. Articles display in the side panel — summarize key points in the chat.',
  icon: '📚',
  uiUrl: '/apps/grokipedia/index.html',
  authTier: 'external_public',
  tools: [
    {
      name: 'search_articles',
      description: 'Search Grokipedia for articles about a topic. Results display in the side panel.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query (e.g., "photosynthesis", "solar system")' },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_article',
      description: 'Fetch and display a full article by title. The article displays in the side panel with key facts and related topics.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The article title to fetch' },
        },
        required: ['title'],
      },
    },
    {
      name: 'explain_topic',
      description: 'Look up a topic and display an explanation with key facts. Use when a student asks to learn about something.',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'The topic to explain' },
        },
        required: ['topic'],
      },
    },
  ],
}

const DRAWING_MANIFEST: AppManifest = {
  id: 'drawing',
  name: 'Drawing Canvas',
  description: 'Open an interactive drawing canvas. ALWAYS use this tool immediately when the user mentions drawing, sketching, doodling, diagramming, or wants to create anything visual. Do not ask what they want to draw — just open the canvas and let them draw freely.',
  icon: '🎨',
  uiUrl: '/apps/drawing/index.html',
  authTier: 'internal',
  tools: [
    {
      name: 'get_canvas_state',
      description: 'Open the drawing canvas and get a description of what is on it. Call this when the user wants to draw or sketch anything.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'clear_canvas',
      description: 'Clear the drawing canvas completely.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'add_text',
      description: 'Add a text label to the canvas.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text to add' },
          x: { type: 'number', description: 'X position (optional, defaults to center)' },
          y: { type: 'number', description: 'Y position (optional, defaults to center)' },
          font_size: { type: 'number', description: 'Font size in pixels (optional, defaults to 24)' },
        },
        required: ['text'],
      },
    },
    {
      name: 'export_image',
      description: 'Export the current canvas as a PNG image.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}

const SPOTIFY_MANIFEST: AppManifest = {
  id: 'spotify',
  name: 'Spotify',
  description: 'Search for music, create playlists, and add tracks on Spotify. IMPORTANT: Before calling any Spotify tool, first tell the user they need to click the green "Connect Spotify" button in the side panel to authorize their account. If a tool returns "AUTHORIZATION REQUIRED", tell the user to click Connect Spotify and wait for them to confirm before retrying.',
  icon: '🎵',
  uiUrl: '/apps/spotify/index.html',
  authTier: 'external_authenticated',
  tools: [
    {
      name: 'search_tracks',
      description: 'Search for music tracks on Spotify. Opens the Spotify panel with results.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (e.g., "study music", "chill beats", "classical piano")' },
        },
        required: ['query'],
      },
    },
    {
      name: 'create_playlist',
      description: 'Create a new Spotify playlist.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the playlist' },
        },
        required: ['name'],
      },
    },
    {
      name: 'add_to_playlist',
      description: 'Add a track to the current playlist.',
      inputSchema: {
        type: 'object',
        properties: {
          track_name: { type: 'string', description: 'Name of the track to add' },
          artist: { type: 'string', description: 'Artist name' },
        },
        required: ['track_name'],
      },
    },
  ],
}

export function bootstrapAppRegistry(): void {
  appRegistry.registerApp(CHESS_MANIFEST)
  appRegistry.registerApp(GROKIPEDIA_MANIFEST)
  appRegistry.registerApp(DRAWING_MANIFEST)
  appRegistry.registerApp(SPOTIFY_MANIFEST)
  console.log('[ChatBridge] Registered apps:', appRegistry.getAllApps().map((a) => a.name).join(', '))
}
