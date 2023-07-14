import { WagmiProvider } from '../../components'
import { MintSection } from './_components'

export default function Mint() {
  return (
    <main
      className="min-h-screenw-full max-w-3xl mx-auto py-16 px-8"
    >
      <WagmiProvider>
        <MintSection />
      </WagmiProvider>
    </main>
  )
}
