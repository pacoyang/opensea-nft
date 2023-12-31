import { NextResponse, type NextRequest } from 'next/server'
import { hexToU8a } from '@polkadot/util'
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import { secp256k1Compress, encodeAddress, blake2AsU8a } from '@polkadot/util-crypto'
import { hashMessage, recoverPublicKey } from 'viem'
import { options, OnChainRegistry, signCertificate, PinkContractPromise } from '@phala/sdk'
import fs from 'fs'
import path from 'path'

const RPC_TESTNET_URL = 'wss://poc5.phala.network/ws'

const tick = async (tokenId: number, address: string) => {
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
  const contractKey = await phatRegistry.getContractKeyOrFail(process.env.PHAT_CONTRACT_ID!)
  const contract = new PinkContractPromise(api, phatRegistry, abi, process.env.PHAT_CONTRACT_ID!, contractKey)
  const cert = await signCertificate({ pair, api })
  const { gasRequired, storageDeposit, result, output } = await contract.query.tick(pair.address, { cert }, Number(tokenId), address)
  const promise = new Promise(async (resolve, reject) => {
    await contract.tx.tick({
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
  const result: any = await tick(token, subAddressFromEvmPublicKey)
  return NextResponse.json(result['ok'])
}

