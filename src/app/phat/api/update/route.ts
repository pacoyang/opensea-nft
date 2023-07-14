import { kv } from '@vercel/kv'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { tokenId, contractId } = await request.json()
  console.info(tokenId, contractId)
  const res = await fetch(`https://testnets-api.opensea.io/v2/chain/mumbai/contract/${contractId}/nfts/${tokenId}/refresh`, {
    method: 'POST',
  })
  const responseText = await res.text()
  return NextResponse.json({
    'message': responseText,
  })
}

