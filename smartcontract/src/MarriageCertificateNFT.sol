// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "../lib/solmate/src/tokens/ERC721.sol";
import {Owned} from "../lib/solmate/src/auth/Owned.sol";

interface ISmartVow {
    function registerCertificate(uint256 _certificateId, address _partnerA, address _partnerB) external;
}

/**
 * @title MarriageCertificateNFT - Sertifikat Pernikahan Digital
 * @notice NFT untuk sertifikat pernikahan on-chain di Base
 * @dev V2: Auto-register certificate ke SmartVow untuk brankas bersama
 */
contract MarriageCertificateNFT is ERC721, Owned {
    // ============ Structs ============
    struct Certificate {
        address partnerA;
        address partnerB;
        string partnerAName;
        string partnerBName;
        string vows;
        uint256 vowId;
        uint256 mintedAt;
        string metadataURI;
    }

    // ============ State Variables ============
    uint256 public totalSupply;
    uint256 public mintPrice;
    address public smartVowContract;
    
    mapping(uint256 => Certificate) public certificates;
    mapping(address => uint256[]) public userCertificates;
    mapping(uint256 => bool) public vowIdMinted;

    // ============ Events ============
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed partnerA,
        address indexed partnerB,
        uint256 vowId
    );
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event SmartVowUpdated(address indexed oldContract, address indexed newContract);

    // ============ Constructor ============
    constructor(address _smartVowContract) ERC721("SmartVow Marriage Certificate", "SVMC") Owned(msg.sender) {
        smartVowContract = _smartVowContract;
        mintPrice = 0.001 ether;
    }

    // ============ External Functions ============

    /**
     * @notice Mint sertifikat pernikahan NFT
     * @dev Otomatis register ke SmartVow untuk brankas bersama
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

        // Auto-register ke SmartVow untuk brankas bersama
        if (smartVowContract != address(0)) {
            try ISmartVow(smartVowContract).registerCertificate(tokenId, msg.sender, _partnerB) {
                // Success
            } catch {
                // Ignore if registration fails (SmartVow might not be set)
            }
        }

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

    /**
     * @notice Check if user is partner in certificate
     */
    function isPartnerInCertificate(uint256 _tokenId, address _user) external view returns (bool) {
        if (_ownerOf[_tokenId] == address(0)) return false;
        Certificate memory cert = certificates[_tokenId];
        return cert.partnerA == _user || cert.partnerB == _user;
    }

    /**
     * @notice Get partner address from certificate
     */
    function getPartner(uint256 _tokenId, address _user) external view returns (address) {
        require(_ownerOf[_tokenId] != address(0), "Token does not exist");
        Certificate memory cert = certificates[_tokenId];
        if (cert.partnerA == _user) return cert.partnerB;
        if (cert.partnerB == _user) return cert.partnerA;
        revert("Not a partner");
    }

    // ============ Admin Functions ============

    function setMintPrice(uint256 _newPrice) external onlyOwner {
        uint256 oldPrice = mintPrice;
        mintPrice = _newPrice;
        emit MintPriceUpdated(oldPrice, _newPrice);
    }

    function setSmartVowContract(address _newContract) external onlyOwner {
        address oldContract = smartVowContract;
        smartVowContract = _newContract;
        emit SmartVowUpdated(oldContract, _newContract);
    }

    function withdraw() external onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    receive() external payable {}
}
