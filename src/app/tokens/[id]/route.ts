import { kv } from '@vercel/kv'
import { NextResponse, type NextRequest } from 'next/server'

const metadata: {[key: string]: any} = {
  '1': {
    'description': 'Friendly OpenSea Creature that enjoys long swims in the ocean.',
    'external_url': 'https://example.com/?token_id=1',
    'image': 'https://bafybeihslhol5draa26unhhe7j2crwedr4tyfrvmba5qt3kyxbvb5olk4i.ipfs.dweb.link/images/1.png',
    'name': 'Sprinkles Fisherton'
  },
  '2': {
    'description': 'Friendly OpenSea Creature that enjoys long swims in the ocean.',
    'external_url': 'https://example.com/?token_id=2',
    'image': 'https://bafybeihslhol5draa26unhhe7j2crwedr4tyfrvmba5qt3kyxbvb5olk4i.ipfs.dweb.link/images/2.png',
    'name': 'Boris McCoy'
  },
  '3': {
    'description': 'Friendly OpenSea Creature that enjoys long swims in the ocean.',
    'external_url': 'https://example.com/?token_id=3',
    'image': 'https://bafybeihslhol5draa26unhhe7j2crwedr4tyfrvmba5qt3kyxbvb5olk4i.ipfs.dweb.link/images/3.png',
    'name': 'Dave Starbelly'
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token_data = await kv.get(`token:${params.id}`);
  if (token_data) {
    return NextResponse.json(token_data)
  }
  return NextResponse.json(metadata[params.id])
}

