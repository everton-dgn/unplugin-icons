import alias from 'virtual:icons-raw/fixture/sample'
import aliasQuery from 'virtual:icons/fixture/sample?raw'
import raw from '~icons-raw/fixture/sample'
import query from '~icons/fixture/sample?raw'

const strings: string[] = [query, aliasQuery, raw, alias]
// @ts-expect-error Raw compiler declarations expose strings.
const invalid: number = query
// @ts-expect-error Both raw query aliases expose strings.
const invalidAlias: number = aliasQuery
void strings
void invalid
void invalidAlias
