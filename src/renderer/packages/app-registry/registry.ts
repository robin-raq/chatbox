import type { AppManifest, AppToolDefinition } from './types'

export class AppRegistry {
  private apps = new Map<string, AppManifest>()

  registerApp(manifest: AppManifest): void {
    this.apps.set(manifest.id, manifest)
  }

  unregisterApp(appId: string): void {
    this.apps.delete(appId)
  }

  getApp(appId: string): AppManifest | undefined {
    return this.apps.get(appId)
  }

  getAllApps(): AppManifest[] {
    return Array.from(this.apps.values())
  }

  getToolsForApp(appId: string): AppToolDefinition[] {
    return this.apps.get(appId)?.tools ?? []
  }

  getAllToolNames(): string[] {
    const names: string[] = []
    for (const app of this.apps.values()) {
      for (const tool of app.tools) {
        names.push(`app__${app.id}__${tool.name}`)
      }
    }
    return names
  }
}

/** Singleton registry instance */
export const appRegistry = new AppRegistry()
