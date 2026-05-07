import {test, expect} from "@playwright/test";

test.describe("UI states without a wallet connected", () => {
    test("EVM panel prompts the user to connect", async ({page}) => {
        await page.goto("/");
        const evmPanel = page.getByTestId("evm-panel");
        await expect(evmPanel.getByText(/Connect an EVM wallet to mint/i)).toBeVisible();
    });

    test("Sui panel prompts the user to connect", async ({page}) => {
        await page.goto("/");
        const suiPanel = page.getByTestId("sui-panel");
        await expect(suiPanel.getByText(/Connect a Sui wallet/i)).toBeVisible();
    });

    test("Mint controls are not visible until a wallet is connected", async ({page}) => {
        await page.goto("/");
        await expect(page.getByTestId("evm-mint")).toHaveCount(0);
        await expect(page.getByTestId("sui-mint")).toHaveCount(0);
    });

    test("Footer links the source paths", async ({page}) => {
        await page.goto("/");
        await expect(
            page.getByText("contracts-evm/src/MultiChainNFT.sol"),
        ).toBeVisible();
        await expect(page.getByText("contracts-sui/sources/nft.move")).toBeVisible();
        await expect(page.getByText("/openapi.yaml")).toBeVisible();
    });
});
