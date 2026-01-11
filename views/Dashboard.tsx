import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { certificateNFTService, assetNFTService } from '../services/web3Service';
import { 
  CheckBadgeIcon, 
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArchiveBoxIcon,
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  DocumentTextIcon,
  RocketLaunchIcon,
  XMarkIcon,
  LockClosedIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { FingerPrintIcon } from '@heroicons/react/24/solid';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const mockAssetHistory = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 4500 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 5200 },
  { name: 'May', value: 5800 },
  { name: 'Jun', value: 6200 },
];

interface PendingVow {
  vowId: number;
  partnerA: string;
  partnerB: string;
  partnerASigned: boolean;
  partnerBSigned: boolean;
  isActive: boolean;
  createdAt: number;
  txHash?: string;
  status: string;
  conditions?: any[];
  escrowAmount?: string;
  selectedCategories?: string[];
  verificationMethod?: string;
}

interface VaultBalance {
  personal: { partnerA: number; partnerB: number };
  shared: { 
    total: number; // Total yang pernah di-deposit (available + locked)
    available: number; // Sisa yang belum terkunci
    partnerAContribution: number; 
    partnerBContribution: number 
  };
  escrow: { 
    total: number; // Yang terkunci di escrow
    locked: boolean 
  };
}

interface PartnerProfile {
  address: string;
  name?: string;
  role: 'A' | 'B';
  isCurrentUser: boolean;
}

