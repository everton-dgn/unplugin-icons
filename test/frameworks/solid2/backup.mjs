import { cpSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import process from 'node:process'

const RE_NON_DIGITS = /\D/g

export function backup(path) {
  if (!existsSync(path))
    return
  const stamp = new Date().toISOString().replaceAll(RE_NON_DIGITS, '').slice(0, 14)
  const root = process.env.UNPLUGIN_ICONS_BACKUP_DIR || join(tmpdir(), 'unplugin-icons-backups')
  const directory = join(root, `${stamp.slice(0, 8)}_${stamp.slice(8)}`)
  mkdirSync(directory, { recursive: true })
  const destination = mkdtempSync(join(directory, 'solid2-'))
  cpSync(path, join(destination, basename(path)), { recursive: true })
}
