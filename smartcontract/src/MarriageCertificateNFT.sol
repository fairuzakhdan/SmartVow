// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "../lib/solmate/src/tokens/ERC721.sol";
import {Owned} from "../lib/solmate/src/auth/Owned.sol";

/**
 * @title MarriageCertificateNFT - Sertifikat Pernikahan Digital
 * @notice NFT untuk sertifikat pernikahan on-chain di Base
 * @dev ERC-721 dengan metadata on-chain
 */
contract MarriageCertificateNFT is ERC721, Owned {
    // ============ Structs ============
    struct Certificate {
        address partnerA;
        address partnerB;
        string partnerAName;
        string partnerBName;
        string vows;
        uint256 vowId; // Reference to SmartVow contract
        uint256 mintedAt;
        string metadataURI;
    }

    // ============ State Variables ============
    uint256 public totalSupply;
    uint256 public mintPrice;
    address public smartVowContract;
    
    mapping(uint256 => Certificate) public certificates;
    mapping(address => uint256[]) public userCertificates;
    mapping(uint256 => bool) public vowIdMinted; // Prevent duplicate minting

    // ============ Events ============
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed partnerA,
        address indexed partnerB,
        uint256 vowId
    );
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);

    // ============ Constructor ============
    constructor(address _smartVowContract) ERC721("SmartVow Marriage Certificate", "SVMC") Owned(msg.sender) {
        smartVowContract = _smartVowContract;
        mintPrice = 0.001 ether;
    }

    // ============ External Functions ============

    /**
     * @notice Mint sertifikat pernikahan NFT
     * @param _partnerB Alamat pasangan
     * @param _partnerAName Nama partner A
     * @param _partnerBName Nama partner B
     * @param _vows Ikrar pernikahan
     * @param _vowId ID dari SmartVow contract
     * @param _metadataURI URI metadata (IPFS)
     */
    function mintCertificate(
        address _partnerB,
        string calldata _partnerAName,
        string calldata _partnerBName,
        string calldata _vows,
        uint256 _vowId,
        string calldata _metadataURI
    ) external payable returns (uint256) {
        require(msg.value >= mintPrice, "Insufficient payment");
        require(_partnerB != address(0), "Invalid partner address");
        require(_partnerB != msg.sender, "Cannot mint with yourself");
        require(!vowIdMinted[_vowId], "Certificate already minted for this vow");

        totalSupply++;
        uint256 tokenId = totalSupply;

        certificates[tokenId] = Certificate({
            partnerA: msg.sender,
            partnerB: _partnerB,
            partnerAName: _partnerAName,
            partnerBName: _partnerBName,
            vows: _vows,
            vowId: _vowId,
            mintedAt: block.timestamp,
            metadataURI: _metadataURI
        });

        vowIdMinted[_vowId] = true;
        userCertificates[msg.sender].push(tokenId);
        userCertificates[_partnerB].push(tokenId);

        _mint(msg.sender, tokenId);

        emit CertificateMinted(tokenId, msg.sender, _partnerB, _vowId);

        return tokenId;
    }


    /**
     * @notice Get certificate details
     */
    function getCertificate(uint256 _tokenId) external view returns (Certificate memory) {
        require(_ownerOf[_tokenId] != address(0), "Token does not exist");
        return certificates[_tokenId];
    }

    /**
     * @notice Get user's certificates
     */
    function getUserCertificates(address _user) external view returns (uint256[] memory) {
        return userCertificates[_user];
    }

    /**
     * @notice Token URI for metadata
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(_ownerOf[_tokenId] != address(0), "Token does not exist");
        return certificates[_tokenId].metadataURI;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update mint price
     */
    function setMintPrice(uint256 _newPrice) external onlyOwner {
        uint256 oldPrice = mintPrice;
        mintPrice = _newPrice;
        emit MintPriceUpdated(oldPrice, _newPrice);
    }

    /**
     * @notice Update SmartVow contract address
     */
    function setSmartVowContract(address _newContract) external onlyOwner {
        smartVowContract = _newContract;
    }

    /**
     * @notice Withdraw contract balance
     */
    function withdraw() external onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}
