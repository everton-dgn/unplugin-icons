/* eslint-disable antfu/no-import-dist, antfu/no-import-node-modules-by-path -- Verify the exact internal declarations repaired by the upstream patch. */
import type { ContextProvider } from '../node_modules/astro/dist/core/fetch/fetch-state.js'
import type { AstroAdapterClientConfig } from '../node_modules/astro/dist/types/public/integrations.js'
import { z } from 'astro:schema'

const valid: string = z.string().parse('text')
const good: ContextProvider<string> = { create: () => valid, finalize: (value) => {
  value.toUpperCase()
} }
const headers: AstroAdapterClientConfig = { internalFetchHeaders: () => ({ test: 'ok' }), assetQueryParams: new URLSearchParams() }
// @ts-expect-error Context factory must return a string.
const badContext: ContextProvider<string> = { create: () => 42 }
// @ts-expect-error Header values must be strings.
const badHeaders: AstroAdapterClientConfig = { internalFetchHeaders: { test: 42 } }
// @ts-expect-error Zod string output cannot be assigned to number.
const badSchema: number = z.string().parse('text')
void [good, headers, badContext, badHeaders, badSchema]
