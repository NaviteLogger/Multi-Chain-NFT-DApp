import {getDefaultConfig} from "@rainbow-me/rainbowkit";
import {sepolia, baseSepolia, polygonAmoy} from "wagmi/chains";
import {http} from "wagmi";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

export const wagmiConfig = getDefaultConfig({
    appName: "MultiChain NFT",
    projectId,
    chains: [sepolia, baseSepolia, polygonAmoy],
    transports: {
        [sepolia.id]: http(),
        [baseSepolia.id]: http(),
        [polygonAmoy.id]: http(),
    },
    ssr: true,
});
