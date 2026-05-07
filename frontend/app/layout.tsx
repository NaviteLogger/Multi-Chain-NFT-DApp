import type {Metadata} from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
    title: "MultiChain NFT",
    description: "Mint an NFT on Ethereum testnets and Sui testnet from one page.",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
