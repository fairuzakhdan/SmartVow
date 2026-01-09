// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SmartVow - Perjanjian Pra Nikah on Base
 * @notice Smart contract untuk mengelola perjanjian pra nikah secara terdesentralisasi
 * @dev Mendukung escrow, kondisi pelanggaran, dan penyelesaian sengketa
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
        uint256 penaltyPercentage; // dalam basis points (100 = 1%)
        bool isTriggered;
    }

    struct Vow {
        uint256 id;
        address partnerA;
        address partnerB;
        uint256 escrowBalance;
        uint256 pendingEscrowAmount; // Jumlah escrow yang akan dikunci saat aktivasi
        VowStatus status;
        uint256 createdAt;
        uint256 activatedAt;
        bool partnerASigned;
        bool partnerBSigned;
        string metadataURI; // IPFS URI untuk data tambahan
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
    
    // Brankas System
    mapping(address => uint256) public personalVault; // Brankas pribadi
    mapping(address => uint256) public sharedVaultContribution; // Kontribusi ke brankas bersama
    uint256 public totalSharedVault; // Total brankas bersama
    
    // Claim System
    mapping(uint256 => bool) public vowClaimed; // Apakah vow sudah diklaim
    mapping(uint256 => address) public claimant; // Siapa yang mengklaim


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
    event SharedDeposit(address indexed user, uint256 amount);
    event PersonalWithdraw(address indexed user, uint256 amount);
    
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

    // ============ Constructor ============
    constructor() {
        mediator = msg.sender;
    }

    // ============ External Functions ============

    /**
     * @notice Membuat perjanjian pra nikah baru
     * @param _partnerB Alamat pasangan kedua
     * @param _metadataURI URI metadata (IPFS)
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
     * @notice Buat perjanjian lengkap dalam 1 transaksi (create + conditions + sign Partner A)
     * @param _partnerB Alamat pasangan kedua
     * @param _metadataURI URI metadata (IPFS)
     * @param _conditionTypes Array tipe kondisi
     * @param _descriptions Array deskripsi kondisi
     * @param _penaltyPercentages Array persentase penalti (basis points)
     */
    function createVowComplete(
        address _partnerB,
        string calldata _metadataURI,
        ConditionType[] calldata _conditionTypes,
        string[] calldata _descriptions,
        uint256[] calldata _penaltyPercentages
    ) external returns (uint256) {
        require(_partnerB != address(0), "Invalid partner address");
        require(_partnerB != msg.sender, "Cannot create vow with yourself");
        require(_conditionTypes.length == _descriptions.length, "Array length mismatch");
        require(_conditionTypes.length == _penaltyPercentages.length, "Array length mismatch");

        // 1. Create vow
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

        // 2. Add all conditions
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

        // 3. Sign as Partner A
        vows[vowId].partnerASigned = true;
        vows[vowId].status = VowStatus.PendingSignatures;
        
        emit VowSigned(vowId, msg.sender);

        return vowId;
    }

    /**
     * @notice Buat perjanjian lengkap + set pending escrow dalam 1 transaksi (untuk Partner A)
     * @dev Escrow BELUM dikunci, hanya dicatat. Akan dikunci saat Partner B aktivasi.
     * @param _partnerB Alamat pasangan kedua
     * @param _metadataURI URI metadata (IPFS)
     * @param _conditionTypes Array tipe kondisi
     * @param _descriptions Array deskripsi kondisi
     * @param _penaltyPercentages Array persentase penalti (basis points)
     * @param _escrowAmount Jumlah escrow yang akan dikunci saat aktivasi
     */
    function createVowAndLockEscrow(
        address _partnerB,
        string calldata _metadataURI,
        ConditionType[] calldata _conditionTypes,
        string[] calldata _descriptions,
        uint256[] calldata _penaltyPercentages,
        uint256 _escrowAmount
    ) external returns (uint256) {
        require(_partnerB != address(0), "Invalid partner address");
        require(_partnerB != msg.sender, "Cannot create vow with yourself");
        require(_conditionTypes.length == _descriptions.length, "Array length mismatch");
        require(_conditionTypes.length == _penaltyPercentages.length, "Array length mismatch");
        require(_escrowAmount >= MIN_ESCROW, "Insufficient escrow amount");

        // Check shared vault balance (hanya validasi, belum dikurangi)
        uint256 callerContribution = sharedVaultContribution[msg.sender];
        uint256 partnerContribution = sharedVaultContribution[_partnerB];
        uint256 totalAvailable = callerContribution + partnerContribution;
        require(totalAvailable >= _escrowAmount, "Insufficient shared vault balance");

        // 1. Create vow dengan pendingEscrowAmount (BELUM dikunci)
        vowCounter++;
        uint256 vowId = vowCounter;

        vows[vowId] = Vow({
            id: vowId,
            partnerA: msg.sender,
            partnerB: _partnerB,
            escrowBalance: 0, // Escrow BELUM dikunci
            pendingEscrowAmount: _escrowAmount, // Jumlah yang akan dikunci saat aktivasi
            status: VowStatus.PendingSignatures, // Menunggu Partner B
            createdAt: block.timestamp,
            activatedAt: 0,
            partnerASigned: true, // Partner A langsung sign
            partnerBSigned: false,
            metadataURI: _metadataURI
        });

        userVows[msg.sender].push(vowId);
        userVows[_partnerB].push(vowId);

        emit VowCreated(vowId, msg.sender, _partnerB);

        // 2. Add all conditions
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
     * @notice Partner B sign dan aktivasi (escrow dikunci dari shared vault saat ini)
     * @dev Hanya butuh gas fee, escrow diambil dari shared vault
     * @param _vowId ID perjanjian
     */
    function signAndActivateOnly(uint256 _vowId) external vowExists(_vowId) onlyPartner(_vowId) {
        Vow storage vow = vows[_vowId];
        
        // Pastikan ini Partner B
        require(msg.sender == vow.partnerB, "Only Partner B can use this");
        require(!vow.partnerBSigned, "Already signed");
        require(vow.partnerASigned, "Partner A must sign first");
        require(vow.status == VowStatus.PendingSignatures, "Invalid status");
        require(vow.pendingEscrowAmount >= MIN_ESCROW, "No pending escrow");
        
        // Lock escrow dari shared vault
        uint256 escrowAmount = vow.pendingEscrowAmount;
        uint256 callerContribution = sharedVaultContribution[msg.sender];
        uint256 partnerContribution = sharedVaultContribution[vow.partnerA];
        uint256 totalAvailable = callerContribution + partnerContribution;
        
        require(totalAvailable >= escrowAmount, "Insufficient shared vault balance");
        
        // Deduct from shared vault (dari Partner A dulu, lalu Partner B jika kurang)
        uint256 remaining = escrowAmount;
        if (partnerContribution >= remaining) {
            sharedVaultContribution[vow.partnerA] -= remaining;
        } else {
            remaining -= partnerContribution;
            sharedVaultContribution[vow.partnerA] = 0;
            sharedVaultContribution[msg.sender] -= remaining;
        }
        totalSharedVault -= escrowAmount;
        
        // Set escrow balance dan clear pending
        vow.escrowBalance = escrowAmount;
        vow.pendingEscrowAmount = 0;
        
        // Sign
        vow.partnerBSigned = true;
        
        // Activate
        vow.status = VowStatus.Active;
        vow.activatedAt = block.timestamp;

        emit VowSigned(_vowId, msg.sender);
        emit EscrowDeposited(_vowId, msg.sender, escrowAmount);
        emit VowActivated(_vowId, vow.escrowBalance);
    }


    /**
     * @notice Menambahkan kondisi ke perjanjian
     * @param _vowId ID perjanjian
     * @param _conditionType Tipe kondisi
     * @param _description Deskripsi kondisi
     * @param _penaltyPercentage Persentase penalti (basis points)
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
     * @notice Menandatangani perjanjian
     * @param _vowId ID perjanjian
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
     * @notice Deposit escrow dan aktivasi perjanjian
     * @param _vowId ID perjanjian
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
     * @notice Aktivasi perjanjian menggunakan dana dari shared vault sebagai escrow
     * @param _vowId ID perjanjian
     * @param _escrowAmount Jumlah escrow yang akan diambil dari shared vault
     */
    function activateWithSharedVault(uint256 _vowId, uint256 _escrowAmount) external vowExists(_vowId) onlyPartner(_vowId) {
        Vow storage vow = vows[_vowId];
        require(vow.partnerASigned && vow.partnerBSigned, "Both must sign first");
        require(vow.status == VowStatus.PendingSignatures || vow.status == VowStatus.Draft, "Invalid status");
        require(_escrowAmount >= MIN_ESCROW, "Insufficient escrow amount");
        
        // Get both partners' contributions
        address otherPartner = msg.sender == vow.partnerA ? vow.partnerB : vow.partnerA;
        uint256 callerContribution = sharedVaultContribution[msg.sender];
        uint256 otherContribution = sharedVaultContribution[otherPartner];
        uint256 totalAvailable = callerContribution + otherContribution;
        
        require(totalAvailable >= _escrowAmount, "Insufficient shared vault balance");
        
        // Deduct from shared vault (proportionally or from caller first)
        uint256 remaining = _escrowAmount;
        
        if (callerContribution >= remaining) {
            sharedVaultContribution[msg.sender] -= remaining;
            remaining = 0;
        } else {
            remaining -= callerContribution;
            sharedVaultContribution[msg.sender] = 0;
            sharedVaultContribution[otherPartner] -= remaining;
        }
        
        totalSharedVault -= _escrowAmount;
        
        // Set escrow and activate
        vow.escrowBalance = _escrowAmount;
        vow.status = VowStatus.Active;
        vow.activatedAt = block.timestamp;

        emit EscrowDeposited(_vowId, msg.sender, _escrowAmount);
        emit VowActivated(_vowId, vow.escrowBalance);
    }

    /**
     * @notice Sign dan aktivasi dalam 1 transaksi (untuk Partner B)
     * @param _vowId ID perjanjian
     * @param _escrowAmount Jumlah escrow yang akan diambil dari shared vault (bisa 0 jika tidak pakai escrow)
     */
    function signAndActivate(uint256 _vowId, uint256 _escrowAmount) external vowExists(_vowId) onlyPartner(_vowId) {
        Vow storage vow = vows[_vowId];
        
        // 1. Sign dulu jika belum
        if (msg.sender == vow.partnerA && !vow.partnerASigned) {
            vow.partnerASigned = true;
            emit VowSigned(_vowId, msg.sender);
        } else if (msg.sender == vow.partnerB && !vow.partnerBSigned) {
            vow.partnerBSigned = true;
            emit VowSigned(_vowId, msg.sender);
        }
        
        // 2. Cek apakah kedua pihak sudah sign
        require(vow.partnerASigned && vow.partnerBSigned, "Both must sign first");
        require(vow.status == VowStatus.Draft || vow.status == VowStatus.PendingSignatures, "Invalid status");
        
        // 3. Jika ada escrow amount, ambil dari shared vault
        if (_escrowAmount > 0) {
            address otherPartner = msg.sender == vow.partnerA ? vow.partnerB : vow.partnerA;
            uint256 callerContribution = sharedVaultContribution[msg.sender];
            uint256 otherContribution = sharedVaultContribution[otherPartner];
            uint256 totalAvailable = callerContribution + otherContribution;
            
            require(totalAvailable >= _escrowAmount, "Insufficient shared vault balance");
            
            uint256 remaining = _escrowAmount;
            
            if (callerContribution >= remaining) {
                sharedVaultContribution[msg.sender] -= remaining;
                remaining = 0;
            } else {
                remaining -= callerContribution;
                sharedVaultContribution[msg.sender] = 0;
                sharedVaultContribution[otherPartner] -= remaining;
            }
            
            totalSharedVault -= _escrowAmount;
            vow.escrowBalance = _escrowAmount;
            
            emit EscrowDeposited(_vowId, msg.sender, _escrowAmount);
        }
        
        // 4. Aktivasi
        vow.status = VowStatus.Active;
        vow.activatedAt = block.timestamp;

        emit VowActivated(_vowId, vow.escrowBalance);
    }

    /**
     * @notice Tambah deposit escrow
     * @param _vowId ID perjanjian
     */
    function addEscrow(uint256 _vowId) external payable vowExists(_vowId) onlyPartner(_vowId) inStatus(_vowId, VowStatus.Active) {
        require(msg.value > 0, "Must send ETH");
        vows[_vowId].escrowBalance += msg.value;
        emit EscrowDeposited(_vowId, msg.sender, msg.value);
    }


    /**
     * @notice Melaporkan pelanggaran (hanya mediator)
     * @param _vowId ID perjanjian
     * @param _conditionIndex Index kondisi yang dilanggar
     */
    function reportBreach(
        uint256 _vowId,
        uint256 _conditionIndex
    ) external onlyMediator vowExists(_vowId) inStatus(_vowId, VowStatus.Active) {
        require(_conditionIndex < vowConditions[_vowId].length, "Invalid condition");
        
        Condition storage condition = vowConditions[_vowId][_conditionIndex];
        require(!condition.isTriggered, "Already triggered");
        
        condition.isTriggered = true;
        vows[_vowId].status = VowStatus.Breached;

        emit BreachReported(_vowId, condition.id, msg.sender);
    }

    /**
     * @notice Menyelesaikan sengketa dan distribusi escrow
     * @param _vowId ID perjanjian
     * @param _beneficiary Penerima kompensasi
     * @param _percentage Persentase escrow untuk beneficiary (basis points)
     */
    function resolveDispute(
        uint256 _vowId,
        address _beneficiary,
        uint256 _percentage
    ) external onlyMediator vowExists(_vowId) inStatus(_vowId, VowStatus.Breached) {
        require(_percentage <= BASIS_POINTS, "Invalid percentage");
        require(
            _beneficiary == vows[_vowId].partnerA || _beneficiary == vows[_vowId].partnerB,
            "Beneficiary must be a partner"
        );

        Vow storage vow = vows[_vowId];
        uint256 totalEscrow = vow.escrowBalance;
        vow.escrowBalance = 0;
        vow.status = VowStatus.Resolved;

        uint256 beneficiaryAmount = (totalEscrow * _percentage) / BASIS_POINTS;
        uint256 remainingAmount = totalEscrow - beneficiaryAmount;

        address otherPartner = _beneficiary == vow.partnerA ? vow.partnerB : vow.partnerA;

        if (beneficiaryAmount > 0) {
            (bool success1, ) = _beneficiary.call{value: beneficiaryAmount}("");
            require(success1, "Transfer to beneficiary failed");
        }

        if (remainingAmount > 0) {
            (bool success2, ) = otherPartner.call{value: remainingAmount}("");
            require(success2, "Transfer to other partner failed");
        }

        emit VowResolved(_vowId, _beneficiary, beneficiaryAmount);
    }

    /**
     * @notice Terminasi perjanjian secara mutual (kedua pihak setuju)
     * @param _vowId ID perjanjian
     */
    function terminateVow(uint256 _vowId) external onlyMediator vowExists(_vowId) {
        Vow storage vow = vows[_vowId];
        require(vow.status == VowStatus.Active, "Must be active");

        uint256 totalEscrow = vow.escrowBalance;
        vow.escrowBalance = 0;
        vow.status = VowStatus.Terminated;

        // Split 50-50
        uint256 halfAmount = totalEscrow / 2;
        
        if (halfAmount > 0) {
            (bool success1, ) = vow.partnerA.call{value: halfAmount}("");
            require(success1, "Transfer to partnerA failed");
            
            (bool success2, ) = vow.partnerB.call{value: totalEscrow - halfAmount}("");
            require(success2, "Transfer to partnerB failed");
        }

        emit VowTerminated(_vowId);
    }


    // ============ View Functions ============

    /**
     * @notice Mendapatkan detail perjanjian
     */
    function getVow(uint256 _vowId) external view returns (Vow memory) {
        return vows[_vowId];
    }

    /**
     * @notice Mendapatkan semua kondisi perjanjian
     */
    function getConditions(uint256 _vowId) external view returns (Condition[] memory) {
        return vowConditions[_vowId];
    }

    /**
     * @notice Mendapatkan semua perjanjian user
     */
    function getUserVows(address _user) external view returns (uint256[] memory) {
        return userVows[_user];
    }

    /**
     * @notice Mendapatkan jumlah kondisi
     */
    function getConditionCount(uint256 _vowId) external view returns (uint256) {
        return vowConditions[_vowId].length;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update mediator
     */
    function setMediator(address _newMediator) external onlyMediator {
        require(_newMediator != address(0), "Invalid address");
        address oldMediator = mediator;
        mediator = _newMediator;
        emit MediatorUpdated(oldMediator, _newMediator);
    }

    // ============ Brankas Functions ============

    /**
     * @notice Deposit ke brankas pribadi
     */
    function depositPersonal() external payable {
        require(msg.value > 0, "Must send ETH");
        personalVault[msg.sender] += msg.value;
        emit PersonalDeposit(msg.sender, msg.value);
    }

    /**
     * @notice Transfer dari brankas pribadi ke brankas bersama
     */
    function transferToShared(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(personalVault[msg.sender] >= _amount, "Insufficient personal balance");
        
        personalVault[msg.sender] -= _amount;
        sharedVaultContribution[msg.sender] += _amount;
        totalSharedVault += _amount;
        
        emit SharedDeposit(msg.sender, _amount);
    }

    /**
     * @notice Withdraw dari brankas pribadi
     */
    function withdrawPersonal(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(personalVault[msg.sender] >= _amount, "Insufficient balance");
        
        personalVault[msg.sender] -= _amount;
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit PersonalWithdraw(msg.sender, _amount);
    }

    /**
     * @notice Get brankas balances
     */
    function getVaultBalances(address _user) external view returns (
        uint256 personal,
        uint256 sharedContribution,
        uint256 totalShared
    ) {
        return (
            personalVault[_user],
            sharedVaultContribution[_user],
            totalSharedVault
        );
    }

    // ============ Claim Functions ============

    /**
     * @notice Submit klaim internal dengan persentase penalty
     * @dev Claimant mendapat persentase dari escrow sesuai penalty, sisanya kembali ke partner lain
     * @param _vowId ID perjanjian
     * @param _penaltyPercentage Persentase penalty dalam basis points (100 = 1%, 10000 = 100%)
     */
    function submitInternalClaim(uint256 _vowId, uint256 _penaltyPercentage) external vowExists(_vowId) onlyPartner(_vowId) {
        require(!vowClaimed[_vowId], "Already claimed");
        require(_penaltyPercentage <= BASIS_POINTS, "Penalty exceeds 100%");
        
        Vow storage vow = vows[_vowId];
        // Allow claim if vow is Active OR if both partners have signed
        require(
            vow.status == VowStatus.Active || 
            (vow.partnerASigned && vow.partnerBSigned),
            "Vow must be active or fully signed"
        );
        
        vowClaimed[_vowId] = true;
        claimant[_vowId] = msg.sender;
        
        // Get partner addresses
        address otherPartner = msg.sender == vow.partnerA ? vow.partnerB : vow.partnerA;
        
        // Get escrow amount from vow
        uint256 escrowAmount = vow.escrowBalance;
        vow.escrowBalance = 0;
        
        // Calculate amounts based on penalty percentage
        uint256 claimantAmount = (escrowAmount * _penaltyPercentage) / BASIS_POINTS;
        uint256 otherPartnerAmount = escrowAmount - claimantAmount;
        
        // Transfer to claimant's personal vault
        if (claimantAmount > 0) {
            personalVault[msg.sender] += claimantAmount;
        }
        
        // Return remaining to other partner's personal vault
        if (otherPartnerAmount > 0) {
            personalVault[otherPartner] += otherPartnerAmount;
        }
        
        vow.status = VowStatus.Resolved;
        
        emit ClaimSubmitted(_vowId, msg.sender, "internal");
        emit ClaimApproved(_vowId, msg.sender, claimantAmount);
    }

    /**
     * @notice Submit klaim AI verification (perlu approval manual)
     */
    function submitAIClaim(
        uint256 _vowId,
        string calldata _reason,
        string calldata _evidence,
        uint256 _timestamp
    ) external vowExists(_vowId) onlyPartner(_vowId) {
        require(!vowClaimed[_vowId], "Already claimed");
        
        Vow storage vow = vows[_vowId];
        // Allow claim if vow is Active OR if both partners have signed
        require(
            vow.status == VowStatus.Active || 
            (vow.partnerASigned && vow.partnerBSigned),
            "Vow must be active or fully signed"
        );
        
        // Simpan klaim untuk review (bisa disimpan di mapping atau emit event)
        claimant[_vowId] = msg.sender;
        
        emit ClaimSubmitted(_vowId, msg.sender, "ai_verification");
        
        // Note: AI verification akan dihandle di frontend
        // Mediator bisa approve/reject berdasarkan AI analysis
    }

    /**
     * @notice Approve AI claim (hanya mediator) - Transfer dari shared vault ke personal vault
     * @dev Claimant mendapat seluruh shared vault + escrow
     */
    function approveAIClaim(uint256 _vowId) external onlyMediator vowExists(_vowId) {
        require(!vowClaimed[_vowId], "Already claimed");
        require(claimant[_vowId] != address(0), "No pending claim");
        
        Vow storage vow = vows[_vowId];
        vowClaimed[_vowId] = true;
        
        address claimer = claimant[_vowId];
        address otherPartner = claimer == vow.partnerA ? vow.partnerB : vow.partnerA;
        
        // Calculate total to transfer: claimer's contribution + other partner's contribution
        uint256 claimerContribution = sharedVaultContribution[claimer];
        uint256 otherContribution = sharedVaultContribution[otherPartner];
        uint256 totalFromSharedVault = claimerContribution + otherContribution;
        
        uint256 escrowAmount = vow.escrowBalance;
        if (escrowAmount > 0) {
            vow.escrowBalance = 0;
        }
        
        // Total amount to transfer to personal vault
        uint256 totalClaimAmount = totalFromSharedVault + escrowAmount;
        
        // Transfer shared vault contributions
        if (totalFromSharedVault > 0) {
            if (claimerContribution > 0) {
                sharedVaultContribution[claimer] = 0;
            }
            if (otherContribution > 0) {
                sharedVaultContribution[otherPartner] = 0;
            }
            totalSharedVault -= totalFromSharedVault;
        }
        
        // Transfer ALL (shared vault + escrow) to personal vault
        if (totalClaimAmount > 0) {
            personalVault[claimer] += totalClaimAmount;
        }
        
        vow.status = VowStatus.Resolved;
        
        emit ClaimApproved(_vowId, claimer, totalClaimAmount);
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}
