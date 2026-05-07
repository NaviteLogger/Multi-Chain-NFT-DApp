"use client";

import "@rainbow-me/rainbowkit/styles.css";
import "@mysten/dapp-kit/dist/index.css";

import {ReactNode, useState} from "react";
import {WagmiProvider} from "wagmi";
import {RainbowKitProvider, darkTheme} from "@rainbow-me/rainbowkit";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {SuiClientProvider, WalletProvider, createNetworkConfig} from "@mysten/dapp-kit";
import {getFullnodeUrl} from "@mysten/sui/client";
import {wagmiConfig} from "@/lib/wagmi";

const {networkConfig} = createNetworkConfig({
    testnet: {url: getFullnodeUrl("testnet")},
    mainnet: {url: getFullnodeUrl("mainnet")},
});

const defaultNetwork =
    (process.env.NEXT_PUBLIC_SUI_NETWORK as "testnet" | "mainnet" | undefined) ?? "testnet";

export default function Providers({children}: {children: ReactNode}) {
    const [queryClient] = useState(() => new QueryClient());
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <SuiClientProvider networks={networkConfig} defaultNetwork={defaultNetwork}>
                    <WalletProvider autoConnect>
                        <RainbowKitProvider theme={darkTheme()}>{children}</RainbowKitProvider>
                    </WalletProvider>
                </SuiClientProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
