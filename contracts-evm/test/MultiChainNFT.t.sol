// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {MultiChainNFT} from "../src/MultiChainNFT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract MultiChainNFTTest is Test {
    using MessageHashUtils for bytes32;

    MultiChainNFT internal nft;

    address internal owner = address(0xA11CE);
    uint256 internal signerKey = 0xB0B1234;
    address internal signer;
    address internal alice = address(0xCAFE);
    address internal bob = address(0xBEEF);

    string internal constant URI_ONE = "ipfs://QmExampleCID/1.json";
    string internal constant URI_TWO = "ipfs://QmExampleCID/2.json";

    function setUp() public {
        signer = vm.addr(signerKey);
        nft = new MultiChainNFT("MultiChain NFT", "MCNFT", owner, signer, 500);
    }

    function test_Metadata() public view {
        assertEq(nft.name(), "MultiChain NFT");
        assertEq(nft.symbol(), "MCNFT");
        assertEq(nft.owner(), owner);
        assertEq(nft.mintSigner(), signer);
        assertTrue(nft.mintOpen());
    }

    function test_OwnerMint_AssignsOwnershipAndUri() public {
        vm.prank(owner);
        uint256 tokenId = nft.ownerMint(alice, URI_ONE);

        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(tokenId), alice);
        assertEq(nft.tokenURI(tokenId), URI_ONE);
        assertEq(nft.balanceOf(alice), 1);
        assertEq(nft.nextTokenId(), 1);
    }

    function test_OwnerMint_RevertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        nft.ownerMint(alice, URI_ONE);
    }

    function test_MintWithSignature_Succeeds() public {
        bytes memory sig = _signMint(alice, URI_ONE);

        vm.prank(alice);
        uint256 tokenId = nft.mintWithSignature(alice, URI_ONE, sig);

        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(tokenId), alice);
        assertEq(nft.tokenURI(tokenId), URI_ONE);
    }

    function test_MintWithSignature_RevertsOnReuse() public {
        bytes memory sig = _signMint(alice, URI_ONE);

        vm.prank(alice);
        nft.mintWithSignature(alice, URI_ONE, sig);

        vm.prank(alice);
        vm.expectRevert(MultiChainNFT.SignatureAlreadyUsed.selector);
        nft.mintWithSignature(alice, URI_ONE, sig);
    }

    function test_MintWithSignature_RevertsOnWrongSigner() public {
        uint256 attackerKey = 0xDEAD;
        bytes32 digest = keccak256(
            abi.encodePacked(alice, URI_ONE, block.chainid, address(nft))
        ).toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attackerKey, digest);
        bytes memory badSig = abi.encodePacked(r, s, v);

        vm.prank(alice);
        vm.expectRevert(MultiChainNFT.InvalidSignature.selector);
        nft.mintWithSignature(alice, URI_ONE, badSig);
    }

    function test_MintWithSignature_RevertsWhenClosed() public {
        vm.prank(owner);
        nft.setMintOpen(false);

        bytes memory sig = _signMint(alice, URI_ONE);
        vm.prank(alice);
        vm.expectRevert(MultiChainNFT.MintClosed.selector);
        nft.mintWithSignature(alice, URI_ONE, sig);
    }

    function test_Transfer() public {
        vm.prank(owner);
        uint256 tokenId = nft.ownerMint(alice, URI_ONE);

        vm.prank(alice);
        nft.transferFrom(alice, bob, tokenId);

        assertEq(nft.ownerOf(tokenId), bob);
        assertEq(nft.balanceOf(alice), 0);
        assertEq(nft.balanceOf(bob), 1);
    }

    function test_RoyaltyInfo() public {
        vm.prank(owner);
        uint256 tokenId = nft.ownerMint(alice, URI_ONE);

        (address receiver, uint256 royaltyAmount) = nft.royaltyInfo(tokenId, 10_000);
        assertEq(receiver, owner);
        assertEq(royaltyAmount, 500); // 5% of 10_000
    }

    function test_SupportsInterface() public view {
        assertTrue(nft.supportsInterface(type(IERC721).interfaceId));
        assertTrue(nft.supportsInterface(type(IERC2981).interfaceId));
    }

    function test_NextTokenIdMonotonic() public {
        vm.startPrank(owner);
        nft.ownerMint(alice, URI_ONE);
        nft.ownerMint(bob, URI_TWO);
        vm.stopPrank();
        assertEq(nft.nextTokenId(), 2);
    }

    function _signMint(address to, string memory uri) internal view returns (bytes memory) {
        bytes32 digest = keccak256(
            abi.encodePacked(to, uri, block.chainid, address(nft))
        ).toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
