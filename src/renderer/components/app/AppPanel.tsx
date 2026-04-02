import { ActionIcon, Button, Flex, Loader, Text } from '@mantine/core'
import { IconAlertTriangle, IconRefresh, IconX } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { appRegistry } from '@/packages/app-registry/registry'
import { connectBridge, disconnectBridge } from '@/packages/app-registry/toolset'
import { useUIStore } from '@/stores/uiStore'

const LOAD_TIMEOUT_MS = 10000

type PanelState = 'loading' | 'ready' | 'error' | 'crashed'

export default function AppPanel() {
  const showAppPanel = useUIStore((s) => s.showAppPanel)
  const activeAppId = useUIStore((s) => s.activeAppId)
  const appPanelUrl = useUIStore((s) => s.appPanelUrl)
  const appPanelName = useUIStore((s) => s.appPanelName)
  const closeApp = useUIStore((s) => s.closeApp)
  const [panelState, setPanelState] = useState<PanelState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [iframeKey, setIframeKey] = useState(0)

  const handleIframeLoad = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }
    setPanelState('ready')
    if (iframeRef.current && activeAppId) {
      connectBridge(activeAppId, iframeRef.current)
    }
  }, [activeAppId])

  const handleIframeError = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }
    setPanelState('error')
    setErrorMessage(`${appPanelName || 'App'} failed to load`)
  }, [appPanelName])

  const handleRetry = useCallback(() => {
    setPanelState('loading')
    setErrorMessage('')
    setIframeKey((k) => k + 1)
  }, [])

  // Set load timeout when iframe starts loading
  useEffect(() => {
    if (panelState === 'loading' && showAppPanel && appPanelUrl) {
      loadTimeoutRef.current = setTimeout(() => {
        setPanelState('error')
        setErrorMessage(`${appPanelName || 'App'} took too long to load`)
      }, LOAD_TIMEOUT_MS)
    }
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
        loadTimeoutRef.current = null
      }
    }
  }, [panelState, showAppPanel, appPanelUrl, appPanelName])

  // Reset state when app changes
  useEffect(() => {
    setPanelState('loading')
    setErrorMessage('')
  }, [activeAppId, appPanelUrl])

  // Disconnect bridge when app is closed
  useEffect(() => {
    return () => {
      if (activeAppId) {
        disconnectBridge(activeAppId)
      }
    }
  }, [activeAppId])

  // All bundled apps get allow-same-origin because they need to load
  // external scripts (chess.js CDN, stockfish.js worker, Spotify SDK).
  const sandboxAttrs = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'

  if (!showAppPanel || !appPanelUrl) return null

  return (
    <div className="flex flex-col border-l border-gray-200 bg-white" style={{ width: 420, minWidth: 320 }}>
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        className="px-3 py-2 border-b border-gray-200"
        style={{ minHeight: 48 }}
      >
        <Text size="sm" fw={600} c="dark">
          {appPanelName || 'App'}
        </Text>
        <ActionIcon variant="subtle" size={28} color="gray" onClick={closeApp}>
          <IconX size={16} />
        </ActionIcon>
      </Flex>

      {/* Iframe container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading state */}
        {panelState === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
            <Loader size="sm" color="blue" />
            <Text size="xs" c="dimmed" mt={8}>
              Loading {appPanelName || 'app'}...
            </Text>
          </div>
        )}

        {/* Error state */}
        {(panelState === 'error' || panelState === 'crashed') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 p-6">
            <IconAlertTriangle size={40} color="#EF4444" style={{ marginBottom: 12 }} />
            <Text size="sm" fw={600} c="dark" ta="center">
              {errorMessage || 'Something went wrong'}
            </Text>
            <Text size="xs" c="dimmed" ta="center" mt={4} mb={12}>
              {panelState === 'crashed'
                ? 'The app stopped responding. Click retry to reload it.'
                : 'Check your connection and try again.'}
            </Text>
            <Button
              size="xs"
              variant="light"
              color="blue"
              leftSection={<IconRefresh size={14} />}
              onClick={handleRetry}
            >
              Retry
            </Button>
          </div>
        )}

        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={appPanelUrl}
          sandbox={sandboxAttrs}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={appPanelName || 'App'}
          className="w-full h-full border-0"
          style={{ opacity: panelState === 'ready' ? 1 : 0 }}
        />
      </div>
    </div>
  )
}
