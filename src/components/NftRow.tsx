import { Link } from '@tanstack/react-router'
import type { Nft } from '../api/types'
import NftCard from './NftCard'
export default function NftRow({ items }: { items: Nft[] }) {
  return (
    <div className="grid grid-cols-5 gap-4 max-[800px]:grid-cols-2">
      {items.map((n) => (
        <Link key={n.id} to="/produto/$id" params={{ id: n.id }} className="text-inherit no-underline">
          <NftCard {...n} />
        </Link>
      ))}
    </div>
  )
}
