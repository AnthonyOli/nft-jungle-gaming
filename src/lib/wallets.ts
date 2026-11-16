export const NETWORKS = ['Ethereum', 'Polygon', 'Solana']
export const WALLET_TYPES = ['MetaMask', 'Coinbase Wallet', 'WalletConnect']
export const ADDRESS = /^0x[0-9a-fA-F]{8,}$/
export const shortAddress = (a: string) => (a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-4)}` : a)
