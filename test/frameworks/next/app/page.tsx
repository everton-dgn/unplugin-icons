import aliasRaw from 'virtual:icons-raw/fixture/sample'
import raw from '~icons-raw/fixture/sample'
import { ClientIcons } from './client-icons'

export default function Page() {
  return (
    <main>
      <h1>Next icon compatibility</h1>
      <ClientIcons />
      <output data-testid="server-raw">{raw}</output>
      <output data-testid="server-raw-alias">{aliasRaw}</output>
    </main>
  )
}
