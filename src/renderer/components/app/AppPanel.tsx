import { ActionIcon, Flex, Loader, Text } from '@mantine/core'
import { IconX } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { appRegistry } from '@/packages/app-registry/registry'
import { connectBridge, disconnectBridge } from '@/packages/app-registry/toolset'
import { useUIStore } from '@/stores/uiStore'

export default function AppPanel() {
  const showAppPanel = useUIStore((s) => s.showAppPanel)
  const activeAppId = useUIStore((s) => s.activeAppId)
  const appPanelUrl = useUIStore((s) => s.appPanelUrl)
  const appPanelName = useUIStore((s) => s.appPanelName)
  const closeApp = useUIStore((s) => s.closeApp)
  const [loading, setLoading] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleIframeLoad = useCallback(() => {
    setLoading(false)
    // Connect the postMessage bridge when iframe loads
    if (iframeRef.current && activeAppId) {
      connectBridge(activeAppId, iframeRef.current)
    }
  }, [activeAppId])

  // Disconnect bridge when app is closed
  useEffect(() => {
    return () => {
      if (activeAppId) {
        disconnectBridge(activeAppId)
      }
    }
  }, [activeAppId])

  // Determine sandbox level based on app's auth tier
  const activeApp = activeAppId ? appRegistry.getApp(activeAppId) : null
  const needsExternalAccess = activeApp?.authTier === 'external_authenticated'
  // Internal apps: strict sandbox (scripts only)
  // External authenticated apps: relaxed sandbox (needs SDK loading, popups for OAuth)
  const sandboxAttrs = needsExternalAccess
    ? 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'
    : 'allow-scripts allow-popups allow-popups-to-escape-sandbox'

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
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <Loader size="sm" color="blue" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={appPanelUrl}
          sandbox={sandboxAttrs}
          onLoad={handleIframeLoad}
          title={appPanelName || 'App'}
          className="w-full h-full border-0"
        />
      </div>
    </div>
  )
}
