import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { assetNFTService, web3Service } from '../services/web3Service';
import { 
  ArrowDownLeftIcon, 
  LockClosedIcon,
  ArrowsRightLeftIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  WalletIcon,
  UserGroupIcon,
  SparklesIcon,
  ChevronRightIcon,
  UserIcon,
  UsersIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpRightIcon,
  LinkIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { VaultAsset } from '../types';

interface VaultBalance {
  personal: { partnerA: number; partnerB: number };
  shared: { total: number; available: number; partnerAContribution: number; partnerBContribution: number };
  escrow: { total: number; locked: boolean };
}

interface Transaction {
  id: string;
  type: 'deposit_personal' | 'transfer_to_shared' | 'lock_escrow' | 'withdraw';
  from: string;
  amount: number;
  date: string;
  status: 'confirmed' | 'pending';
}

interface BlockchainAsset {
  tokenId: number;
  name: string;
  symbol: string;
  assetClass: string;
  utility: string;
  mintedAt: number;
  metadataURI: string;
  ownership?: string;
  category?: string;
  imageUrl?: string;
  isPartnerAsset?: boolean;
  partnerAddress?: string;
}

const Vault: React.FC = () => {
  const { isConnected, account, shortenAddress, getVaultBalances, depositPersonal, transferToShared, getUserVows, getVow } = useWeb3();
  
  const [balance, setBalance] = useState<VaultBalance>({
    personal: { partnerA: 0, partnerB: 0 },
    shared: { total: 0, available: 0, partnerAContribution: 0, partnerBContribution: 0 },
    escrow: { total: 0, locked: false }
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nftAssets, setNftAssets] = useState<VaultAsset[]>([]);
  const [allAssets, setAllAssets] = useState<BlockchainAsset[]>([]);
  const [assetFilter, setAssetFilter] = useState<'all' | 'personal' | 'joint'>('all');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  
  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch metadata from IPFS to get ownership info
  const fetchMetadataFromIPFS = async (metadataURI: string): Promise<{ ownership?: string; category?: string; image?: string } | null> => {
    try {
      // Convert ipfs:// to gateway URL
      const ipfsHash = metadataURI.replace('ipfs://', '');
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      
      const response = await fetch(gatewayUrl);
      if (!response.ok) return null;
      
      const metadata = await response.json();
      
      // Extract ownership and category from attributes
      const attributes = metadata.attributes || [];
      const ownershipAttr = attributes.find((a: any) => a.trait_type === 'Ownership');
      const categoryAttr = attributes.find((a: any) => a.trait_type === 'Category');
      
      // Get image URL
      let imageUrl = metadata.image;
      if (imageUrl?.startsWith('ipfs://')) {
        const imgHash = imageUrl.replace('ipfs://', '');
        imageUrl = `https://gateway.pinata.cloud/ipfs/${imgHash}`;
      }
      
      return {
        ownership: ownershipAttr?.value,
        category: categoryAttr?.value,
        image: imageUrl
      };
    } catch (e) {
      console.error('Failed to fetch metadata from IPFS:', e);
      return null;
    }
  };

  // Load NFT assets from blockchain using getAllVisibleAssets (includes partner's Harta Bersama)
  const loadAssetsFromBlockchain = async () => {
    if (!account || !isConnected) return;
    
    setLoadingAssets(true);
    try {
      await assetNFTService.connect();
      
      // Get all visible assets (own + shared from partner) - ON-CHAIN
      const allTokenIds = await assetNFTService.getAllVisibleAssets(account);
      console.log('All visible assets:', allTokenIds);
      
      // Get localStorage data for extra info (as cache)
      const localAssets = JSON.parse(localStorage.getItem('chainvow_assets') || '[]');
      const localAssetMap = new Map();
      localAssets.forEach((a: any) => {
        if (a.tokenId !== undefined) localAssetMap.set(Number(a.tokenId), a);
        if (a.id !== undefined) localAssetMap.set(Number(a.id), a);
      });
      
      const assets: BlockchainAsset[] = [];
      
      for (const tokenId of allTokenIds) {
        try {
          const assetData = await assetNFTService.getAsset(tokenId);
          const localData = localAssetMap.get(Number(tokenId)) as any;
          
          // Get ownership type from contract
          const ownershipType = Number(assetData.ownershipType);
          const ownership = ownershipType === 1 ? 'Harta Bersama' : 'Harta Pribadi';
          
          // Check if this is partner's asset
          const isPartnerAsset = assetData.creator.toLowerCase() !== account.toLowerCase();
          
          let category = localData?.category;
          let imageUrl = localData?.icon;
          
          // If no localStorage data, fetch from IPFS metadata
          if (!category && assetData.metadataURI) {
            const ipfsData = await fetchMetadataFromIPFS(assetData.metadataURI);
            if (ipfsData) {
              category = ipfsData.category;
              imageUrl = ipfsData.image;
            }
          }
          
          assets.push({
            tokenId: Number(tokenId),
            name: assetData.name,
            symbol: assetData.symbol,
            assetClass: assetData.assetClass,
            utility: assetData.utility,
            mintedAt: Number(assetData.mintedAt),
            metadataURI: assetData.metadataURI,
            ownership: ownership,
            category: category || assetData.assetClass,
            imageUrl: imageUrl,
            isPartnerAsset: isPartnerAsset,
            partnerAddress: isPartnerAsset ? assetData.creator : undefined
          });
        } catch (e) {
          console.error(`Failed to load asset ${tokenId}:`, e);
        }
      }
      
      setAllAssets(assets);
      console.log('Loaded assets from blockchain:', assets);
    } catch (error) {
      console.error('Failed to load assets from blockchain:', error);
    } finally {
      setLoadingAssets(false);
    }
  };

  // Load vault balances from blockchain (synced with Dashboard)
  const loadVaultBalances = async () => {
    if (!account || !isConnected) return;
    
    setLoadingBalance(true);
    try {
      console.log('=== VAULT: LOAD BALANCES FROM BLOCKCHAIN ===');
      const balances = await getVaultBalances();
      console.log('Vault balances from blockchain:', balances);
      
      const personalBalance = parseFloat(balances.personal);
      const sharedTotal = parseFloat(balances.totalShared);
      const myContribution = parseFloat(balances.sharedContribution);
      
      // Calculate escrow from active vows
      let totalEscrow = 0;
      try {
        const vowIds = await getUserVows();
        for (const vowId of vowIds) {
          const vow = await getVow(vowId);
          if (Number(vow.status) === 2) { // Active
            const escrowWei = Number(vow.escrowBalance);
            totalEscrow += escrowWei / 1e18;
          }
        }
      } catch (e) {
        console.error('Failed to calculate escrow:', e);
      }
      
      console.log('Personal:', personalBalance);
      console.log('Shared Total:', sharedTotal);
      console.log('My Contribution:', myContribution);
      console.log('Total Escrow:', totalEscrow);
      
      setBalance({
        personal: { partnerA: personalBalance, partnerB: 0 },
        shared: { 
          total: sharedTotal + totalEscrow,
          available: sharedTotal,
          partnerAContribution: myContribution, 
          partnerBContribution: sharedTotal - myContribution 
        },
        escrow: { total: totalEscrow, locked: totalEscrow > 0 }
      });
      
      console.log('=== END VAULT BALANCES ===');
    } catch (error) {
      console.error('Failed to load vault balances:', error);
      // Fallback to localStorage
      const savedBalance = localStorage.getItem('vault_balance');
      if (savedBalance) {
        setBalance(JSON.parse(savedBalance));
      }
    } finally {
      setLoadingBalance(false);
    }
  };

  // Load data from localStorage (transactions only)
  useEffect(() => {
    const savedTx = localStorage.getItem('vault_transactions');
    if (savedTx) {
      setTransactions(JSON.parse(savedTx));
    }
  }, []);

  // Load balances and assets when account changes
  useEffect(() => {
    if (isConnected && account) {
      loadVaultBalances();
      loadAssetsFromBlockchain();
    }
  }, [isConnected, account]);

  // Filter assets based on selected filter
  const filteredAssets = allAssets.filter((asset: any) => {
    if (assetFilter === 'all') return true;
    if (assetFilter === 'personal') return asset.ownership === 'Harta Pribadi';
    if (assetFilter === 'joint') return asset.ownership === 'Harta Bersama';
    return true;
  });

  const personalAssetsCount = allAssets.filter((a: any) => a.ownership === 'Harta Pribadi').length;
  const jointAssetsCount = allAssets.filter((a: any) => a.ownership === 'Harta Bersama').length;

  // Save transactions to localStorage
  const saveTransactions = (newTx: Transaction[]) => {
    localStorage.setItem('vault_transactions', JSON.stringify(newTx));
  };

  // Deposit to Personal Vault (blockchain)
  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError('Masukkan jumlah yang valid');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const amount = parseFloat(depositAmount);
      
      // Deposit to blockchain
      const txHash = await depositPersonal(depositAmount);
      console.log('Deposit tx:', txHash);
      
      // Add transaction to history
      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        type: 'deposit_personal',
        from: 'Partner A',
        amount,
        date: new Date().toISOString(),
        status: 'confirmed'
      };
      
      const newTransactions = [newTx, ...transactions];
      setTransactions(newTransactions);
      saveTransactions(newTransactions);
      
      setSuccess(`Berhasil deposit ${amount} ETH ke Brankas Pribadi`);
      setShowDepositModal(false);
      setDepositAmount('');
      
      // Reload balances from blockchain
      await loadVaultBalances();
    } catch (err: any) {
      console.error('Deposit error:', err);
      setError(err.message || 'Gagal deposit ke brankas');
    } finally {
      setLoading(false);
    }
  };

  // Transfer from Personal to Shared Vault (blockchain)
  const handleTransferToShared = async () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      setError('Masukkan jumlah yang valid');
      return;
    }
    
    const amount = parseFloat(transferAmount);
    if (amount > balance.personal.partnerA) {
      setError('Saldo tidak cukup di Brankas Pribadi');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Transfer to shared vault on blockchain
      const txHash = await transferToShared(transferAmount);
      console.log('Transfer tx:', txHash);
      
      // Add transaction to history
      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        type: 'transfer_to_shared',
        from: 'Partner A',
        amount,
        date: new Date().toISOString(),
        status: 'confirmed'
      };
      
      const newTransactions = [newTx, ...transactions];
      setTransactions(newTransactions);
      saveTransactions(newTransactions);
      
      setSuccess(`Berhasil transfer ${amount} ETH ke Brankas Bersama`);
      setShowTransferModal(false);
      setTransferAmount('');
      
      // Reload balances from blockchain
      await loadVaultBalances();
    } catch (err: any) {
      console.error('Transfer error:', err);
      setError(err.message || 'Gagal transfer ke brankas bersama');
    } finally {
      setLoading(false);
    }
  };

  const escrowAvailable = balance.shared.total - balance.escrow.total;
  const partnerAPercent = balance.shared.total > 0 
    ? Math.round((balance.shared.partnerAContribution / balance.shared.total) * 100) 
    : 0;
  const partnerBPercent = 100 - partnerAPercent;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Brankas Digital</h1>
            <p className="text-slate-500 text-sm mt-1">Kelola aset pribadi dan bersama dengan aman</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { loadVaultBalances(); loadAssetsFromBlockchain(); }}
              disabled={loadingBalance || loadingAssets}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loadingBalance || loadingAssets ? 'animate-spin' : ''}`} />
              {loadingBalance ? 'Memuat...' : 'Refresh'}
            </button>
            <button 
              onClick={() => setShowDepositModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" /> Deposit
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-rose-500" />
            <p className="text-sm text-rose-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600">✕</button>
          </div>
        )}
        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
            <p className="text-sm text-emerald-700">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">✕</button>
          </div>
        )}

        {/* Flow Diagram */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Step 1: Personal Vault */}
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <WalletIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Step 1</p>
                  <p className="text-sm font-bold text-slate-900">Brankas Pribadi</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Deposit dari wallet Anda</p>
            </div>
            
            <ChevronRightIcon className="h-5 w-5 text-slate-300 hidden md:block" />
            
            {/* Step 2: Shared Vault */}
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <UserGroupIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Step 2</p>
                  <p className="text-sm font-bold text-slate-900">Brankas Bersama</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Pindahkan untuk harta bersama</p>
            </div>
            
            <ChevronRightIcon className="h-5 w-5 text-slate-300 hidden md:block" />
            
            {/* Step 3: Escrow */}
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <LockClosedIcon className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Step 3</p>
                  <p className="text-sm font-bold text-slate-900">Escrow Perjanjian</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Terkunci di smart contract</p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Personal Vault Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <WalletIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Brankas Pribadi</p>
                  {loadingBalance ? (
                    <div className="flex items-center gap-2">
                      <ArrowPathIcon className="h-4 w-4 text-slate-400 animate-spin" />
                      <span className="text-sm text-slate-400">Memuat...</span>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-slate-900">{balance.personal.partnerA.toFixed(4)} <span className="text-sm text-slate-400">ETH</span></p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-xs text-slate-600">Partner A (Anda)</span>
                <span className="text-sm font-bold text-blue-600">{balance.personal.partnerA.toFixed(4)} ETH</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-xs text-slate-600">Partner B</span>
                <span className="text-sm font-bold text-slate-400">{balance.personal.partnerB.toFixed(4)} ETH</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setShowDepositModal(true)}
                className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-1"
              >
                <ArrowDownLeftIcon className="h-3 w-3" /> Deposit
              </button>
              <button 
                onClick={() => setShowTransferModal(true)}
                disabled={balance.personal.partnerA <= 0}
                className="flex-1 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold hover:bg-purple-100 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <ArrowsRightLeftIcon className="h-3 w-3" /> Transfer
              </button>
            </div>
          </div>

          {/* Shared Vault Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 rounded-xl">
                  <UserGroupIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Brankas Bersama</p>
                  {loadingBalance ? (
                    <div className="flex items-center gap-2">
                      <ArrowPathIcon className="h-4 w-4 text-slate-400 animate-spin" />
                      <span className="text-sm text-slate-400">Memuat...</span>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-slate-900">{balance.shared.total.toFixed(4)} <span className="text-sm text-slate-400">ETH</span></p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Contribution Bar */}
            {balance.shared.total > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-bold mb-1">
                  <span className="text-indigo-600">A: {partnerAPercent}%</span>
                  <span className="text-rose-600">B: {partnerBPercent}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full flex overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all" style={{ width: `${partnerAPercent}%` }} />
                  <div className="bg-rose-500 h-full transition-all" style={{ width: `${partnerBPercent}%` }} />
                </div>
              </div>
            )}
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl">
                <span className="text-xs text-slate-600">Kontribusi A</span>
                <span className="text-sm font-bold text-indigo-600">{balance.shared.partnerAContribution.toFixed(4)} ETH</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-rose-50 rounded-xl">
                <span className="text-xs text-slate-600">Kontribusi B</span>
                <span className="text-sm font-bold text-rose-600">{balance.shared.partnerBContribution.toFixed(4)} ETH</span>
              </div>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-[10px] text-purple-700 font-medium">
                💡 Dana di sini bisa dijadikan jaminan escrow saat buat perjanjian
              </p>
            </div>
          </div>

          {/* Escrow Card */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl">
                  <LockClosedIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/70 font-medium">Escrow Terkunci</p>
                  <p className="text-2xl font-bold">{balance.escrow.total.toFixed(4)} <span className="text-sm text-white/70">ETH</span></p>
                </div>
              </div>
              {balance.escrow.locked && (
                <span className="text-[9px] bg-white/20 px-2 py-1 rounded-full font-bold">🔒 LOCKED</span>
              )}
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-white/10 rounded-xl">
                <span className="text-xs text-white/80">Total di Brankas Bersama</span>
                <span className="text-sm font-bold">{balance.shared.total.toFixed(4)} ETH</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/10 rounded-xl">
                <span className="text-xs text-white/80">Terkunci di Escrow</span>
                <span className="text-sm font-bold">{balance.escrow.total.toFixed(4)} ETH</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/20 rounded-xl border border-white/20">
                <span className="text-xs font-bold">Sisa (Belum Terkunci)</span>
                <span className="text-sm font-bold">{escrowAvailable.toFixed(4)} ETH</span>
              </div>
            </div>
            
            <p className="text-[10px] text-white/70">
              Escrow otomatis terkunci saat perjanjian aktif dan dibagi sesuai klausul
            </p>
          </div>
        </div>

        {/* NFT Assets - All with Filter */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <SparklesIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Inventaris Aset NFT</h3>
                <p className="text-xs text-slate-400">{allAssets.length} aset terdaftar di blockchain</p>
              </div>
              <button
                onClick={loadAssetsFromBlockchain}
                disabled={loadingAssets}
                className="ml-2 p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50"
                title="Refresh dari blockchain"
              >
                <ArrowPathIcon className={`h-4 w-4 ${loadingAssets ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setAssetFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  assetFilter === 'all' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Semua ({allAssets.length})
              </button>
              <button
                onClick={() => setAssetFilter('personal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  assetFilter === 'personal' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <UserIcon className="h-3 w-3" /> Pribadi ({personalAssetsCount})
              </button>
              <button
                onClick={() => setAssetFilter('joint')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  assetFilter === 'joint' 
                    ? 'bg-white text-rose-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <UsersIcon className="h-3 w-3" /> Bersama ({jointAssetsCount})
              </button>
            </div>
          </div>
          
          {loadingAssets ? (
            <div className="text-center py-12">
              <ArrowPathIcon className="h-8 w-8 text-indigo-400 mx-auto mb-3 animate-spin" />
              <p className="text-sm text-slate-400">Memuat aset dari blockchain...</p>
            </div>
          ) : filteredAssets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map((asset: BlockchainAsset) => {
                // Get category icon based on assetClass
                const getCategoryIcon = (assetClass: string) => {
                  const icons: Record<string, string> = {
                    'Properti': '🏠',
                    'Kendaraan': '🚗',
                    'Investasi': '📈',
                    'Barang Berharga': '💎',
                  };
                  return icons[assetClass] || '📦';
                };
                
                // Format date from timestamp
                const formatDate = (timestamp: number) => {
                  if (!timestamp) return '-';
                  return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                };

                return (
                  <div key={asset.tokenId} className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                    asset.ownership === 'Harta Bersama' 
                      ? 'bg-rose-50/50 border-rose-100 hover:border-rose-200' 
                      : 'bg-indigo-50/50 border-indigo-100 hover:border-indigo-200'
                  }`}>
                    {/* Partner Asset Badge */}
                    {asset.isPartnerAsset && (
                      <div className="mb-2 flex items-center gap-1 text-[9px] text-purple-600 font-bold">
                        <UsersIcon className="h-3 w-3" />
                        <span>Aset Pasangan</span>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3 mb-3">
                      {asset.imageUrl ? (
                        <img 
                          src={asset.imageUrl} 
                          alt={asset.name}
                          className="w-14 h-14 rounded-xl object-cover shadow-sm"
                          onError={(e) => {
                            // Fallback to emoji icon if image fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-2xl shadow-sm ${asset.imageUrl ? 'hidden' : ''}`}>
                        {getCategoryIcon(asset.assetClass)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{asset.name}</p>
                        <p className="text-[10px] text-slate-400">{asset.assetClass} • {asset.symbol}</p>
                        <span className={`inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full font-bold ${
                          asset.ownership === 'Harta Bersama' 
                            ? 'bg-rose-100 text-rose-700' 
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {asset.ownership === 'Harta Bersama' ? '👫 Harta Bersama' : '👤 Harta Pribadi'}
                        </span>
                      </div>
                    </div>
                    
                    {asset.utility && (
                      <p className="text-[10px] text-slate-500 mb-3 line-clamp-2">{asset.utility}</p>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">
                          Token #{asset.tokenId}
                        </span>
                        <span className="text-[9px] text-slate-400">{formatDate(asset.mintedAt)}</span>
                      </div>
                      <a 
                        href={`https://sepolia.basescan.org/token/${import.meta.env.VITE_ASSET_NFT_ADDRESS}?a=${asset.tokenId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-indigo-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                        BaseScan
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <SparklesIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400 mb-2">
                {assetFilter === 'all' 
                  ? 'Belum ada aset NFT terdaftar' 
                  : assetFilter === 'personal' 
                    ? 'Belum ada Harta Pribadi' 
                    : 'Belum ada Harta Bersama'
                }
              </p>
              <Link 
                to="/asset-creator" 
                className="inline-flex items-center gap-2 text-xs text-indigo-600 font-bold hover:underline"
              >
                <PlusIcon className="h-4 w-4" />
                Daftarkan Aset Baru
              </Link>
            </div>
          )}
          
          {/* Quick Add Button */}
          {allAssets.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Link 
                to="/asset-creator"
                className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Daftarkan Aset Baru
              </Link>
            </div>
          )}
        </div>

        {/* Deposit Modal */}
        {showDepositModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Deposit ke Brankas Pribadi</h3>
              <p className="text-sm text-slate-500 mb-6">Dana akan masuk ke brankas pribadi Anda</p>
              
              <div className="mb-6">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Jumlah ETH</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 p-3 border border-slate-200 rounded-xl text-lg font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                  <span className="text-slate-400 font-bold">ETH</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowDepositModal(false); setDepositAmount(''); }}
                  className="flex-1 py-3 text-slate-500 font-bold text-sm hover:text-slate-700"
                >
                  Batal
                </button>
                <button 
                  onClick={handleDeposit}
                  disabled={loading || !depositAmount}
                  className="flex-[2] py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Processing...</> : 'Deposit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Transfer ke Brankas Bersama</h3>
              <p className="text-sm text-slate-500 mb-6">Pindahkan dana dari pribadi ke bersama</p>
              
              <div className="p-3 bg-blue-50 rounded-xl mb-4">
                <p className="text-xs text-blue-700">
                  Saldo Brankas Pribadi: <span className="font-bold">{balance.personal.partnerA.toFixed(4)} ETH</span>
                </p>
              </div>
              
              <div className="mb-6">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Jumlah Transfer</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={balance.personal.partnerA}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 p-3 border border-slate-200 rounded-xl text-lg font-bold focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                  <span className="text-slate-400 font-bold">ETH</span>
                </div>
                <button 
                  onClick={() => setTransferAmount(balance.personal.partnerA.toString())}
                  className="text-xs text-purple-600 font-bold mt-2 hover:underline"
                >
                  Transfer Semua
                </button>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowTransferModal(false); setTransferAmount(''); }}
                  className="flex-1 py-3 text-slate-500 font-bold text-sm hover:text-slate-700"
                >
                  Batal
                </button>
                <button 
                  onClick={handleTransferToShared}
                  disabled={loading || !transferAmount || parseFloat(transferAmount) > balance.personal.partnerA}
                  className="flex-[2] py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Processing...</> : 'Transfer'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Vault;
