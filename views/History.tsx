import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { assetNFTService } from '../services/web3Service';
import { 
  ArrowUpRightIcon, 
  ArrowDownLeftIcon, 
  LockClosedIcon,
  ArrowsRightLeftIcon,
  ArchiveBoxIcon,
  FunnelIcon,
  CalendarIcon,
  SparklesIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

type TransactionType = 'deposit_personal' | 'transfer_to_shared' | 'lock_escrow' | 'withdraw' | 'nft_mint' | 'agreement_create';

interface Transaction {
  id: string;
  type: TransactionType;
  from: string;
  amount?: number;
  date: string;
  status: 'confirmed' | 'pending';
  txHash?: string;
  details?: string;
  isPartnerAsset?: boolean;
  partnerAddress?: string;
}

const History: React.FC = () => {
  const { isConnected, account } = useWeb3();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'vault' | 'nft' | 'agreement'>('all');
  const [loadingBlockchain, setLoadingBlockchain] = useState(false);

  // Fetch metadata from IPFS to get ownership info (same as Vault.tsx)
  const fetchMetadataFromIPFS = async (metadataURI: string): Promise<{ ownership?: string; category?: string } | null> => {
    try {
      const ipfsHash = metadataURI.replace('ipfs://', '');
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      
      const response = await fetch(gatewayUrl);
      if (!response.ok) return null;
      
      const metadata = await response.json();
      const attributes = metadata.attributes || [];
      const ownershipAttr = attributes.find((a: any) => a.trait_type === 'Ownership');
      const categoryAttr = attributes.find((a: any) => a.trait_type === 'Category');
      
      return {
        ownership: ownershipAttr?.value,
        category: categoryAttr?.value
      };
    } catch (e) {
      console.error('Failed to fetch metadata from IPFS:', e);
      return null;
    }
  };

  // Load NFT assets from blockchain (synced with Vault.tsx)
  const loadNFTsFromBlockchain = async (): Promise<Transaction[]> => {
    if (!account || !isConnected) return [];
    
    try {
      await assetNFTService.connect();
      
      // Get all visible assets (own + shared from partner) - ON-CHAIN
      const allTokenIds = await assetNFTService.getAllVisibleAssets(account);
      console.log('History - All visible assets:', allTokenIds);
      
      // Get localStorage data for extra info (as cache)
      const localAssets = JSON.parse(localStorage.getItem('chainvow_assets') || '[]');
      const localAssetMap = new Map();
      localAssets.forEach((a: any) => {
        if (a.tokenId !== undefined) localAssetMap.set(Number(a.tokenId), a);
        if (a.id !== undefined) localAssetMap.set(Number(a.id), a);
      });
      
      const nftTx: Transaction[] = [];
      
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
          
          // If no localStorage data, fetch from IPFS metadata
          if (!category && assetData.metadataURI) {
            const ipfsData = await fetchMetadataFromIPFS(assetData.metadataURI);
            if (ipfsData) {
              category = ipfsData.category;
            }
          }
          
          nftTx.push({
            id: `nft_${tokenId}`,
            type: 'nft_mint' as TransactionType,
            from: assetData.name,
            date: assetData.mintedAt ? new Date(Number(assetData.mintedAt) * 1000).toISOString() : new Date().toISOString(),
            status: 'confirmed' as const,
            txHash: localData?.txHash,
            details: `${category || assetData.assetClass} - ${ownership}`,
            isPartnerAsset: isPartnerAsset,
            partnerAddress: isPartnerAsset ? assetData.creator : undefined
          });
        } catch (e) {
          console.error(`Failed to load asset ${tokenId}:`, e);
        }
      }
      
      return nftTx;
    } catch (error) {
      console.error('Failed to load NFTs from blockchain:', error);
      return [];
    }
  };

  // Load all transactions
  const loadTransactions = async () => {
    setLoadingBlockchain(true);
    
    // Load vault transactions from localStorage
    const vaultTx = JSON.parse(localStorage.getItem('vault_transactions') || '[]');
    
    // Load NFT minting history from blockchain (synced with Vault)
    let nftTx: Transaction[] = [];
    if (isConnected && account) {
      nftTx = await loadNFTsFromBlockchain();
    } else {
      // Fallback to localStorage if not connected
      const nftAssets = JSON.parse(localStorage.getItem('chainvow_assets') || '[]');
      nftTx = nftAssets.map((asset: any) => ({
        id: `nft_${asset.tokenId}`,
        type: 'nft_mint' as TransactionType,
        from: asset.name,
        date: asset.date ? new Date(asset.date).toISOString() : new Date().toISOString(),
        status: 'confirmed' as const,
        txHash: asset.txHash,
        details: `${asset.category} - ${asset.ownership}`
      }));
    }
    
    // Load agreement history
    const agreements = JSON.parse(localStorage.getItem('smartvow_agreements') || '[]');
    const agreementTx: Transaction[] = agreements.map((a: any) => ({
      id: `agreement_${a.vowId}`,
      type: 'agreement_create' as TransactionType,
      from: `Vow #${a.vowId}`,
      date: a.createdAt,
      status: a.status === 'active' ? 'confirmed' as const : 'pending' as const,
      txHash: a.txHash,
      details: `${a.conditions?.length || 0} klausul`
    }));
    
    // Combine and sort by date
    const allTx = [...vaultTx, ...nftTx, ...agreementTx].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    setTransactions(allTx);
    setLoadingBlockchain(false);
  };

  useEffect(() => {
    loadTransactions();
  }, [isConnected, account]);

  // Filter transactions
  const filteredTx = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'vault') return ['deposit_personal', 'transfer_to_shared', 'lock_escrow', 'withdraw'].includes(tx.type);
    if (filter === 'nft') return tx.type === 'nft_mint';
    if (filter === 'agreement') return tx.type === 'agreement_create';
    return true;
  });

  const getTypeConfig = (type: TransactionType) => {
    switch (type) {
      case 'deposit_personal':
        return { icon: ArrowDownLeftIcon, label: 'Deposit Brankas Pribadi', color: 'bg-blue-100 text-blue-600' };
      case 'transfer_to_shared':
        return { icon: ArrowsRightLeftIcon, label: 'Transfer ke Bersama', color: 'bg-purple-100 text-purple-600' };
      case 'lock_escrow':
        return { icon: LockClosedIcon, label: 'Kunci ke Escrow', color: 'bg-amber-100 text-amber-600' };
      case 'withdraw':
        return { icon: ArrowUpRightIcon, label: 'Penarikan', color: 'bg-rose-100 text-rose-600' };
      case 'nft_mint':
        return { icon: SparklesIcon, label: 'Mint NFT Aset', color: 'bg-emerald-100 text-emerald-600' };
      case 'agreement_create':
        return { icon: DocumentTextIcon, label: 'Buat Perjanjian', color: 'bg-indigo-100 text-indigo-600' };
      default:
        return { icon: ArchiveBoxIcon, label: 'Transaksi', color: 'bg-slate-100 text-slate-600' };
    }
  };

  const vaultCount = transactions.filter(tx => ['deposit_personal', 'transfer_to_shared', 'lock_escrow', 'withdraw'].includes(tx.type)).length;
  const nftCount = transactions.filter(tx => tx.type === 'nft_mint').length;
  const partnerAssetCount = transactions.filter(tx => tx.type === 'nft_mint' && tx.isPartnerAsset).length;
  const agreementCount = transactions.filter(tx => tx.type === 'agreement_create').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Riwayat Transaksi</h1>
            <p className="text-slate-500 text-sm mt-1">Semua aktivitas di SmartVow</p>
          </div>
          <button
            onClick={loadTransactions}
            disabled={loadingBlockchain}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loadingBlockchain ? 'animate-spin' : ''}`} />
            {loadingBlockchain ? 'Memuat...' : 'Refresh'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
            <p className="text-2xl font-bold text-slate-900">{transactions.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Brankas</p>
            <p className="text-2xl font-bold text-purple-600">{vaultCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase">NFT Aset</p>
            <p className="text-2xl font-bold text-emerald-600">{nftCount}</p>
            {partnerAssetCount > 0 && (
              <p className="text-[9px] text-purple-500 mt-1">({partnerAssetCount} dari pasangan)</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Perjanjian</p>
            <p className="text-2xl font-bold text-indigo-600">{agreementCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Harta Bersama</p>
            <p className="text-2xl font-bold text-rose-600">{transactions.filter(tx => tx.type === 'nft_mint' && tx.details?.includes('Harta Bersama')).length}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <FunnelIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
          {[
            { id: 'all', label: 'Semua' },
            { id: 'vault', label: 'Brankas' },
            { id: 'nft', label: 'NFT Aset' },
            { id: 'agreement', label: 'Perjanjian' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === f.id 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredTx.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredTx.map((tx) => {
                const config = getTypeConfig(tx.type);
                const IconComponent = config.icon;
                
                return (
                  <div key={tx.id} className="p-4 hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${config.color}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-bold text-slate-900">{config.label}</p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            tx.status === 'confirmed' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {tx.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                          </span>
                          {tx.isPartnerAsset && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                              <UsersIcon className="h-3 w-3" /> Aset Pasangan
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{tx.from}</p>
                        {tx.details && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{tx.details}</p>
                        )}
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        {tx.amount !== undefined && (
                          <p className={`text-sm font-bold ${
                            tx.type === 'withdraw' ? 'text-rose-600' : 'text-emerald-600'
                          }`}>
                            {tx.type === 'withdraw' ? '-' : '+'}{tx.amount.toFixed(4)} ETH
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                          <CalendarIcon className="h-3 w-3" />
                          {new Date(tx.date).toLocaleDateString('id-ID', { 
                            day: 'numeric', 
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                        {tx.txHash && (
                          <a 
                            href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-indigo-600 font-bold hover:underline flex items-center gap-1 justify-end mt-1"
                          >
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                            BaseScan
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <ArchiveBoxIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400 mb-2">Belum ada riwayat transaksi</p>
              <p className="text-xs text-slate-300">Mulai dengan deposit ke brankas atau buat perjanjian</p>
              <div className="flex justify-center gap-3 mt-4">
                <Link 
                  to="/vault" 
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200"
                >
                  Ke Brankas
                </Link>
                <Link 
                  to="/generator" 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                >
                  Buat Perjanjian
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default History;
