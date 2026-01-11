import { ethers } from 'ethers';

// SmartVow Contract ABI (V3 - Brankas Bersama Per Certificate)
export const SMARTVOW_ABI = [
  // Events
  "event VowCreated(uint256 indexed vowId, address indexed partnerA, address indexed partnerB)",
  "event VowSigned(uint256 indexed vowId, address indexed signer)",
  "event VowActivated(uint256 indexed vowId, uint256 escrowAmount)",
  "event EscrowDeposited(uint256 indexed vowId, address indexed depositor, uint256 amount)",
  "event ConditionAdded(uint256 indexed vowId, uint256 conditionId, uint8 conditionType)",
  "event BreachReported(uint256 indexed vowId, uint256 conditionId, address reporter)",
  "event VowResolved(uint256 indexed vowId, address beneficiary, uint256 amount)",
  "event VowTerminated(uint256 indexed vowId)",
  "event PersonalDeposit(address indexed user, uint256 amount)",
  "event SharedDeposit(uint256 indexed certificateId, address indexed user, uint256 amount)",
  "event PersonalWithdraw(address indexed user, uint256 amount)",
  "event CertificateRegistered(uint256 indexed certificateId, address indexed partnerA, address indexed partnerB)",
  "event ClaimSubmitted(uint256 indexed vowId, address indexed claimant, string claimType)",
  "event ClaimApproved(uint256 indexed vowId, address indexed claimant, uint256 amount)",

  // Read Functions
  "function vowCounter() view returns (uint256)",
  "function mediator() view returns (address)",
  "function getVow(uint256 _vowId) view returns (tuple(uint256 id, address partnerA, address partnerB, uint256 escrowBalance, uint256 pendingEscrowAmount, uint8 status, uint256 createdAt, uint256 activatedAt, bool partnerASigned, bool partnerBSigned, string metadataURI))",
  "function getConditions(uint256 _vowId) view returns (tuple(uint256 id, uint8 conditionType, string description, uint256 penaltyPercentage, bool isTriggered)[])",
  "function getUserVows(address _user) view returns (uint256[])",
  "function getConditionCount(uint256 _vowId) view returns (uint256)",

  // Certificate Registration Functions
  "function registerCertificate(uint256 _certificateId, address _partnerA, address _partnerB)",
  "function isCertificatePartner(uint256 _certId, address _user) view returns (bool)",
  "function getMyCertificates() view returns (uint256[])",
  "function getCertificatePartners(uint256 _certId) view returns (address partnerA, address partnerB)",
  "function certificateActive(uint256 _certId) view returns (bool)",
  "function certificatePartnerA(uint256 _certId) view returns (address)",
  "function certificatePartnerB(uint256 _certId) view returns (address)",

  // Write Functions
  "function createVow(address _partnerB, string _metadataURI) returns (uint256)",
  "function createVowWithCertificateEscrow(address _partnerB, string _metadataURI, uint8[] _conditionTypes, string[] _descriptions, uint256[] _penaltyPercentages, uint256 _escrowAmount, uint256 _certificateId) returns (uint256)",
  "function addCondition(uint256 _vowId, uint8 _conditionType, string _description, uint256 _penaltyPercentage)",
  "function signVow(uint256 _vowId)",
  "function signAndActivateWithCertificate(uint256 _vowId, uint256 _certificateId)",
  "function depositAndActivate(uint256 _vowId) payable",
  "function activateWithCertificateVault(uint256 _vowId, uint256 _certificateId, uint256 _escrowAmount)",
  "function addEscrow(uint256 _vowId) payable",
  "function reportBreach(uint256 _vowId, uint256 _conditionIndex)",
  "function resolveDispute(uint256 _vowId, address _beneficiary, uint256 _percentage)",
  "function terminateVow(uint256 _vowId)",
  "function setMediator(address _newMediator)",

  // Brankas Pribadi Functions
  "function depositPersonal() payable",
  "function withdrawPersonal(uint256 _amount)",
  "function getMyPersonalVault() view returns (uint256)",

  // Brankas Bersama Functions (Per Certificate - PRIVATE)
  "function transferToSharedVault(uint256 _certificateId, uint256 _amount)",
  "function depositToSharedVault(uint256 _certificateId) payable",
  "function getSharedVaultInfo(uint256 _certificateId) view returns (uint256 totalBalance, uint256 myContribution, uint256 partnerContribution, address partnerA, address partnerB)",
  "function getSharedVaultBalance(uint256 _certificateId) view returns (uint256)",
  "function getMySharedContribution(uint256 _certificateId) view returns (uint256)",
  "function getAllMySharedVaults() view returns (uint256[] certificateIds, uint256[] balances, uint256[] myContributions)",
  "function getMyVaultSummary() view returns (uint256 personalBalance, uint256 totalSharedBalance, uint256 certificateCount)",

  // Claim Functions
  "function submitInternalClaim(uint256 _vowId, uint256 _penaltyPercentage)",
  "function submitAIClaim(uint256 _vowId, string _reason, string _evidence, uint256 _timestamp)",
  "function approveClaim(uint256 _vowId)",
  "function approveAIClaim(uint256 _vowId)",
  "function vowClaimed(uint256 _vowId) view returns (bool)",
  "function claimant(uint256 _vowId) view returns (address)",
  "function claimPercentage(uint256 _vowId) view returns (uint256)"
] as const;