const Dashboard: React.FC = () => {
  const { 
    isConnected, 
    account, 
    signVow, 
    depositAndActivate,
    activateWithSharedVault,
    signAndActivate,
    signAndActivateOnly,
    shortenAddress, 
    getVow, 
    getUserVows,
    depositPersonal,
    transferToShared,
    withdrawPersonal,
    getVaultBalances,
    submitInternalClaim,
    submitAIClaim,
    isVowClaimed,
    checkContractDeployment
  } = useWeb3();
  const [pendingVows, setPendingVows] = useState<PendingVow[]>([]);
  const [signing, setSigning] = useState<number | null>(null);
  const [activating, setActivating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingVows, setLoadingVows] = useState(false);
  const [partnerProfiles, setPartnerProfiles] = useState<PartnerProfile[]>([]);
  const [vaultBalance, setVaultBalance] = useState<VaultBalance>({
    personal: { partnerA: 0, partnerB: 0 },
    shared: { total: 0, available: 0, partnerAContribution: 0, partnerBContribution: 0 },
    escrow: { total: 0, locked: false }
  });
  
  // New states for deposit, withdraw and claim modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedVowForClaim, setSelectedVowForClaim] = useState<number | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [claimFileUrl, setClaimFileUrl] = useState<string | null>(null);
  const [selectedClaimDetail, setSelectedClaimDetail] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositType, setDepositType] = useState<'personal' | 'shared'>('personal');
  const [depositing, setDepositing] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [claimReason, setClaimReason] = useState('');
  const [claimEvidence, setClaimEvidence] = useState('');
  
  // ETH distribution state (based on shared vault contributions)
  const [ethDistribution, setEthDistribution] = useState({
    partnerA: { value: 0, percentage: 50 },
    partnerB: { value: 0, percentage: 50 },
    total: { value: 0 }
  });
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [totalNFTAssets, setTotalNFTAssets] = useState({ personal: 0, shared: 0, total: 0 });
  const [loadingVaultBalance, setLoadingVaultBalance] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  
  // State untuk mengecek apakah user memiliki pasangan yang terdaftar di Marriage Certificate
  const [hasRegisteredPartner, setHasRegisteredPartner] = useState(false);
  const [registeredPartnerAddress, setRegisteredPartnerAddress] = useState<string | null>(null);

  // Calculate ETH distribution from shared vault contributions
  const calculateEthDistribution = (balances: { personal: string; sharedContribution: string; totalShared: string }) => {
    const totalShared = parseFloat(balances.totalShared);
    const partnerAContribution = parseFloat(balances.sharedContribution);
    // Partner B contribution = total - partner A contribution
    const partnerBContribution = totalShared - partnerAContribution;
    
    // Calculate percentages
    const partnerAPercentage = totalShared > 0 ? (partnerAContribution / totalShared) * 100 : 50;
    const partnerBPercentage = totalShared > 0 ? (partnerBContribution / totalShared) * 100 : 50;
    
    setEthDistribution({
      partnerA: { value: partnerAContribution, percentage: partnerAPercentage },
      partnerB: { value: partnerBContribution, percentage: partnerBPercentage },
      total: { value: totalShared }
    });
    
    console.log('ETH distribution calculated:', {
      partnerA: { value: partnerAContribution, percentage: partnerAPercentage },
      partnerB: { value: partnerBContribution, percentage: partnerBPercentage },
      total: totalShared
    });
  };

  // Load asset distribution from blockchain (for NFT count)
  const loadAssetDistribution = async () => {
    if (!account || !isConnected) return;
    
    setLoadingAssets(true);
    try {
      console.log('=== LOADING NFT ASSETS ===');
      console.log('Account:', account);
      
      await assetNFTService.connect();
      
      // Get ALL visible assets (own + shared from partner)
      const allVisibleIds = await assetNFTService.getAllVisibleAssets(account);
      console.log('All visible asset IDs:', allVisibleIds);
      
      // Get user's own assets
      const userAssetIds = await assetNFTService.getUserAssets(account);
      console.log('User own asset IDs:', userAssetIds);
      
      // Get shared assets from partner
      const sharedFromPartnerIds = await assetNFTService.getSharedAssets(account);
      console.log('Shared from partner IDs:', sharedFromPartnerIds);
      
      // Count by ownership type
      let personalCount = 0;
      let sharedCount = 0;
      
      // Process user's own assets
      for (const assetId of userAssetIds) {
        try {
          const asset = await assetNFTService.getAsset(assetId);
          console.log(`Asset ${assetId}:`, asset.name, 'Type:', asset.ownershipType);
          
          if (Number(asset.ownershipType) === 0) { // Personal = 0
            personalCount++;
          } else { // Joint = 1
            sharedCount++;
          }
        } catch (e) {
          console.error('Failed to get asset:', assetId, e);
        }
      }
      
      // Add shared assets from partner (these are Joint assets owned by partner but shared to us)
      sharedCount += sharedFromPartnerIds.length;
      
      const totalCount = allVisibleIds.length;
      
      console.log('=== NFT ASSETS RESULT ===');
      console.log('Personal (Harta Pribadi):', personalCount);
      console.log('Shared (Harta Bersama):', sharedCount);
      console.log('Total visible:', totalCount);
      console.log('=== END NFT ASSETS ===');
      
      setTotalNFTAssets({
        personal: personalCount,
        shared: sharedCount,
        total: totalCount
      });
      
    } catch (e) {
      console.error('Failed to load asset distribution:', e);
      
      // Fallback: try to get from localStorage
      try {
        const storedAssets = localStorage.getItem('smartvow_assets');
        if (storedAssets) {
          const assets = JSON.parse(storedAssets);
          const personalCount = assets.filter((a: any) => a.ownershipType === 'personal' || a.ownershipType === 0).length;
          const sharedCount = assets.filter((a: any) => a.ownershipType === 'joint' || a.ownershipType === 1).length;
          
          console.log('Fallback from localStorage:', { personal: personalCount, shared: sharedCount });
          
          setTotalNFTAssets({
            personal: personalCount,
            shared: sharedCount,
            total: assets.length
          });
        }
      } catch (localErr) {
        console.error('Fallback also failed:', localErr);
      }
    } finally {
      setLoadingAssets(false);
    }
  };

  // Load shared vault balance from blockchain
  const loadVaultBalances = async () => {
    if (!account || !isConnected) return;
    
    setLoadingVaultBalance(true);
    try {
      console.log('=== LOAD VAULT BALANCES ===');
      console.log('Loading vault balances for account:', account);
      const balances = await getVaultBalances();
      console.log('Vault balances from blockchain:', balances);
      console.log('Personal balance (raw):', balances.personal);
      console.log('Personal balance (parsed):', parseFloat(balances.personal));
      
      const personalBalance = parseFloat(balances.personal);
      const availableShared = parseFloat(balances.totalShared); // Sisa yang belum terkunci
      const myContribution = parseFloat(balances.sharedContribution);
      
      console.log('Setting vault balance state:');
      console.log('- Personal:', personalBalance);
      console.log('- Available Shared:', availableShared);
      console.log('- My Contribution:', myContribution);
      console.log('=== END LOAD VAULT BALANCES ===');
      
      // Escrow akan di-update dari loadVowsFromBlockchain
      // Total shared = available + escrow (akan dihitung setelah load vows)
      
      // Calculate ETH distribution from shared vault (available only)
      calculateEthDistribution(balances);
      
      setVaultBalance(prev => ({
        personal: { 
          partnerA: personalBalance, 
          partnerB: 0 
        },
        shared: { 
          total: availableShared + prev.escrow.total, // Total = available + locked in escrow
          available: availableShared, // Sisa yang belum terkunci
          partnerAContribution: myContribution, 
          partnerBContribution: 0 
        },
        escrow: prev.escrow // Keep escrow from loadVowsFromBlockchain
      }));
      
      console.log('Vault balance state updated:', {
        personal: personalBalance,
        availableShared: availableShared,
        myContribution: myContribution
      });
      
      // Update sync time
      setLastSyncTime(new Date());
    } catch (e) {
      console.error('Failed to load vault balances:', e);
    } finally {
      setLoadingVaultBalance(false);
    }
  };

  // Load vows from blockchain AND localStorage
  const loadVowsFromBlockchain = async () => {
    if (!account || !isConnected) return;
    
    setLoadingVows(true);
    try {
      // Get vow IDs from blockchain
      const vowIds = await getUserVows();
      console.log('Vow IDs from blockchain:', vowIds);
      
      // Get localStorage data as cache for extra info (conditions, escrowAmount, etc)
      const localAgreements = JSON.parse(localStorage.getItem('smartvow_agreements') || '[]');
      const localMap = new Map(localAgreements.map((a: any) => [a.vowId, a]));
      
      const vows: PendingVow[] = [];
      let totalEscrowLocked = 0; // Track total escrow from active vows
      
      for (const vowId of vowIds) {
        try {
          const onChainVow = await getVow(vowId);
          
          // Skip invalid vows (from old contracts or corrupted data)
          if (!onChainVow.partnerA || onChainVow.partnerA === '0x0000000000000000000000000000000000000000' || 
              Number(onChainVow.createdAt) === 0) {
            console.log(`Skipping invalid vow ${vowId}`);
            continue;
          }
          
          const localData = localMap.get(vowId) as any;
          
          // Get escrow balance from on-chain (convert from wei to ETH)
          const escrowBalanceWei = onChainVow.escrowBalance;
          const escrowBalanceEth = Number(escrowBalanceWei) / 1e18;
          
          // Add to total if vow is active
          if (Number(onChainVow.status) === 2) { // Active
            totalEscrowLocked += escrowBalanceEth;
          }
          
          vows.push({
            vowId: vowId,
            txHash: localData?.txHash || '',
            partnerA: onChainVow.partnerA,
            partnerB: onChainVow.partnerB,
            partnerASigned: onChainVow.partnerASigned,
            partnerBSigned: onChainVow.partnerBSigned,
            isActive: Number(onChainVow.status) === 2, // Active = 2
            // Status: 0=Draft, 1=PendingSignatures, 2=Active, 3=Breached, 4=Resolved, 5=Terminated
            status: (() => {
              const s = Number(onChainVow.status);
              if (s === 2) return 'active';
              if (s === 4) return 'resolved';
              if (s === 5) return 'terminated';
              if (s === 3) return 'breached';
              if (onChainVow.partnerASigned && onChainVow.partnerBSigned) return 'ready';
              return 'pending';
            })(),
            createdAt: Number(onChainVow.createdAt) * 1000,
            conditions: localData?.conditions || [],
            escrowAmount: escrowBalanceEth > 0 ? escrowBalanceEth.toString() : (localData?.escrowAmount || '0.001'),
            selectedCategories: localData?.selectedCategories || [],
            verificationMethod: localData?.verificationMethod || 'internal'
          });
        } catch (e) {
          console.error(`Failed to load vow ${vowId}:`, e);
        }
      }
      
      // Update escrow and recalculate shared total
      setVaultBalance(prev => ({
        ...prev,
        shared: {
          ...prev.shared,
          total: prev.shared.available + totalEscrowLocked // Total = available + locked
        },
        escrow: {
          total: totalEscrowLocked,
          locked: totalEscrowLocked > 0
        }
      }));
      
      console.log('Total escrow locked:', totalEscrowLocked, 'ETH');
      
      // Sort by createdAt descending
      vows.sort((a, b) => b.createdAt - a.createdAt);
      
      setPendingVows(vows);
      
      // Extract partner profiles - PRIORITY: Certificate first, then SmartVow
      const profiles: PartnerProfile[] = [];
      const uniquePartners = new Set<string>();
      
      // STEP 1: Load from Certificate FIRST (this is the "official" record)
      let hasCertificate = false;
      
      try {
        setLoadingCertificates(true);
        
        // Check localStorage for certificate data (faster)
        const storedCerts = localStorage.getItem('smartvow_certificates');
        if (storedCerts) {
          const certificates = JSON.parse(storedCerts);
          console.log('Certificates from localStorage:', certificates);
          
          certificates.forEach((cert: any) => {
            hasCertificate = true;
            
            // Add Partner A from certificate
            if (cert.partnerA && !uniquePartners.has(cert.partnerA.address.toLowerCase())) {
              uniquePartners.add(cert.partnerA.address.toLowerCase());
              profiles.push({
                address: cert.partnerA.address,
                name: cert.partnerA.name,
                role: 'A',
                isCurrentUser: cert.partnerA.address.toLowerCase() === account.toLowerCase()
              });
            }
            
            // Add Partner B from certificate
            if (cert.partnerB && !uniquePartners.has(cert.partnerB.address.toLowerCase())) {
              uniquePartners.add(cert.partnerB.address.toLowerCase());
              profiles.push({
                address: cert.partnerB.address,
                name: cert.partnerB.name,
                role: 'B',
                isCurrentUser: cert.partnerB.address.toLowerCase() === account.toLowerCase()
              });
            }
          });
        }
        
        // Also check blockchain for certificate data
        await certificateNFTService.connect();
        const certificateIds = await certificateNFTService.getUserCertificates(account);
        console.log('Certificate IDs found:', certificateIds);
        
        for (const certId of certificateIds) {
          try {
            const cert = await certificateNFTService.getCertificate(certId);
            hasCertificate = true;
            console.log('Certificate loaded from blockchain:', {
              certId,
              partnerA: cert.partnerA,
              partnerAName: cert.partnerAName,
              partnerB: cert.partnerB,
              partnerBName: cert.partnerBName
            });
            
            // Add/Update Partner A from certificate
            if (!uniquePartners.has(cert.partnerA.toLowerCase())) {
              uniquePartners.add(cert.partnerA.toLowerCase());
              profiles.push({
                address: cert.partnerA,
                name: cert.partnerAName,
                role: 'A',
                isCurrentUser: cert.partnerA.toLowerCase() === account.toLowerCase()
              });
            } else {
              const existingIndex = profiles.findIndex(p => p.address.toLowerCase() === cert.partnerA.toLowerCase());
              if (existingIndex >= 0 && cert.partnerAName) {
                profiles[existingIndex].name = cert.partnerAName;
              }
            }
            
            // Add/Update Partner B from certificate
            if (!uniquePartners.has(cert.partnerB.toLowerCase())) {
              uniquePartners.add(cert.partnerB.toLowerCase());
              profiles.push({
                address: cert.partnerB,
                name: cert.partnerBName,
                role: 'B',
                isCurrentUser: cert.partnerB.toLowerCase() === account.toLowerCase()
              });
            } else {
              const existingIndex = profiles.findIndex(p => p.address.toLowerCase() === cert.partnerB.toLowerCase());
              if (existingIndex >= 0 && cert.partnerBName) {
                profiles[existingIndex].name = cert.partnerBName;
              }
            }
          } catch (e) {
            console.error(`Failed to load certificate ${certId}:`, e);
          }
        }
      } catch (e) {
        console.error('Failed to load certificates:', e);
      } finally {
        setLoadingCertificates(false);
      }
      
      // STEP 2: Only add from SmartVow if NO certificate exists
      if (!hasCertificate) {
        vows.forEach(vow => {
          if (!uniquePartners.has(vow.partnerA.toLowerCase())) {
            uniquePartners.add(vow.partnerA.toLowerCase());
            profiles.push({
              address: vow.partnerA,
              role: 'A',
              isCurrentUser: vow.partnerA.toLowerCase() === account.toLowerCase()
            });
          }
          if (!uniquePartners.has(vow.partnerB.toLowerCase())) {
            uniquePartners.add(vow.partnerB.toLowerCase());
            profiles.push({
              address: vow.partnerB,
              role: 'B',
              isCurrentUser: vow.partnerB.toLowerCase() === account.toLowerCase()
            });
          }
        });
      }
      
      setPartnerProfiles(profiles);
      
      // Check if user has a registered partner from Marriage Certificate
      // Berangkas bersama hanya boleh dilihat oleh pasangan yang terdaftar di certificate yang sama
      let hasPartner = false;
      let partnerAddr: string | null = null;
      
      // Check from certificate data (priority)
      if (hasCertificate) {
        const certPartner = profiles.find(p => !p.isCurrentUser);
        if (certPartner) {
          hasPartner = true;
          partnerAddr = certPartner.address;
        }
      }
      
      setHasRegisteredPartner(hasPartner);
      setRegisteredPartnerAddress(partnerAddr);
      console.log('Has registered partner (from certificate):', hasPartner);
      console.log('Registered partner address:', partnerAddr);
      
      console.log('=== PARTNER PROFILES DEBUG ===');
      console.log('Loaded vows:', vows.length);
      console.log('Partner profiles (including certificates):', profiles);
      console.log('Partner profiles with names:', profiles.filter(p => p.name));
      console.log('Current user profiles:', profiles.filter(p => p.isCurrentUser));
      console.log('Partner B profiles:', profiles.filter(p => !p.isCurrentUser));
      console.log('Has certificate:', hasCertificate);
      console.log('Has registered partner:', hasPartner);
      console.log('=== END DEBUG ===');
    } catch (e) {
      console.error('Failed to load vows from blockchain:', e);
      // Fallback to localStorage only
      const saved = localStorage.getItem('smartvow_agreements');
      if (saved) {
        const agreements = JSON.parse(saved);
        setPendingVows(agreements.map((a: any) => ({
          vowId: a.vowId,
          txHash: a.txHash,
          partnerA: a.partnerA,
          partnerB: a.partnerB,
          partnerASigned: a.partnerASigned,
          partnerBSigned: a.partnerBSigned,
          isActive: a.status === 'active',
          status: a.status,
          createdAt: new Date(a.createdAt).getTime(),
          conditions: a.conditions,
          escrowAmount: a.escrowAmount,
          selectedCategories: a.selectedCategories,
          verificationMethod: a.verificationMethod
        })));
      }
    } finally {
      setLoadingVows(false);
    }
  };

  useEffect(() => {
    if (isConnected && account) {
      // Check if contract address changed - clear old localStorage data
      const currentContractAddress = import.meta.env.VITE_SMARTVOW_ADDRESS;
      const savedContractAddress = localStorage.getItem('smartvow_contract_address');
      
      if (savedContractAddress && savedContractAddress !== currentContractAddress) {
        console.log('Contract address changed, clearing old data...');
        localStorage.removeItem('smartvow_agreements');
        localStorage.removeItem('vault_balance');
      }
      
      // Save current contract address
      localStorage.setItem('smartvow_contract_address', currentContractAddress);
      
      loadVowsFromBlockchain();
      loadVaultBalances();
      loadAssetDistribution(); // Load NFT assets
    }
  }, [isConnected, account]);

  useEffect(() => {
    // Remove localStorage loading for vault balance - always load from blockchain
    // const savedBalance = localStorage.getItem('vault_balance');
    // if (savedBalance) {
    //   setVaultBalance(JSON.parse(savedBalance));
    // }
  }, []);

  const handleSign = async (vowId: number) => {
    if (!isConnected) {
      setError('Hubungkan wallet terlebih dahulu');
      return;
    }
    setSigning(vowId);
    setError(null);
    try {
      // Check on-chain status first to avoid "Already signed" error
      const onChainVow = await getVow(vowId);
      const isPartnerA = onChainVow.partnerA.toLowerCase() === account?.toLowerCase();
      const isPartnerB = onChainVow.partnerB.toLowerCase() === account?.toLowerCase();
      
      // Check if already signed
      if (isPartnerA && onChainVow.partnerASigned) {
        setError('Anda sudah menandatangani perjanjian ini');
        await loadVowsFromBlockchain(); // Refresh to update UI
        setSigning(null);
        return;
      }
      if (isPartnerB && onChainVow.partnerBSigned) {
        setError('Anda sudah menandatangani perjanjian ini');
        await loadVowsFromBlockchain(); // Refresh to update UI
        setSigning(null);
        return;
      }
      
      await signVow(vowId);
      
      // Update localStorage
      const agreements = JSON.parse(localStorage.getItem('smartvow_agreements') || '[]');
      const updated = agreements.map((a: any) => {
        if (a.vowId === vowId) {
          if (isPartnerA) return { ...a, partnerASigned: true };
          if (isPartnerB) return { ...a, partnerBSigned: true };
        }
        return a;
      });
      localStorage.setItem('smartvow_agreements', JSON.stringify(updated));
      
      setSuccess(`Berhasil menandatangani Vow #${vowId} di blockchain!`);
      
      // Reload from blockchain and wait for it to complete
      await loadVowsFromBlockchain();
    } catch (err: any) {
      console.error('Sign error:', err);
      
      // Handle specific errors
      if (err.message?.includes('Already signed')) {
        setError('Anda sudah menandatangani perjanjian ini');
        await loadVowsFromBlockchain(); // Refresh UI
      } else {
        setError(err.message || 'Gagal menandatangani');
      }
    } finally {
      setSigning(null);
    }
  };

  // Sign + Activate dalam 1 transaksi (untuk Partner B)
  // Escrow dikunci dari shared vault saat aktivasi ini
  const handleSignAndActivate = async (vowId: number) => {
    if (!isConnected) {
      setError('Hubungkan wallet terlebih dahulu');
      return;
    }
    setActivating(vowId);
    setError(null);
    setSuccess(null);
    
    try {
      // Check on-chain vow status first
      const onChainVow = await getVow(vowId);
      
      console.log('=== SIGN AND ACTIVATE (Partner B) ===');
      console.log('Vow ID:', vowId);
      console.log('Partner A signed:', onChainVow.partnerASigned);
      console.log('Partner B signed:', onChainVow.partnerBSigned);
      console.log('Status:', Number(onChainVow.status));
      
      // Pastikan Partner A sudah sign
      if (!onChainVow.partnerASigned) {
        setError('Partner A belum menandatangani perjanjian ini.');
        setActivating(null);
        return;
      }
      
      // Pastikan belum di-sign oleh Partner B
      if (onChainVow.partnerBSigned) {
        setError('Anda sudah menandatangani perjanjian ini.');
        await loadVowsFromBlockchain();
        setActivating(null);
        return;
      }
      
      // Gunakan signAndActivateOnly - escrow akan dikunci dari shared vault
      // Partner B hanya bayar gas fee
      console.log('Using signAndActivateOnly - escrow will be locked from shared vault');
      await signAndActivateOnly(vowId);
      
      // HAPUS dari pendingVows karena sudah aktif
      setPendingVows(prev => prev.filter(v => v.vowId !== vowId));
      
      // Update localStorage
      const agreements = JSON.parse(localStorage.getItem('smartvow_agreements') || '[]');
      const updated = agreements.map((a: any) => 
        a.vowId === vowId ? { ...a, partnerBSigned: true, status: 'active' } : a
      );
      localStorage.setItem('smartvow_agreements', JSON.stringify(updated));
      
      setSuccess(`Vow #${vowId} berhasil ditandatangani dan diaktifkan! Escrow telah dikunci.`);
      console.log('=== SIGN AND ACTIVATE SELESAI ===');
      
      // Refresh data dari blockchain
      await Promise.all([
        loadVaultBalances(),
        loadVowsFromBlockchain()
      ]);
      
    } catch (err: any) {
      console.error('Sign and Activate error:', err);
      
      if (err.message?.includes('Already signed')) {
        setError('Anda sudah menandatangani perjanjian ini.');
        // Refresh untuk update UI
        await loadVowsFromBlockchain();
      } else if (err.message?.includes('Partner A must sign')) {
        setError('Partner A belum menandatangani perjanjian ini.');
      } else if (err.message?.includes('No pending escrow')) {
        setError('Tidak ada escrow yang pending. Hubungi Partner A.');
      } else if (err.message?.includes('Insufficient shared vault')) {
        setError('Saldo brankas bersama tidak mencukupi untuk escrow.');
      } else {
        setError(err.message || 'Gagal menandatangani dan mengaktifkan');
      }
    } finally {
      setActivating(null);
    }
  };

  const handleActivate = async (vowId: number) => {
    if (!isConnected) {
      setError('Hubungkan wallet terlebih dahulu');
      return;
    }
    setActivating(vowId);
    setError(null);
    setSuccess(null); // Clear previous messages
    
    try {
      // Check on-chain status first
      let onChainVow;
      try {
        onChainVow = await getVow(vowId);
        console.log('On-chain vow status:', {
          vowId,
          partnerASigned: onChainVow.partnerASigned,
          partnerBSigned: onChainVow.partnerBSigned,
          status: Number(onChainVow.status)
        });
      } catch (e) {
        console.error('Failed to get vow from chain:', e);
        setError(`Vow #${vowId} tidak ditemukan di blockchain`);
        setActivating(null);
        return;
      }
      
      const vowStatus = Number(onChainVow.status);
      // Status: 0=Draft, 1=PendingSignatures, 2=Active, 3=Breached, 4=Resolved, 5=Terminated
      
      // Check if already active (status 2 = Active)
      if (vowStatus === 2) {
        // Immediately update local state
        setPendingVows(prev => prev.map(v => 
          v.vowId === vowId ? { ...v, isActive: true, status: 'active' } : v
        ));
        
        // Update localStorage
        const agreements = JSON.parse(localStorage.getItem('smartvow_agreements') || '[]');
        const updated = agreements.map((a: any) => 
          a.vowId === vowId ? { ...a, status: 'active' } : a
        );
        localStorage.setItem('smartvow_agreements', JSON.stringify(updated));
        
        setSuccess(`Perjanjian #${vowId} sudah aktif!`);
        setActivating(null);
        return;
      }
      
      // Check if vow is in a final state (cannot be activated)
      if (vowStatus === 4) { // Resolved
        setError('Perjanjian ini sudah diselesaikan (Resolved)');
        await loadVowsFromBlockchain();
        setActivating(null);
        return;
      }
      
      if (vowStatus === 5) { // Terminated
        setError('Perjanjian ini sudah diterminasi');
        await loadVowsFromBlockchain();
        setActivating(null);
        return;
      }
      
      if (vowStatus === 3) { // Breached
        setError('Perjanjian ini dalam status pelanggaran (Breached)');
        await loadVowsFromBlockchain();
        setActivating(null);
        return;
      }
      
      if (!onChainVow.partnerASigned || !onChainVow.partnerBSigned) {
        const missing = [];
        if (!onChainVow.partnerASigned) missing.push('Partner A');
        if (!onChainVow.partnerBSigned) missing.push('Partner B');
        setError(`${missing.join(' dan ')} belum menandatangani di blockchain`);
        setActivating(null);
        return;
      }
      
      // Get escrow amount from agreement data, default to 0.001 if not set
      const vow = pendingVows.find(v => v.vowId === vowId);
      let amount = '0.001'; // minimum default
      
      if (vow?.escrowAmount && parseFloat(vow.escrowAmount) > 0) {
        amount = vow.escrowAmount;
      }
      
      console.log('Activating vow:', vowId, 'with escrow from shared vault:', amount, 'ETH');
      console.log('Vow status before activate:', vowStatus);
      console.log('Partner A signed:', onChainVow.partnerASigned);
      console.log('Partner B signed:', onChainVow.partnerBSigned);
      
      // Use activateWithSharedVault - escrow comes from shared vault, not wallet
      await activateWithSharedVault(vowId, amount);
      
      console.log('Activation successful, updating local state...');
      
      // Update localStorage
      const agreements = JSON.parse(localStorage.getItem('smartvow_agreements') || '[]');
      const updated = agreements.map((a: any) => 
        a.vowId === vowId ? { ...a, status: 'active' } : a
      );
      localStorage.setItem('smartvow_agreements', JSON.stringify(updated));
      
      // Show success message first
      setSuccess(`Vow #${vowId} berhasil diaktifkan! Escrow ${amount} ETH diambil dari brankas bersama.`);
      
      // Refresh vault balance and vows from blockchain immediately
      await Promise.all([
        loadVaultBalances(),
        loadVowsFromBlockchain()
      ]);
    } catch (err: any) {
      console.error('Activation error:', err);
      console.error('Full error object:', JSON.stringify(err, null, 2));
      
      // Check for insufficient funds in nested error info
      const errorInfo = err?.info?.error?.data?.message || err?.info?.error?.message || '';
      
      if (err.message?.includes('Both must sign')) {
        setError('Kedua partner harus menandatangani terlebih dahulu');
      } else if (err.message?.includes('Insufficient escrow') || err.message?.includes('Insufficient shared vault')) {
        const vow = pendingVows.find(v => v.vowId === vowId);
        setError(`Saldo brankas bersama tidak mencukupi untuk escrow ${vow?.escrowAmount || '0.001'} ETH. Silakan deposit ke brankas bersama terlebih dahulu.`);
      } else if (err.message?.includes('Invalid status')) {
        setError('Status perjanjian tidak valid untuk aktivasi. Mungkin sudah aktif atau sudah diselesaikan.');
        await loadVowsFromBlockchain();
      } else if (err.message?.includes('insufficient funds') || errorInfo.includes('insufficient funds')) {
        const vow = pendingVows.find(v => v.vowId === vowId);
        const escrowNeeded = vow?.escrowAmount || '0.01';
        setError(`❌ Saldo ETH tidak mencukupi! Dibutuhkan ${escrowNeeded} ETH untuk escrow + gas fee. Silakan top up wallet Anda.`);
      } else if (err.message?.includes('user rejected') || err.message?.includes('User denied')) {
        setError('Transaksi dibatalkan oleh pengguna');
      } else if (err.message?.includes('missing revert data')) {
        // Check nested error for more details
        if (errorInfo.includes('insufficient funds')) {
          const vow = pendingVows.find(v => v.vowId === vowId);
          const escrowNeeded = vow?.escrowAmount || '0.01';
          setError(`❌ Saldo ETH tidak mencukupi! Dibutuhkan ${escrowNeeded} ETH untuk escrow + gas fee. Silakan top up wallet Anda.`);
        } else {
          await loadVowsFromBlockchain();
          setError(`Transaksi gagal. Pastikan wallet memiliki cukup ETH untuk escrow + gas fee.`);
        }
      } else {
        setError(err.message || 'Gagal mengaktifkan perjanjian');
      }
    } finally {
      setActivating(null);
    }
  };

  // Handle deposit to personal vault
  const handleDeposit = async () => {
    if (!isConnected || !depositAmount) {
      setError('Masukkan jumlah deposit yang valid');
      return;
    }
    
    setError(null);
    setSuccess(null);
    setDepositing(true);
    
    try {
      // Check if contract is properly deployed
      const isDeployed = await checkContractDeployment();
      if (!isDeployed) {
        setError('Smart contract tidak dapat diakses. Pastikan Anda terhubung ke Base Sepolia network.');
        setDepositing(false);
        return;
      }
      
      const depositAmountNum = parseFloat(depositAmount);
      
      if (depositType === 'personal') {
        console.log('=== DEPOSIT TO PERSONAL VAULT ===');
        console.log('Amount:', depositAmount, 'ETH');
        console.log('Contract address:', import.meta.env.VITE_SMARTVOW_ADDRESS);
        
        await depositPersonal(depositAmount);
        
        // Immediately update local state for instant UI feedback
        setVaultBalance(prev => ({
          ...prev,
          personal: {
            ...prev.personal,
            partnerA: prev.personal.partnerA + depositAmountNum
          }
        }));
        
        setSuccess(`Berhasil deposit ${depositAmount} ETH ke brankas pribadi!`);
      } else {
        // Transfer from personal to shared
        console.log('=== TRANSFER TO SHARED VAULT ===');
        
        // First check current balance from blockchain (fresh data)
        const balances = await getVaultBalances();
        console.log('Fresh balances from blockchain:', balances);
        console.log('Trying to transfer:', depositAmount, 'ETH');
        console.log('Personal vault balance:', balances.personal, 'ETH');
        
        const personalBalance = parseFloat(balances.personal);
        
        if (personalBalance < depositAmountNum) {
          setError(`Saldo brankas pribadi tidak mencukupi. Tersedia: ${balances.personal} ETH, dibutuhkan: ${depositAmount} ETH. Silakan deposit ke brankas pribadi terlebih dahulu.`);
          setDepositing(false);
          return;
        }
        
        await transferToShared(depositAmount);
        
        // Immediately update local state for instant UI feedback
        setVaultBalance(prev => ({
          ...prev,
          personal: {
            ...prev.personal,
            partnerA: prev.personal.partnerA - depositAmountNum
          },
          shared: {
            ...prev.shared,
            available: prev.shared.available + depositAmountNum,
            total: prev.shared.total + depositAmountNum,
            partnerAContribution: prev.shared.partnerAContribution + depositAmountNum
          }
        }));
        
        setSuccess(`Berhasil transfer ${depositAmount} ETH ke brankas bersama!`);
      }
      
      setShowDepositModal(false);
      setDepositAmount('');
      
      // Wait a bit for blockchain to update, then refresh from blockchain
      setTimeout(async () => {
        console.log('Reloading vault balances from blockchain...');
        await loadVaultBalances();
        console.log('Vault balances reloaded');
      }, 3000);
      
    } catch (err: any) {
      console.error('Deposit error:', err);
      
      // Parse error message for better UX
      let errorMessage = 'Gagal melakukan deposit';
      if (err.message) {
        if (err.message.includes('Insufficient personal balance')) {
          errorMessage = 'Saldo brankas pribadi tidak mencukupi. Silakan deposit ke brankas pribadi terlebih dahulu.';
        } else if (err.message.includes('user rejected') || err.message.includes('User denied')) {
          errorMessage = 'Transaksi dibatalkan oleh pengguna';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Saldo ETH di wallet tidak mencukupi untuk gas fee';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setDepositing(false);
    }
  };

  // Handle claim submission
  const handleClaim = async () => {
    if (!selectedVowForClaim) return;
    
    // Get verification method from the selected vow
    const selectedVow = pendingVows.find(v => v.vowId === selectedVowForClaim);
    const verificationMethod = selectedVow?.verificationMethod || 'internal';
    const isInternalClaim = verificationMethod === 'internal';
    
    // Validate required fields
    if (!claimReason.trim()) {
      setError('Masukkan alasan klaim');
      return;
    }
    if (!claimEvidence) {
      setError('Masukkan tanggal kejadian');
      return;
    }
    
    // Check if vow is eligible for claim
    if (!selectedVow) {
      setError('Perjanjian tidak ditemukan');
      return;
    }
    
    if (!selectedVow.partnerASigned || !selectedVow.partnerBSigned) {
      setError('Kedua partner harus menandatangani perjanjian terlebih dahulu');
      return;
    }
    
    setClaiming(selectedVowForClaim);
    setError(null);
    setSuccess(null); // Clear previous success message
    
    try {
      // Check if vow already claimed
      const alreadyClaimed = await isVowClaimed(selectedVowForClaim);
      if (alreadyClaimed) {
        setError('Perjanjian ini sudah pernah diklaim sebelumnya');
        setClaiming(null);
        return;
      }
      
      if (isInternalClaim) {
        console.log('=== INTERNAL CLAIM DEBUG ===');
        console.log('Submitting internal claim for vow:', selectedVowForClaim);
        console.log('Selected vow data:', selectedVow);
        console.log('Escrow amount:', selectedVow.escrowAmount);
        console.log('Conditions:', selectedVow.conditions);
        
        // Get penalty percentage from the FIRST condition (primary violation)
        // Each condition has penalty in percentage (e.g., 70 = 70%)
        // Convert to basis points (70% = 7000 basis points)
        let penaltyPercentage = 70; // Default 70%
        
        if (selectedVow.conditions && selectedVow.conditions.length > 0) {
          // Use the FIRST condition's penalty (primary violation)
          // Don't sum all conditions - use the one being claimed
          const primaryCondition = selectedVow.conditions[0];
          penaltyPercentage = primaryCondition.penalty || 70;
          
          console.log('Primary condition:', primaryCondition.title);
          console.log('Primary condition penalty:', primaryCondition.penalty, '%');
          
          // Log all conditions for debugging
          selectedVow.conditions.forEach((c: any, i: number) => {
            console.log(`Condition ${i}:`, c.title, 'Penalty:', c.penalty, '%');
          });
        }
        
        // Ensure penalty is within valid range (1-100%)
        if (penaltyPercentage < 1) penaltyPercentage = 1;
        if (penaltyPercentage > 100) penaltyPercentage = 100;
        
        // Convert percentage to basis points (70% -> 7000)
        const penaltyBasisPoints = penaltyPercentage * 100;
        
        const escrowAmount = parseFloat(selectedVow.escrowAmount || '0');
        const expectedClaimantAmount = escrowAmount * penaltyPercentage / 100;
        const expectedOtherAmount = escrowAmount - expectedClaimantAmount;
        
        console.log('Penalty percentage:', penaltyPercentage, '%');
        console.log('Penalty basis points:', penaltyBasisPoints);
        console.log('Escrow amount:', escrowAmount, 'ETH');
        console.log('Expected claimant amount:', expectedClaimantAmount.toFixed(6), 'ETH');
        console.log('Expected other partner amount:', expectedOtherAmount.toFixed(6), 'ETH');
        console.log('=== END CLAIM DEBUG ===');
        
        await submitInternalClaim(selectedVowForClaim, penaltyBasisPoints);
        
        // Simpan data klaim ke localStorage untuk transparansi
        const claimData = {
          vowId: selectedVowForClaim,
          claimant: account,
          reason: claimReason,
          date: claimEvidence, // tanggal kejadian
          evidence: claimFileUrl || null, // URL file bukti jika ada
          penaltyPercentage: penaltyPercentage,
          claimantAmount: expectedClaimantAmount,
          otherAmount: expectedOtherAmount,
          claimedAt: new Date().toISOString(),
          type: 'internal'
        };
        
        // Simpan ke localStorage
        const existingClaims = JSON.parse(localStorage.getItem('smartvow_claims') || '[]');
        existingClaims.push(claimData);
        localStorage.setItem('smartvow_claims', JSON.stringify(existingClaims));
        
        // Update agreement status di localStorage
        const agreements = JSON.parse(localStorage.getItem('smartvow_agreements') || '[]');
        const updatedAgreements = agreements.map((a: any) => 
          a.vowId === selectedVowForClaim 
            ? { ...a, status: 'resolved', claimData: claimData } 
            : a
        );
        localStorage.setItem('smartvow_agreements', JSON.stringify(updatedAgreements));
        
        // Only show success if no error was thrown
        setShowClaimModal(false);
        setSelectedVowForClaim(null);
        setClaimReason('');
        setClaimEvidence('');
        setClaimFileUrl(null);
        
        const claimantShare = penaltyPercentage;
        const otherShare = 100 - penaltyPercentage;
        setSuccess(`✅ Klaim berhasil! Anda menerima ${claimantShare}% (${expectedClaimantAmount.toFixed(5)} ETH) dari escrow. ${otherShare > 0 ? `Sisa ${otherShare}% (${expectedOtherAmount.toFixed(5)} ETH) dikembalikan ke partner.` : ''}`);
        
        // Refresh data
        await loadVaultBalances();
        await loadVowsFromBlockchain();
      } else {
        // AI verification
        console.log('Submitting AI claim for vow:', selectedVowForClaim);
        await submitAIClaim(selectedVowForClaim, claimReason, claimEvidence);
        
        // Simpan data klaim ke localStorage untuk transparansi
        const claimData = {
          vowId: selectedVowForClaim,
          claimant: account,
          reason: claimReason,
          date: claimEvidence,
          evidence: claimFileUrl || null,
          claimedAt: new Date().toISOString(),
          type: 'ai',
          status: 'pending_verification'
        };
        
        const existingClaims = JSON.parse(localStorage.getItem('smartvow_claims') || '[]');
        existingClaims.push(claimData);
        localStorage.setItem('smartvow_claims', JSON.stringify(existingClaims));
        
        setShowClaimModal(false);
        setSelectedVowForClaim(null);
        setClaimReason('');
        setClaimEvidence('');
        setClaimFileUrl(null);
        
        setSuccess(`🤖 Klaim sedang diverifikasi oleh AI. Mohon tunggu beberapa saat untuk hasil verifikasi.`);
        
        await loadVowsFromBlockchain();
      }
    } catch (err: any) {
      console.error('Claim error:', err);
      
      // Parse error message
      let errorMessage = 'Gagal mengajukan klaim';
      if (err.message) {
        if (err.message.includes('Vow does not exist')) {
          errorMessage = 'Perjanjian tidak ditemukan. Mungkin sudah dihapus atau ID tidak valid.';
        } else if (err.message.includes('Invalid status') || err.message.includes('Vow must be active')) {
          errorMessage = 'Perjanjian harus dalam status aktif atau sudah ditandatangani kedua partner';
        } else if (err.message.includes('Already claimed')) {
          errorMessage = 'Perjanjian ini sudah pernah diklaim sebelumnya';
        } else if (err.message.includes('Not a partner')) {
          errorMessage = 'Anda bukan partner dalam perjanjian ini';
        } else if (err.message.includes('user rejected')) {
          errorMessage = 'Transaksi dibatalkan oleh pengguna';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setClaiming(null);
    }
  };

  const myPendingVows = pendingVows.filter(v => 
    v.partnerB?.toLowerCase() === account?.toLowerCase() && !v.partnerBSigned
  );
  // Only show vows that are ready to activate (signed by both, not active, and not resolved/terminated)
  // Also check status is 'ready' or 'pending' (not 'active')
  const readyToActivate = pendingVows.filter(v => 
    v.partnerASigned && v.partnerBSigned && !v.isActive && 
    v.status !== 'resolved' && v.status !== 'terminated' && v.status !== 'active'
  );
  const activeVows = pendingVows.filter(v => v.isActive || v.status === 'active');
  const waitingPartnerB = pendingVows.filter(v => 
    v.partnerA?.toLowerCase() === account?.toLowerCase() && 
    v.partnerASigned && !v.partnerBSigned
  );
  const allMyVows = pendingVows.filter(v => 
    v.partnerA?.toLowerCase() === account?.toLowerCase() || 
    v.partnerB?.toLowerCase() === account?.toLowerCase()
  );

  // Debug: Log vault balance state
  console.log('Current vault balance state:', vaultBalance);
  console.log('Current partner profiles state:', partnerProfiles);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard SmartVow</h1>
          <p className="text-slate-500 mt-1">Kelola perjanjian pranikah digital Anda</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 1. Refresh Button */}
          <button 
            onClick={() => {
              loadVowsFromBlockchain();
              loadVaultBalances();
            }}
            disabled={loadingVows || loadingVaultBalance}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-50"
            title="Refresh semua data dari blockchain"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loadingVows || loadingVaultBalance ? 'animate-spin' : ''}`} />
          </button>
          
          {/* 2. Buat Perjanjian Baru */}
          <Link to="/generator" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all">
            <PlusIcon className="h-4 w-4" />
            Buat Perjanjian Baru
          </Link>
          
          {/* 3. Withdraw Button */}
          <button 
            onClick={async () => {
              await loadVaultBalances();
              setShowWithdrawModal(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Withdraw</span>
          </button>
          
          {/* 4. Deposit Button */}
          <button 
            onClick={async () => {
              await loadVaultBalances();
              setDepositType('personal');
              setShowDepositModal(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Deposit</span>
          </button>
          
          {/* 5. Vault Balance Display - Brankas Pribadi */}
          <div className="hidden md:flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
            <div className="text-center">
              <p className="text-[10px] text-purple-600 font-bold uppercase">Brankas Pribadi</p>
              {loadingVaultBalance ? (
                <ArrowPathIcon className="h-4 w-4 text-purple-500 animate-spin mx-auto" />
              ) : (
                <p className="text-sm font-bold text-purple-900">{vaultBalance.personal.partnerA.toFixed(5)} ETH</p>
              )}
            </div>
            
            {/* Sync Status Indicator */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[8px] text-emerald-600 font-bold">LIVE</span>
            </div>
            
            {/* Refresh Button for Vault Balance */}
            <button 
              onClick={loadVaultBalances}
              disabled={loadingVaultBalance}
              className="p-1 text-purple-400 hover:text-purple-600 rounded-lg transition-all disabled:opacity-50"
              title="Refresh vault balance"
            >
              <ArrowPathIcon className={`h-3 w-3 ${loadingVaultBalance ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {loadingVows && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
          <ArrowPathIcon className="h-5 w-5 text-indigo-500 animate-spin" />
          <p className="text-sm text-indigo-700">Memuat perjanjian dari blockchain...</p>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-rose-500" />
          <p className="text-sm text-rose-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
          <p className="text-sm text-emerald-700">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">✕</button>
        </div>
      )}

      {/* Pending Signatures - for Partner B */}
      {myPendingVows.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-xl"><ClockIcon className="h-6 w-6 text-amber-600" /></div>
            <div>
              <h2 className="text-lg font-bold text-amber-800">Menunggu Tanda Tangan Anda</h2>
              <p className="text-xs text-amber-600">{myPendingVows.length} perjanjian perlu ditandatangani</p>
            </div>
          </div>
          <div className="space-y-4">
            {myPendingVows.map((vow) => (
              <div key={vow.vowId} className="bg-white rounded-xl p-4 border border-amber-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Vow #{vow.vowId}</p>
                    <p className="text-xs text-slate-500">Dari: {shortenAddress(vow.partnerA)}</p>
                  </div>
                  <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">
                    {vow.verificationMethod === 'ai' ? '🤖 Verifikasi AI' : '🔒 Internal'}
                  </span>
                </div>
                
                {/* Clause Summary */}
                {vow.conditions && vow.conditions.length > 0 && (
                  <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Ringkasan Klausul ({vow.conditions.length})</p>
                    <div className="space-y-1.5">
                      {vow.conditions.slice(0, 3).map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 truncate flex-1">{c.title}</span>
                          <span className="text-indigo-600 font-bold ml-2">{c.penalty}%</span>
                        </div>
                      ))}
                      {vow.conditions.length > 3 && (
                        <p className="text-[10px] text-slate-400">+{vow.conditions.length - 3} klausul lainnya</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Categories */}
                {vow.selectedCategories && vow.selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {vow.selectedCategories.map((cat: string) => (
                      <span key={cat} className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-medium">
                        {cat === 'divorce' ? '⚖️ Perceraian' : 
                         cat === 'infidelity' ? '💔 Perselingkuhan' :
                         cat === 'kdrt' ? '🛡️ KDRT' :
                         cat === 'financial' ? '💰 Keuangan' :
                         cat === 'asset' ? '🏠 Aset' :
                         cat === 'children' ? '👨‍👩‍👧 Anak' : cat}
                      </span>
                    ))}
                  </div>
                )}
                
                <button onClick={() => handleSignAndActivate(vow.vowId)} disabled={activating === vow.vowId} className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-500 text-white rounded-lg text-xs font-bold hover:from-amber-600 hover:to-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {activating === vow.vowId ? <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Processing...</> : <><RocketLaunchIcon className="h-4 w-4" /> TTD & Aktivasi Perjanjian</>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting for Partner B - for Partner A */}
      {waitingPartnerB.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-xl"><ClockIcon className="h-6 w-6 text-indigo-600" /></div>
            <div>
              <h2 className="text-lg font-bold text-indigo-800">Menunggu Partner B</h2>
              <p className="text-xs text-indigo-600">{waitingPartnerB.length} perjanjian menunggu tanda tangan partner</p>
            </div>
          </div>
          <div className="space-y-3">
            {waitingPartnerB.map((vow) => (
              <div key={vow.vowId} className="bg-white rounded-xl p-4 border border-indigo-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Vow #{vow.vowId}</p>
                    <p className="text-xs text-slate-500">Partner B: {shortenAddress(vow.partnerB)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Anda sudah sign</span>
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">⏳ Menunggu Partner B</span>
                    </div>
                  </div>
                  {vow.txHash && (
                    <a href={`https://sepolia.basescan.org/tx/${vow.txHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" /> Lihat TX
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Bagikan Vow ID #{vow.vowId} ke partner untuk menandatangani</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ready to Activate */}
      {readyToActivate.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-xl"><RocketLaunchIcon className="h-6 w-6 text-emerald-600" /></div>
            <div>
              <h2 className="text-lg font-bold text-emerald-800">Siap Diaktifkan</h2>
              <p className="text-xs text-emerald-600">Kedua partner sudah menandatangani</p>
            </div>
          </div>
          <div className="space-y-4">
            {readyToActivate.map((vow) => (
              <div key={vow.vowId} className="bg-white rounded-xl p-4 border border-emerald-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Vow #{vow.vowId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Partner A</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Partner B</span>
                    </div>
                  </div>
                  {vow.escrowAmount && parseFloat(vow.escrowAmount) > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Escrow</p>
                      <p className="text-sm font-bold text-emerald-600">{vow.escrowAmount} ETH</p>
                    </div>
                  )}
                </div>
                
                {/* Clause Summary */}
                {vow.conditions && vow.conditions.length > 0 && (
                  <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">{vow.conditions.length} Klausul</p>
                    <div className="space-y-1">
                      {vow.conditions.slice(0, 2).map((c: any, i: number) => (
                        <p key={i} className="text-[10px] text-slate-600">• {c.title}</p>
                      ))}
                      {vow.conditions.length > 2 && (
                        <p className="text-[10px] text-slate-400">+{vow.conditions.length - 2} lainnya</p>
                      )}
                    </div>
                  </div>
                )}
                
                <button onClick={() => handleActivate(vow.vowId)} disabled={activating === vow.vowId} className="w-full px-4 py-2.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {activating === vow.vowId ? <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Activating...</> : <><RocketLaunchIcon className="h-4 w-4" /> Aktivasi Perjanjian</>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><CheckBadgeIcon className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Perjanjian Aktif</p>
              <p className="text-xl font-bold text-slate-900">{activeVows.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
          {/* Tombol + absolute di pojok kanan atas - hanya tampil jika punya pasangan terdaftar di certificate */}
          {hasRegisteredPartner && (
            <button 
              onClick={async () => {
                await loadVaultBalances();
                setDepositType('shared');
                setShowDepositModal(true);
              }}
              disabled={loadingVaultBalance}
              className="absolute -top-2 -right-2 p-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 shadow-md"
              title="Transfer dari brankas pribadi ke bersama"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><ArchiveBoxIcon className="h-5 w-5 text-purple-600" /></div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-400 uppercase">Brankas Bersama</p>
              {loadingVaultBalance ? (
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="h-4 w-4 text-purple-500 animate-spin" />
                  <span className="text-sm text-purple-500">Loading...</span>
                </div>
              ) : (
                <p className="text-xl font-bold text-slate-900">
                  {hasRegisteredPartner ? vaultBalance.shared.total.toFixed(5) : '0.00000'} <span className="text-sm text-slate-400">ETH</span>
                </p>
              )}
            </div>
            {/* Refresh button - hanya tampil jika punya pasangan terdaftar */}
            {hasRegisteredPartner && (
              <button 
                onClick={loadVaultBalances}
                disabled={loadingVaultBalance}
                className="p-1 text-purple-400 hover:text-purple-600 rounded-lg transition-all disabled:opacity-50"
                title="Refresh brankas bersama"
              >
                <ArrowPathIcon className={`h-3 w-3 ${loadingVaultBalance ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          {/* Info jika tidak punya pasangan terdaftar */}
          {!hasRegisteredPartner && (
            <p className="text-[10px] text-slate-400 mt-2">
              🔒 Mint Marriage Certificate untuk mengakses
            </p>
          )}
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-50 rounded-lg"><ArchiveBoxIcon className="h-5 w-5 text-pink-600" /></div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-400 uppercase">ASSET NFT</p>
              {loadingAssets ? (
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="h-4 w-4 text-pink-500 animate-spin" />
                  <span className="text-sm text-pink-500">Loading...</span>
                </div>
              ) : (
                <p className="text-xl font-bold text-slate-900">
                  {totalNFTAssets.total}
                  <span className="text-sm text-slate-400 ml-1"></span>
                </p>
              )}
            </div>
            <button 
              onClick={loadAssetDistribution}
              disabled={loadingAssets}
              className="p-1.5 bg-pink-50 rounded-lg hover:bg-pink-100 transition-all disabled:opacity-50"
              title="Refresh NFT"
            >
              <ArrowPathIcon className={`h-3.5 w-3.5 text-pink-600 ${loadingAssets ? 'animate-spin' : ''}`} />
            </button>
            <Link to="/vault" className="p-1.5 bg-pink-50 rounded-lg hover:bg-pink-100 transition-all" title="Lihat di Vault">
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 text-pink-600" />
            </Link>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-4 rounded-xl shadow-sm text-white relative">
          {/* Status badge di pojok kanan atas */}
          {!hasRegisteredPartner ? (
            <span className="absolute top-2 right-2 text-[8px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
              Kosong
            </span>
          ) : !loadingVows && vaultBalance.escrow.total === 0 ? (
            <span className="absolute top-2 right-2 text-[8px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
              Kosong
            </span>
          ) : vaultBalance.escrow.locked && (
            <span className="absolute top-2 right-2 text-[8px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
              🔒 Locked
            </span>
          )}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg"><ShieldCheckIcon className="h-5 w-5 text-white" /></div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white/70 uppercase">Escrow Terkunci</p>
              {loadingVows ? (
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="h-4 w-4 text-white animate-spin" />
                  <span className="text-sm text-white/80">Loading...</span>
                </div>
              ) : (
                <p className="text-xl font-bold">
                  {hasRegisteredPartner ? vaultBalance.escrow.total.toFixed(5) : '0.00000'} <span className="text-sm text-white/70">ETH</span>
                </p>
              )}
            </div>
          </div>
          {hasRegisteredPartner ? (
            <p className="text-[10px] text-white/60 mt-2">
              💰 Sisa: {vaultBalance.shared.available.toFixed(5)} ETH
            </p>
          ) : (
            <p className="text-[10px] text-white/60 mt-2">
              🔒 Mint Marriage Certificate untuk mengakses
            </p>
          )}
        </div>
      </div>

      {/* Partner Profiles Section */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <FingerPrintIcon className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-900">Profile Pasangan</h3>
            <p className="text-xs text-slate-400">Informasi kedua belah pihak dalam perjanjian</p>
          </div>
          {/* Refresh button for partner profiles */}
          <button 
            onClick={() => {
              console.log('Force refreshing certificate data...');
              loadVowsFromBlockchain();
            }}
            disabled={loadingVows || loadingCertificates}
            className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg transition-all disabled:opacity-50"
            title="Refresh profile pasangan dari certificate"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loadingVows || loadingCertificates ? 'animate-spin' : ''}`} />
          </button>
          {/* Sync indicator */}
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${loadingCertificates ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></div>
            <span className={`text-[8px] font-bold ${loadingCertificates ? 'text-amber-600' : 'text-emerald-600'}`}>
              {loadingCertificates ? 'LOADING' : 'CERT'}
            </span>
          </div>
        </div>
        
        {/* Always show Partner A (current user) and Partner B (if exists) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Partner A - Current User */}
          <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                A
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-indigo-900">
                  {(() => {
                    const currentUserProfile = partnerProfiles.find(p => p.isCurrentUser);
                    if (currentUserProfile?.name) {
                      return `${currentUserProfile.name} (You)`;
                    }
                    return 'Partner A (You)';
                  })()}
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  {account ? shortenAddress(account) : 'Not connected'}
                </p>
              </div>
              <span className="text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold uppercase">
                {(() => {
                  const currentUserProfile = partnerProfiles.find(p => p.isCurrentUser);
                  return currentUserProfile?.name ? 'CERTIFIED' : 'YOU';
                })()}
              </span>
            </div>
            
            <div className="space-y-1">
              {(() => {
                const currentUserProfile = partnerProfiles.find(p => p.isCurrentUser);
                return currentUserProfile?.name && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Nama:</span>
                    <span className="text-indigo-700 font-medium">{currentUserProfile.name}</span>
                  </div>
                );
              })()}
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Address:</span>
                {account ? (
                  <a 
                    href={`https://sepolia.basescan.org/address/${account}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline font-mono flex items-center gap-1"
                  >
                    {account.slice(0, 6)}...{account.slice(-4)}
                    <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-slate-400">Connect wallet</span>
                )}
              </div>
            </div>
          </div>

          {/* Partner B - From agreements or certificates */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-xs font-bold">
                B
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">
                  {(() => {
                    // Get partner from the most recent/active vow where current user is involved
                    const relevantVow = pendingVows.find(v => 
                      v.partnerA.toLowerCase() === account?.toLowerCase() || 
                      v.partnerB.toLowerCase() === account?.toLowerCase()
                    );
                    
                    // PRIORITY: First check certificate for partner name
                    // Certificate is the "official" record
                    const certPartner = partnerProfiles.find(p => 
                      !p.isCurrentUser && p.name // Has name = from certificate
                    );
                    
                    if (certPartner?.name) {
                      return certPartner.name;
                    }
                    
                    if (relevantVow) {
                      // Current user's partner is the other person in the vow
                      const partnerAddress = relevantVow.partnerA.toLowerCase() === account?.toLowerCase() 
                        ? relevantVow.partnerB 
                        : relevantVow.partnerA;
                      
                      // Find profile with name for this partner
                      const partnerProfile = partnerProfiles.find(p => 
                        p.address.toLowerCase() === partnerAddress.toLowerCase()
                      );
                      
                      if (partnerProfile?.name) {
                        return partnerProfile.name;
                      }
                    }
                    
                    // Fallback to old logic
                    const partnerB = partnerProfiles.find(p => !p.isCurrentUser);
                    if (partnerB?.name) {
                      return partnerB.name;
                    }
                    return 'Partner B';
                  })()}
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  {(() => {
                    // PRIORITY: First check certificate for partner address
                    const certPartner = partnerProfiles.find(p => 
                      !p.isCurrentUser && p.name // Has name = from certificate
                    );
                    
                    if (certPartner) {
                      return shortenAddress(certPartner.address);
                    }
                    
                    // Get partner from the most recent/active vow
                    const relevantVow = pendingVows.find(v => 
                      v.partnerA.toLowerCase() === account?.toLowerCase() || 
                      v.partnerB.toLowerCase() === account?.toLowerCase()
                    );
                    
                    if (relevantVow) {
                      const partnerAddress = relevantVow.partnerA.toLowerCase() === account?.toLowerCase() 
                        ? relevantVow.partnerB 
                        : relevantVow.partnerA;
                      return shortenAddress(partnerAddress);
                    }
                    
                    const partnerB = partnerProfiles.find(p => !p.isCurrentUser);
                    return partnerB ? shortenAddress(partnerB.address) : 'Belum diundang';
                  })()}
                </p>
              </div>
              {(() => {
                // PRIORITY: Check certificate first
                const certPartner = partnerProfiles.find(p => 
                  !p.isCurrentUser && p.name
                );
                
                if (certPartner?.name) {
                  return (
                    <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold uppercase">
                      CERTIFIED
                    </span>
                  );
                }
                
                // Get partner from the most recent/active vow
                const relevantVow = pendingVows.find(v => 
                  v.partnerA.toLowerCase() === account?.toLowerCase() || 
                  v.partnerB.toLowerCase() === account?.toLowerCase()
                );
                
                if (relevantVow) {
                  const partnerAddress = relevantVow.partnerA.toLowerCase() === account?.toLowerCase() 
                    ? relevantVow.partnerB 
                    : relevantVow.partnerA;
                  
                  const partnerProfile = partnerProfiles.find(p => 
                    p.address.toLowerCase() === partnerAddress.toLowerCase()
                  );
                  
                  if (partnerProfile?.name) {
                    return (
                      <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold uppercase">
                        CERTIFIED
                      </span>
                    );
                  } else {
                    return (
                      <span className="text-[8px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold uppercase">
                        LINKED
                      </span>
                    );
                  }
                }
                
                return (
                  <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold uppercase">
                    PENDING
                  </span>
                );
              })()}
            </div>
            
            <div className="space-y-1">
              {(() => {
                const relevantVow = pendingVows.find(v => 
                  v.partnerA.toLowerCase() === account?.toLowerCase() || 
                  v.partnerB.toLowerCase() === account?.toLowerCase()
                );
                
                if (relevantVow) {
                  const partnerAddress = relevantVow.partnerA.toLowerCase() === account?.toLowerCase() 
                    ? relevantVow.partnerB 
                    : relevantVow.partnerA;
                  
                  const partnerProfile = partnerProfiles.find(p => 
                    p.address.toLowerCase() === partnerAddress.toLowerCase()
                  );
                  
                  return partnerProfile?.name && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Nama:</span>
                      <span className="text-slate-700 font-medium">{partnerProfile.name}</span>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Address:</span>
                {(() => {
                  const relevantVow = pendingVows.find(v => 
                    v.partnerA.toLowerCase() === account?.toLowerCase() || 
                    v.partnerB.toLowerCase() === account?.toLowerCase()
                  );
                  
                  if (relevantVow) {
                    const partnerAddress = relevantVow.partnerA.toLowerCase() === account?.toLowerCase() 
                      ? relevantVow.partnerB 
                      : relevantVow.partnerA;
                    
                    return (
                      <a 
                        href={`https://sepolia.basescan.org/address/${partnerAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline font-mono flex items-center gap-1"
                      >
                        {partnerAddress.slice(0, 6)}...{partnerAddress.slice(-4)}
                        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                    );
                  }
                  
                  return <span className="text-slate-400">Belum ada perjanjian</span>;
                })()}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-xs text-slate-500">
            💡 Profile ini otomatis tercatat dari Marriage Certificate NFT dan perjanjian. Nama diambil dari sertifikat pernikahan yang sudah di-mint di blockchain.
          </p>
          {/* Debug info */}
          <div className="mt-2 text-[10px] text-slate-400">
            Debug: {partnerProfiles.length} profiles loaded, {partnerProfiles.filter(p => p.name).length} with names
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Chart - tampilkan angka 0 jika tidak punya pasangan terdaftar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pertumbuhan Shared Vault</h3>
                <p className="text-xs text-slate-500">Aset dikunci dalam escrow</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-indigo-600">
                  {hasRegisteredPartner ? vaultBalance.shared.total.toFixed(5) : '0.00000'} ETH
                </p>
                <p className="text-[10px] text-emerald-600 font-bold">Brankas Bersama</p>
              </div>
            </div>
            {hasRegisteredPartner ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockAssetHistory}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)'}} />
                    <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 w-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <div className="text-center">
                  <LockClosedIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-medium">Belum Ada Pasangan Terdaftar</p>
                  <p className="text-xs text-slate-400 mt-1">Mint Marriage Certificate untuk mengakses brankas bersama</p>
                  <Link to="/certificate" className="inline-flex items-center gap-1 mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                    <PlusIcon className="h-3 w-3" /> Mint Certificate
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* All Agreements List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Semua Perjanjian</h3>
              <span className="text-xs text-slate-400">{allMyVows.length} total</span>
            </div>
            {allMyVows.length > 0 ? (
              <div className="space-y-3">
                {allMyVows.map((vow) => {
                  const isPartnerA = vow.partnerA?.toLowerCase() === account?.toLowerCase();
                  let statusColor = 'bg-slate-100 text-slate-600';
                  let statusText = 'Unknown';
                  
                  // Check status based on vow.status first (from blockchain)
                  if (vow.status === 'resolved') {
                    statusColor = 'bg-purple-100 text-purple-700';
                    statusText = '✓ SELESAI';
                  } else if (vow.status === 'terminated') {
                    statusColor = 'bg-slate-100 text-slate-600';
                    statusText = '✕ DITERMINASI';
                  } else if (vow.status === 'breached') {
                    statusColor = 'bg-rose-100 text-rose-700';
                    statusText = '⚠️ PELANGGARAN';
                  } else if (vow.isActive || vow.status === 'active') {
                    statusColor = 'bg-emerald-100 text-emerald-700';
                    statusText = '✓ AKTIF';
                  } else if (vow.partnerASigned && vow.partnerBSigned) {
                    statusColor = 'bg-blue-100 text-blue-700';
                    statusText = 'Siap Aktivasi';
                  } else if (vow.partnerASigned && !vow.partnerBSigned) {
                    statusColor = 'bg-amber-100 text-amber-700';
                    statusText = isPartnerA ? 'Menunggu Partner B' : 'Perlu Tanda Tangan';
                  } else if (!vow.partnerASigned && !vow.partnerBSigned) {
                    statusColor = 'bg-slate-100 text-slate-600';
                    statusText = 'Draft';
                  }
                  return (
                    <div key={vow.vowId} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${vow.isActive ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                            {vow.isActive ? <ShieldCheckIcon className="h-5 w-5 text-emerald-600" /> : <DocumentTextIcon className="h-5 w-5 text-indigo-600" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Vow #{vow.vowId}</p>
                            <p className="text-[10px] text-slate-400">{isPartnerA ? `Partner B: ${shortenAddress(vow.partnerB)}` : `Partner A: ${shortenAddress(vow.partnerA)}`}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${statusColor}`}>{statusText}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                        <div className={`flex items-center gap-1 text-[9px] font-bold ${vow.partnerASigned ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <CheckCircleIcon className={`h-3 w-3 ${vow.partnerASigned ? 'text-emerald-500' : 'text-slate-300'}`} /> A Signed
                        </div>
                        <div className={`flex items-center gap-1 text-[9px] font-bold ${vow.partnerBSigned ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <CheckCircleIcon className={`h-3 w-3 ${vow.partnerBSigned ? 'text-emerald-500' : 'text-slate-300'}`} /> B Signed
                        </div>
                        <div className={`flex items-center gap-1 text-[9px] font-bold ${vow.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <CheckCircleIcon className={`h-3 w-3 ${vow.isActive ? 'text-emerald-500' : 'text-slate-300'}`} /> Aktif
                        </div>
                        {vow.txHash && (
                          <a href={`https://sepolia.basescan.org/tx/${vow.txHash}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-[9px] text-indigo-600 font-bold hover:underline flex items-center gap-1">
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" /> BaseScan
                          </a>
                        )}
                        
                        {/* Claim Button for Active Vows or Fully Signed Vows (not resolved/terminated) */}
                        {(vow.isActive || (vow.partnerASigned && vow.partnerBSigned)) && 
                         vow.status !== 'resolved' && vow.status !== 'terminated' && vow.status !== 'breached' && (
                          <button
                            onClick={() => {
                              setSelectedVowForClaim(vow.vowId);
                              setShowClaimModal(true);
                            }}
                            className="ml-auto px-3 py-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg text-[9px] font-bold hover:shadow-lg transition-all"
                          >
                            🚨 Ajukan Klaim
                          </button>
                        )}
                      </div>
                      {vow.conditions && vow.conditions.length > 0 && (
                        <p className="text-[10px] text-slate-400 mt-2">{vow.conditions.length} klausul • Dibuat {new Date(vow.createdAt).toLocaleDateString('id-ID')}</p>
                      )}
                      
                      {/* Detail Klaim untuk perjanjian yang sudah resolved - Compact View */}
                      {vow.status === 'resolved' && (() => {
                        const claims = JSON.parse(localStorage.getItem('smartvow_claims') || '[]');
                        const claimData = claims.find((c: any) => c.vowId === vow.vowId);
                        
                        if (claimData) {
                          return (
                            <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-purple-600">📋</span>
                                <div>
                                  <p className="text-[10px] font-bold text-purple-700">Klaim oleh {shortenAddress(claimData.claimant)}</p>
                                  <p className="text-[9px] text-purple-500">{new Date(claimData.claimedAt).toLocaleDateString('id-ID')} • {claimData.penaltyPercentage}% : {100 - claimData.penaltyPercentage}%</p>
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedClaimDetail(claimData)}
                                className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-[9px] font-bold hover:bg-purple-200 transition-all"
                              >
                                Lihat Detail
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <DocumentTextIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Belum ada perjanjian</p>
                <Link to="/generator" className="text-xs text-indigo-600 font-bold hover:underline mt-2 inline-block">Buat perjanjian pertama →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Distribusi Harta (ETH)</h3>
              {hasRegisteredPartner && (
                <button 
                  onClick={loadVaultBalances}
                  disabled={loadingVaultBalance}
                  className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg transition-all disabled:opacity-50"
                  title="Refresh distribusi ETH"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loadingVaultBalance ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
            
            {!hasRegisteredPartner ? (
              <div className="text-center py-8">
                <LockClosedIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">Belum Ada Pasangan</p>
                <p className="text-xs text-slate-400 mt-1">Mint Marriage Certificate untuk melihat distribusi harta bersama</p>
                <Link to="/certificate" className="inline-flex items-center gap-1 mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                  <PlusIcon className="h-3 w-3" /> Mint Certificate
                </Link>
              </div>
            ) : loadingVaultBalance ? (
              <div className="flex items-center justify-center h-40">
                <ArrowPathIcon className="h-8 w-8 text-indigo-500 animate-spin" />
              </div>
            ) : (
              <>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={[
                          { name: 'Partner A', value: ethDistribution.partnerA.percentage, color: '#4f46e5' },
                          { name: 'Partner B', value: ethDistribution.partnerB.percentage, color: '#f43f5e' }
                        ]} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={40} 
                        outerRadius={60} 
                        paddingAngle={5} 
                        dataKey="value"
                      >
                        <Cell fill="#4f46e5" />
                        <Cell fill="#f43f5e" />
                      </Pie>
                      <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center text-xs p-3 bg-indigo-50 rounded-xl">
                    <div>
                      <span className="text-slate-600 font-bold">Partner A (You)</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Kontribusi: {ethDistribution.partnerA.value.toFixed(4)} ETH
                      </p>
                    </div>
                    <span className="font-bold text-indigo-600">{ethDistribution.partnerA.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-3 bg-rose-50 rounded-xl">
                    <div>
                      <span className="text-slate-600 font-bold">Partner B</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Kontribusi: {ethDistribution.partnerB.value.toFixed(4)} ETH
                      </p>
                    </div>
                    <span className="font-bold text-rose-600">{ethDistribution.partnerB.percentage.toFixed(1)}%</span>
                  </div>
                  
                  {/* Total Summary */}
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Total Brankas Bersama:</span>
                      <span className="text-slate-700 font-bold">
                        {ethDistribution.total.value.toFixed(4)} ETH
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  {ethDistribution.total.value === 0 ? (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700 font-medium text-center">
                        📝 Belum ada deposit ke brankas bersama
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-xs text-emerald-700 font-medium text-center">
                        ✅ Data real-time dari blockchain
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-2xl text-white">
            <h3 className="font-bold mb-4">Aksi Cepat</h3>
            <div className="space-y-3">
              <Link to="/generator" className="flex items-center gap-3 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                <PlusIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Buat Perjanjian Baru</span>
              </Link>
              <Link to="/vault" className="flex items-center gap-3 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                <ArchiveBoxIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Kelola Brankas</span>
              </Link>
              <Link to="/asset-creator" className="flex items-center gap-3 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                <DocumentTextIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Virtualisasi Aset</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-[9999]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDepositModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl pointer-events-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  {depositType === 'shared' ? 'Transfer ke Brankas Bersama' : 'Deposit ke Brankas Pribadi'}
                </h3>
                <button onClick={() => setShowDepositModal(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Info Box untuk Transfer ke Bersama */}
                {depositType === 'shared' && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <p className="text-xs text-indigo-700">
                      💡 Transfer dari brankas pribadi ke brankas bersama. Saldo pribadi Anda: <span className="font-bold">{vaultBalance.personal.partnerA.toFixed(5)} ETH</span>
                    </p>
                  </div>
                )}

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Jumlah (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.001"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {depositType === 'shared' && parseFloat(depositAmount) > vaultBalance.personal.partnerA && (
                    <p className="text-xs text-rose-500 mt-1">
                      ⚠️ Jumlah melebihi saldo brankas pribadi
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowDepositModal(false)}
                    disabled={depositing}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleDeposit}
                    disabled={!depositAmount || parseFloat(depositAmount) <= 0 || depositing || (depositType === 'shared' && parseFloat(depositAmount) > vaultBalance.personal.partnerA)}
                    className={`flex-1 px-4 py-3 ${depositType === 'shared' ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'} text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                  >
                    {depositing ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      depositType === 'personal' ? 'Deposit' : 'Transfer'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[9999]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWithdrawModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl pointer-events-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Withdraw dari Brankas Pribadi</h3>
                <button onClick={() => setShowWithdrawModal(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Info Box */}
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <p className="text-xs text-rose-700">
                    💰 Tarik ETH dari brankas pribadi ke wallet Anda. Saldo tersedia: <span className="font-bold">{vaultBalance.personal.partnerA.toFixed(5)} ETH</span>
                  </p>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Jumlah (ETH)</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.001"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                  {parseFloat(withdrawAmount) > vaultBalance.personal.partnerA && (
                    <p className="text-xs text-rose-500 mt-1">
                      ⚠️ Jumlah melebihi saldo brankas pribadi
                    </p>
                  )}
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setWithdrawAmount((vaultBalance.personal.partnerA * 0.25).toFixed(5))}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setWithdrawAmount((vaultBalance.personal.partnerA * 0.5).toFixed(5))}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setWithdrawAmount((vaultBalance.personal.partnerA * 0.75).toFixed(5))}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setWithdrawAmount(vaultBalance.personal.partnerA.toFixed(5))}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
                  >
                    MAX
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    disabled={withdrawing}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={async () => {
                      if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
                      if (parseFloat(withdrawAmount) > vaultBalance.personal.partnerA) {
                        setError('Jumlah melebihi saldo brankas pribadi');
                        return;
                      }
                      
                      setWithdrawing(true);
                      try {
                        await withdrawPersonal(withdrawAmount);
                        setSuccess(`Berhasil withdraw ${withdrawAmount} ETH ke wallet Anda!`);
                        setShowWithdrawModal(false);
                        setWithdrawAmount('');
                        await loadVaultBalances();
                      } catch (err: any) {
                        setError(err.message || 'Gagal withdraw');
                      } finally {
                        setWithdrawing(false);
                      }
                    }}
                    disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || withdrawing || parseFloat(withdrawAmount) > vaultBalance.personal.partnerA}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {withdrawing ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      'Withdraw'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {showClaimModal && selectedVowForClaim && (() => {
        const selectedVow = pendingVows.find(v => v.vowId === selectedVowForClaim);
        const verificationMethod = selectedVow?.verificationMethod || 'internal';
        const isInternalClaim = verificationMethod === 'internal';
        
        return (
        <div className="fixed inset-0 z-[9999]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowClaimModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-lg font-bold text-slate-900">Ajukan Klaim - Vow #{selectedVowForClaim}</h3>
                <button onClick={() => setShowClaimModal(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Verification Method Info (Read-only) */}
                <div className={`p-4 rounded-xl ${
                  isInternalClaim 
                    ? 'bg-emerald-50 border border-emerald-200' 
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isInternalClaim ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                      {isInternalClaim ? (
                        <LockClosedIcon className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <SparklesIcon className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className={`font-bold ${isInternalClaim ? 'text-emerald-800' : 'text-blue-800'}`}>
                        {isInternalClaim ? 'Verifikasi Internal' : 'Verifikasi AI'}
                      </p>
                      <p className={`text-xs ${isInternalClaim ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {isInternalClaim 
                          ? 'Dana langsung ditransfer ke brankas pribadi' 
                          : 'Klaim akan diverifikasi oleh AI'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Claim Form Fields */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Alasan Klaim *</label>
                  <textarea
                    placeholder="Jelaskan alasan mengapa Anda mengajukan klaim ini..."
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                    rows={3}
                  />
                </div>
                
                {/* Date Field */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tanggal Kejadian *</label>
                  <input
                    type="date"
                    value={claimEvidence}
                    onChange={(e) => setClaimEvidence(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                </div>
                
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Upload Bukti (Opsional)</label>
                  <label htmlFor="claim-file" className="block border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer">
                    <input
                      type="file"
                      id="claim-file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          console.log('File selected:', file.name);
                          // Convert to base64 untuk disimpan di localStorage
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setClaimFileUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {claimFileUrl ? (
                      <>
                        <CheckCircleIcon className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm text-emerald-600 font-medium">File berhasil dipilih</p>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setClaimFileUrl(null);
                          }}
                          className="text-xs text-rose-500 mt-1 hover:underline"
                        >
                          Hapus file
                        </button>
                      </>
                    ) : (
                      <>
                        <DocumentTextIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 font-medium">Klik untuk upload file</p>
                        <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF, DOC (Max 5MB)</p>
                      </>
                    )}
                  </label>
                </div>

                {/* Info Box */}
                <div className={`p-3 rounded-xl ${
                  isInternalClaim 
                    ? 'bg-emerald-50 border border-emerald-100' 
                    : 'bg-amber-50 border border-amber-100'
                }`}>
                  <p className={`text-xs ${isInternalClaim ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {isInternalClaim 
                      ? '✅ Klaim internal akan langsung memindahkan dana brankas bersama ke brankas pribadi Anda.'
                      : '⏳ Klaim AI memerlukan waktu verifikasi. Status akan diupdate setelah proses selesai.'}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 flex gap-3 rounded-b-2xl">
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleClaim}
                  disabled={claiming === selectedVowForClaim || !claimReason.trim() || !claimEvidence}
                  className={`flex-1 px-4 py-3 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isInternalClaim 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}
                >
                  {claiming === selectedVowForClaim ? (
                    <><ArrowPathIcon className="h-4 w-4 animate-spin" /> {isInternalClaim ? 'Memproses...' : 'Mengirim...'}</>
                  ) : (
                    <>{isInternalClaim ? '✅ Klaim Sekarang' : '🤖 Ajukan Verifikasi'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Claim Detail Modal */}
      {selectedClaimDetail && (
        <div className="fixed inset-0 z-[9999]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedClaimDetail(null)} />
          <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <DocumentTextIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Detail Klaim</h3>
                      <p className="text-xs text-white/70">Vow #{selectedClaimDetail.vowId}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedClaimDetail(null)} 
                    className="p-1 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <p className="text-[10px] text-purple-500 font-bold uppercase">Pengaju Klaim</p>
                    <p className="text-sm font-bold text-purple-700 mt-1">{shortenAddress(selectedClaimDetail.claimant)}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <p className="text-[10px] text-indigo-500 font-bold uppercase">Pembagian</p>
                    <p className="text-sm font-bold text-indigo-700 mt-1">{selectedClaimDetail.penaltyPercentage}% : {100 - selectedClaimDetail.penaltyPercentage}%</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Tanggal Kejadian</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">
                      {selectedClaimDetail.date ? new Date(selectedClaimDetail.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Diklaim Pada</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">
                      {new Date(selectedClaimDetail.claimedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Jumlah */}
                {selectedClaimDetail.claimantAmount && (
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase mb-2">Distribusi Dana</p>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-slate-500">Pengaju menerima</p>
                        <p className="text-lg font-bold text-emerald-600">{selectedClaimDetail.claimantAmount.toFixed(5)} ETH</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Partner menerima</p>
                        <p className="text-lg font-bold text-slate-600">{selectedClaimDetail.otherAmount.toFixed(5)} ETH</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alasan */}
                {selectedClaimDetail.reason && (
                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-2">📝 Alasan Klaim</p>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-sm text-slate-700 leading-relaxed">{selectedClaimDetail.reason}</p>
                    </div>
                  </div>
                )}

                {/* Bukti */}
                {selectedClaimDetail.evidence && (
                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-2">📎 Bukti Pendukung</p>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      {selectedClaimDetail.evidence.startsWith('data:image') ? (
                        <img 
                          src={selectedClaimDetail.evidence} 
                          alt="Bukti klaim" 
                          className="w-full rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-all"
                          onClick={() => window.open(selectedClaimDetail.evidence, '_blank')}
                        />
                      ) : selectedClaimDetail.evidence.startsWith('data:application/pdf') ? (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                          <div className="p-2 bg-rose-100 rounded-lg">
                            <DocumentTextIcon className="h-6 w-6 text-rose-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700">Dokumen PDF</p>
                            <p className="text-xs text-slate-400">Klik untuk melihat</p>
                          </div>
                          <a 
                            href={selectedClaimDetail.evidence} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-all"
                          >
                            Buka
                          </a>
                        </div>
                      ) : (
                        <a 
                          href={selectedClaimDetail.evidence} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-indigo-600 font-bold hover:underline"
                        >
                          <DocumentTextIcon className="h-4 w-4" /> Lihat Dokumen
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Tipe Klaim */}
                <div className="flex items-center justify-center pt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedClaimDetail.type === 'internal' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedClaimDetail.type === 'internal' ? '🔒 Klaim Internal' : '🤖 Verifikasi AI'}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 rounded-b-2xl">
                <button
                  onClick={() => setSelectedClaimDetail(null)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 rounded-xl font-bold hover:from-slate-200 hover:to-slate-300 transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
