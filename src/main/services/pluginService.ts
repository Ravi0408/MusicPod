import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  type: 'downloader' | 'lyrics'
}

export class PluginService {
  static async getInstalledPlugins(): Promise<PluginManifest[]> {
    const pluginsDir = path.join(app.getPath('userData'), 'plugins')
    await fs.ensureDir(pluginsDir)

    const list = await fs.readdir(pluginsDir)
    const manifests: PluginManifest[] = []

    for (const folderName of list) {
      const manifestPath = path.join(pluginsDir, folderName, 'plugin.json')
      try {
        if (await fs.pathExists(manifestPath)) {
          const manifest = await fs.readJson(manifestPath) as PluginManifest
          manifests.push(manifest)
        }
      } catch (err) {
        console.error('Failed to read plugin manifest:', manifestPath, err)
      }
    }

    return manifests
  }

  static async installPlugin(manifest: PluginManifest): Promise<void> {
    const pluginsDir = path.join(app.getPath('userData'), 'plugins')
    const pluginFolder = path.join(pluginsDir, manifest.id)
    await fs.ensureDir(pluginFolder)

    await fs.writeJson(path.join(pluginFolder, 'plugin.json'), manifest, { spaces: 2 })
    await fs.writeFile(path.join(pluginFolder, 'index.js'), `// Plugin ${manifest.name} entry point\n`)
  }
}
