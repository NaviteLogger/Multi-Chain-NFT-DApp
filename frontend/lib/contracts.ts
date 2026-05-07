import {sepolia, baseSepolia, polygonAmoy} from "wagmi/chains";

/**
 * MultiChainNFT ABI — only the functions the dApp calls.
 * Hand-curated to keep the bundle small.
 */
export const multiChainNftAbi = [
    {
        type: "function",
        name: "mintWithSignature",
        stateMutability: "nonpayable",
        inputs: [
            {name: "to", type: "address"},
            {name: "uri", type: "string"},
            {name: "signature", type: "bytes"},
        ],
        outputs: [{name: "tokenId", type: "uint256"}],
    },
    {
        type: "function",
        name: "ownerMint",
        stateMutability: "nonpayable",
        inputs: [
            {name: "to", type: "address"},
            {name: "uri", type: "string"},
        ],
        outputs: [{name: "tokenId", type: "uint256"}],
    },
    {
        type: "function",
        name: "balanceOf",
        stateMutability: "view",
        inputs: [{name: "owner", type: "address"}],
        outputs: [{name: "balance", type: "uint256"}],
    },
    {
        type: "function",
        name: "tokenURI",
        stateMutability: "view",
        inputs: [{name: "tokenId", type: "uint256"}],
        outputs: [{name: "uri", type: "string"}],
    },
    {
        type: "function",
        name: "nextTokenId",
        stateMutability: "view",
        inputs: [],
        outputs: [{name: "", type: "uint256"}],
    },
    {
        type: "event",
        name: "Minted",
        inputs: [
            {indexed: true, name: "to", type: "address"},
            {indexed: true, name: "tokenId", type: "uint256"},
            {indexed: false, name: "uri", type: "string"},
        ],
    },
] as const;

export type SupportedChainId = typeof sepolia.id | typeof baseSepolia.id | typeof polygonAmoy.id;

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export const nftAddressByChain: Record<SupportedChainId, `0x${string}`> = {
    [sepolia.id]:
        (process.env.NEXT_PUBLIC_NFT_ADDRESS_SEPOLIA as `0x${string}` | undefined) ?? ZERO,
    [baseSepolia.id]:
        (process.env.NEXT_PUBLIC_NFT_ADDRESS_BASE_SEPOLIA as `0x${string}` | undefined) ?? ZERO,
    [polygonAmoy.id]:
        (process.env.NEXT_PUBLIC_NFT_ADDRESS_POLYGON_AMOY as `0x${string}` | undefined) ?? ZERO,
};

export const chainLabels: Record<SupportedChainId, string> = {
    [sepolia.id]: "Ethereum Sepolia",
    [baseSepolia.id]: "Base Sepolia",
    [polygonAmoy.id]: "Polygon Amoy",
};

export const SUPPORTED_CHAIN_IDS = [sepolia.id, baseSepolia.id, polygonAmoy.id] as const;
