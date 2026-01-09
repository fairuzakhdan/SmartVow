import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import web3Service, { ContractVow, ContractCondition } from '../services/web3Service';

interface Web3ContextType {
  // State
  isConnected: boolean;
  isConnecting: boolean;
  account: string | null;
  error: string | null;
  
  // Actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToBase: (testnet?: boolean) => Promise<void>;
  
  // Contract reads
  getUserVows: () => Promise<number[]>;
  getVow: (vowId: number) => Promise<ContractVow>;
  getConditions: (vowId: number) => Promise<ContractCondition[]>;
  
  // Contract writes
  createVow: (partnerB: string, metadataURI: string) => Promise<{ vowId: number; txHash: string }>;
  createVowAndLockEscrow: (partnerB: string, metadataURI: string, conditionTypes: number[], descriptions: string[], penaltyPercentages: number[], escrowAmount: string) => Promise<{ vowId: number; txHash: string }>;
  addCondition: (vowId: number, type: number, description: string, penalty: number) => Promise<string>;
  signVow: (vowId: number) => Promise<string>;
  depositAndActivate: (vowId: number, amount: string) => Promise<string>;
  activateWithSharedVault: (vowId: number, escrowAmount: string) => Promise<string>;
  signAndActivate: (vowId: number, escrowAmount: string) => Promise<string>;
  signAndActivateOnly: (vowId: number) => Promise<string>;
  addEscrow: (vowId: number, amount: string) => Promise<string>;
  
  // Vault functions
  depositPersonal: (amount: string) => Promise<string>;
  transferToShared: (amount: string) => Promise<string>;
  withdrawPersonal: (amount: string) => Promise<string>;
  getVaultBalances: () => Promise<{ personal: string; sharedContribution: string; totalShared: string }>;
  
  // Claim functions
  submitInternalClaim: (vowId: number, penaltyPercentage: number) => Promise<string>;
  submitAIClaim: (vowId: number, reason: string, evidence: string) => Promise<string>;
  isVowClaimed: (vowId: number) => Promise<boolean>;
  
  // Debug functions
  checkContractDeployment: () => Promise<boolean>;
  
  // Utils
  shortenAddress: (address: string) => string;
  formatEther: (wei: bigint) => string;
}

const Web3Context = createContext<Web3ContextType | null>(null);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-connect if previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (web3Service.isWalletAvailable() && localStorage.getItem('walletConnected')) {
        try {
          const addr = await web3Service.connectWallet();
          setAccount(addr);
          setIsConnected(true);
        } catch (err) {
          console.log('Auto-connect failed');
        }
      }
    };
    checkConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!web3Service.isWalletAvailable()) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setIsConnected(false);
        setAccount(null);
        localStorage.removeItem('walletConnected');
      } else {
        setAccount(accounts[0]);
      }
    };

    window.ethereum?.on('accountsChanged', handleAccountsChanged);
    return () => window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
  }, []);


  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const addr = await web3Service.connectWallet();
      setAccount(addr);
      setIsConnected(true);
      localStorage.setItem('walletConnected', 'true');
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setAccount(null);
    localStorage.removeItem('walletConnected');
  }, []);

  const switchToBase = useCallback(async (testnet = true) => {
    try {
      await web3Service.switchToBase(testnet);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Contract read functions
  const getUserVows = useCallback(async () => {
    if (!account) return [];
    return web3Service.getUserVows(account);
  }, [account]);

  const getVow = useCallback(async (vowId: number) => {
    return web3Service.getVow(vowId);
  }, []);

  const getConditions = useCallback(async (vowId: number) => {
    return web3Service.getConditions(vowId);
  }, []);

  // Contract write functions
  const createVow = useCallback(async (partnerB: string, metadataURI: string) => {
    return web3Service.createVow(partnerB, metadataURI);
  }, []);

  const createVowAndLockEscrow = useCallback(async (
    partnerB: string, 
    metadataURI: string, 
    conditionTypes: number[], 
    descriptions: string[], 
    penaltyPercentages: number[], 
    escrowAmount: string
  ) => {
    return web3Service.createVowAndLockEscrow(partnerB, metadataURI, conditionTypes, descriptions, penaltyPercentages, escrowAmount);
  }, []);

  const addCondition = useCallback(async (vowId: number, type: number, description: string, penalty: number) => {
    return web3Service.addCondition(vowId, type, description, penalty);
  }, []);

  const signVow = useCallback(async (vowId: number) => {
    return web3Service.signVow(vowId);
  }, []);

  const depositAndActivate = useCallback(async (vowId: number, amount: string) => {
    return web3Service.depositAndActivate(vowId, amount);
  }, []);

  const activateWithSharedVault = useCallback(async (vowId: number, escrowAmount: string) => {
    return web3Service.activateWithSharedVault(vowId, escrowAmount);
  }, []);

  const signAndActivate = useCallback(async (vowId: number, escrowAmount: string) => {
    return web3Service.signAndActivate(vowId, escrowAmount);
  }, []);

  const signAndActivateOnly = useCallback(async (vowId: number) => {
    return web3Service.signAndActivateOnly(vowId);
  }, []);

  const addEscrow = useCallback(async (vowId: number, amount: string) => {
    return web3Service.addEscrow(vowId, amount);
  }, []);

  // Vault functions
  const depositPersonal = useCallback(async (amount: string) => {
    return web3Service.depositPersonal(amount);
  }, []);

  const transferToShared = useCallback(async (amount: string) => {
    return web3Service.transferToShared(amount);
  }, []);

  const withdrawPersonal = useCallback(async (amount: string) => {
    return web3Service.withdrawPersonal(amount);
  }, []);

  const getVaultBalances = useCallback(async () => {
    if (!account) return { personal: '0', sharedContribution: '0', totalShared: '0' };
    return web3Service.getVaultBalances(account);
  }, [account]);

  // Claim functions
  const submitInternalClaim = useCallback(async (vowId: number, penaltyPercentage: number) => {
    return web3Service.submitInternalClaim(vowId, penaltyPercentage);
  }, []);

  const submitAIClaim = useCallback(async (vowId: number, reason: string, evidence: string) => {
    const timestamp = Math.floor(Date.now() / 1000);
    return web3Service.submitAIClaim(vowId, reason, evidence, timestamp);
  }, []);

  const isVowClaimed = useCallback(async (vowId: number) => {
    return web3Service.isVowClaimed(vowId);
  }, []);

  const checkContractDeployment = useCallback(async () => {
    return web3Service.checkContractDeployment();
  }, []);

  const value: Web3ContextType = {
    isConnected,
    isConnecting,
    account,
    error,
    connectWallet,
    disconnectWallet,
    switchToBase,
    getUserVows,
    getVow,
    getConditions,
    createVow,
    createVowAndLockEscrow,
    addCondition,
    signVow,
    depositAndActivate,
    activateWithSharedVault,
    signAndActivate,
    signAndActivateOnly,
    addEscrow,
    depositPersonal,
    transferToShared,
    withdrawPersonal,
    getVaultBalances,
    submitInternalClaim,
    submitAIClaim,
    isVowClaimed,
    checkContractDeployment,
    shortenAddress: web3Service.shortenAddress,
    formatEther: web3Service.formatEther
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};

export default Web3Context;
