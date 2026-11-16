import type { NftRecord } from './fixtures'
import type { Nft, NftDetail } from '../api/types'

export const toNft = ({ editions, createdAt: _c, popularity: _p, ...nft }: NftRecord): Nft => ({
  ...nft,
  available: editions.some((e) => e.stock > 0),
})

export function detailOf(rec: NftRecord, favorited: boolean): NftDetail {
  const short = rec.id.replace(/^0+/, '')
  return {
    ...toNft(rec),
    gallery: Array.from({ length: 4 }, () => ({ src: rec.image, alt: rec.alt })),
    editions: rec.editions,
    rating: 4.8,
    reviews: 19,
    about: `Um colecionável digital finalizado à mão da coleção ${rec.collection}, verificado na ${rec.network}, com arte desbloqueável e acesso para colecionadores.`,
    description: [
      `${rec.name} é uma obra digital finalizada à mão da coleção ${rec.collection}. Cada atributo fica armazenado nos metadados do token e verificado na ${rec.network}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. O criador recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
    ],
    networkInfo: `Cunhado na ${rec.network} com procedência imutável e metadados armazenados no IPFS.`,
    contract: 'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    copyright: `0x7A${short}...19E8 • Contrato inteligente ERC-721 verificado.`,
    favorited,
  }
}

export function relatedTo(all: NftRecord[], id: string, limit = 5): Nft[] {
  const current = all.find((n) => n.id === id)
  return all
    .filter((n) => n.id !== id)
    .sort((a, b) => Number(b.collection === current?.collection) - Number(a.collection === current?.collection))
    .slice(0, limit)
    .map(toNft)
}
