import { mkdirSync } from 'node:fs'
import {
  chmod,
  chown,
  open,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Generator, getConfig } from '@tanstack/router-generator'
import { tanstackRouterConfig } from './tanstack-router-config.js'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const config = getConfig(tanstackRouterConfig, repoRoot)

const generatorFs = {
  stat: async (filePath) => {
    const result = await stat(filePath, { bigint: true })
    return {
      mtimeMs: result.mtimeMs,
      mode: Number(result.mode),
      uid: Number(result.uid),
      gid: Number(result.gid),
    }
  },
  rename: async (oldPath, newPath) => {
    try {
      await rename(oldPath, newPath)
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error.code === 'EPERM' || error.code === 'EEXIST')
      ) {
        await rm(newPath, { force: true })
        await rename(oldPath, newPath)
        return
      }

      throw error
    }
  },
  writeFile: (filePath, content) => writeFile(filePath, content),
  readFile: async (filePath) => {
    try {
      const fileHandle = await open(filePath, 'r')
      const fileStat = await fileHandle.stat({ bigint: true })
      const fileContent = (await fileHandle.readFile()).toString()
      await fileHandle.close()
      return {
        stat: fileStat,
        fileContent,
      }
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return 'file-not-existing'
      }

      throw error
    }
  },
  chmod: (filePath, mode) => chmod(filePath, mode),
  chown: (filePath, uid, gid) => chown(filePath, uid, gid),
}

mkdirSync(config.tmpDir, { recursive: true })

const generator = new Generator({
  config,
  fs: generatorFs,
  root: repoRoot,
})

await generator.run()
