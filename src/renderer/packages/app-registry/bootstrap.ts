/**
 * Registers all built-in ChatBridge apps.
 * Called once on app startup.
 */
import { appRegistry } from './registry'
import type { AppManifest } from './types'

const CHESS_MANIFEST: AppManifest = {
  id: 'chess',
  name: 'Chess',
  description: 'Interactive chess game with a built-in Stockfish engine. The engine plays automatically — you do NOT make moves. IMPORTANT: When the user asks ANY question about the chess game (advice, analysis, what to do, position), you MUST call get_board_state first to see the CURRENT position. Never guess the position from memory.',
  icon: '♟',
  uiUrl: '/apps/chess/index.html',
  authTier: 'internal',
  ageRating: 'all-ages',
  learningOutcome: 'Strategic thinking, pattern recognition, problem solving. Students learn to plan ahead, evaluate positions, and understand cause-and-effect through gameplay.',
  dataCollected: [],
  reviewStatus: 'approved',
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
      description: 'Execute a chess move on the board. You MUST call this tool to make any move — never just describe a move in text. Use SAN notation like "e4", "Nf3", "O-O", "Bxe5".',
      inputSchema: {
        type: 'object',
        properties: {
          move: { type: 'string', description: 'Move in standard algebraic notation (e.g., "e4", "Nf3", "O-O", "Bxe5")' },
          from: { type: 'string', description: 'Source square (e.g., "e2") — alternative to move parameter' },
          to: { type: 'string', description: 'Destination square (e.g., "e4") — use with from parameter' },
        },
        required: ['move'],
      },
    },
    {
      name: 'get_board_state',
      description: 'Get the CURRENT chess position, moves played, and whose turn it is. ALWAYS call this when the user asks anything about the chess game — never rely on memory.',
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
  ageRating: 'all-ages',
  learningOutcome: 'Research skills, reading comprehension, critical thinking. Students learn to find information, evaluate sources, and ask follow-up questions to deepen understanding.',
  dataCollected: ['search queries'],
  reviewStatus: 'approved',
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
  name: 'Excalidraw Whiteboard',
  description: 'Open the Excalidraw whiteboard for drawing, diagramming, and visual thinking. ALWAYS use this when the user mentions drawing, sketching, diagramming, whiteboard, or wants to visualize anything. Do not ask what they want to draw — just open it.',
  icon: '🎨',
  uiUrl: '/apps/drawing/index.html',
  authTier: 'internal',
  ageRating: 'all-ages',
  learningOutcome: 'Visual learning, spatial reasoning, concept mapping. Students create diagrams, flowcharts, and sketches to organize and communicate ideas visually.',
  dataCollected: [],
  reviewStatus: 'approved',
  tools: [
    {
      name: 'open_whiteboard',
      description: 'Open the Excalidraw whiteboard. Call this whenever the user wants to draw, sketch, diagram, or visualize anything.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_canvas_state',
      description: 'Check if the whiteboard is active.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'clear_canvas',
      description: 'Clear the whiteboard and start fresh.',
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
  description: 'Spotify music app. ALWAYS use this when the user mentions Spotify, music, songs, playlists, or wants to listen to something. Call search_tracks immediately to open the Spotify panel. If a tool returns "AUTHORIZATION REQUIRED", tell the user to click Connect Spotify in the side panel.',
  icon: '🎵',
  uiUrl: '/apps/spotify/index.html',
  authTier: 'external_authenticated',
  ageRating: '13+',
  learningOutcome: 'Focus and productivity through curated study music. Demonstrates OAuth2 integration pattern for authenticated third-party services.',
  dataCollected: ['Spotify user ID', 'search queries', 'playlist data'],
  privacyPolicyUrl: 'https://www.spotify.com/legal/privacy-policy/',
  reviewStatus: 'approved',
  tools: [
    {
      name: 'search_tracks',
      description: 'Search for music on Spotify and open the Spotify panel. Call this whenever the user wants to open Spotify, find music, listen to songs, or anything music-related.',
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
