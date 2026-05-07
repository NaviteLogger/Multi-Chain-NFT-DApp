// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MultiChainNFT} from "../src/MultiChainNFT.sol";

/// @notice Deploy the same NFT contract to any configured EVM chain.
/// @dev Run with:
///        forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
contract Deploy is Script {
    function run() external returns (MultiChainNFT nft) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.addr(pk);
        address signer = vm.envOr("MINT_SIGNER", owner);
        uint96 royaltyBps = uint96(vm.envOr("ROYALTY_BPS", uint256(500)));

        vm.startBroadcast(pk);
        nft = new MultiChainNFT("MultiChain NFT", "MCNFT", owner, signer, royaltyBps);
        vm.stopBroadcast();

        console2.log("MultiChainNFT deployed:", address(nft));
        console2.log("Owner:", owner);
        console2.log("Signer:", signer);
        console2.log("Chain:", block.chainid);
    }
}
