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
  useSignMessage,
  useContractEvent,
} from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { atom, useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import { useIsMounted } from '../../components'
import NFT from '../../NFT.json'

const RPC_TESTNET_URL = 'wss://poc5.phala.network/ws'
const CONTRACT_ADDRESS = '0xF073E236595618f34195Ae524E18C99c1Fd9D19D'

const tokenAtom = atomWithStorage('token', 0)
const expAtom = atomWithStorage('exp', 0)
const lvAtom = atomWithStorage('lv', 0)

interface Attribute {
  trait_type: string
  value: string
}

interface NftMetada {
  name: string
  description: string
  external_url: string
  image: string
  attributes: Attribute[]
}

function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000)
  })
}

function getAttributeValueByTraitType(traitType: string, data: NftMetada): string | undefined {
  const attribute = data.attributes.find((attr) => attr.trait_type === traitType)
  return attribute ? attribute.value : undefined
}

const updateMetadata = async (token: number) => {
  await sleep(10)
  await fetch('/phat/api/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tokenId: token, contractId: CONTRACT_ADDRESS }),
  })
}

export function MintSection() {
  const [token, setToken] = useAtom(tokenAtom)
  const [exp, setExp] = useAtom(expAtom)
  const [lv, setLv] = useAtom(lvAtom)
  const isMounted = useIsMounted()
  const { connect, connectors, error: connectError, isLoading, pendingConnector } = useConnect()
  const { signMessageAsync } = useSignMessage()
  const { isConnected, address, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const {
    config,
    error: prepareError,
    isError: isPrepareError
  } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: NFT.abi,
    functionName: 'mintTo',
    args: [address],
    enabled: Boolean(address),
  })

  useContractEvent({
    address: CONTRACT_ADDRESS,
    abi: NFT.abi,
    eventName: 'NewOwner',
    listener(events: any[]) {
      console.info(events)
      if (events.length > 0) {
        setToken(Number(events[0].args.token_id))
      }
    },
  })

  useEffect(() => {
    if (token > 0) {
      (async () => {
        const res = await fetch(`/phat/tokens/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        const data = await res.json()
        if (data['err']) {
          setLv(0)
          setExp(0)
          return
        }
        const lv = getAttributeValueByTraitType('lv', data)
        const exp = getAttributeValueByTraitType('exp', data)
        if (lv) {
          setLv(parseInt(lv, 10))
        }
        if (exp) {
          setExp(parseInt(exp, 10))
        }
      })()
    }
  }, [token, setLv, setExp])

  const { data, write, error, isError } = useContractWrite(config)
  const { isLoading: isMintLoading, isSuccess: isMintSuccess } = useWaitForTransaction({
    hash: data?.hash,
  })
  const [claiming, setClaiming] = useState(false)
  const [ticking, setTicking] = useState(false)
  const [upping, setUpping] = useState(false)

  const handleUp = async () => {
    setUpping(true)
    const wsProvider = new WsProvider(RPC_TESTNET_URL)
    const api = await ApiPromise.create({ provider: wsProvider })
    const message = api.tx.system.remarkWithEvent('levelup').inner.toHex()
    try {
      const signature = await signMessageAsync({ message })
      if (!signature) {
        return
      }
      const res = await fetch('/phat/api/levelup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, signature, token }),
      })
      const data = await res.json()
      if (data['err']) {
        setUpping(false)
        alert(data['err'])
        return
      }
      await updateMetadata(token)
      setUpping(false)
      window.alert(`Successfully, current lv${data['ok']}!`)
      console.info(data)
      setLv(data['ok'])
      setExp(0)
      // update opensea metadata
    } catch(err) {
      console.error(err)
      window.alert('Fail to level-up')
      setUpping(false)
    }
  }

  const handleTick = async () => {
    setTicking(true)
    const wsProvider = new WsProvider(RPC_TESTNET_URL)
    const api = await ApiPromise.create({ provider: wsProvider })
    const message = api.tx.system.remarkWithEvent('tick').inner.toHex()
    try {
      const signature = await signMessageAsync({ message })
      if (!signature) {
        return
      }
      const res = await fetch('/phat/api/tick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, signature, token }),
      })
      const data = await res.json()
      if (data['err']) {
        setTicking(false)
        alert(data['err'])
        return
      }
      await updateMetadata(token)
      setTicking(false)
      console.info(data)
      window.alert('exp + 1')
      setExp(exp + 1)
    } catch(err) {
      console.error(err)
      window.alert('Fail to tick')
      setTicking(false)
    }
  }

  const handleClaimPhat = async () => {
    setClaiming(true)
    const wsProvider = new WsProvider(RPC_TESTNET_URL)
    const api = await ApiPromise.create({ provider: wsProvider })
    const message = api.tx.system.remarkWithEvent('claim').inner.toHex()
    try {
      const signature = await signMessageAsync({ message })
      if (!signature) {
        return
      }
      const res = await fetch('/phat/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, signature, token }),
      })
      const data = await res.json()
      if (data['err']) {
        setClaiming(false)
        alert(data['err'])
        return
      }
      await updateMetadata(token)
      setClaiming(false)
      console.info(data)
      window.alert('Successfully claimed your NFT on Phala!')
    } catch(err) {
      console.error(err)
      window.alert('Fail to claim')
      setClaiming(false)
    }
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
            {
              token == 0 && !isMintSuccess ? (
                <>
                  <label htmlFor="message">Click to mint</label>
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
                </>
              ) : token === 0 && isMintSuccess ? (
                <div className="text-center">
                  Successfully minted your NFT, please wait a moment until your transaction is confirmed!
                  <div>
                    <a target="_blank" className="underline text-blue-500" href={`https://mumbai.polygonscan.com/tx/${data?.hash}`}>Polygonscan</a>
                  </div>
                </div>
              ) : null
            }
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
      {
        token > 0 ? (
          <div className="mt-8 flex flex-col gap-6">
            <div className="text-center text-3xl">
                🎉 New <a target="_blank" className="underline text-blue-500" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${token}`}>token #{token}</a> minted
            </div>
            <div className="text-center font-bold">lv: {lv} exp: {exp}</div>
            <button
              className="rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
              onClick={handleClaimPhat}
              disabled={claiming || ticking || upping}
            >
              {claiming ? 'Claiming...' : 'Claim on Phala' }
            </button>
            <button
              className="rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
              onClick={handleTick}
              disabled={claiming || ticking || upping}
            >
              {ticking ? 'Ticking...' : 'Tick exp +1' }
            </button>
            <button
              className="rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
              onClick={handleUp}
              disabled={claiming || ticking || upping}
            >
              {upping ? 'Loading...' : 'Level-up'}
            </button>
          </div>
        ) : null
      }
    </section>
  )
}
