'use client'
import { useState, useEffect } from 'react'
import {
  WagmiConfig,
  createConfig,
  configureChains,
  useConnect,
  useAccount,
  useDisconnect,
  useNetwork,
  usePrepareContractWrite,
  useContractWrite,
  useWaitForTransaction,
} from 'wagmi'
import { polygonMumbai } from '@wagmi/core/chains'
import { publicProvider } from 'wagmi/providers/public'
import { InjectedConnector } from 'wagmi/connectors/injected'

import NFT from './NFT.json'

export function Form() {
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (event: any) => {
    event.preventDefault()
    const formData = new FormData(event.target)
    const tokenId = formData.get('tokenId') as string
    if (!tokenId) {
      window.alert('Please enter token id')
      return
    }
    let metadata = formData.get('metadata') as string
    metadata = metadata.replace(/'/g, '"')
    try {
      metadata = JSON.parse(metadata)
    } catch (err: any) {
      window.alert('Metadata must be JSON data, please check!')
      console.info(err)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenId, metadata }),
      })
      const data = await res.json()
      setLoading(false)
      if (data.result === 'OK') {
        window.alert('Updated!!')
      }
    } catch (err: any) {
      window.alert(`Fail to update: ${err}`)
      setLoading(false)
    }
  }
  return (
   <form
     className="flex flex-col gap-3 w-full"
     onSubmit={handleSubmit}
   >
     <label htmlFor="message">Enter Token Id</label>
     <input
       id="tokenId"
       name="tokenId"
       className="placeholder:italic placeholder:text-slate-400 block bg-white w-full border border-slate-300 rounded-md py-2 px-4 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-blue-500 focus:ring-1 sm:text-sm"
       placeholder="Enter token id..."
     />
     <label htmlFor="message">Enter Token Metadata</label>
     <textarea
       id="metadata"
       name="metadata"
       className="placeholder:italic placeholder:text-slate-400 block bg-white w-full border border-slate-300 rounded-md py-2 px-4 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-blue-500 focus:ring-1 sm:text-sm"
       placeholder="Enter token metadata..."
       rows={20}
     />
     <button
       className="flex items-center justify-center px-4 py-3 font-semibold text-sm bg-blue-500 hover:bg-blue-600 text-white rounded shadow-sm disabled:opacity-50"
       disabled={loading}
     >
       {
         loading ? (
           <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
         ) : null
       }
       {loading ? 'Loading...' : 'Submit'}
     </button>
   </form>
  )
}

const { chains, publicClient } = configureChains(
  [polygonMumbai],
  [publicProvider()],
)

const config = createConfig({
  autoConnect: true,
  connectors: [
    new InjectedConnector({ chains }),
  ],
  publicClient,
})

const useIsMounted = () => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

export const WagmiProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiConfig config={config}>
      {children}
    </WagmiConfig>
  )
}

export function MintSection() {
  // @see: https://github.com/wagmi-dev/wagmi/issues/28
  const isMounted = useIsMounted()
  const [recipient, setRecipient] = useState('')
  const { connect, connectors, error: connectError, isLoading, pendingConnector } = useConnect()
  const { isConnected, address, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const {
    config,
    error: prepareError,
    isError: isPrepareError
  } = usePrepareContractWrite({
    address: '0xad66aa37d3ac277c0cb3f36308e541df7f38ac95',
    abi: NFT.abi,
    functionName: 'mintTo',
    args: [recipient],
    enabled: Boolean(recipient),
  })
  const { data, write, error, isError } = useContractWrite(config)
  const { isLoading: isMintLoading, isSuccess: isMintSuccess } = useWaitForTransaction({
    hash: data?.hash,
  })
  const handleMint = () => {
    console.info(recipient)
  }

  return (
    <section className="flex flex-col gap-6">
      {
        isMounted && isConnected && connector ? (
          <>
            <div className="break-all">{address}</div>
            <div>Connected to {connector!.name}</div>
            <button
              className="rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              onClick={() => disconnect()}
            >
              Disconnect
            </button>
            <label htmlFor="message">Enter Recipient address</label>
            <input
              className="placeholder:italic placeholder:text-slate-400 block bg-white w-full border border-slate-300 rounded-md py-2 px-4 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-blue-500 focus:ring-1 sm:text-sm"
              placeholder="Enter recipient address..."
              onChange={(e: any) => setRecipient(e.target.value)}
              value={recipient}
            />
            <button
              className="flex items-center justify-center px-4 py-3 font-semibold text-sm bg-blue-500 hover:bg-blue-600 text-white rounded shadow-sm disabled:opacity-50"
              onClick={write}
              disabled={!write || isMintLoading}
            >
              {isMintLoading ? 'Minting...' : 'Mint'}
            </button>
            {(isPrepareError || isError) && (
              <div>Error: {(prepareError || error)?.message}</div>
            )}
            {isMintSuccess && (
              <div>
                Successfully minted your NFT!
                <div>
                  <a target="_blank" className="underline text-blue-500" href={`https://mumbai.polygonscan.com/tx/${data?.hash}`}>Polygonscan</a>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {connectors.map((connector) => (
              <button
                className="rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                disabled={isMounted ? !connector.ready : true}
                key={connector.id}
                onClick={() => connect({ connector })}
              >
                {isMounted ? connector.name : connector.id === 'injected' ? connector.id : connector.name}
                {isMounted && !connector.ready && ' (unsupported)'}
                {isLoading &&
                  connector.id === pendingConnector?.id &&
                  ' (connecting)'}
              </button>
            ))}
            {connectError && <div>{connectError.message}</div>}
          </>
        )
      }
    </section>
  )
}