// Contract Address - ganti dengan address setelah deploy
export const SMARTVOW_ADDRESS = import.meta.env.VITE_SMARTVOW_ADDRESS || '0x0000000000000000000000000000000000000000';

// Base Sepolia Chain Config
export const BASE_SEPOLIA_CHAIN = {
  chainId: '0x14a34', // 84532
  chainName: 'Base Sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://sepolia.base.org'],
  blockExplorerUrls: ['https://sepolia.basescan.org']
};

// Base Mainnet Chain Config
export const BASE_MAINNET_CHAIN = {
  chainId: '0x2105', // 8453
  chainName: 'Base',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org']
};

// Enum mapping sesuai contract
export enum ContractVowStatus {
  Draft = 0,
  PendingSignatures = 1,
  Active = 2,
  Breached = 3,
  Resolved = 4,
  Terminated = 5
}

export enum ContractConditionType {
  Infidelity = 0,
  KDRT = 1,
  Financial = 2,
  Custom = 3
}


// Types
export interface ContractVow {
  id: bigint;
  partnerA: string;
  partnerB: string;
  escrowBalance: bigint;
  pendingEscrowAmount: bigint;
  status: number;
  createdAt: bigint;
  activatedAt: bigint;
  partnerASigned: boolean;
  partnerBSigned: boolean;
  metadataURI: string;
}

export interface ContractCondition {
  id: bigint;
  conditionType: number;
  description: string;
  penaltyPercentage: bigint;
  isTriggered: boolean;
}

class Web3Service {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;

