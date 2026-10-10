/// <reference types="deno" />
/// <reference types="bun-types/sqlite" />
/// <reference types="emscripten" />
import type { KVNamespace as CloudflareKVNamespace, R2Bucket as CloudflareR2Bucket } from '@cloudflare/workers-types/index.ts'

declare global {
  type KVNamespace<Key extends string = string> = CloudflareKVNamespace<Key>
  type R2Bucket = CloudflareR2Bucket
}
