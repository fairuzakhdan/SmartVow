import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { ContractConditionType, assetNFTService } from '../services/web3Service';
import { 
  TrashIcon, 
  RocketLaunchIcon, 
  ShieldCheckIcon, 
  LockClosedIcon, 
  ChevronRightIcon,
  ArrowPathIcon,
  ArchiveBoxIcon,
  ScaleIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  HeartIcon,
  BanknotesIcon,
  HomeIcon,
  UserIcon,
  SparklesIcon,
  HandRaisedIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { VaultAsset } from '../types';

type ClaimVerificationMethod = 'ai' | 'internal' | null;
type NFTDistributionType = 'transfer' | 'sell' | null;

interface VowFormCondition {
  title: string;
  description: string;
  penalty: number;
  linkedAssetId?: number;
  nftDistribution?: NFTDistributionType;
}

const AGREEMENT_CATEGORIES = [
  {
    id: 'divorce',
    title: 'Perceraian',
    icon: ScaleIcon,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    description: 'Pembagian harta jika terjadi perceraian',
    clauses: []
  },
  {
    id: 'infidelity',
    title: 'Perselingkuhan',
    icon: HeartIcon,
    color: 'from-rose-500 to-pink-500',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    description: 'Perlindungan dari ketidaksetiaan',
    clauses: [
      { title: 'Larangan Perselingkuhan', description: 'Jika terbukti menjalin hubungan romantis atau intim dengan pihak ketiga, pihak yang melanggar wajib memberikan kompensasi penuh.', penalty: 85 },
      { title: 'Komitmen Kesetiaan', description: 'Kedua pihak berkomitmen untuk saling setia secara emosional dan fisik selama pernikahan.', penalty: 75 },
    ]
  },
  {
    id: 'kdrt',
    title: 'Kekerasan (KDRT)',
    icon: HandRaisedIcon,
    color: 'from-red-500 to-rose-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    description: 'Perlindungan dari kekerasan rumah tangga',
    clauses: [
      { title: 'Perlindungan dari Kekerasan Fisik', description: 'Jika terbukti melakukan kekerasan fisik, pelaku wajib memberikan kompensasi 100%.', penalty: 100 },
      { title: 'Perlindungan dari Kekerasan Psikis', description: 'Jika terbukti melakukan kekerasan psikis, pelaku wajib memberikan kompensasi.', penalty: 90 },
    ]
  },
  {
    id: 'financial',
    title: 'Keuangan',
    icon: BanknotesIcon,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    description: 'Transparansi pengelolaan keuangan',
    clauses: [
      { title: 'Transparansi Keuangan', description: 'Kedua pihak wajib transparan dalam penghasilan, pengeluaran, dan investasi.', penalty: 70 },
      { title: 'Larangan Hutang Sepihak', description: 'Tidak diperbolehkan membuat hutang besar tanpa persetujuan pasangan.', penalty: 65 },
    ]
  },
  {
    id: 'asset',
    title: 'Aset & Properti',
    icon: HomeIcon,
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    description: 'Pembagian dan perlindungan aset',
    clauses: [
      { title: 'Pembagian Aset Bersama', description: 'Aset yang diperoleh selama pernikahan dibagi sesuai kontribusi.', penalty: 70 },
      { title: 'Larangan Penjualan Sepihak', description: 'Aset bersama tidak boleh dijual tanpa persetujuan kedua pihak.', penalty: 75 },
    ]
  },
  {
    id: 'children',
    title: 'Anak & Keluarga',
    icon: UserIcon,
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    description: 'Hak asuh dan tanggung jawab keluarga',
    clauses: [
      { title: 'Hak Asuh Anak', description: 'Hak asuh anak diberikan kepada pihak yang tidak melanggar perjanjian.', penalty: 75 },
      { title: 'Kewajiban Nafkah Anak', description: 'Pihak yang tidak mendapat hak asuh wajib memberikan nafkah anak.', penalty: 70 },
    ]
  },
];

const Generator: React.FC = () => {
  const { 
    isConnected, 
    account, 
    createVowAndLockEscrow,
    shortenAddress,
    getVaultBalances
  } = useWeb3();
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [conditions, setConditions] = useState<VowFormCondition[]>([]);
  const [step, setStep] = useState(1);
  const [availableAssets, setAvailableAssets] = useState<VaultAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [partnerAddress, setPartnerAddress] = useState('');
  const [divorceOption, setDivorceOption] = useState<'custom' | 'allin' | null>(null);
  const [escrowAmount, setEscrowAmount] = useState('0.01');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [vowId, setVowId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVerificationMethod, setSelectedVerificationMethod] = useState<ClaimVerificationMethod>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [sharedVaultBalance, setSharedVaultBalance] = useState<number>(0);
  const [loadingVaultBalance, setLoadingVaultBalance] = useState(false);

  // Load shared vault balance
  const loadSharedVaultBalance = async () => {
    if (!account || !isConnected) return;
    
    setLoadingVaultBalance(true);
    try {
      const balances = await getVaultBalances();
      setSharedVaultBalance(parseFloat(balances.totalShared));
    } catch (e) {
      console.error('Failed to load vault balance:', e);
    } finally {
      setLoadingVaultBalance(false);
    }
  };

  // Fetch metadata from IPFS to get ownership info
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
      
      // If no Ownership attribute, try to detect from description
      let ownership = ownershipAttr?.value;
      if (!ownership && metadata.description) {
        if (metadata.description.toLowerCase().includes('harta pribadi')) {
          ownership = 'Harta Pribadi';
        } else if (metadata.description.toLowerCase().includes('harta bersama')) {
          ownership = 'Harta Bersama';
        }
      }
      
      return {
        ownership: ownership,
        category: categoryAttr?.value
      };
    } catch (e) {
      console.error('Failed to fetch metadata from IPFS:', e);
      return null;
    }
  };

  // Get partner addresses from existing agreements AND linked partner
  const getPartnerAddresses = (): string[] => {
    const partners: Set<string> = new Set();
    
    // 1. From linked partner (manual input in Vault)
    const savedLinkedPartner = localStorage.getItem(`linked_partner_${account?.toLowerCase()}`);
    if (savedLinkedPartner) {
      partners.add(savedLinkedPartner.toLowerCase());
    }
    
    // 2. From existing agreements
    const agreements = JSON.parse(localStorage.getItem('smartvow_agreements') || '[]');
    agreements.forEach((agreement: any) => {
      if (agreement.partnerA?.toLowerCase() === account?.toLowerCase()) {
        if (agreement.partnerB) partners.add(agreement.partnerB.toLowerCase());
      }
      if (agreement.partnerB?.toLowerCase() === account?.toLowerCase()) {
        if (agreement.partnerA) partners.add(agreement.partnerA.toLowerCase());
      }
    });
    
    return Array.from(partners);
  };

  // Load NFT assets from blockchain (including partner's "Harta Bersama" assets)
  // Load NFT assets from blockchain using getAllVisibleAssets (includes partner's Harta Bersama)
  const loadAssetsFromBlockchain = async () => {
    if (!account || !isConnected) return;
    
    setLoadingAssets(true);
    try {
      await assetNFTService.connect();
      
      // Get all visible assets (own + shared from partner) - ON-CHAIN
      const allTokenIds = await assetNFTService.getAllVisibleAssets(account);
      console.log('All visible assets for agreement:', allTokenIds);
      
      // Get localStorage data as cache
      const localAssets = JSON.parse(localStorage.getItem('chainvow_assets') || '[]');
      const localAssetMap = new Map();
      localAssets.forEach((a: any) => {
        if (a.tokenId !== undefined) localAssetMap.set(Number(a.tokenId), a);
        if (a.id !== undefined) localAssetMap.set(Number(a.id), a);
      });
      
      const assets: VaultAsset[] = [];
      
      for (const tokenId of allTokenIds) {
        try {
          const assetData = await assetNFTService.getAsset(tokenId);
          const localData = localAssetMap.get(Number(tokenId)) as any;
          
          // Get ownership type from contract
          const ownershipType = Number(assetData.ownershipType);
          const ownership = ownershipType === 1 ? 'Harta Bersama' : 'Harta Pribadi';
          
          let category = localData?.category;
          
          if (!category && assetData.metadataURI) {
            const ipfsData = await fetchMetadataFromIPFS(assetData.metadataURI);
            if (ipfsData) {
              category = ipfsData.category;
            }
          }
          
          // Only include "Harta Bersama" for agreements
          if (ownership === 'Harta Bersama') {
            const isPartnerAsset = assetData.creator.toLowerCase() !== account.toLowerCase();
            
            assets.push({
              id: Number(tokenId),
              name: isPartnerAsset ? `${assetData.name} (Pasangan)` : assetData.name,
              type: assetData.assetClass,
              category: category || assetData.assetClass,
              ownership: ownership,
              icon: '',
              symbol: assetData.symbol,
              isUserGenerated: true,
              date: new Date(Number(assetData.mintedAt) * 1000).toLocaleDateString(),
              txHash: '',
              tokenId: Number(tokenId),
              onChain: true
            });
          }
        } catch (e) {
          console.error(`Failed to load asset ${tokenId}:`, e);
        }
      }
      
      console.log('Final available assets for agreement:', assets);
      setAvailableAssets(assets);
    } catch (e) {
      console.error('Failed to load assets from blockchain:', e);
      const saved = JSON.parse(localStorage.getItem('chainvow_assets') || '[]');
      const jointAssets = saved.filter((asset: any) => asset.ownership === 'Harta Bersama' && asset.onChain);
      setAvailableAssets(jointAssets);
    } finally {
      setLoadingAssets(false);
    }
  };

  // Reset state when component mounts (for creating new agreement)
  useEffect(() => {
    // Reset all form state when entering Generator
    setStep(1);
    setVowId(null);
    setTxHash(null);
    setError(null);
    setConditions([]);
    setSelectedCategories([]);
    setDivorceOption(null);
    setSelectedVerificationMethod(null);
    setPartnerAddress('');
    setEscrowAmount('0.01');
  }, []);

  useEffect(() => {
    if (isConnected && account) {
      loadAssetsFromBlockchain();
      loadSharedVaultBalance();
    }
  }, [isConnected, account]);

  // Auto-set escrow for non-divorce clauses when no NFTs available
  useEffect(() => {
    if (availableAssets.length === 0 && conditions.length > 0) {
      const updatedConditions = conditions.map(c => {
        if (!c.title.includes('Perceraian') && c.linkedAssetId !== -1) {
          return { ...c, linkedAssetId: -1 };
        }
        return c;
      });
      const hasChanges = updatedConditions.some((c, i) => c.linkedAssetId !== conditions[i].linkedAssetId);
      if (hasChanges) {
        setConditions(updatedConditions);
      }
    }
  }, [availableAssets.length, conditions.length]);

  // Validation check
  const validateBeforeDeploy = (): boolean => {
    const errors: string[] = [];
    
    if (conditions.length === 0) {
      errors.push('Pilih minimal 1 kategori perjanjian');
    }
    
    if (!selectedVerificationMethod) {
      errors.push('Pilih metode pengajuan klaim');
    }
    
    // Check divorce clause requirements
    const divorceClause = conditions.find(c => c.title.includes('Perceraian'));
    if (divorceClause) {
      if (!divorceClause.linkedAssetId) {
        errors.push('Pilih aset untuk klausul perceraian');
      }
      if (!divorceOption) {
        errors.push('Pilih metode pembagian perceraian (All-in atau Custom)');
      }
    }
    
    // Check non-divorce clauses for linked assets
    const nonDivorceClauses = conditions.filter(c => !c.title.includes('Perceraian'));
    const hasUnlinkedClauses = nonDivorceClauses.some(c => !c.linkedAssetId);
    if (nonDivorceClauses.length > 0 && hasUnlinkedClauses) {
      errors.push('Hubungkan semua klausul dengan jaminan (Escrow/NFT)');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const toggleCategory = (categoryId: string) => {
    const category = AGREEMENT_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    if (categoryId === 'divorce') {
      if (selectedCategories.includes(categoryId)) {
        setSelectedCategories(prev => prev.filter(id => id !== categoryId));
        setConditions(prev => prev.filter(c => !c.title.includes('Perceraian')));
        setDivorceOption(null);
      } else {
        setSelectedCategories(prev => [...prev, categoryId]);
        const divorceClause: VowFormCondition = {
          title: 'Pembagian Harta Perceraian',
          description: 'Jika terjadi perceraian tanpa pelanggaran perjanjian, harta bersama akan dibagi sesuai kesepakatan.',
          penalty: 50
        };
        setConditions(prev => [...prev, divorceClause]);
        setDivorceOption('custom');
      }
      return;
    }

    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
      setConditions(prev => prev.filter(c => !category.clauses.find(cl => cl.title === c.title)));
    } else {
      setSelectedCategories(prev => [...prev, categoryId]);
      const newClauses = category.clauses.map(cl => ({
        title: cl.title,
        description: cl.description,
        penalty: cl.penalty
      }));
      setConditions(prev => [...prev, ...newClauses]);
    }
  };

  const getConditionType = (title: string): ContractConditionType => {
    const lower = title.toLowerCase();
    if (lower.includes('selingkuh') || lower.includes('kesetiaan')) return ContractConditionType.Infidelity;
    if (lower.includes('kdrt') || lower.includes('kekerasan')) return ContractConditionType.KDRT;
    if (lower.includes('finansial') || lower.includes('keuangan')) return ContractConditionType.Financial;
    return ContractConditionType.Custom;
  };

  const handleDeploy = async () => {
    if (!validateBeforeDeploy()) return;
    if (!isConnected || !partnerAddress) {
      setError('Hubungkan wallet dan masukkan alamat partner');
      return;
    }

    // Check shared vault balance for escrow
    const requiredEscrow = parseFloat(escrowAmount);
    if (sharedVaultBalance < requiredEscrow) {
      setError(`Saldo brankas bersama tidak mencukupi. Diperlukan ${requiredEscrow} ETH, tersedia ${sharedVaultBalance.toFixed(3)} ETH. Silakan deposit ke brankas bersama terlebih dahulu.`);
      return;
    }

    setDeploying(true);
    setError(null);

    try {
      // Prepare condition data for single transaction
      const conditionTypes: number[] = [];
      const descriptions: string[] = [];
      const penaltyPercentages: number[] = [];
      
      for (const condition of conditions) {
        const condType = getConditionType(condition.title);
        conditionTypes.push(condType);
        descriptions.push(condition.description);
        penaltyPercentages.push(condition.penalty * 100); // Convert to basis points
      }
      
      console.log('=== DEPLOY PERJANJIAN (1 TRANSAKSI) ===');
      console.log('Partner B:', partnerAddress);
      console.log('Escrow Amount:', escrowAmount, 'ETH');
      console.log('Conditions:', conditions.length);
      
      // Single transaction: Create + Add Conditions + Sign Partner A + Lock Escrow
      const { vowId: newVowId, txHash: createTxHash } = await createVowAndLockEscrow(
        partnerAddress,
        `ipfs://smartvow-${Date.now()}`,
        conditionTypes,
        descriptions,
        penaltyPercentages,
        escrowAmount
      );
      
      console.log('Vow created with ID:', newVowId);
      console.log('Transaction hash:', createTxHash);
      
      setVowId(newVowId);
      setTxHash(createTxHash);
      
      // Save agreement to localStorage for Dashboard
      const agreementData = {
        vowId: newVowId,
        txHash: createTxHash,
        partnerA: account,
        partnerB: partnerAddress,
        conditions: conditions.map(c => ({
          title: c.title,
          description: c.description,
          penalty: c.penalty,
          linkedAssetId: c.linkedAssetId,
          nftDistribution: c.nftDistribution,
          linkedAsset: c.linkedAssetId && c.linkedAssetId > 0 
            ? availableAssets.find((a: any) => a.id === c.linkedAssetId) 
            : null
        })),
        verificationMethod: selectedVerificationMethod,
        divorceOption: divorceOption,
        escrowAmount: escrowAmount,
        status: 'pending', // Waiting for Partner B to sign and activate
        partnerASigned: true,
        partnerBSigned: false,
        createdAt: new Date().toISOString(),
        selectedCategories: selectedCategories
      };
      
      // Get existing agreements and add new one (avoid duplicates)
      const existingAgreements = JSON.parse(localStorage.getItem('smartvow_agreements') || '[]');
      const filteredAgreements = existingAgreements.filter((a: any) => a.vowId !== newVowId);
      filteredAgreements.push(agreementData);
      localStorage.setItem('smartvow_agreements', JSON.stringify(filteredAgreements));
      
      console.log('=== DEPLOY SELESAI ===');
      console.log('Partner B tinggal TTD + Aktivasi (1 transaksi, gas fee saja)');
      
      // Go to step 3 (waiting for Partner B)
      setStep(3);
    } catch (err: any) {
      console.error('Deploy error:', err);
      setError(err.message || 'Gagal deploy contract. Coba lagi.');
    } finally {
      setDeploying(false);
    }
  };

  const updatePenalty = (index: number, value: number) => {
    const newConditions = [...conditions];
    newConditions[index].penalty = value;
    setConditions(newConditions);
  };

  const linkAsset = (index: number, assetId: number) => {
    const newConditions = [...conditions];
    newConditions[index].linkedAssetId = assetId;
    if (assetId && assetId > 0) {
      newConditions[index].nftDistribution = 'transfer';
    } else {
      newConditions[index].nftDistribution = null;
    }
    setConditions(newConditions);
  };

  const setNFTDistribution = (index: number, distribution: NFTDistributionType) => {
    const newConditions = [...conditions];
    newConditions[index].nftDistribution = distribution;
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    const condition = conditions[index];
    if (condition.title.includes('Perceraian')) {
      setSelectedCategories(prev => prev.filter(id => id !== 'divorce'));
      setDivorceOption(null);
    }
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const canProceedToStep2 = conditions.length > 0 && selectedVerificationMethod;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
        
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-xs font-bold mb-4 shadow-lg">
            <ShieldCheckIcon className="h-4 w-4" />
            Smart Prenup Generator
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Buat Perjanjian <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Pranikah Digital</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Lindungi komitmen Anda dengan smart contract di blockchain Base
          </p>
        </header>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {[
            { num: 1, label: 'Susun Klausul' },
            { num: 2, label: 'Verifikasi' },
            { num: 3, label: 'Selesai' }
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div className={`flex items-center gap-2 ${step >= s.num ? 'text-indigo-600' : 'text-slate-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s.num 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {step > s.num ? <CheckCircleIcon className="h-5 w-5" /> : s.num}
                </div>
                <span className="text-xs font-medium hidden sm:block">{s.label}</span>
              </div>
              {i < 2 && <div className={`w-12 h-0.5 ${step > s.num ? 'bg-indigo-600' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Panel - Categories */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900 mb-1">Pilih Kategori Perjanjian</h2>
                <p className="text-xs text-slate-400 mb-4">Klik untuk menambahkan klausul</p>
                
                <div className="space-y-2">
                  {AGREEMENT_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                          isSelected 
                            ? `${cat.borderColor} ${cat.bgColor}` 
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${cat.color} text-white`}>
                          <cat.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${isSelected ? cat.textColor : 'text-slate-700'}`}>
                            {cat.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{cat.description}</p>
                        </div>
                        {isSelected && <CheckCircleIcon className={`h-5 w-5 ${cat.textColor}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Verification Method */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-bold text-slate-900">Metode Pengajuan Klaim</h2>
                  <span className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold">WAJIB</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedVerificationMethod('ai')}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedVerificationMethod === 'ai' 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-slate-100 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <SparklesIcon className={`h-4 w-4 ${selectedVerificationMethod === 'ai' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-slate-700">Verifikasi AI</span>
                    </div>
                    <p className="text-[9px] text-slate-400">Upload bukti, AI verifikasi otomatis</p>
                  </button>
                  <button
                    onClick={() => setSelectedVerificationMethod('internal')}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedVerificationMethod === 'internal' 
                        ? 'border-rose-500 bg-rose-50' 
                        : 'border-slate-100 hover:border-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <LockClosedIcon className={`h-4 w-4 ${selectedVerificationMethod === 'internal' ? 'text-rose-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-slate-700">Internal Pasangan</span>
                    </div>
                    <p className="text-[9px] text-slate-400">Privasi, tanpa pihak ketiga</p>
                  </button>
                </div>
              </div>

              {/* Summary */}
              {selectedCategories.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs opacity-80">{selectedCategories.length} kategori dipilih</p>
                      <p className="text-lg font-bold">{conditions.length} Klausul</p>
                    </div>
                    <ChevronRightIcon className="h-6 w-6 opacity-60" />
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Clauses */}
            <div className="lg:col-span-7 space-y-4">
              
              {conditions.length > 0 ? (
                <>
                  {conditions.map((c, i) => {
                    const isDivorce = c.title.includes('Perceraian');
                    
                    return (
                      <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isDivorce ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                              {isDivorce ? <ScaleIcon className="h-4 w-4 text-amber-600" /> : <DocumentTextIcon className="h-4 w-4 text-indigo-600" />}
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 font-medium">Klausul #{i + 1}</p>
                              <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                            </div>
                          </div>
                          <button onClick={() => removeCondition(i)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">{c.description}</p>

                        {isDivorce ? (
                          /* Divorce Clause UI */
                          <div className="space-y-4">
                            {/* Asset Selection */}
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                                Pilih Aset dari Brankas <span className="text-rose-500">*</span>
                                {loadingAssets && <span className="ml-2 text-indigo-500">(Memuat...)</span>}
                              </label>
                              <select 
                                value={c.linkedAssetId || ''} 
                                onChange={(e) => linkAsset(i, Number(e.target.value))}
                                disabled={loadingAssets}
                                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                              >
                                <option value="">{loadingAssets ? 'Memuat aset...' : 'Pilih aset...'}</option>
                                <option value="-1">💰 Saldo ETH di Brankas</option>
                                {availableAssets.map((asset: any) => (
                                  <option key={asset.id} value={asset.id}>🏠 {asset.name} - Token #{asset.tokenId}</option>
                                ))}
                              </select>
                            </div>

                            {/* Distribution Method */}
                            {c.linkedAssetId && (
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                                  Metode Pembagian <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => { setDivorceOption('allin'); updatePenalty(i, 100); }}
                                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                                      divorceOption === 'allin' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'
                                    }`}
                                  >
                                    <p className="text-xs font-bold text-slate-700">All-in (100%)</p>
                                    <p className="text-[9px] text-slate-400">100% ke korban</p>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setDivorceOption('custom'); updatePenalty(i, 50); }}
                                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                                      divorceOption === 'custom' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'
                                    }`}
                                  >
                                    <p className="text-xs font-bold text-slate-700">Custom %</p>
                                    <p className="text-[9px] text-slate-400">Atur pembagian</p>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Custom Slider */}
                            {c.linkedAssetId && divorceOption === 'custom' && (
                              <div className="bg-slate-50 rounded-xl p-4">
                                <div className="flex justify-between text-xs font-bold mb-2">
                                  <span className="text-indigo-600">Partner A: {c.penalty}%</span>
                                  <span className="text-rose-600">Partner B: {100 - c.penalty}%</span>
                                </div>
                                <input 
                                  type="range" min="10" max="90" value={c.penalty}
                                  onChange={(e) => updatePenalty(i, Number(e.target.value))}
                                  className="w-full h-2 bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full appearance-none cursor-pointer"
                                />
                                <div className="flex mt-2">
                                  <div className="h-2 bg-indigo-500 rounded-l-full" style={{ width: `${c.penalty}%` }} />
                                  <div className="h-2 bg-rose-500 rounded-r-full" style={{ width: `${100 - c.penalty}%` }} />
                                </div>
                              </div>
                            )}

                            {/* Summary */}
                            {c.linkedAssetId && divorceOption && (
                              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                <p className="text-xs text-amber-700 font-medium">
                                  {divorceOption === 'allin' 
                                    ? `✓ Jika cerai: ${c.linkedAssetId === -1 ? 'Saldo ETH' : 'NFT dijual'}, 100% ke korban`
                                    : `✓ Jika cerai: Dibagi ${c.penalty}% : ${100-c.penalty}%`
                                  }
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Non-Divorce Clause UI */
                          <div className="space-y-4">
                            {/* Collateral - Dynamic based on available assets */}
                            {loadingAssets ? (
                              /* Loading state */
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                  <ArrowPathIcon className="h-5 w-5 text-indigo-500 animate-spin" />
                                  <p className="text-xs text-slate-500">Memuat aset dari blockchain...</p>
                                </div>
                              </div>
                            ) : availableAssets.length > 0 ? (
                              /* Ada NFT - tampilkan pilihan */
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                                  Hubungkan Jaminan <span className="text-rose-500">*</span>
                                </label>
                                <select 
                                  value={c.linkedAssetId === -1 ? 'escrow' : (c.linkedAssetId || '')} 
                                  onChange={(e) => linkAsset(i, e.target.value === 'escrow' ? -1 : Number(e.target.value))}
                                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                >
                                  <option value="">Pilih jaminan...</option>
                                  <option value="escrow">💰 Dana Escrow (ETH)</option>
                                  {availableAssets.map((asset: any) => (
                                    <option key={asset.id} value={asset.id}>🏠 {asset.name} - Token #{asset.tokenId}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              /* Tidak ada NFT - default ke Escrow ETH */
                              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-indigo-100 rounded-lg">
                                    <ArchiveBoxIcon className="h-5 w-5 text-indigo-600" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs font-bold text-indigo-700">Jaminan: Dana Escrow (ETH)</p>
                                    <p className="text-[10px] text-indigo-600">Default karena belum ada NFT di brankas</p>
                                  </div>
                                  <CheckCircleIcon className="h-5 w-5 text-indigo-500" />
                                </div>
                              </div>
                            )}

                            {/* NFT Distribution Options - only if NFT selected */}
                            {c.linkedAssetId && c.linkedAssetId > 0 && (
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 block">Opsi Pembagian NFT</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setNFTDistribution(i, 'transfer')}
                                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                                      c.nftDistribution === 'transfer' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'
                                    }`}
                                  >
                                    <p className="text-xs font-bold text-slate-700">Transfer Penuh</p>
                                    <p className="text-[9px] text-slate-400">100% milik korban</p>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setNFTDistribution(i, 'sell')}
                                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                                      c.nftDistribution === 'sell' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'
                                    }`}
                                  >
                                    <p className="text-xs font-bold text-slate-700">Jual & Bagi</p>
                                    <p className="text-[9px] text-slate-400">Hasil dibagi %</p>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Penalty Slider - for Escrow or Sell NFT */}
                            {(c.linkedAssetId === -1 || c.nftDistribution === 'sell') && (
                              <div className="bg-slate-50 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">Kompensasi Korban</span>
                                  <span className="text-sm font-bold text-indigo-600">{c.penalty}%</span>
                                </div>
                                <input 
                                  type="range" min="51" max="100" value={c.penalty} 
                                  onChange={(e) => updatePenalty(i, Number(e.target.value))}
                                  className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                                />
                              </div>
                            )}

                            {/* Transfer Info */}
                            {c.linkedAssetId && c.linkedAssetId > 0 && c.nftDistribution === 'transfer' && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                <p className="text-xs text-emerald-700 font-medium">✓ NFT 100% menjadi milik korban jika dilanggar</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-rose-500" />
                        <span className="text-sm font-bold text-rose-700">Lengkapi data berikut:</span>
                      </div>
                      <ul className="space-y-1">
                        {validationErrors.map((err, i) => (
                          <li key={i} className="text-xs text-rose-600 flex items-center gap-2">
                            <span className="w-1 h-1 bg-rose-400 rounded-full" />
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Deploy Button */}
                  <button 
                    onClick={() => {
                      if (validateBeforeDeploy()) setStep(2);
                    }}
                    disabled={!canProceedToStep2}
                    className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                      canProceedToStep2
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Lanjut ke Verifikasi
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </>
              ) : (
                /* Empty State */
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <DocumentTextIcon className="h-8 w-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-300 mb-2">Belum Ada Klausul</h3>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto">
                    Pilih kategori perjanjian di panel kiri untuk menambahkan klausul
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheckIcon className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Verifikasi & Deploy</h2>
                <p className="text-xs text-slate-400 mt-1">Tinjau dan konfirmasi perjanjian Anda</p>
              </div>

              {!isConnected ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <ExclamationCircleIcon className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-amber-700">Wallet Belum Terhubung</p>
                  <p className="text-xs text-amber-600">Hubungkan wallet untuk melanjutkan</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Partner A */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Partner A (Anda)</p>
                    <p className="text-sm font-mono font-bold text-slate-900">{account ? shortenAddress(account) : ''}</p>
                  </div>

                  {/* Partner B */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Alamat Partner B</label>
                    <input
                      type="text"
                      value={partnerAddress}
                      onChange={(e) => setPartnerAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full p-3 rounded-xl border border-slate-200 font-mono text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                  </div>

                  {/* Clauses Summary */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">Ringkasan Perjanjian</p>
                    <div className="space-y-2">
                      {conditions.map((c, i) => {
                        const isDivorce = c.title.includes('Perceraian');
                        const isNFT = c.linkedAssetId && c.linkedAssetId > 0;
                        const isEscrow = c.linkedAssetId === -1;
                        const linkedAsset = isNFT ? availableAssets.find((a: any) => a.id === c.linkedAssetId) : null;
                        
                        return (
                          <div key={i} className="bg-white rounded-lg p-3 border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {isDivorce ? <ScaleIcon className="h-4 w-4 text-amber-500" /> : <DocumentTextIcon className="h-4 w-4 text-indigo-500" />}
                                <span className="text-xs font-bold text-slate-700">{c.title}</span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                isDivorce ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {c.penalty === 100 ? '100%' : `${c.penalty}%`}
                              </span>
                            </div>
                            {/* Asset Info */}
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              {isNFT && linkedAsset && (
                                <>
                                  <HomeIcon className="h-3 w-3" />
                                  <span>NFT: {(linkedAsset as any).name} #{(linkedAsset as any).tokenId}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className={c.nftDistribution === 'transfer' ? 'text-emerald-600' : 'text-amber-600'}>
                                    {c.nftDistribution === 'transfer' ? 'Transfer 100%' : `Jual & Bagi ${c.penalty}%`}
                                  </span>
                                </>
                              )}
                              {isEscrow && (
                                <>
                                  <ArchiveBoxIcon className="h-3 w-3" />
                                  <span>Dana Escrow ETH</span>
                                </>
                              )}
                              {!isNFT && !isEscrow && !isDivorce && (
                                <span className="text-rose-500">⚠ Belum pilih jaminan</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Escrow Deposit - ONLY if any clause uses Escrow ETH (linkedAssetId === -1) */}
                  {conditions.some(c => c.linkedAssetId === -1 && !c.title.includes('Perceraian')) && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <p className="text-[10px] font-bold text-indigo-600 uppercase mb-3">💰 Escrow Deposit</p>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs font-medium text-slate-700">Jaminan ETH untuk Klausul</p>
                          <p className="text-[10px] text-slate-400">Dana dikunci di smart contract</p>
                        </div>
                        <div className="text-right">
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={escrowAmount}
                            onChange={(e) => setEscrowAmount(e.target.value)}
                            className="w-24 text-right text-xl font-bold text-indigo-600 bg-transparent border-none outline-none"
                          />
                          <p className="text-[10px] text-slate-400">ETH</p>
                        </div>
                      </div>
                      
                      {/* Vault Balance Info */}
                      <div className="flex items-center justify-between pt-2 border-t border-indigo-200">
                        <div className="flex items-center gap-2">
                          <ArchiveBoxIcon className="h-4 w-4 text-indigo-500" />
                          <span className="text-xs text-indigo-700 font-medium">Saldo Tersedia:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {loadingVaultBalance ? (
                            <ArrowPathIcon className="h-4 w-4 text-indigo-500 animate-spin" />
                          ) : (
                            <>
                              <span className={`text-sm font-bold ${sharedVaultBalance >= parseFloat(escrowAmount) ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {sharedVaultBalance.toFixed(4)} ETH
                              </span>
                              {sharedVaultBalance < parseFloat(escrowAmount) && (
                                <ExclamationTriangleIcon className="h-4 w-4 text-rose-500" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Sisa brankas bersama yang belum terkunci di escrow</p>
                      
                      {sharedVaultBalance < parseFloat(escrowAmount) && (
                        <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg">
                          <p className="text-xs text-rose-700 font-medium">
                            ⚠️ Saldo tidak mencukupi. Deposit ke brankas bersama terlebih dahulu.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* NFT Info - if any clause uses NFT */}
                  {conditions.some(c => c.linkedAssetId && c.linkedAssetId > 0 && !c.title.includes('Perceraian')) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <HomeIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-blue-800">Jaminan NFT</p>
                          <p className="text-[10px] text-blue-700 mt-1">
                            NFT sudah tercatat di blockchain. Jika terjadi pelanggaran, NFT akan otomatis ditransfer atau dijual sesuai kesepakatan.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Divorce Info */}
                  {conditions.some(c => c.title.includes('Perceraian')) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <ScaleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-800">Klausul Perceraian</p>
                          <p className="text-[10px] text-amber-700 mt-1">
                            Aset dari brankas akan otomatis dibagi sesuai kesepakatan saat perceraian.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Verification Method Badge */}
                  <div className={`rounded-xl p-3 flex items-center gap-3 ${
                    selectedVerificationMethod === 'ai' ? 'bg-indigo-50 border border-indigo-200' : 'bg-rose-50 border border-rose-200'
                  }`}>
                    {selectedVerificationMethod === 'ai' ? (
                      <SparklesIcon className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <LockClosedIcon className="h-5 w-5 text-rose-600" />
                    )}
                    <div>
                      <p className={`text-xs font-bold ${selectedVerificationMethod === 'ai' ? 'text-indigo-700' : 'text-rose-700'}`}>
                        {selectedVerificationMethod === 'ai' ? 'Verifikasi AI' : 'Klaim Internal Pasangan'}
                      </p>
                      <p className={`text-[10px] ${selectedVerificationMethod === 'ai' ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {selectedVerificationMethod === 'ai' ? 'Bukti diverifikasi otomatis' : 'Privasi antar pasangan'}
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2">
                      <ExclamationCircleIcon className="h-5 w-5 text-rose-500" />
                      <p className="text-xs text-rose-600 font-medium">{error}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setStep(1)} 
                      className="flex-1 py-3 text-slate-500 font-bold text-xs uppercase tracking-wide hover:text-slate-900 transition-all"
                    >
                      Kembali
                    </button>
                    <button 
                      onClick={handleDeploy}
                      disabled={deploying || !partnerAddress}
                      className="flex-[2] py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-xs uppercase tracking-wide shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {deploying ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        <>
                          <RocketLaunchIcon className="h-4 w-4" />
                          Deploy ke Base
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <div className="w-20 h-20 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <ArrowPathIcon className="h-10 w-10 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Menunggu Partner B</h2>
              <p className="text-slate-500 text-sm mb-6">
                Perjanjian sudah dibuat dan Anda sudah menandatangani. Partner B perlu menandatangani sebelum perjanjian aktif.
              </p>

              {vowId && (
                <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Vow ID</span>
                    <span className="font-mono font-bold text-indigo-600">#{vowId}</span>
                  </div>
                  {txHash && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Transaction</span>
                      <a 
                        href={`https://sepolia.basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-indigo-600 hover:underline"
                      >
                        {txHash.slice(0, 8)}...{txHash.slice(-6)}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Status */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Partner A (Anda)</span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircleIcon className="h-4 w-4" /> Sudah Sign
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Partner B</span>
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                      <ArrowPathIcon className="h-4 w-4" /> Menunggu Sign
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Deposit & Aktivasi</span>
                    <span className="text-xs font-bold text-slate-400">Setelah kedua sign</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 mb-4">
                Bagikan Vow ID #{vowId} ke Partner B untuk menandatangani di Dashboard
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => { 
                    setStep(1); 
                    setConditions([]); 
                    setSelectedCategories([]); 
                    setVowId(null); 
                    setTxHash(null); 
                    setDivorceOption(null);
                    setSelectedVerificationMethod(null);
                    setValidationErrors([]);
                  }} 
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-slate-200 transition-all"
                >
                  Buat Baru
                </button>
                <a 
                  href="#/dashboard" 
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-xs uppercase tracking-wide shadow-lg hover:shadow-xl transition-all text-center"
                >
                  Dashboard
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl px-6 py-3 rounded-full border border-slate-200 shadow-xl flex items-center gap-4 z-50">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${
              step === s 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 w-6' 
                : step > s 
                  ? 'bg-indigo-600' 
                  : 'bg-slate-200'
            }`} />
          ))}
        </div>

      </div>
    </div>
  );
};

export default Generator;
