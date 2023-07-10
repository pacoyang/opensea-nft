import { kv } from '@vercel/kv'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { metadata, tokenId } = await request.json()
  const result = await kv.set(`token:${tokenId}`, metadata)
  const res = await fetch(`https://testnets-api.opensea.io/v2/chain/mumbai/contract/0xAd66Aa37d3aC277c0Cb3f36308e541DF7F38ac95/nfts/${tokenId}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  console.info(res)
  return NextResponse.json({
    result,
  })
}