  // Check if wallet is available
  isWalletAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  // Connect wallet
  async connectWallet(): Promise<string> {
    if (!this.isWalletAvailable()) {
      throw new Error('Please install MetaMask or another Web3 wallet');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    await this.provider.send('eth_requestAccounts', []);
    this.signer = await this.provider.getSigner();
    
    const address = await this.signer.getAddress();
    this.contract = new ethers.Contract(SMARTVOW_ADDRESS, SMARTVOW_ABI, this.signer);
    
    return address;
  }

  // Get current account
  async getAccount(): Promise<string | null> {
    if (!this.signer) return null;
    return await this.signer.getAddress();
  }

  // Switch to Base network
  async switchToBase(testnet: boolean = true): Promise<void> {
    if (!this.isWalletAvailable()) throw new Error('Wallet not available');

    const chain = testnet ? BASE_SEPOLIA_CHAIN : BASE_MAINNET_CHAIN;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chain.chainId }]
      });
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [chain]
        });
      } else {
        throw error;
      }
    }
  }

  // Get contract instance
  private getContract(): ethers.Contract {
    if (!this.contract) throw new Error('Please connect wallet first');
    return this.contract;
  }

  // Check if contract is deployed and accessible
  async checkContractDeployment(): Promise<boolean> {
    try {
      const contract = this.getContract();
      console.log('Checking contract at:', contract.target);
      
      // Check network
      const network = await this.provider?.getNetwork();
      console.log('Current network:', network?.name, 'chainId:', network?.chainId);
      
      if (network?.chainId !== 84532n) {
        console.error('Wrong network! Expected Base Sepolia (84532), got:', network?.chainId);
        return false;
      }
      
      // Check if contract has code
      const code = await this.provider?.getCode(contract.target as string);
      console.log('Contract code length:', code?.length);
      
      if (!code || code === '0x') {
        console.error('No contract code found at address:', contract.target);
        return false;
      }
      
      // Try to call a simple view function
      const mediator = await contract.mediator();
      console.log('Contract mediator:', mediator);
      
      return true;
    } catch (error) {
      console.error('Contract check failed:', error);
      return false;
    }
  }


  // ============ Read Functions ============

  async getVowCount(): Promise<number> {
    const contract = this.getContract();
    const count = await contract.vowCounter();
    return Number(count);
  }

  async getVow(vowId: number): Promise<ContractVow> {
    const contract = this.getContract();
    return await contract.getVow(vowId);
  }

  async getConditions(vowId: number): Promise<ContractCondition[]> {
    const contract = this.getContract();
    return await contract.getConditions(vowId);
  }

  async getUserVows(address: string): Promise<number[]> {
    const contract = this.getContract();
    const vowIds = await contract.getUserVows(address);
    return vowIds.map((id: bigint) => Number(id));
  }

  async getMediator(): Promise<string> {
    const contract = this.getContract();
    return await contract.mediator();
  }

  // ============ Write Functions ============

  async createVow(partnerB: string, metadataURI: string): Promise<{ vowId: number; txHash: string }> {
    const contract = this.getContract();
    const tx = await contract.createVow(partnerB, metadataURI);
    const receipt = await tx.wait();
    
    // Parse event to get vowId
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === 'VowCreated';
      } catch { return false; }
    });

    const parsedEvent = contract.interface.parseLog(event);
    const vowId = Number(parsedEvent?.args[0] || 0);

    return { vowId, txHash: receipt.hash };
  }

  // Create vow + lock escrow dalam 1 transaksi (untuk Partner A)
  // V3: Menggunakan createVowWithCertificateEscrow yang membutuhkan certificateId
  async createVowAndLockEscrow(
    partnerB: string,
    metadataURI: string,
    conditionTypes: number[],
    descriptions: string[],
    penaltyPercentages: number[],
    escrowAmountInEth: string,
    certificateId?: number
  ): Promise<{ vowId: number; txHash: string }> {
    const contract = this.getContract();
    const escrowWei = ethers.parseEther(escrowAmountInEth);
    
    console.log('=== CREATE VOW WITH CERTIFICATE ESCROW ===');
    console.log('Partner B:', partnerB);
    console.log('Escrow:', escrowAmountInEth, 'ETH');
    
    // Get certificate ID if not provided
    let certId = certificateId;
    if (!certId) {
      const myCerts = await this.getMyCertificates();
      console.log('My certificates:', myCerts);
      
      if (myCerts.length === 0) {
        throw new Error('Anda belum memiliki sertifikat pernikahan. Silakan mint Marriage Certificate terlebih dahulu.');
      }
      
      // Find certificate with this partner
      for (const cid of myCerts) {
        const isPartner = await contract.isCertificatePartner(cid, partnerB);
        if (isPartner) {
          certId = cid;
          break;
        }
      }
      
      if (!certId) {
        // Use latest certificate
        certId = myCerts[myCerts.length - 1];
      }
    }
    
    console.log('Using certificate ID:', certId);
    
    // Check shared vault balance
    try {
      const sharedBalance = await contract.getSharedVaultBalance(certId);
      console.log('Shared vault balance:', ethers.formatEther(sharedBalance), 'ETH');
      
      if (sharedBalance < escrowWei) {
        throw new Error(`Saldo brankas bersama tidak cukup. Saldo: ${ethers.formatEther(sharedBalance)} ETH, Dibutuhkan: ${escrowAmountInEth} ETH`);
      }
    } catch (e: any) {
      if (e.message.includes('Saldo brankas')) throw e;
      console.log('Could not check shared vault balance:', e.message);
    }
    
    const tx = await contract.createVowWithCertificateEscrow(
      partnerB,
      metadataURI,
      conditionTypes,
      descriptions,
      penaltyPercentages,
      escrowWei,
      certId
    );
    
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed');
    
    // Parse event to get vowId
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === 'VowCreated';
      } catch { return false; }
    });

    const parsedEvent = contract.interface.parseLog(event);
    const vowId = Number(parsedEvent?.args[0] || 0);
    
    console.log('Vow ID:', vowId);
    console.log('=== END CREATE VOW ===');

    return { vowId, txHash: receipt.hash };
  }

  async addCondition(
    vowId: number,
    conditionType: ContractConditionType,
    description: string,
    penaltyPercentage: number
  ): Promise<string> {
    const contract = this.getContract();
    const tx = await contract.addCondition(vowId, conditionType, description, penaltyPercentage);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async signVow(vowId: number): Promise<string> {
    const contract = this.getContract();
    const tx = await contract.signVow(vowId);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async depositAndActivate(vowId: number, amountInEth: string): Promise<string> {
    const contract = this.getContract();
    const tx = await contract.depositAndActivate(vowId, {
      value: ethers.parseEther(amountInEth)
    });
    const receipt = await tx.wait();
    return receipt.hash;
  }

  // V3: Aktivasi dengan dana dari certificate shared vault
  async activateWithSharedVault(vowId: number, escrowAmountInEth: string, certificateId?: number): Promise<string> {
    const contract = this.getContract();
    const escrowWei = ethers.parseEther(escrowAmountInEth);
    
    console.log('=== ACTIVATE WITH CERTIFICATE VAULT ===');
    
    // Get certificate ID if not provided
    let certId = certificateId;
    if (!certId) {
      const myCerts = await this.getMyCertificates();
      if (myCerts.length === 0) {
        throw new Error('Anda belum memiliki sertifikat pernikahan.');
      }
      certId = myCerts[myCerts.length - 1];
    }
    
    console.log('Certificate ID:', certId);
    console.log('Escrow:', escrowAmountInEth, 'ETH');
    
    const tx = await contract.activateWithCertificateVault(vowId, certId, escrowWei);
    const receipt = await tx.wait();
    
    console.log('=== END ACTIVATE ===');
    return receipt.hash;
  }

  // V3: Sign and activate - simplified version
  async signAndActivate(vowId: number, escrowAmountInEth: string, certificateId?: number): Promise<string> {
    const contract = this.getContract();
    
    console.log('=== SIGN AND ACTIVATE ===');
    
    // First sign the vow
    await this.signVow(vowId);
    
    // Then activate with certificate vault
    return this.activateWithSharedVault(vowId, escrowAmountInEth, certificateId);
  }

  // V3: Sign + Activate untuk Partner B dalam 1 TRANSAKSI
  // Menggunakan fungsi signAndActivateWithCertificate di contract
  async signAndActivateOnly(vowId: number, certificateId?: number): Promise<string> {
    const contract = this.getContract();
    console.log('=== SIGN AND ACTIVATE ONLY (1 TX) ===');
    console.log('Vow ID:', vowId);
    
    // Get vow details
    const vow = await this.getVow(vowId);
    console.log('Pending escrow:', ethers.formatEther(vow.pendingEscrowAmount), 'ETH');
    
    // Get certificate ID
    let certId = certificateId;
    if (!certId) {
      const myCerts = await this.getMyCertificates();
      if (myCerts.length === 0) {
        throw new Error('Anda belum memiliki sertifikat pernikahan.');
      }
      
      // Find certificate with both partners
      for (const cid of myCerts) {
        const isPartnerA = await contract.isCertificatePartner(cid, vow.partnerA);
        const isPartnerB = await contract.isCertificatePartner(cid, vow.partnerB);
        if (isPartnerA && isPartnerB) {
          certId = cid;
          break;
        }
      }
      
      if (!certId) {
        certId = myCerts[myCerts.length - 1];
      }
    }
    
    console.log('Certificate ID:', certId);
    
    // 1 TRANSAKSI: Sign + Activate sekaligus
    const tx = await contract.signAndActivateWithCertificate(vowId, certId);
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Vow signed and activated in 1 transaction');
    console.log('=== END SIGN AND ACTIVATE ONLY ===');
    
    return receipt.hash;
  }

  async addEscrow(vowId: number, amountInEth: string): Promise<string> {
    const contract = this.getContract();
    const tx = await contract.addEscrow(vowId, {
      value: ethers.parseEther(amountInEth)
    });
    const receipt = await tx.wait();
    return receipt.hash;
  }

  // ============ Brankas Functions ============

  async depositPersonal(amountInEth: string): Promise<string> {
    const contract = this.getContract();
    
    console.log('Depositing to personal vault:', amountInEth, 'ETH');
    console.log('Contract address:', contract.target);
    console.log('Parsed amount:', ethers.parseEther(amountInEth).toString());
    
    // Check if contract is properly deployed
    const isDeployed = await this.checkContractDeployment();
    if (!isDeployed) {
      throw new Error('Smart contract tidak ditemukan atau belum ter-deploy dengan benar');
    }
    
    try {
      // First try to estimate gas
      const gasEstimate = await contract.depositPersonal.estimateGas({
        value: ethers.parseEther(amountInEth)
      });
      console.log('Gas estimate:', gasEstimate.toString());
      
      const tx = await contract.depositPersonal({
        value: ethers.parseEther(amountInEth),
        gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
      });
      
      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed');
      return receipt.hash;
    } catch (error: any) {
      console.error('Deposit error details:', {
        message: error.message,
        code: error.code,
        data: error.data,
        reason: error.reason
      });
      
      // Provide more user-friendly error messages
      if (error.code === 'CALL_EXCEPTION') {
        throw new Error('Transaksi gagal. Pastikan Anda terhubung ke Base Sepolia network dan memiliki ETH yang cukup.');
      }
      
      throw error;
    }
  }

  // ============ Certificate-based Functions (V3) ============

  /**
   * Get my certificates dari SmartVow
   */
  async getMyCertificates(): Promise<number[]> {
    const contract = this.getContract();
    const ids = await contract.getMyCertificates();
    return ids.map((id: bigint) => Number(id));
  }

  /**
   * Check if certificate is active
   */
  async isCertificateActive(certId: number): Promise<boolean> {
    const contract = this.getContract();
    return await contract.certificateActive(certId);
  }

  /**
   * Check if user is partner in certificate
   */
  async isCertificatePartner(certId: number, userAddress: string): Promise<boolean> {
    const contract = this.getContract();
    return await contract.isCertificatePartner(certId, userAddress);
  }

  /**
   * Transfer dari brankas pribadi ke brankas bersama certificate
   * @param certificateId ID sertifikat
   * @param amountInEth Jumlah ETH
   */
  async transferToShared(amountInEth: string, certificateId?: number): Promise<string> {
    const contract = this.getContract();
    const amountWei = ethers.parseEther(amountInEth);
    
    console.log('=== TRANSFER TO SHARED VAULT ===');
    console.log('Amount:', amountInEth, 'ETH');
    
    // Get user's certificates
    const myCerts = await this.getMyCertificates();
    console.log('My certificates:', myCerts);
    
    if (myCerts.length === 0) {
      throw new Error('Anda belum memiliki sertifikat pernikahan. Silakan mint Marriage Certificate terlebih dahulu.');
    }
    
    // Use provided certificateId or the latest one
    const certId = certificateId ?? myCerts[myCerts.length - 1];
    console.log('Using certificate ID:', certId);
    
    // Check personal vault balance
    const personalBalance = await contract.getMyPersonalVault();
    console.log('Personal vault balance:', ethers.formatEther(personalBalance), 'ETH');
    
    if (personalBalance < amountWei) {
      throw new Error(`Saldo brankas pribadi tidak cukup. Saldo: ${ethers.formatEther(personalBalance)} ETH`);
    }
    
    const tx = await contract.transferToSharedVault(certId, amountWei);
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed');
    console.log('=== END TRANSFER TO SHARED ===');
    return receipt.hash;
  }

  /**
   * Deposit langsung ke brankas bersama certificate
   */
  async depositToSharedVault(certificateId: number, amountInEth: string): Promise<string> {
    const contract = this.getContract();
    const tx = await contract.depositToSharedVault(certificateId, {
      value: ethers.parseEther(amountInEth)
    });
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async withdrawPersonal(amountInEth: string): Promise<string> {
    const contract = this.getContract();
    const tx = await contract.withdrawPersonal(ethers.parseEther(amountInEth));
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getVaultBalances(): Promise<{
    personal: string;
    sharedContribution: string;
    totalShared: string;
  }> {
    const contract = this.getContract();
    console.log('=== GET MY VAULT BALANCES ===');
    console.log('Contract address:', contract.target);
    
    // Menggunakan getMyVaultSummary dari SmartVow V3
    const [personalBalance, totalSharedBalance, certificateCount] = await contract.getMyVaultSummary();
    
    // Get my contribution dari semua shared vaults
    let totalMyContribution = 0n;
    if (certificateCount > 0) {
      const [certIds, , myContributions] = await contract.getAllMySharedVaults();
      for (let i = 0; i < myContributions.length; i++) {
        totalMyContribution += myContributions[i];
      }
    }
    
    const result = {
      personal: ethers.formatEther(personalBalance),
      sharedContribution: ethers.formatEther(totalMyContribution),
      totalShared: ethers.formatEther(totalSharedBalance)
    };
    
    console.log('Vault balances result:', result);
    console.log('Certificate count:', Number(certificateCount));
    console.log('=== END GET MY VAULT BALANCES ===');
    
    return result;
  }

  /**
   * Get shared vault info untuk certificate tertentu
   */
  async getSharedVaultInfo(certificateId: number): Promise<{
    totalBalance: string;
    myContribution: string;
    partnerContribution: string;
    partnerA: string;
    partnerB: string;
  }> {
    const contract = this.getContract();
    console.log('=== GET SHARED VAULT INFO ===');
    console.log('Certificate ID:', certificateId);
    
    const [totalBalance, myContribution, partnerContribution, partnerA, partnerB] = 
      await contract.getSharedVaultInfo(certificateId);
    
    const result = {
      totalBalance: ethers.formatEther(totalBalance),
      myContribution: ethers.formatEther(myContribution),
      partnerContribution: ethers.formatEther(partnerContribution),
      partnerA,
      partnerB
    };
    
    console.log('Shared vault info:', result);
    console.log('=== END SHARED VAULT INFO ===');
    
    return result;
  }

  /**
   * Get all shared vaults for current user
   */
  async getAllMySharedVaults(): Promise<{
    certificateIds: number[];
    balances: string[];
    myContributions: string[];
  }> {
    const contract = this.getContract();
    const [certIds, balances, contributions] = await contract.getAllMySharedVaults();
    
    return {
      certificateIds: certIds.map((id: bigint) => Number(id)),
      balances: balances.map((b: bigint) => ethers.formatEther(b)),
      myContributions: contributions.map((c: bigint) => ethers.formatEther(c))
    };
  }

  /**
   * Get couple shared vault - untuk kompatibilitas dengan UI lama
   * Menggunakan certificate pertama yang ditemukan
   */
  async getCoupleSharedVault(): Promise<{
    userContribution: string;
    partnerContribution: string;
    coupleTotal: string;
    partnerAddress: string;
    isMutualRegistered: boolean;
  }> {
    const contract = this.getContract();
    console.log('=== GET COUPLE SHARED VAULT ===');
    
    // Get user's certificates
    const myCerts = await this.getMyCertificates();
    
    if (myCerts.length === 0) {
      console.log('No certificates found');
      return {
        userContribution: '0',
        partnerContribution: '0',
        coupleTotal: '0',
        partnerAddress: '0x0000000000000000000000000000000000000000',
        isMutualRegistered: false
      };
    }
    
    // Use the latest certificate
    const certId = myCerts[myCerts.length - 1];
    console.log('Using certificate ID:', certId);
    
    try {
      const [totalBalance, myContribution, partnerContribution, partnerA, partnerB] = 
        await contract.getSharedVaultInfo(certId);
      
      const myAddress = await this.getAccount();
      const partnerAddress = myAddress?.toLowerCase() === partnerA.toLowerCase() ? partnerB : partnerA;
      
      const result = {
        userContribution: ethers.formatEther(myContribution),
        partnerContribution: ethers.formatEther(partnerContribution),
        coupleTotal: ethers.formatEther(totalBalance),
        partnerAddress,
        isMutualRegistered: true // If we can get info, we're registered
      };
      
      console.log('Couple shared vault:', result);
      console.log('=== END COUPLE SHARED VAULT ===');
      
      return result;
    } catch (e) {
      console.log('Error getting shared vault info:', e);
      return {
        userContribution: '0',
        partnerContribution: '0',
        coupleTotal: '0',
        partnerAddress: '0x0000000000000000000000000000000000000000',
        isMutualRegistered: false
      };
    }
  }

  async getPersonalVault(): Promise<string> {
    const contract = this.getContract();
    const balance = await contract.getMyPersonalVault();
    return ethers.formatEther(balance);
  }

  async getSharedVaultContribution(certificateId?: number): Promise<string> {
    const contract = this.getContract();
    
    // If no certificateId provided, get from latest certificate
    if (!certificateId) {
      const myCerts = await this.getMyCertificates();
      if (myCerts.length === 0) return '0';
      certificateId = myCerts[myCerts.length - 1];
    }
    
    try {
      const contribution = await contract.getMySharedContribution(certificateId);
      return ethers.formatEther(contribution);
    } catch {
      return '0';
    }
  }

  /**
   * Get partner address dari certificate
   */
  async getMyPartner(): Promise<string> {
    try {
      const myCerts = await this.getMyCertificates();
      if (myCerts.length === 0) {
        return '0x0000000000000000000000000000000000000000';
      }
      
      const certId = myCerts[myCerts.length - 1];
      const contract = this.getContract();
      const [partnerA, partnerB] = await contract.getCertificatePartners(certId);
      
      const myAddress = await this.getAccount();
      return myAddress?.toLowerCase() === partnerA.toLowerCase() ? partnerB : partnerA;
    } catch {
      return '0x0000000000000000000000000000000000000000';
    }
  }

  /**
   * Check if user has active certificate (mutual registered)
   */
  async amIMutualRegistered(): Promise<boolean> {
    try {
      const myCerts = await this.getMyCertificates();
      return myCerts.length > 0;
    } catch {
      return false;
    }
  }

  // ============ Claim Functions ============

  async submitInternalClaim(vowId: number, penaltyPercentage: number): Promise<string> {
    const contract = this.getContract();
    
    console.log('=== SUBMIT INTERNAL CLAIM ===');
    console.log('Vow ID:', vowId);
    console.log('Penalty (basis points):', penaltyPercentage);
    
    // Check vow status first
    const vow = await this.getVow(vowId);
    const statusNum = Number(vow.status);
    console.log('Vow status (number):', statusNum);
    console.log('Vow status (label):', this.getStatusLabel(statusNum));
    console.log('Vow escrow balance:', ethers.formatEther(vow.escrowBalance), 'ETH');
    
    if (statusNum !== 2) { // 2 = Active
      throw new Error(`Vow tidak dalam status Active. Status saat ini: ${this.getStatusLabel(statusNum)} (${statusNum})`);
    }
    
    // Check if already claimed
    const isClaimed = await contract.vowClaimed(vowId);
    console.log('Already claimed:', isClaimed);
    
    if (isClaimed) {
      throw new Error('Vow ini sudah pernah di-claim sebelumnya.');
    }
    
    // penaltyPercentage is in basis points (100 = 1%, 7000 = 70%, 10000 = 100%)
    const tx = await contract.submitInternalClaim(vowId, penaltyPercentage);
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed');
    console.log('=== END SUBMIT INTERNAL CLAIM ===');
    return receipt.hash;
  }

  async submitAIClaim(
    vowId: number,
    reason: string,
    evidence: string,
    timestamp: number
  ): Promise<string> {
    const contract = this.getContract();
    
    console.log('=== SUBMIT AI CLAIM ===');
    console.log('Vow ID:', vowId);
    console.log('Reason:', reason);
    
    // Check vow status first
    const vow = await this.getVow(vowId);
    const statusNum = Number(vow.status);
    console.log('Vow status (number):', statusNum);
    
    if (statusNum !== 2) { // 2 = Active
      throw new Error(`Vow tidak dalam status Active. Status saat ini: ${this.getStatusLabel(statusNum)} (${statusNum})`);
    }
    
    const tx = await contract.submitAIClaim(vowId, reason, evidence, timestamp);
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed');
    console.log('=== END SUBMIT AI CLAIM ===');
    return receipt.hash;
  }

  async approveAIClaim(vowId: number): Promise<string> {
    const contract = this.getContract();
    const tx = await contract.approveAIClaim(vowId);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async isVowClaimed(vowId: number): Promise<boolean> {
    const contract = this.getContract();
    return await contract.vowClaimed(vowId);
  }

  async getClaimant(vowId: number): Promise<string> {
    const contract = this.getContract();
    return await contract.claimant(vowId);
  }

  // ============ Utility Functions ============

  formatEther(wei: bigint): string {
    return ethers.formatEther(wei);
  }

  parseEther(eth: string): bigint {
    return ethers.parseEther(eth);
  }

  shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  getStatusLabel(status: number): string {
    const labels = ['Draft', 'Pending Signatures', 'Active', 'Breached', 'Resolved', 'Terminated'];
    return labels[status] || 'Unknown';
  }

  getConditionTypeLabel(type: number): string {
    const labels = ['Infidelity', 'KDRT', 'Financial', 'Custom'];
    return labels[type] || 'Unknown';
  }
}

export const web3Service = new Web3Service();
export default web3Service;

// Add ethereum type to window
declare global {
  interface Window {
    ethereum?: any;
  }
}


// ============ Marriage Certificate NFT Contract ============

export const CERTIFICATE_NFT_ABI = [
  // Events
  "event CertificateMinted(uint256 indexed tokenId, address indexed partnerA, address indexed partnerB, uint256 vowId)",
  
  // Read Functions
  "function totalSupply() view returns (uint256)",
  "function mintPrice() view returns (uint256)",
  "function getCertificate(uint256 _tokenId) view returns (tuple(address partnerA, address partnerB, string partnerAName, string partnerBName, string vows, uint256 vowId, uint256 mintedAt, string metadataURI))",
  "function getUserCertificates(address _user) view returns (uint256[])",
  "function tokenURI(uint256 _tokenId) view returns (string)",
  "function ownerOf(uint256 _tokenId) view returns (address)",
  "function vowIdMinted(uint256 _vowId) view returns (bool)",
  
  // Write Functions
  "function mintCertificate(address _partnerB, string _partnerAName, string _partnerBName, string _vows, uint256 _vowId, string _metadataURI) payable returns (uint256)"
] as const;

export const CERTIFICATE_NFT_ADDRESS = import.meta.env.VITE_CERTIFICATE_NFT_ADDRESS || '0x0000000000000000000000000000000000000000';

export interface CertificateData {
  partnerA: string;
  partnerB: string;
  partnerAName: string;
  partnerBName: string;
  vows: string;
  vowId: bigint;
  mintedAt: bigint;
  metadataURI: string;
}

class CertificateNFTService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;

  async connect(): Promise<void> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Please install MetaMask');
    }
    
    this.provider = new ethers.BrowserProvider(window.ethereum);
    await this.provider.send('eth_requestAccounts', []);
    this.signer = await this.provider.getSigner();
    this.contract = new ethers.Contract(CERTIFICATE_NFT_ADDRESS, CERTIFICATE_NFT_ABI, this.signer);
  }

  private getContract(): ethers.Contract {
    if (!this.contract) throw new Error('Please connect wallet first');
    return this.contract;
  }

  async getMintPrice(): Promise<string> {
    const contract = this.getContract();
    const price = await contract.mintPrice();
    return ethers.formatEther(price);
  }

  async mintCertificate(
    partnerB: string,
    partnerAName: string,
    partnerBName: string,
    vows: string,
    vowId: number,
    metadataURI: string
  ): Promise<{ tokenId: number; txHash: string }> {
    const contract = this.getContract();
    
    // Check if vowId already minted
    try {
      const alreadyMinted = await contract.vowIdMinted(vowId);
      if (alreadyMinted) {
        throw new Error('Sertifikat dengan ID ini sudah pernah di-mint');
      }
    } catch (e: any) {
      if (e.message?.includes('sudah pernah')) throw e;
      // Ignore other errors (function might not exist)
    }
    
    const mintPrice = await contract.mintPrice();
    console.log('Mint price:', ethers.formatEther(mintPrice), 'ETH');
    console.log('Minting certificate for:', partnerB);
    
    const tx = await contract.mintCertificate(
      partnerB,
      partnerAName,
      partnerBName,
      vows,
      vowId,
      metadataURI,
      { value: mintPrice }
    );
    
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed');
    
    // Parse event to get tokenId
    let tokenId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'CertificateMinted') {
          tokenId = Number(parsed.args[0]);
          break;
        }
      } catch { /* ignore */ }
    }

    return { tokenId, txHash: receipt.hash };
  }

  async getCertificate(tokenId: number): Promise<CertificateData> {
    const contract = this.getContract();
    return await contract.getCertificate(tokenId);
  }

  async getUserCertificates(address: string): Promise<number[]> {
    const contract = this.getContract();
    const ids = await contract.getUserCertificates(address);
    return ids.map((id: bigint) => Number(id));
  }

  async isVowMinted(vowId: number): Promise<boolean> {
    const contract = this.getContract();
    return await contract.vowIdMinted(vowId);
  }
}

