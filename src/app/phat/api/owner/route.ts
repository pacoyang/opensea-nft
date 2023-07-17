import { NextResponse, type NextRequest } from 'next/server'
import { createPublicClient, http, getContract } from 'viem'
import { polygonMumbai } from 'viem/chains'
import fs from 'fs'
import path from 'path'

const client = createPublicClient({
  chain: polygonMumbai,
  transport: http(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenId = searchParams.get('tokenId')
  const NFT = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'artifacts/contracts/NFT.sol/NFT.json'), 'utf-8')
  )
  const owner = await client.readContract({
    address: process.env.EVM_CONTRACT_ID as `0x${string}`,
    abi: NFT.abi,
    functionName: 'ownerOf',
    args: [parseInt(tokenId!, 10)]
  })
  return NextResponse.json({
    owner
  })
}
