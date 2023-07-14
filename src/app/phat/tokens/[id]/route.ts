import { NextResponse, type NextRequest } from 'next/server'
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import { options, OnChainRegistry, signCertificate, PinkContractPromise } from '@phala/sdk'
import fs from 'fs'
import path from 'path'

const RPC_TESTNET_URL = 'wss://poc5.phala.network/ws'
const CONTRACT_ID = '0x3489b4d5de3197c302fd8568c6b6c36123681393b20dfef491fcbb6d778262b8'

interface Attribute {
  traitType: string
  value: string
}

interface NftMetada {
  name: string
  description: string
  externalUrl: string
  image: string
  attributes: Attribute[]
}

function getAttributeValueByTraitType(traitType: string, data: NftMetada): string | undefined {
  const attribute = data.attributes.find((attr) => attr.traitType === traitType)
  return attribute ? attribute.value : undefined
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
  const cert = await signCertificate({ pair, api });
  const { result, output } = await contract.query.getNftMetadata(pair.address, { cert }, params.id)
  if (!result.isOk) {
    return NextResponse.json({ message: 'Server unreachable.' }, { status: 500 })
  }
  const data = output!.toJSON() as any
  if (data['ok']['err']) {
    return NextResponse.json(data['ok'], { status: 500 })
  }
  const metadata = data['ok']['ok']
  const lv = parseInt(getAttributeValueByTraitType('lv', metadata)!, 10)
  if (lv == 0) {
    metadata.image = `${request.nextUrl.protocol}//${request.nextUrl.host}/images/lv0.png`
  } else if (lv == 1) {
    metadata.image = `${request.nextUrl.protocol}//${request.nextUrl.host}/images/lv1.png`
  } else if (lv == 2) {
    metadata.image = `${request.nextUrl.protocol}//${request.nextUrl.host}/images/lv2.png`
  } else {
    metadata.image = `${request.nextUrl.protocol}//${request.nextUrl.host}/images/lv3.png`
  }
  return NextResponse.json({
    name: metadata.name,
    description: metadata.description,
    external_url: metadata.externalUrl,
    image: metadata.image,
    attributes: metadata.attributes.map((attribute: Attribute) => ({
      trait_type: attribute.traitType,
      value: attribute.value,
    }))
  })
}

