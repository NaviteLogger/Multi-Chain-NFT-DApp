// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title MultiChainNFT
/// @notice ERC-721 with per-token URI, ERC-2981 royalties, and signature-gated mint.
/// @dev Same bytecode is deployed to multiple EVM testnets (Sepolia, Base Sepolia, Polygon Amoy).
contract MultiChainNFT is ERC721URIStorage, ERC2981, Ownable {
    using MessageHashUtils for bytes32;

    error InvalidSignature();
    error SignatureAlreadyUsed();
    error MintClosed();
    error EmptyUri();

    event Minted(address indexed to, uint256 indexed tokenId, string uri);
    event MintSignerChanged(address indexed previous, address indexed current);
    event MintOpenChanged(bool open);

    uint256 public nextTokenId;
    address public mintSigner;
    bool public mintOpen;

    mapping(bytes32 => bool) public usedDigests;

    constructor(
        string memory name_,
        string memory symbol_,
        address owner_,
        address signer_,
        uint96 royaltyBps
    ) ERC721(name_, symbol_) Ownable(owner_) {
        mintSigner = signer_;
        mintOpen = true;
        emit MintSignerChanged(address(0), signer_);
        emit MintOpenChanged(true);
        _setDefaultRoyalty(owner_, royaltyBps);
    }

    function setMintSigner(address signer_) external onlyOwner {
        emit MintSignerChanged(mintSigner, signer_);
        mintSigner = signer_;
    }

    function setMintOpen(bool open_) external onlyOwner {
        mintOpen = open_;
        emit MintOpenChanged(open_);
    }

    /// @notice Owner mint — primarily for tests and admin actions.
    function ownerMint(address to, string calldata uri) external onlyOwner returns (uint256 tokenId) {
        tokenId = _mintTo(to, uri);
    }

    /// @notice Public mint authorised by an off-chain signature from `mintSigner`.
    /// @dev Backend signs `keccak256(abi.encodePacked(to, uri, chainId, address(this)))` as
    ///      an Ethereum signed message. The digest binds chain, contract, recipient, and URI;
    ///      reuse is prevented by `usedDigests`.
    function mintWithSignature(
        address to,
        string calldata uri,
        bytes calldata signature
    ) external returns (uint256 tokenId) {
        if (!mintOpen) revert MintClosed();
        if (bytes(uri).length == 0) revert EmptyUri();

        bytes32 digest = keccak256(abi.encodePacked(to, uri, block.chainid, address(this)))
            .toEthSignedMessageHash();

        if (usedDigests[digest]) revert SignatureAlreadyUsed();
        usedDigests[digest] = true;

        address recovered = ECDSA.recover(digest, signature);
        if (recovered != mintSigner) revert InvalidSignature();

        tokenId = _mintTo(to, uri);
    }

    function _mintTo(address to, string memory uri) internal returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit Minted(to, tokenId, uri);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
