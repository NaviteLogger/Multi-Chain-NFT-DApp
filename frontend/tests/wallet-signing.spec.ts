import {test, expect} from "@playwright/test";

// Wallet-driving via Synpress is out of scope; UI tests assert the surface
// users land on (panels, connect buttons, modal). The signing path itself is
// covered by api-sign-mint.spec.ts via viem signature recovery.
test.describe("MultiChain NFT — wallet UI", () => {
    test("home page renders both wallet panels", async ({page}) => {
        await page.goto("/");
        await expect(page.getByRole("heading", {name: /MultiChain NFT/})).toBeVisible();
        await expect(page.getByTestId("evm-panel")).toBeVisible();
        await expect(page.getByTestId("sui-panel")).toBeVisible();
    });

    test("EVM Connect Wallet button opens RainbowKit modal", async ({page}) => {
        await page.goto("/");

        const evmConnect = page
            .getByTestId("evm-panel")
            .getByRole("button", {name: /Connect Wallet/i});
        await expect(evmConnect).toBeVisible();
        await evmConnect.click();

        const modalTitle = page.getByRole("heading", {name: /Connect a Wallet/i});
        await expect(modalTitle).toBeVisible({timeout: 10_000});

        await page.keyboard.press("Escape");
        await expect(modalTitle).toBeHidden();
    });

    test("Sui Connect button is rendered", async ({page}) => {
        await page.goto("/");
        const suiConnect = page
            .getByTestId("sui-panel")
            .getByRole("button", {name: /Connect/i});
        await expect(suiConnect).toBeVisible();
    });
});