export const certificateNFTService = new CertificateNFTService();


// ============ Asset NFT Contract ============

export const ASSET_NFT_ABI = [
  // Events
  "event AssetMinted(uint256 indexed tokenId, address indexed creator, string name, string assetClass, uint8 ownershipType)",
  "event PartnerSet(uint256 indexed tokenId, address indexed partner)",
  "event PartnerRemoved(uint256 indexed tokenId, address indexed oldPartner)",
  
  // Read Functions
  "function totalSupply() view returns (uint256)",
  "function mintPrice() view returns (uint256)",
  "function getAsset(uint256 _tokenId) view returns (tuple(address creator, string name, string symbol, string assetClass, string utility, uint256 mintedAt, string metadataURI, uint8 ownershipType, address partner))",
  "function getUserAssets(address _user) view returns (uint256[])",
  "function getSharedAssets(address _user) view returns (uint256[])",
  "function getAllVisibleAssets(address _user) view returns (uint256[])",
  "function canViewAsset(address _user, uint256 _tokenId) view returns (bool)",
  "function tokenURI(uint256 _tokenId) view returns (string)",
  "function ownerOf(uint256 _tokenId) view returns (address)",
  
  // Write Functions
  "function mintAsset(string _name, string _symbol, string _assetClass, string _utility, string _metadataURI, bool _isJoint, address _partner) payable returns (uint256)",
  "function setPartner(uint256 _tokenId, address _partner)"
] as const;

