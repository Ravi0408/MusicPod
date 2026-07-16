import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs-extra'
import crypto from 'crypto'

export interface ConnectedDevice {
  name: string
  path: string
  type: 'iPod' | 'USB Drive' | 'Virtual iPod'
  totalSpace: number
  freeSpace: number
}

export class DeviceService {
  private static simulatedDevicePath: string | null = null

  static setSimulatedPath(dirPath: string | null) {
    this.simulatedDevicePath = dirPath
  }

  static async getConnectedDevices(): Promise<ConnectedDevice[]> {
    const devices: ConnectedDevice[] = []

    if (this.simulatedDevicePath) {
      if (await fs.pathExists(this.simulatedDevicePath)) {
        const isIPod = await fs.pathExists(path.join(this.simulatedDevicePath, 'iPod_Control'))
        devices.push({
          name: 'Virtual Sim iPod',
          path: this.simulatedDevicePath,
          type: isIPod ? 'Virtual iPod' : 'USB Drive',
          totalSpace: 4000 * 1024 * 1024,
          freeSpace: 3200 * 1024 * 1024
        })
      }
    }

    if (process.platform === 'darwin') {
      try {
        const volumes = await fs.readdir('/Volumes')
        for (const vol of volumes) {
          if (vol === 'Macintosh HD' || vol.startsWith('.')) continue
          const fullPath = path.join('/Volumes', vol)
          
          try {
            const stats = await fs.stat(fullPath)
            if (stats.isDirectory()) {
              const isIPod = await fs.pathExists(path.join(fullPath, 'iPod_Control'))
              devices.push({
                name: vol,
                path: fullPath,
                type: isIPod ? 'iPod' : 'USB Drive',
                totalSpace: 16000 * 1024 * 1024,
                freeSpace: 12000 * 1024 * 1024
              })
            }
          } catch (e) {
            // Ignore mount read errors
          }
        }
      } catch (err) {
        console.error('Failed to read Volumes:', err)
      }
    }

    return devices
  }

  static async syncDevice(
    devicePath: string,
    songsList: any[],
    mainWindow: BrowserWindow
  ): Promise<void> {
    const isIPod = await fs.pathExists(path.join(devicePath, 'iPod_Control'))
    const total = songsList.length
    let synced = 0

    mainWindow.webContents.send('sync-progress', { synced, total, status: 'syncing' })

    for (const song of songsList) {
      try {
        if (!await fs.pathExists(song.filePath)) continue

        const ext = path.extname(song.filePath).toLowerCase()
        let destFilePath: string

        if (isIPod) {
          const randomDirNum = Math.floor(Math.random() * 50)
          const fFolder = `F${randomDirNum < 10 ? '0' : ''}${randomDirNum}`
          const ipodMusicDir = path.join(devicePath, 'iPod_Control', 'Music', fFolder)
          await fs.ensureDir(ipodMusicDir)

          const randomName = crypto.randomBytes(2).toString('hex').toUpperCase()
          destFilePath = path.join(ipodMusicDir, `${randomName}${ext}`)
        } else {
          const artist = (song.artist || 'Unknown Artist').replace(/[^\w\s-]/g, '')
          const album = (song.album || 'Unknown Album').replace(/[^\w\s-]/g, '')
          const title = (song.title || 'Unknown').replace(/[^\w\s-]/g, '')
          const usbMusicDir = path.join(devicePath, 'Music', artist, album)
          await fs.ensureDir(usbMusicDir)
          destFilePath = path.join(usbMusicDir, `${title}${ext}`)
        }

        await fs.copy(song.filePath, destFilePath, { overwrite: true })
      } catch (err) {
        console.error('Failed to sync song', song.filePath, err)
      }

      synced++
      mainWindow.webContents.send('sync-progress', {
        synced,
        total,
        currentSong: song.title,
        status: synced === total ? 'done' : 'syncing'
      })
    }

    mainWindow.webContents.send('sync-progress', { synced, total, status: 'done' })
  }

  static async backupDevice(devicePath: string): Promise<string> {
    const backupDir = path.join(app.getPath('userData'), 'backups', `backup_${Date.now()}`)
    await fs.ensureDir(backupDir)

    const isIPod = await fs.pathExists(path.join(devicePath, 'iPod_Control'))
    const sourceDir = isIPod ? path.join(devicePath, 'iPod_Control', 'Music') : path.join(devicePath, 'Music')

    if (await fs.pathExists(sourceDir)) {
      await fs.copy(sourceDir, backupDir)
    } else {
      throw new Error('No music files found on device to backup')
    }

    return backupDir
  }

  static async restoreDevice(devicePath: string, backupPath: string): Promise<void> {
    if (!await fs.pathExists(backupPath)) {
      throw new Error('Backup path does not exist')
    }

    const isIPod = await fs.pathExists(path.join(devicePath, 'iPod_Control'))
    const destDir = isIPod ? path.join(devicePath, 'iPod_Control', 'Music') : path.join(devicePath, 'Music')

    await fs.ensureDir(destDir)
    await fs.copy(backupPath, destDir, { overwrite: true })
  }

  static async enableVirtualDevice(dirName: string): Promise<string> {
    const virtualPath = path.join(app.getPath('userData'), 'virtual_devices', dirName)
    await fs.ensureDir(virtualPath)
    
    await fs.ensureDir(path.join(virtualPath, 'iPod_Control', 'Music'))
    await fs.ensureDir(path.join(virtualPath, 'iPod_Control', 'Device'))
    
    this.setSimulatedPath(virtualPath)
    return virtualPath
  }
}
