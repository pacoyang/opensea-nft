import { NextResponse, type NextRequest } from 'next/server'
import { hexToU8a } from '@polkadot/util'
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import { secp256k1Compress, encodeAddress, blake2AsU8a } from '@polkadot/util-crypto'
import { hashMessage, recoverPublicKey } from 'viem'
import { options, OnChainRegistry, signCertificate, PinkContractPromise } from '@phala/sdk'
import fs from 'fs'
import path from 'path'

const RPC_TESTNET_URL = 'wss://poc5.phala.network/ws'
const CONTRACT_ID = '0x3489b4d5de3197c302fd8568c6b6c36123681393b20dfef491fcbb6d778262b8'

const levelup = async (tokenId: number, address: string) => {
  const api = await ApiPromise.create(options({
    provider: new WsProvider(RPC_TESTNET_URL),
    noInitWarn: true,
  }))
  const phatRegistry = await OnChainRegistry.create(api)
  const keyring = new Keyring({ type: 'sr25519' })
  const pair = keyring.addFromUri(process.env.POLKADOT_PRIMARY_KEY!)
  const abi = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'phat_contracts/phala_nft_collection.json'), 'utf-8')
  )
  const contractKey = await phatRegistry.getContractKeyOrFail(CONTRACT_ID)
  const contract = new PinkContractPromise(api, phatRegistry, abi, CONTRACT_ID, contractKey)
  const cert = await signCertificate({ pair, api })
  const { gasRequired, storageDeposit, result, output } = await contract.query.levelup(pair.address, { cert }, Number(tokenId), address)
  const promise = new Promise(async (resolve, reject) => {
    await contract.tx.levelup({
      gasLimit: gasRequired,
      storageDepositLimit: storageDeposit.isCharge ? storageDeposit.asCharge : null,
    }, Number(tokenId), address).signAndSend(pair, { nonce: -1 }, ({ status, events }) => {
      console.info(status.toHuman())
      if ((status.toJSON() as any)['inBlock']) {
        resolve(output!.toJSON())
      }
    })
  })
  return promise
}

export async function POST(request: NextRequest) {
  const { message, signature, token } = await request.json()
  const hash = hashMessage(message)
  const recoveredPublicKey = await recoverPublicKey({ hash, signature })
  const compressedEvmPublicKey = secp256k1Compress(hexToU8a(recoveredPublicKey))
  const subAddressFromEvmPublicKey = encodeAddress(blake2AsU8a(compressedEvmPublicKey), 42)
  const result: any = await levelup(token, subAddressFromEvmPublicKey)
  return NextResponse.json(result['ok'])
}