export const ASSET_NFT_ADDRESS = import.meta.env.VITE_ASSET_NFT_ADDRESS || '0x0000000000000000000000000000000000000000';

// Ownership type enum matching contract
export enum AssetOwnershipType {
  Personal = 0,  // Harta Pribadi
  Joint = 1      // Harta Bersama
}

export interface AssetData {
  creator: string;
  name: string;
  symbol: string;
  assetClass: string;
  utility: string;
  mintedAt: bigint;
  metadataURI: string;
  ownershipType: number;
  partner: string;
}

class AssetNFTService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;

  async connect(): Promise<string> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Please install MetaMask');
    }
    
    this.provider = new ethers.BrowserProvider(window.ethereum);
    await this.provider.send('eth_requestAccounts', []);
    this.signer = await this.provider.getSigner();
    this.contract = new ethers.Contract(ASSET_NFT_ADDRESS, ASSET_NFT_ABI, this.signer);
    
    return await this.signer.getAddress();
  }

  private getContract(): ethers.Contract {
    if (!this.contract) throw new Error('Please connect wallet first');
    return this.contract;
  }

  async getMintPrice(): Promise<string> {
    const contract = this.getContract();
    const price = await contract.mintPrice();
    return ethers.formatEther(price);
  }

  /**
   * Mint asset NFT dengan ownership type dan partner
   */
  async mintAsset(
    name: string,
    symbol: string,
    assetClass: string,
    utility: string,
    metadataURI: string,
    isJoint: boolean = false,
    partner: string = '0x0000000000000000000000000000000000000000'
  ): Promise<{ tokenId: number; txHash: string }> {
    const contract = this.getContract();
    const mintPrice = await contract.mintPrice();
    
    console.log('Mint price:', ethers.formatEther(mintPrice), 'ETH');
    console.log('Minting asset:', name, 'isJoint:', isJoint, 'partner:', partner);
    
    const tx = await contract.mintAsset(
      name,
      symbol,
      assetClass,
      utility,
      metadataURI,
      isJoint,
      partner,
      { value: mintPrice }
    );
    
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed');
    
    // Parse event to get tokenId
    let tokenId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'AssetMinted') {
          tokenId = Number(parsed.args[0]);
          break;
        }
      } catch { /* ignore */ }
    }

    return { tokenId, txHash: receipt.hash };
  }

  /**
   * Set partner untuk asset (hanya untuk Harta Bersama)
   */
  async setPartner(tokenId: number, partner: string): Promise<string> {
    const contract = this.getContract();
    const tx = await contract.setPartner(tokenId, partner);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getAsset(tokenId: number): Promise<AssetData> {
    const contract = this.getContract();
    return await contract.getAsset(tokenId);
  }

  /**
   * Get user's own assets
   */
  async getUserAssets(address: string): Promise<number[]> {
    const contract = this.getContract();
    const ids = await contract.getUserAssets(address);
    return ids.map((id: bigint) => Number(id));
  }

  /**
   * Get assets shared TO this user (Harta Bersama dari pasangan)
   */
  async getSharedAssets(address: string): Promise<number[]> {
    const contract = this.getContract();
    const ids = await contract.getSharedAssets(address);
    return ids.map((id: bigint) => Number(id));
  }

  /**
   * Get all assets user can see (own + shared)
   */
  async getAllVisibleAssets(address: string): Promise<number[]> {
    const contract = this.getContract();
    const ids = await contract.getAllVisibleAssets(address);
    return ids.map((id: bigint) => Number(id));
  }

  /**
   * Check if user can view this asset
   */
  async canViewAsset(user: string, tokenId: number): Promise<boolean> {
    const contract = this.getContract();
    return await contract.canViewAsset(user, tokenId);
  }

  /**
   * Get ownership type label
   */
  getOwnershipLabel(ownershipType: number): string {
    return ownershipType === AssetOwnershipType.Joint ? 'Harta Bersama' : 'Harta Pribadi';
  }
}

export const assetNFTService = new AssetNFTService();
