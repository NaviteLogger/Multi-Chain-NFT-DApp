import {defineConfig, devices} from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? "github" : "list",
    use: {
        baseURL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: {...devices["Desktop Chrome"]},
        },
    ],
    webServer: {
        command: "npm run dev -- -p 3100",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 120_000,
        env: {
            // Hardhat / Anvil test account #0 — safe to commit, no funds.
            MINT_SIGNER_PRIVATE_KEY:
                "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
            NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "demo",
            NEXT_PUBLIC_NFT_ADDRESS_SEPOLIA:
                "0x1234567890123456789012345678901234567890",
            NEXT_PUBLIC_NFT_ADDRESS_BASE_SEPOLIA:
                "0x1234567890123456789012345678901234567890",
            NEXT_PUBLIC_NFT_ADDRESS_POLYGON_AMOY:
                "0x1234567890123456789012345678901234567890",
            NEXT_PUBLIC_SUI_PACKAGE_ID:
                "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
            NEXT_PUBLIC_SUI_MINT_CAP_ID:
                "0x1111111111111111111111111111111111111111111111111111111111111111",
            NEXT_PUBLIC_SUI_NETWORK: "testnet",
        },
    },
});
