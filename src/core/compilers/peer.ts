import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { importModule, resolveModule } from 'local-pkg'

/** Resolve optional compiler peers next to this package, then in the user's project. */
export async function importPeerModule<T = any>(name: string): Promise<T> {
  // Bare imports in local-pkg resolve from its own location, which cannot see
  // our peers in isolated installs. File URLs also support Windows paths.
  const resolved = resolveModule(name, { paths: [import.meta.url, pathToFileURL(`${process.cwd()}/`).href] })
  return await importModule(resolved ? pathToFileURL(resolved).href : name)
}
