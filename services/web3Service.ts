import { ethers } from 'ethers';

// SmartVow Contract ABI (sesuai dengan SmartVow.sol)
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

  // Read Functions
  "function vowCounter() view returns (uint256)",
  "function mediator() view returns (address)",
  "function getVow(uint256 _vowId) view returns (tuple(uint256 id, address partnerA, address partnerB, uint256 escrowBalance, uint256 pendingEscrowAmount, uint8 status, uint256 createdAt, uint256 activatedAt, bool partnerASigned, bool partnerBSigned, string metadataURI))",
  "function getConditions(uint256 _vowId) view returns (tuple(uint256 id, uint8 conditionType, string description, uint256 penaltyPercentage, bool isTriggered)[])",
  "function getUserVows(address _user) view returns (uint256[])",
  "function getConditionCount(uint256 _vowId) view returns (uint256)",

  // Write Functions
  "function createVow(address _partnerB, string _metadataURI) returns (uint256)",
  "function createVowComplete(address _partnerB, string _metadataURI, uint8[] _conditionTypes, string[] _descriptions, uint256[] _penaltyPercentages) returns (uint256)",
  "function createVowAndLockEscrow(address _partnerB, string _metadataURI, uint8[] _conditionTypes, string[] _descriptions, uint256[] _penaltyPercentages, uint256 _escrowAmount) returns (uint256)",
  "function addCondition(uint256 _vowId, uint8 _conditionType, string _description, uint256 _penaltyPercentage)",
  "function signVow(uint256 _vowId)",
  "function depositAndActivate(uint256 _vowId) payable",
  "function activateWithSharedVault(uint256 _vowId, uint256 _escrowAmount)",
  "function signAndActivate(uint256 _vowId, uint256 _escrowAmount)",
  "function signAndActivateOnly(uint256 _vowId)",
  "function signAndActivateOnly(uint256 _vowId)",
  "function addEscrow(uint256 _vowId) payable",
  "function reportBreach(uint256 _vowId, uint256 _conditionIndex)",
  "function resolveDispute(uint256 _vowId, address _beneficiary, uint256 _percentage)",
  "function terminateVow(uint256 _vowId)",
  "function setMediator(address _newMediator)",

  // Brankas Functions
  "function depositPersonal() payable",
  "function transferToShared(uint256 _amount)",
  "function withdrawPersonal(uint256 _amount)",
  "function getVaultBalances(address _user) view returns (uint256 personal, uint256 sharedContribution, uint256 totalShared)",
  "function personalVault(address _user) view returns (uint256)",
  "function sharedVaultContribution(address _user) view returns (uint256)",
  "function totalSharedVault() view returns (uint256)",

  // Claim Functions
  "function submitInternalClaim(uint256 _vowId, uint256 _penaltyPercentage)",
  "function submitAIClaim(uint256 _vowId, string _reason, string _evidence, uint256 _timestamp)",
  "function approveAIClaim(uint256 _vowId)",
  "function vowClaimed(uint256 _vowId) view returns (bool)",
  "function claimant(uint256 _vowId) view returns (address)"
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
  async createVowAndLockEscrow(
    partnerB: string,
    metadataURI: string,
    conditionTypes: number[],
    descriptions: string[],
    penaltyPercentages: number[],
    escrowAmountInEth: string
  ): Promise<{ vowId: number; txHash: string }> {
    const contract = this.getContract();
    const escrowWei = ethers.parseEther(escrowAmountInEth);
    
    const tx = await contract.createVowAndLockEscrow(
      partnerB,
      metadataURI,
      conditionTypes,
      descriptions,
      penaltyPercentages,
      escrowWei
    );
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

  async activateWithSharedVault(vowId: number, escrowAmountInEth: string): Promise<string> {
    const contract = this.getContract();
    const escrowWei = ethers.parseEther(escrowAmountInEth);
    const tx = await contract.activateWithSharedVault(vowId, escrowWei);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async signAndActivate(vowId: number, escrowAmountInEth: string): Promise<string> {
    const contract = this.getContract();
    const escrowWei = ethers.parseEther(escrowAmountInEth);
    const tx = await contract.signAndActivate(vowId, escrowWei);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  // Sign + Activate TANPA escrow (escrow sudah di-lock oleh Partner A)
  // Hanya butuh gas fee
  async signAndActivateOnly(vowId: number): Promise<string> {
    const contract = this.getContract();
    console.log('=== SIGN AND ACTIVATE ONLY ===');
    console.log('Vow ID:', vowId);
    console.log('This function ONLY needs gas fee, NO escrow needed');
    
    const tx = await contract.signAndActivateOnly(vowId);
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed');
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

  async transferToShared(amountInEth: string): Promise<string> {
    const contract = this.getContract();
    const amountWei = ethers.parseEther(amountInEth);
    
    console.log('=== TRANSFER TO SHARED ===');
    console.log('Contract address:', contract.target);
    console.log('Amount:', amountInEth, 'ETH');
    console.log('Amount (wei):', amountWei.toString());
    
    // Check current balance first
    const signer = await this.provider?.getSigner();
    const userAddress = await signer?.getAddress();
    console.log('User address:', userAddress);
    
    if (userAddress) {
      const currentBalance = await contract.personalVault(userAddress);
      console.log('Current personal vault balance (wei):', currentBalance.toString());
      console.log('Current personal vault balance (ETH):', ethers.formatEther(currentBalance));
    }
    
    const tx = await contract.transferToShared(amountWei);
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed');
    console.log('=== END TRANSFER TO SHARED ===');
    return receipt.hash;
  }

  async withdrawPersonal(amountInEth: string): Promise<string> {
    const contract = this.getContract();
    const tx = await contract.withdrawPersonal(ethers.parseEther(amountInEth));
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getVaultBalances(address: string): Promise<{
    personal: string;
    sharedContribution: string;
    totalShared: string;
  }> {
    const contract = this.getContract();
    console.log('=== GET VAULT BALANCES ===');
    console.log('Contract address:', contract.target);
    console.log('User address:', address);
    
    const [personal, sharedContribution, totalShared] = await contract.getVaultBalances(address);
    
    const result = {
      personal: ethers.formatEther(personal),
      sharedContribution: ethers.formatEther(sharedContribution),
      totalShared: ethers.formatEther(totalShared)
    };
    
    console.log('Vault balances result:', result);
    console.log('Personal (raw wei):', personal.toString());
    console.log('=== END GET VAULT BALANCES ===');
    
    return result;
  }

  async getPersonalVault(address: string): Promise<string> {
    const contract = this.getContract();
    const balance = await contract.personalVault(address);
    return ethers.formatEther(balance);
  }

  async getSharedVaultContribution(address: string): Promise<string> {
    const contract = this.getContract();
    const contribution = await contract.sharedVaultContribution(address);
    return ethers.formatEther(contribution);
  }

  async getTotalSharedVault(): Promise<string> {
    const contract = this.getContract();
    const total = await contract.totalSharedVault();
    return ethers.formatEther(total);
  }

  // ============ Claim Functions ============

  async submitInternalClaim(vowId: number, penaltyPercentage: number): Promise<string> {
    const contract = this.getContract();
    // penaltyPercentage is in basis points (100 = 1%, 7000 = 70%, 10000 = 100%)
    const tx = await contract.submitInternalClaim(vowId, penaltyPercentage);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async submitAIClaim(
    vowId: number,
    reason: string,
    evidence: string,
    timestamp: number
  ): Promise<string> {
    const contract = this.getContract();
    const tx = await contract.submitAIClaim(vowId, reason, evidence, timestamp);
    const receipt = await tx.wait();
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
