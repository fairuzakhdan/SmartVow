// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SmartVow - Perjanjian Pra Nikah on Base
 * @notice Smart contract untuk mengelola perjanjian pra nikah secara terdesentralisasi
 * @dev V3: Brankas bersama berdasarkan Certificate ID (bukan partner registration)
 * @dev Brankas bersama hanya bisa diakses oleh pasangan yang ada di sertifikat
 */
contract SmartVow {
    // ============ Enums ============
    enum VowStatus {
        Draft,
        PendingSignatures,
        Active,
        Breached,
        Resolved,
        Terminated
    }

    enum ConditionType {
        Infidelity,
        KDRT,
        Financial,
        Custom
    }

    // ============ Structs ============
    struct Condition {
        uint256 id;
        ConditionType conditionType;
        string description;
        uint256 penaltyPercentage;
        bool isTriggered;
    }

    struct Vow {
        uint256 id;
        address partnerA;
        address partnerB;
        uint256 escrowBalance;
        uint256 pendingEscrowAmount;
        VowStatus status;
        uint256 createdAt;
        uint256 activatedAt;
        bool partnerASigned;
        bool partnerBSigned;
        string metadataURI;
    }

    // ============ State Variables ============
    uint256 public vowCounter;
    uint256 public conditionCounter;
    address public mediator;
    uint256 public constant MIN_ESCROW = 0.001 ether;
    uint256 public constant BASIS_POINTS = 10000;

    mapping(uint256 => Vow) public vows;
    mapping(uint256 => Condition[]) public vowConditions;
    mapping(address => uint256[]) public userVows;
    
    // ============ Brankas System V3 - Per Certificate ============
    // Brankas pribadi - hanya bisa dilihat oleh pemilik
    mapping(address => uint256) private personalVault;
    
    // Brankas bersama per Certificate ID
    // certificateId => total balance
    mapping(uint256 => uint256) private certificateSharedVault;
    
    // Kontribusi per user per certificate
    // certificateId => user => contribution
    mapping(uint256 => mapping(address => uint256)) private certificateContribution;
    
    // Certificate data (diset saat mint certificate)
    // certificateId => partnerA
    mapping(uint256 => address) public certificatePartnerA;
    // certificateId => partnerB
    mapping(uint256 => address) public certificatePartnerB;
    // certificateId => isActive
    mapping(uint256 => bool) public certificateActive;
    
    // User's certificates
    mapping(address => uint256[]) private userCertificateIds;
    
    // Claim System
    mapping(uint256 => bool) public vowClaimed;
    mapping(uint256 => address) public claimant;

    // ============ Events ============
    event VowCreated(uint256 indexed vowId, address indexed partnerA, address indexed partnerB);
    event VowSigned(uint256 indexed vowId, address indexed signer);
    event VowActivated(uint256 indexed vowId, uint256 escrowAmount);
    event EscrowDeposited(uint256 indexed vowId, address indexed depositor, uint256 amount);
    event ConditionAdded(uint256 indexed vowId, uint256 conditionId, ConditionType conditionType);
    event BreachReported(uint256 indexed vowId, uint256 conditionId, address reporter);
    event VowResolved(uint256 indexed vowId, address beneficiary, uint256 amount);
    event VowTerminated(uint256 indexed vowId);
    event MediatorUpdated(address indexed oldMediator, address indexed newMediator);
    
    // Brankas Events
    event PersonalDeposit(address indexed user, uint256 amount);
    event SharedDeposit(uint256 indexed certificateId, address indexed user, uint256 amount);
    event PersonalWithdraw(address indexed user, uint256 amount);
    event CertificateRegistered(uint256 indexed certificateId, address indexed partnerA, address indexed partnerB);
    
    // Claim Events
    event ClaimSubmitted(uint256 indexed vowId, address indexed claimant, string claimType);
    event ClaimApproved(uint256 indexed vowId, address indexed claimant, uint256 amount);

    // ============ Modifiers ============
    modifier onlyMediator() {
        require(msg.sender == mediator, "Only mediator");
        _;
    }

    modifier onlyPartner(uint256 _vowId) {
        require(
            msg.sender == vows[_vowId].partnerA || msg.sender == vows[_vowId].partnerB,
            "Not a partner"
        );
        _;
    }

    modifier vowExists(uint256 _vowId) {
        require(vows[_vowId].createdAt != 0, "Vow does not exist");
        _;
    }

    modifier inStatus(uint256 _vowId, VowStatus _status) {
        require(vows[_vowId].status == _status, "Invalid vow status");
        _;
    }
    
    modifier onlyCertificatePartner(uint256 _certId) {
        require(
            certificateActive[_certId] &&
            (msg.sender == certificatePartnerA[_certId] || msg.sender == certificatePartnerB[_certId]),
            "Not a certificate partner"
        );
        _;
    }

    // ============ Constructor ============
    constructor() {
        mediator = msg.sender;
    }

    // ============ Certificate Registration ============
    
    /**
     * @notice Register certificate - dipanggil saat mint certificate
     * @dev Hanya bisa dipanggil sekali per certificateId
     */
    function registerCertificate(uint256 _certificateId, address _partnerA, address _partnerB) external {
        require(!certificateActive[_certificateId], "Certificate already registered");
        require(_partnerA != address(0) && _partnerB != address(0), "Invalid addresses");
        require(_partnerA != _partnerB, "Partners must be different");
        
        certificatePartnerA[_certificateId] = _partnerA;
        certificatePartnerB[_certificateId] = _partnerB;
        certificateActive[_certificateId] = true;
        
        userCertificateIds[_partnerA].push(_certificateId);
        userCertificateIds[_partnerB].push(_certificateId);
        
        emit CertificateRegistered(_certificateId, _partnerA, _partnerB);
    }
    
    /**
     * @notice Cek apakah user adalah partner di certificate tertentu
     */
    function isCertificatePartner(uint256 _certId, address _user) public view returns (bool) {
        return certificateActive[_certId] && 
               (certificatePartnerA[_certId] == _user || certificatePartnerB[_certId] == _user);
    }
    
    /**
     * @notice Get user's certificate IDs
     */
    function getMyCertificates() external view returns (uint256[] memory) {
        return userCertificateIds[msg.sender];
    }
    
    /**
     * @notice Get certificate partners (hanya jika caller adalah partner)
     */
    function getCertificatePartners(uint256 _certId) external view returns (address partnerA, address partnerB) {
        require(isCertificatePartner(_certId, msg.sender), "Not authorized");
        return (certificatePartnerA[_certId], certificatePartnerB[_certId]);
    }

    // ============ Brankas Pribadi Functions ============

    /**
     * @notice Deposit ke brankas pribadi
     */
    function depositPersonal() external payable {
        require(msg.value > 0, "Must send ETH");
        personalVault[msg.sender] += msg.value;
        emit PersonalDeposit(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw dari brankas pribadi
     */
    function withdrawPersonal(uint256 _amount) external {
        require(_amount > 0, "Amount must be > 0");
        require(personalVault[msg.sender] >= _amount, "Insufficient balance");
        
        personalVault[msg.sender] -= _amount;
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit PersonalWithdraw(msg.sender, _amount);
    }

    /**
     * @notice Get saldo brankas pribadi (hanya milik sendiri)
     */
    function getMyPersonalVault() external view returns (uint256) {
        return personalVault[msg.sender];
    }

    // ============ Brankas Bersama Functions (Per Certificate) ============

    /**
     * @notice Transfer dari brankas pribadi ke brankas bersama certificate
     * @param _certificateId ID sertifikat yang akan ditambah brankas bersamanya
     * @param _amount Jumlah yang akan ditransfer
     */
    function transferToSharedVault(uint256 _certificateId, uint256 _amount) external onlyCertificatePartner(_certificateId) {
        require(_amount > 0, "Amount must be > 0");
        require(personalVault[msg.sender] >= _amount, "Insufficient personal balance");
        
        personalVault[msg.sender] -= _amount;
        certificateSharedVault[_certificateId] += _amount;
        certificateContribution[_certificateId][msg.sender] += _amount;
        
        emit SharedDeposit(_certificateId, msg.sender, _amount);
    }

    /**
     * @notice Deposit langsung ke brankas bersama certificate
     * @param _certificateId ID sertifikat
     */
    function depositToSharedVault(uint256 _certificateId) external payable onlyCertificatePartner(_certificateId) {
        require(msg.value > 0, "Must send ETH");
        
        certificateSharedVault[_certificateId] += msg.value;
        certificateContribution[_certificateId][msg.sender] += msg.value;
        
        emit SharedDeposit(_certificateId, msg.sender, msg.value);
    }

    /**
     * @notice Get info brankas bersama (HANYA untuk partner di certificate)
     * @param _certificateId ID sertifikat
     */
    function getSharedVaultInfo(uint256 _certificateId) external view onlyCertificatePartner(_certificateId) returns (
        uint256 totalBalance,
        uint256 myContribution,
        uint256 partnerContribution,
        address partnerA,
        address partnerB
    ) {
        partnerA = certificatePartnerA[_certificateId];
        partnerB = certificatePartnerB[_certificateId];
        totalBalance = certificateSharedVault[_certificateId];
        myContribution = certificateContribution[_certificateId][msg.sender];
        
        address otherPartner = msg.sender == partnerA ? partnerB : partnerA;
        partnerContribution = certificateContribution[_certificateId][otherPartner];
    }

    /**
     * @notice Get total saldo brankas bersama (HANYA untuk partner)
     */
    function getSharedVaultBalance(uint256 _certificateId) external view onlyCertificatePartner(_certificateId) returns (uint256) {
        return certificateSharedVault[_certificateId];
    }

    /**
     * @notice Get kontribusi saya ke brankas bersama
     */
    function getMySharedContribution(uint256 _certificateId) external view onlyCertificatePartner(_certificateId) returns (uint256) {
        return certificateContribution[_certificateId][msg.sender];
    }

    /**
     * @notice Get semua brankas bersama yang saya punya akses
     * @return certificateIds Array of certificate IDs
     * @return balances Array of balances
     * @return myContributions Array of my contributions
     */
    function getAllMySharedVaults() external view returns (
        uint256[] memory certificateIds,
        uint256[] memory balances,
        uint256[] memory myContributions
    ) {
        uint256[] memory myCerts = userCertificateIds[msg.sender];
        uint256 count = myCerts.length;
        
        certificateIds = new uint256[](count);
        balances = new uint256[](count);
        myContributions = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 certId = myCerts[i];
            certificateIds[i] = certId;
            balances[i] = certificateSharedVault[certId];
            myContributions[i] = certificateContribution[certId][msg.sender];
        }
    }

    /**
     * @notice Get ringkasan vault saya (pribadi + semua shared)
     */
    function getMyVaultSummary() external view returns (
        uint256 personalBalance,
        uint256 totalSharedBalance,
        uint256 certificateCount
    ) {
        personalBalance = personalVault[msg.sender];
        
        uint256[] memory myCerts = userCertificateIds[msg.sender];
        certificateCount = myCerts.length;
        
        for (uint256 i = 0; i < myCerts.length; i++) {
            totalSharedBalance += certificateSharedVault[myCerts[i]];
        }
    }

    // ============ Vow Functions ============

    /**
     * @notice Membuat perjanjian pra nikah baru
     */
    function createVow(address _partnerB, string calldata _metadataURI) external returns (uint256) {
        require(_partnerB != address(0), "Invalid partner address");
        require(_partnerB != msg.sender, "Cannot create vow with yourself");

        vowCounter++;
        uint256 vowId = vowCounter;

        vows[vowId] = Vow({
            id: vowId,
            partnerA: msg.sender,
            partnerB: _partnerB,
            escrowBalance: 0,
            pendingEscrowAmount: 0,
            status: VowStatus.Draft,
            createdAt: block.timestamp,
            activatedAt: 0,
            partnerASigned: false,
            partnerBSigned: false,
            metadataURI: _metadataURI
        });

        userVows[msg.sender].push(vowId);
        userVows[_partnerB].push(vowId);

        emit VowCreated(vowId, msg.sender, _partnerB);
        return vowId;
    }

    /**
     * @notice Buat perjanjian lengkap dengan escrow dari certificate shared vault
     */
    function createVowWithCertificateEscrow(
        address _partnerB,
        string calldata _metadataURI,
        ConditionType[] calldata _conditionTypes,
        string[] calldata _descriptions,
        uint256[] calldata _penaltyPercentages,
        uint256 _escrowAmount,
        uint256 _certificateId
    ) external returns (uint256) {
        require(_partnerB != address(0), "Invalid partner address");
        require(_partnerB != msg.sender, "Cannot create vow with yourself");
        require(_conditionTypes.length == _descriptions.length, "Array length mismatch");
        require(_conditionTypes.length == _penaltyPercentages.length, "Array length mismatch");
        require(_escrowAmount >= MIN_ESCROW, "Insufficient escrow amount");
        require(isCertificatePartner(_certificateId, msg.sender), "Not certificate partner");
        require(isCertificatePartner(_certificateId, _partnerB), "Partner not in certificate");
        require(certificateSharedVault[_certificateId] >= _escrowAmount, "Insufficient shared vault");

        vowCounter++;
        uint256 vowId = vowCounter;

        vows[vowId] = Vow({
            id: vowId,
            partnerA: msg.sender,
            partnerB: _partnerB,
            escrowBalance: 0,
            pendingEscrowAmount: _escrowAmount,
            status: VowStatus.PendingSignatures,
            createdAt: block.timestamp,
            activatedAt: 0,
            partnerASigned: true,
            partnerBSigned: false,
            metadataURI: _metadataURI
        });

        userVows[msg.sender].push(vowId);
        userVows[_partnerB].push(vowId);

        emit VowCreated(vowId, msg.sender, _partnerB);

        for (uint256 i = 0; i < _conditionTypes.length; i++) {
            require(_penaltyPercentages[i] <= BASIS_POINTS, "Penalty exceeds 100%");
            conditionCounter++;
            vowConditions[vowId].push(Condition({
                id: conditionCounter,
                conditionType: _conditionTypes[i],
                description: _descriptions[i],
                penaltyPercentage: _penaltyPercentages[i],
                isTriggered: false
            }));
            emit ConditionAdded(vowId, conditionCounter, _conditionTypes[i]);
        }

        emit VowSigned(vowId, msg.sender);
        return vowId;
    }

    /**
     * @notice Menandatangani perjanjian
     */
    function signVow(uint256 _vowId) external vowExists(_vowId) onlyPartner(_vowId) {
        Vow storage vow = vows[_vowId];
        require(vow.status == VowStatus.Draft || vow.status == VowStatus.PendingSignatures, "Cannot sign");

        if (msg.sender == vow.partnerA) {
            require(!vow.partnerASigned, "Already signed");
            vow.partnerASigned = true;
        } else {
            require(!vow.partnerBSigned, "Already signed");
            vow.partnerBSigned = true;
        }

        if (!vow.partnerASigned || !vow.partnerBSigned) {
            vow.status = VowStatus.PendingSignatures;
        }

        emit VowSigned(_vowId, msg.sender);
    }

    /**
     * @notice Sign dan Activate dalam 1 transaksi (untuk Partner B)
     * @dev Menggunakan pending escrow yang sudah di-set oleh Partner A
     */
    function signAndActivateWithCertificate(uint256 _vowId, uint256 _certificateId) 
        external vowExists(_vowId) onlyPartner(_vowId) onlyCertificatePartner(_certificateId) 
    {
        Vow storage vow = vows[_vowId];
        require(vow.status == VowStatus.PendingSignatures, "Invalid status");
        require(vow.pendingEscrowAmount >= MIN_ESCROW, "No pending escrow");
        
        // Sign
        if (msg.sender == vow.partnerA && !vow.partnerASigned) {
            vow.partnerASigned = true;
        } else if (msg.sender == vow.partnerB && !vow.partnerBSigned) {
            vow.partnerBSigned = true;
        } else {
            revert("Already signed");
        }
        
        emit VowSigned(_vowId, msg.sender);
        
        // Check if both signed
        require(vow.partnerASigned && vow.partnerBSigned, "Both must sign first");
        
        // Pastikan kedua partner ada di certificate
        require(isCertificatePartner(_certificateId, vow.partnerA), "PartnerA not in certificate");
        require(isCertificatePartner(_certificateId, vow.partnerB), "PartnerB not in certificate");
        
        uint256 escrowAmount = vow.pendingEscrowAmount;
        require(certificateSharedVault[_certificateId] >= escrowAmount, "Insufficient shared vault");
        
        // Deduct from certificate shared vault
        certificateSharedVault[_certificateId] -= escrowAmount;
        
        // Deduct proportionally from contributions
        uint256 contribA = certificateContribution[_certificateId][vow.partnerA];
        uint256 contribB = certificateContribution[_certificateId][vow.partnerB];
        uint256 total = contribA + contribB;
        
        if (total > 0) {
            uint256 deductA = (escrowAmount * contribA) / total;
            uint256 deductB = escrowAmount - deductA;
            certificateContribution[_certificateId][vow.partnerA] -= deductA;
            certificateContribution[_certificateId][vow.partnerB] -= deductB;
        }
        
        // Activate
        vow.escrowBalance = escrowAmount;
        vow.pendingEscrowAmount = 0;
        vow.status = VowStatus.Active;
        vow.activatedAt = block.timestamp;
        
        emit EscrowDeposited(_vowId, msg.sender, escrowAmount);
        emit VowActivated(_vowId, vow.escrowBalance);
    }

    /**
     * @notice Deposit escrow dan aktivasi perjanjian
     */
    function depositAndActivate(uint256 _vowId) external payable vowExists(_vowId) onlyPartner(_vowId) {
        Vow storage vow = vows[_vowId];
        require(vow.partnerASigned && vow.partnerBSigned, "Both must sign first");
        require(vow.status == VowStatus.PendingSignatures || vow.status == VowStatus.Draft, "Invalid status");
        require(msg.value >= MIN_ESCROW, "Insufficient escrow");

        vow.escrowBalance += msg.value;
        vow.status = VowStatus.Active;
        vow.activatedAt = block.timestamp;

        emit EscrowDeposited(_vowId, msg.sender, msg.value);
        emit VowActivated(_vowId, vow.escrowBalance);
    }

    /**
     * @notice Aktivasi dengan dana dari certificate shared vault
     */
    function activateWithCertificateVault(uint256 _vowId, uint256 _certificateId, uint256 _escrowAmount) 
        external vowExists(_vowId) onlyPartner(_vowId) onlyCertificatePartner(_certificateId) 
    {
        Vow storage vow = vows[_vowId];
        require(vow.partnerASigned && vow.partnerBSigned, "Both must sign first");
        require(vow.status == VowStatus.PendingSignatures || vow.status == VowStatus.Draft, "Invalid status");
        require(_escrowAmount >= MIN_ESCROW, "Insufficient escrow amount");
        require(certificateSharedVault[_certificateId] >= _escrowAmount, "Insufficient shared vault");
        
        // Pastikan kedua partner ada di certificate
        require(isCertificatePartner(_certificateId, vow.partnerA), "PartnerA not in certificate");
        require(isCertificatePartner(_certificateId, vow.partnerB), "PartnerB not in certificate");
        
        certificateSharedVault[_certificateId] -= _escrowAmount;
        
        // Deduct proportionally
        uint256 contribA = certificateContribution[_certificateId][vow.partnerA];
        uint256 contribB = certificateContribution[_certificateId][vow.partnerB];
        uint256 total = contribA + contribB;
        
        if (total > 0) {
            uint256 deductA = (_escrowAmount * contribA) / total;
            uint256 deductB = _escrowAmount - deductA;
            certificateContribution[_certificateId][vow.partnerA] -= deductA;
            certificateContribution[_certificateId][vow.partnerB] -= deductB;
        }
        
        vow.escrowBalance = _escrowAmount;
        vow.status = VowStatus.Active;
        vow.activatedAt = block.timestamp;

        emit EscrowDeposited(_vowId, msg.sender, _escrowAmount);
        emit VowActivated(_vowId, vow.escrowBalance);
    }

    /**
     * @notice Tambah kondisi ke perjanjian
     */
    function addCondition(
        uint256 _vowId,
        ConditionType _conditionType,
        string calldata _description,
        uint256 _penaltyPercentage
    ) external vowExists(_vowId) onlyPartner(_vowId) inStatus(_vowId, VowStatus.Draft) {
        require(_penaltyPercentage <= BASIS_POINTS, "Penalty exceeds 100%");

        conditionCounter++;
        vowConditions[_vowId].push(Condition({
            id: conditionCounter,
            conditionType: _conditionType,
            description: _description,
            penaltyPercentage: _penaltyPercentage,
            isTriggered: false
        }));

        emit ConditionAdded(_vowId, conditionCounter, _conditionType);
    }

    /**
     * @notice Tambah deposit escrow
     */
    function addEscrow(uint256 _vowId) external payable vowExists(_vowId) onlyPartner(_vowId) inStatus(_vowId, VowStatus.Active) {
        require(msg.value > 0, "Must send ETH");
        vows[_vowId].escrowBalance += msg.value;
        emit EscrowDeposited(_vowId, msg.sender, msg.value);
    }

    /**
     * @notice Melaporkan pelanggaran
     */
    function reportBreach(uint256 _vowId, uint256 _conditionIndex) 
        external onlyMediator vowExists(_vowId) inStatus(_vowId, VowStatus.Active) 
    {
        require(_conditionIndex < vowConditions[_vowId].length, "Invalid condition");
        
        Condition storage condition = vowConditions[_vowId][_conditionIndex];
        require(!condition.isTriggered, "Already triggered");
        
        condition.isTriggered = true;
        vows[_vowId].status = VowStatus.Breached;

        emit BreachReported(_vowId, condition.id, msg.sender);
    }

    /**
     * @notice Menyelesaikan sengketa
     */
    function resolveDispute(uint256 _vowId, address _beneficiary, uint256 _percentage) 
        external onlyMediator vowExists(_vowId) inStatus(_vowId, VowStatus.Breached) 
    {
        require(_percentage <= BASIS_POINTS, "Invalid percentage");
        require(_beneficiary == vows[_vowId].partnerA || _beneficiary == vows[_vowId].partnerB, "Invalid beneficiary");

        Vow storage vow = vows[_vowId];
        uint256 totalEscrow = vow.escrowBalance;
        vow.escrowBalance = 0;
        vow.status = VowStatus.Resolved;

        uint256 beneficiaryAmount = (totalEscrow * _percentage) / BASIS_POINTS;
        uint256 remainingAmount = totalEscrow - beneficiaryAmount;
        address otherPartner = _beneficiary == vow.partnerA ? vow.partnerB : vow.partnerA;

        if (beneficiaryAmount > 0) {
            (bool success1, ) = _beneficiary.call{value: beneficiaryAmount}("");
            require(success1, "Transfer failed");
        }
        if (remainingAmount > 0) {
            (bool success2, ) = otherPartner.call{value: remainingAmount}("");
            require(success2, "Transfer failed");
        }

        emit VowResolved(_vowId, _beneficiary, beneficiaryAmount);
    }

    /**
     * @notice Terminasi perjanjian
     */
    function terminateVow(uint256 _vowId) external onlyMediator vowExists(_vowId) {
        Vow storage vow = vows[_vowId];
        require(vow.status == VowStatus.Active, "Must be active");

        uint256 totalEscrow = vow.escrowBalance;
        vow.escrowBalance = 0;
        vow.status = VowStatus.Terminated;

        uint256 halfAmount = totalEscrow / 2;
        if (halfAmount > 0) {
            (bool success1, ) = vow.partnerA.call{value: halfAmount}("");
            require(success1, "Transfer failed");
            (bool success2, ) = vow.partnerB.call{value: totalEscrow - halfAmount}("");
            require(success2, "Transfer failed");
        }

        emit VowTerminated(_vowId);
    }

    // ============ View Functions ============

    function getVow(uint256 _vowId) external view vowExists(_vowId) returns (Vow memory) {
        return vows[_vowId];
    }

    function getConditions(uint256 _vowId) external view vowExists(_vowId) returns (Condition[] memory) {
        return vowConditions[_vowId];
    }

    function getUserVows(address _user) external view returns (uint256[] memory) {
        return userVows[_user];
    }

    function getConditionCount(uint256 _vowId) external view vowExists(_vowId) returns (uint256) {
        return vowConditions[_vowId].length;
    }

    // ============ Admin Functions ============

    function setMediator(address _newMediator) external onlyMediator {
        require(_newMediator != address(0), "Invalid address");
        address oldMediator = mediator;
        mediator = _newMediator;
        emit MediatorUpdated(oldMediator, _newMediator);
    }

    // ============ Claim Functions ============
    
    // Menyimpan persentase klaim
    mapping(uint256 => uint256) public claimPercentage;

    /**
     * @notice Submit internal claim DAN langsung distribusi dana KE BRANKAS PRIBADI
     * @dev Internal claim = auto-approve, transfer ke brankas pribadi claimant dan partner
     */
    function submitInternalClaim(uint256 _vowId, uint256 _penaltyPercentage) 
        external vowExists(_vowId) onlyPartner(_vowId) inStatus(_vowId, VowStatus.Active) 
    {
        require(!vowClaimed[_vowId], "Already claimed");
        require(_penaltyPercentage <= BASIS_POINTS, "Invalid percentage");
        
        Vow storage vow = vows[_vowId];
        uint256 totalEscrow = vow.escrowBalance;
        
        vowClaimed[_vowId] = true;
        claimant[_vowId] = msg.sender;
        claimPercentage[_vowId] = _penaltyPercentage;
        
        // Langsung distribusi dana ke BRANKAS PRIBADI (auto-approve untuk internal claim)
        vow.escrowBalance = 0;
        vow.status = VowStatus.Resolved;
        
        // Hitung pembagian berdasarkan persentase
        uint256 claimantAmount = (totalEscrow * _penaltyPercentage) / BASIS_POINTS;
        uint256 remainingAmount = totalEscrow - claimantAmount;
        address otherPartner = msg.sender == vow.partnerA ? vow.partnerB : vow.partnerA;
        
        // Transfer ke BRANKAS PRIBADI masing-masing
        if (claimantAmount > 0) {
            personalVault[msg.sender] += claimantAmount;
            emit PersonalDeposit(msg.sender, claimantAmount);
        }
        if (remainingAmount > 0) {
            personalVault[otherPartner] += remainingAmount;
            emit PersonalDeposit(otherPartner, remainingAmount);
        }
        
        emit ClaimSubmitted(_vowId, msg.sender, "internal");
        emit ClaimApproved(_vowId, msg.sender, claimantAmount);
    }

    /**
     * @notice Submit AI claim - membutuhkan approval mediator
     */
    function submitAIClaim(
        uint256 _vowId,
        string calldata _reason,
        string calldata,
        uint256
    ) external vowExists(_vowId) onlyPartner(_vowId) inStatus(_vowId, VowStatus.Active) {
        require(!vowClaimed[_vowId], "Already claimed");
        require(bytes(_reason).length > 0, "Reason required");
        
        vowClaimed[_vowId] = true;
        claimant[_vowId] = msg.sender;
        claimPercentage[_vowId] = BASIS_POINTS; // Default 100% untuk AI claim
        
        emit ClaimSubmitted(_vowId, msg.sender, "ai");
    }

    /**
     * @notice Approve klaim dan distribusi dana berdasarkan persentase
     * @dev Claimant mendapat persentase yang diklaim, sisanya ke partner lain
     */
    function approveClaim(uint256 _vowId) external onlyMediator vowExists(_vowId) {
        require(vowClaimed[_vowId], "No claim submitted");
        require(vows[_vowId].status == VowStatus.Active, "Vow not active");
        
        Vow storage vow = vows[_vowId];
        address _claimant = claimant[_vowId];
        uint256 percentage = claimPercentage[_vowId];
        uint256 totalEscrow = vow.escrowBalance;
        
        vow.escrowBalance = 0;
        vow.status = VowStatus.Resolved;
        
        // Hitung pembagian berdasarkan persentase
        uint256 claimantAmount = (totalEscrow * percentage) / BASIS_POINTS;
        uint256 remainingAmount = totalEscrow - claimantAmount;
        address otherPartner = _claimant == vow.partnerA ? vow.partnerB : vow.partnerA;
        
        if (claimantAmount > 0) {
            (bool success1, ) = _claimant.call{value: claimantAmount}("");
            require(success1, "Transfer to claimant failed");
        }
        if (remainingAmount > 0) {
            (bool success2, ) = otherPartner.call{value: remainingAmount}("");
            require(success2, "Transfer to other partner failed");
        }
        
        emit ClaimApproved(_vowId, _claimant, claimantAmount);
    }

    // Legacy function untuk backward compatibility
    function approveAIClaim(uint256 _vowId) external onlyMediator vowExists(_vowId) {
        require(vowClaimed[_vowId], "No claim submitted");
        require(vows[_vowId].status == VowStatus.Active, "Vow not active");
        
        Vow storage vow = vows[_vowId];
        address _claimant = claimant[_vowId];
        uint256 percentage = claimPercentage[_vowId];
        uint256 totalEscrow = vow.escrowBalance;
        
        vow.escrowBalance = 0;
        vow.status = VowStatus.Resolved;
        
        // Hitung pembagian berdasarkan persentase
        uint256 claimantAmount = (totalEscrow * percentage) / BASIS_POINTS;
        uint256 remainingAmount = totalEscrow - claimantAmount;
        address otherPartner = _claimant == vow.partnerA ? vow.partnerB : vow.partnerA;
        
        if (claimantAmount > 0) {
            (bool success1, ) = _claimant.call{value: claimantAmount}("");
            require(success1, "Transfer to claimant failed");
        }
        if (remainingAmount > 0) {
            (bool success2, ) = otherPartner.call{value: remainingAmount}("");
            require(success2, "Transfer to other partner failed");
        }
        
        emit ClaimApproved(_vowId, _claimant, claimantAmount);
    }

    // ============ Receive Function ============

    receive() external payable {
        personalVault[msg.sender] += msg.value;
        emit PersonalDeposit(msg.sender, msg.value);
    }
}
