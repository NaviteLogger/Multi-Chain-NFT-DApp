// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
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

    event Minted(address indexed to, uint256 indexed tokenId, string uri);
    event MintSignerChanged(address indexed previous, address indexed current);
    event MintOpenChanged(bool open);

    function setUp() public {
        signer = vm.addr(signerKey);
        nft = new MultiChainNFT("MultiChain NFT", "MCNFT", owner, signer, 500);
    }

    // ============ Metadata ============

    function test_Metadata() public view {
        assertEq(nft.name(), "MultiChain NFT");
        assertEq(nft.symbol(), "MCNFT");
        assertEq(nft.owner(), owner);
        assertEq(nft.mintSigner(), signer);
        assertTrue(nft.mintOpen());
        assertEq(nft.nextTokenId(), 0);
    }

    function test_Constructor_EmitsSignerAndOpenEvents() public {
        vm.expectEmit(true, true, false, false);
        emit MintSignerChanged(address(0), signer);
        vm.expectEmit(false, false, false, true);
        emit MintOpenChanged(true);
        new MultiChainNFT("X", "Y", owner, signer, 500);
    }

    function test_SupportsInterface() public view {
        assertTrue(nft.supportsInterface(type(IERC721).interfaceId));
        assertTrue(nft.supportsInterface(type(IERC2981).interfaceId));
    }

    // ============ Owner mint ============

    function test_OwnerMint_AssignsOwnershipAndUri() public {
        vm.expectEmit(true, true, false, true);
        emit Minted(alice, 0, URI_ONE);

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

    function test_NextTokenIdMonotonic() public {
        vm.startPrank(owner);
        nft.ownerMint(alice, URI_ONE);
        nft.ownerMint(bob, URI_TWO);
        vm.stopPrank();
        assertEq(nft.nextTokenId(), 2);
    }

    // ============ Signature mint ============

    function test_MintWithSignature_Succeeds() public {
        bytes memory sig = _signMint(alice, URI_ONE);

        vm.prank(alice);
        uint256 tokenId = nft.mintWithSignature(alice, URI_ONE, sig);

        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(tokenId), alice);
        assertEq(nft.tokenURI(tokenId), URI_ONE);
        assertTrue(nft.usedDigests(_digest(alice, URI_ONE, address(nft))));
    }

    function test_MintWithSignature_AnyoneCanRelay() public {
        bytes memory sig = _signMint(alice, URI_ONE);

        vm.prank(bob);
        uint256 tokenId = nft.mintWithSignature(alice, URI_ONE, sig);

        assertEq(nft.ownerOf(tokenId), alice, "NFT must go to signed recipient, not relayer");
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
        bytes32 digest = _ethDigest(alice, URI_ONE, address(nft), block.chainid);
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

    function test_MintWithSignature_RevertsOnEmptyUri() public {
        bytes memory sig = _signMint(alice, "");
        vm.prank(alice);
        vm.expectRevert(MultiChainNFT.EmptyUri.selector);
        nft.mintWithSignature(alice, "", sig);
    }

    function test_MintWithSignature_DigestBindsToContract() public {
        // Sign for nft, replay against a second deployment with same params.
        MultiChainNFT other = new MultiChainNFT("MultiChain NFT", "MCNFT", owner, signer, 500);
        bytes memory sig = _signMint(alice, URI_ONE);

        vm.prank(alice);
        vm.expectRevert(MultiChainNFT.InvalidSignature.selector);
        other.mintWithSignature(alice, URI_ONE, sig);
    }

    function test_MintWithSignature_DigestBindsToChainId() public {
        bytes memory sig = _signMint(alice, URI_ONE);
        vm.chainId(block.chainid + 1);
        vm.prank(alice);
        vm.expectRevert(MultiChainNFT.InvalidSignature.selector);
        nft.mintWithSignature(alice, URI_ONE, sig);
    }

    function test_MintWithSignature_DigestBindsToRecipient() public {
        bytes memory sig = _signMint(alice, URI_ONE);
        vm.prank(bob);
        vm.expectRevert(MultiChainNFT.InvalidSignature.selector);
        nft.mintWithSignature(bob, URI_ONE, sig);
    }

    function test_MintWithSignature_AfterSignerRotated() public {
        uint256 newKey = 0xC0FFEE;
        address newSigner = vm.addr(newKey);

        vm.prank(owner);
        nft.setMintSigner(newSigner);

        bytes memory oldSig = _signMint(alice, URI_ONE);
        vm.prank(alice);
        vm.expectRevert(MultiChainNFT.InvalidSignature.selector);
        nft.mintWithSignature(alice, URI_ONE, oldSig);

        bytes memory newSig = _signWith(newKey, alice, URI_ONE, address(nft), block.chainid);
        vm.prank(alice);
        nft.mintWithSignature(alice, URI_ONE, newSig);
        assertEq(nft.ownerOf(0), alice);
    }

    // ============ Fuzz ============

    function testFuzz_Sign_Recover(address to, string calldata uri) public {
        vm.assume(to != address(0));
        vm.assume(bytes(uri).length > 0 && bytes(uri).length < 256);

        bytes memory sig = _signMint(to, uri);
        vm.prank(to);
        uint256 tokenId = nft.mintWithSignature(to, uri, sig);
        assertEq(nft.ownerOf(tokenId), to);
    }

    function testFuzz_WrongKey_Rejected(uint256 attackerKey) public {
        attackerKey = bound(attackerKey, 1, type(uint128).max);
        vm.assume(vm.addr(attackerKey) != signer);

        bytes memory badSig = _signWith(attackerKey, alice, URI_ONE, address(nft), block.chainid);
        vm.prank(alice);
        vm.expectRevert(MultiChainNFT.InvalidSignature.selector);
        nft.mintWithSignature(alice, URI_ONE, badSig);
    }

    // ============ Admin ============

    function test_SetMintSigner_EmitsAndUpdates() public {
        address newSigner = address(0xFEED);
        vm.expectEmit(true, true, false, false);
        emit MintSignerChanged(signer, newSigner);
        vm.prank(owner);
        nft.setMintSigner(newSigner);
        assertEq(nft.mintSigner(), newSigner);
    }

    function test_SetMintSigner_RevertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        nft.setMintSigner(alice);
    }

    function test_SetMintOpen_EmitsAndUpdates() public {
        vm.expectEmit(false, false, false, true);
        emit MintOpenChanged(false);
        vm.prank(owner);
        nft.setMintOpen(false);
        assertFalse(nft.mintOpen());
    }

    function test_SetMintOpen_RevertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        nft.setMintOpen(false);
    }

    // ============ Transfer / royalty ============

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
        assertEq(royaltyAmount, 500);
    }

    // ============ Helpers ============

    function _digest(address to, string memory uri, address contractAddr) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(to, uri, block.chainid, contractAddr)).toEthSignedMessageHash();
    }

    function _ethDigest(
        address to,
        string memory uri,
        address contractAddr,
        uint256 chainId
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(to, uri, chainId, contractAddr)).toEthSignedMessageHash();
    }

    function _signMint(address to, string memory uri) internal view returns (bytes memory) {
        return _signWith(signerKey, to, uri, address(nft), block.chainid);
    }

    function _signWith(
        uint256 key,
        address to,
        string memory uri,
        address contractAddr,
        uint256 chainId
    ) internal pure returns (bytes memory) {
        bytes32 digest = _ethDigest(to, uri, contractAddr, chainId);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }
}
