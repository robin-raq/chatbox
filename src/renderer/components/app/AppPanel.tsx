import { ActionIcon, Button, Flex, Loader, Text } from '@mantine/core'
import { IconAlertTriangle, IconRefresh, IconX } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { appRegistry } from '@/packages/app-registry/registry'
import { connectBridge, disconnectBridge } from '@/packages/app-registry/toolset'
import { useUIStore } from '@/stores/uiStore'

const LOAD_TIMEOUT_MS = 10000

interface AppIframeState {
  loaded: boolean
  error: boolean
  errorMessage: string
}

export default function AppPanel() {
  const showAppPanel = useUIStore((s) => s.showAppPanel)
  const activeAppId = useUIStore((s) => s.activeAppId)
  const openApps = useUIStore((s) => s.openApps)
  const switchApp = useUIStore((s) => s.switchApp)
  const closeSpecificApp = useUIStore((s) => s.closeSpecificApp)
  const [iframeStates, setIframeStates] = useState<Record<string, AppIframeState>>({})
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({})
  const loadTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [retryKeys, setRetryKeys] = useState<Record<string, number>>({})

  const openAppIds = Object.keys(openApps)

  const handleIframeLoad = useCallback((appId: string) => {
    if (loadTimers.current[appId]) {
      clearTimeout(loadTimers.current[appId])
      delete loadTimers.current[appId]
    }
    setIframeStates((prev) => ({ ...prev, [appId]: { loaded: true, error: false, errorMessage: '' } }))
    const iframe = iframeRefs.current[appId]
    if (iframe) {
      connectBridge(appId, iframe)
    }
  }, [])

  const handleIframeError = useCallback((appId: string) => {
    if (loadTimers.current[appId]) {
      clearTimeout(loadTimers.current[appId])
      delete loadTimers.current[appId]
    }
    setIframeStates((prev) => ({
      ...prev,
      [appId]: { loaded: false, error: true, errorMessage: `${openApps[appId]?.name || 'App'} failed to load` },
    }))
  }, [openApps])

  const handleRetry = useCallback((appId: string) => {
    setIframeStates((prev) => ({ ...prev, [appId]: { loaded: false, error: false, errorMessage: '' } }))
    setRetryKeys((prev) => ({ ...prev, [appId]: (prev[appId] || 0) + 1 }))
  }, [])

  // Set load timeouts for new apps
  useEffect(() => {
    for (const appId of openAppIds) {
      const state = iframeStates[appId]
      if (!state || (!state.loaded && !state.error)) {
        if (!loadTimers.current[appId]) {
          loadTimers.current[appId] = setTimeout(() => {
            setIframeStates((prev) => ({
              ...prev,
              [appId]: { loaded: false, error: true, errorMessage: `${openApps[appId]?.name || 'App'} took too long to load` },
            }))
          }, LOAD_TIMEOUT_MS)
        }
      }
    }
    return () => {
      for (const timer of Object.values(loadTimers.current)) {
        clearTimeout(timer)
      }
    }
  }, [openAppIds.join(','), iframeStates])

  // Disconnect bridges for closed apps
  useEffect(() => {
    const currentIds = new Set(openAppIds)
    for (const appId of Object.keys(iframeRefs.current)) {
      if (!currentIds.has(appId)) {
        disconnectBridge(appId)
        delete iframeRefs.current[appId]
      }
    }
  }, [openAppIds.join(',')])

  const sandboxAttrs = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'

  if (!showAppPanel || openAppIds.length === 0) return null

  return (
    <div className="flex flex-col border-l border-gray-200 bg-white" style={{ width: 420, minWidth: 320 }}>
      {/* Tab bar */}
      {openAppIds.length > 1 && (
        <Flex gap={0} className="border-b border-gray-200 bg-gray-50 overflow-x-auto" style={{ minHeight: 36 }}>
          {openAppIds.map((appId) => {
            const app = openApps[appId]
            const isActive = appId === activeAppId
            return (
              <Flex
                key={appId}
                align="center"
                gap={4}
                className={`px-3 py-1 cursor-pointer border-r border-gray-200 flex-shrink-0 ${isActive ? 'bg-white' : 'hover:bg-gray-100'}`}
                style={{ borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent' }}
                onClick={() => switchApp(appId)}
              >
                <Text size="xs" fw={isActive ? 600 : 400} c={isActive ? 'dark' : 'dimmed'} style={{ whiteSpace: 'nowrap' }}>
                  {app?.name || appId}
                </Text>
                <ActionIcon
                  variant="transparent"
                  size={16}
                  color="gray"
                  onClick={(e) => { e.stopPropagation(); closeSpecificApp(appId); }}
                >
                  <IconX size={10} />
                </ActionIcon>
              </Flex>
            )
          })}
        </Flex>
      )}

      {/* Single-app header (when only one app open) */}
      {openAppIds.length === 1 && (
        <Flex align="center" justify="space-between" className="px-3 py-2 border-b border-gray-200" style={{ minHeight: 48 }}>
          <Text size="sm" fw={600} c="dark">
            {openApps[openAppIds[0]]?.name || 'App'}
          </Text>
          <ActionIcon variant="subtle" size={28} color="gray" onClick={() => closeSpecificApp(openAppIds[0])}>
            <IconX size={16} />
          </ActionIcon>
        </Flex>
      )}

      {/* Iframe container — ALL open iframes stay mounted */}
      <div className="flex-1 relative overflow-hidden">
        {openAppIds.map((appId) => {
          const app = openApps[appId]
          const isActive = appId === activeAppId
          const state = iframeStates[appId] || { loaded: false, error: false, errorMessage: '' }
          const retryKey = retryKeys[appId] || 0

          return (
            <div
              key={appId}
              className="absolute inset-0"
              style={{ display: isActive ? 'block' : 'none' }}
            >
              {/* Loading state */}
              {!state.loaded && !state.error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                  <Loader size="sm" color="blue" />
                  <Text size="xs" c="dimmed" mt={8}>Loading {app?.name || 'app'}...</Text>
                </div>
              )}

              {/* Error state */}
              {state.error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 p-6">
                  <IconAlertTriangle size={40} color="#EF4444" style={{ marginBottom: 12 }} />
                  <Text size="sm" fw={600} c="dark" ta="center">{state.errorMessage || 'Something went wrong'}</Text>
                  <Text size="xs" c="dimmed" ta="center" mt={4} mb={12}>Check your connection and try again.</Text>
                  <Button size="xs" variant="light" color="blue" leftSection={<IconRefresh size={14} />} onClick={() => handleRetry(appId)}>
                    Retry
                  </Button>
                </div>
              )}

              <iframe
                key={`${appId}-${retryKey}`}
                ref={(el) => { iframeRefs.current[appId] = el }}
                src={app?.url}
                sandbox={sandboxAttrs}
                onLoad={() => handleIframeLoad(appId)}
                onError={() => handleIframeError(appId)}
                title={app?.name || 'App'}
                className="w-full h-full border-0"
                style={{ opacity: state.loaded ? 1 : 0 }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
