// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "../lib/solmate/src/tokens/ERC721.sol";
import {Owned} from "../lib/solmate/src/auth/Owned.sol";

/**
 * @title AssetNFT - Digital Asset Virtualization for SmartVow
 * @notice NFT untuk virtualisasi aset digital on-chain di Base
 * @dev ERC-721 dengan metadata on-chain dan partner linking untuk Harta Bersama
 */
contract AssetNFT is ERC721, Owned {
    // ============ Enums ============
    enum OwnershipType {
        Personal,   // Harta Pribadi
        Joint       // Harta Bersama
    }

    // ============ Structs ============
    struct Asset {
        address creator;
        string name;
        string symbol;
        string assetClass;
        string utility;
        uint256 mintedAt;
        string metadataURI;
        OwnershipType ownershipType;
        address partner;  // Partner address untuk Harta Bersama
    }

    // ============ State Variables ============
    uint256 public totalSupply;
    uint256 public mintPrice;
    
    mapping(uint256 => Asset) public assets;
    mapping(address => uint256[]) public userAssets;
    mapping(address => uint256[]) public partnerSharedAssets; // Assets shared TO this address

    // ============ Events ============
    event AssetMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string name,
        string assetClass,
        OwnershipType ownershipType
    );
    event PartnerSet(uint256 indexed tokenId, address indexed partner);
    event PartnerRemoved(uint256 indexed tokenId, address indexed oldPartner);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);

    // ============ Constructor ============
    constructor() ERC721("SmartVow Asset", "SVA") Owned(msg.sender) {
        mintPrice = 0.002 ether;
    }

    // ============ External Functions ============

    /**
     * @notice Mint asset NFT dengan ownership type
     * @param _name Nama aset
     * @param _symbol Symbol token
     * @param _assetClass Klasifikasi aset (Properti, Kendaraan, dll)
     * @param _utility Utilitas/kegunaan aset
     * @param _metadataURI URI metadata (IPFS)
     * @param _isJoint True jika Harta Bersama, False jika Harta Pribadi
     * @param _partner Alamat pasangan (untuk Harta Bersama, bisa address(0) jika belum ada)
     */
    function mintAsset(
        string calldata _name,
        string calldata _symbol,
        string calldata _assetClass,
        string calldata _utility,
        string calldata _metadataURI,
        bool _isJoint,
        address _partner
    ) external payable returns (uint256) {
        require(msg.value >= mintPrice, "Insufficient payment");
        require(bytes(_name).length > 0, "Name required");
        
        // Jika Harta Bersama dengan partner, pastikan bukan diri sendiri
        if (_isJoint && _partner != address(0)) {
            require(_partner != msg.sender, "Partner cannot be yourself");
        }

        totalSupply++;
        uint256 tokenId = totalSupply;

        OwnershipType ownershipType = _isJoint ? OwnershipType.Joint : OwnershipType.Personal;

        assets[tokenId] = Asset({
            creator: msg.sender,
            name: _name,
            symbol: _symbol,
            assetClass: _assetClass,
            utility: _utility,
            mintedAt: block.timestamp,
            metadataURI: _metadataURI,
            ownershipType: ownershipType,
            partner: _partner
        });

        userAssets[msg.sender].push(tokenId);
        
        // Jika ada partner, tambahkan ke partnerSharedAssets
        if (_partner != address(0) && _isJoint) {
            partnerSharedAssets[_partner].push(tokenId);
        }
        
        _mint(msg.sender, tokenId);

        emit AssetMinted(tokenId, msg.sender, _name, _assetClass, ownershipType);
        
        if (_partner != address(0) && _isJoint) {
            emit PartnerSet(tokenId, _partner);
        }

        return tokenId;
    }

    /**
     * @notice Set atau update partner untuk asset (hanya owner)
     * @param _tokenId Token ID
     * @param _partner Alamat partner baru
     */
    function setPartner(uint256 _tokenId, address _partner) external {
        require(_ownerOf[_tokenId] == msg.sender, "Not owner");
        require(_partner != msg.sender, "Partner cannot be yourself");
        require(assets[_tokenId].ownershipType == OwnershipType.Joint, "Only for Joint assets");
        
        address oldPartner = assets[_tokenId].partner;
        
        // Remove from old partner's shared assets
        if (oldPartner != address(0)) {
            _removeFromPartnerShared(oldPartner, _tokenId);
            emit PartnerRemoved(_tokenId, oldPartner);
        }
        
        // Set new partner
        assets[_tokenId].partner = _partner;
        
        // Add to new partner's shared assets
        if (_partner != address(0)) {
            partnerSharedAssets[_partner].push(_tokenId);
            emit PartnerSet(_tokenId, _partner);
        }
    }

    /**
     * @notice Get asset details
     */
    function getAsset(uint256 _tokenId) external view returns (Asset memory) {
        require(_ownerOf[_tokenId] != address(0), "Token does not exist");
        return assets[_tokenId];
    }

    /**
     * @notice Get user's own assets
     */
    function getUserAssets(address _user) external view returns (uint256[] memory) {
        return userAssets[_user];
    }

    /**
     * @notice Get assets shared TO this user (Harta Bersama dari pasangan)
     */
    function getSharedAssets(address _user) external view returns (uint256[] memory) {
        return partnerSharedAssets[_user];
    }

    /**
     * @notice Get all assets user can see (own + shared from partner)
     */
    function getAllVisibleAssets(address _user) external view returns (uint256[] memory) {
        uint256[] memory ownAssets = userAssets[_user];
        uint256[] memory sharedAssets = partnerSharedAssets[_user];
        
        uint256[] memory allAssets = new uint256[](ownAssets.length + sharedAssets.length);
        
        for (uint256 i = 0; i < ownAssets.length; i++) {
            allAssets[i] = ownAssets[i];
        }
        for (uint256 i = 0; i < sharedAssets.length; i++) {
            allAssets[ownAssets.length + i] = sharedAssets[i];
        }
        
        return allAssets;
    }

    /**
     * @notice Check if user can view this asset
     */
    function canViewAsset(address _user, uint256 _tokenId) external view returns (bool) {
        if (_ownerOf[_tokenId] == address(0)) return false;
        
        // Owner can always view
        if (_ownerOf[_tokenId] == _user) return true;
        
        // Partner can view Joint assets
        if (assets[_tokenId].ownershipType == OwnershipType.Joint && 
            assets[_tokenId].partner == _user) {
            return true;
        }
        
        return false;
    }

    /**
     * @notice Token URI for metadata
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(_ownerOf[_tokenId] != address(0), "Token does not exist");
        return assets[_tokenId].metadataURI;
    }

    // ============ Internal Functions ============
    
    function _removeFromPartnerShared(address _partner, uint256 _tokenId) internal {
        uint256[] storage shared = partnerSharedAssets[_partner];
        for (uint256 i = 0; i < shared.length; i++) {
            if (shared[i] == _tokenId) {
                shared[i] = shared[shared.length - 1];
                shared.pop();
                break;
            }
        }
    }

    // ============ Admin Functions ============

    function setMintPrice(uint256 _newPrice) external onlyOwner {
        uint256 oldPrice = mintPrice;
        mintPrice = _newPrice;
        emit MintPriceUpdated(oldPrice, _newPrice);
    }

    function withdraw() external onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    receive() external payable {}
}
