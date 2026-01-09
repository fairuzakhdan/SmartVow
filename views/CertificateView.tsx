import React, { useState, useEffect } from 'react';
import { generateCertificateVows, generateCertificateSeal, generateCertificateNFTImage } from '../services/geminiService';
import { createCertificateMetadata } from '../services/ipfsService';
import { useWeb3 } from '../contexts/Web3Context';
import { certificateNFTService } from '../services/web3Service';
import { 
  SparklesIcon, 
  ArrowPathIcon, 
  ShieldCheckIcon, 
  IdentificationIcon,
  DocumentCheckIcon,
  QrCodeIcon,
  GlobeAltIcon,
  ExclamationCircleIcon,
  WalletIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

// Certificate Status
type CertificateStatus = 'idle' | 'creating' | 'pending_partner' | 'pending_sign' | 'active' | 'disputed' | 'divorced';

interface PendingCertificate {
  id: string;
  partnerA: { name: string; address: string };
  partnerB: { name: string; address: string };
  vows: string;
  sealUrl: string | null;
  nftImageUrl: string | null;
  status: CertificateStatus;
  createdAt: number;
  tokenIdA?: number;
  tokenIdB?: number;
  txHash?: string;
  metadataURI?: string;
}

const CertificateView: React.FC = () => {
  const { isConnected, account, shortenAddress } = useWeb3();
  
  // States
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [minting, setMinting] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [uploadingIPFS, setUploadingIPFS] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form data
  const [partnerAName, setPartnerAName] = useState('');
  const [partnerBName, setPartnerBName] = useState('');
  const [partnerBAddress, setPartnerBAddress] = useState('');
  const [customVows, setCustomVows] = useState('');
  
  // Certificate data
  const [certificate, setCertificate] = useState<PendingCertificate | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingCertificate[]>([]);
  
  // Fetch certificates from blockchain and merge with localStorage
  useEffect(() => {
    const loadCertificates = async () => {
      if (!account) return;
      
      setSyncing(true);
      
      try {
        // 1. Connect to contract
        await certificateNFTService.connect();
        
        // 2. Fetch on-chain certificates for this user
        const tokenIds = await certificateNFTService.getUserCertificates(account);
        console.log('On-chain certificates:', tokenIds);
        
        // 3. If user has on-chain certificates, fetch details
        if (tokenIds.length > 0) {
          // Get the latest certificate (highest tokenId)
          const latestTokenId = Math.max(...tokenIds);
          const onChainCert = await certificateNFTService.getCertificate(latestTokenId);
          
          console.log('On-chain certificate data:', onChainCert);
          
          // Convert on-chain data to PendingCertificate format
          const activeCert: PendingCertificate = {
            id: `onchain_${latestTokenId}`,
            partnerA: { 
              name: onChainCert.partnerAName, 
              address: onChainCert.partnerA 
            },
            partnerB: { 
              name: onChainCert.partnerBName, 
              address: onChainCert.partnerB 
            },
            vows: onChainCert.vows,
            sealUrl: null,
            nftImageUrl: null, // Will be loaded from metadataURI if needed
            status: 'active',
            createdAt: Number(onChainCert.mintedAt) * 1000, // Convert to milliseconds
            tokenIdA: latestTokenId,
            metadataURI: onChainCert.metadataURI
          };
          
          // Try to get NFT image from metadata
          if (onChainCert.metadataURI) {
            try {
              const metadataUrl = onChainCert.metadataURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
              const response = await fetch(metadataUrl);
              const metadata = await response.json();
              if (metadata.image) {
                activeCert.nftImageUrl = metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
              }
            } catch (e) {
              console.log('Could not fetch metadata image:', e);
            }
          }
          
          setCertificate(activeCert);
          setCurrentStep(4);
          
          // Update localStorage with on-chain data (as cache)
          const stored = localStorage.getItem('smartvow_certificates');
          const certs: PendingCertificate[] = stored ? JSON.parse(stored) : [];
          const existingIndex = certs.findIndex(c => 
            c.tokenIdA === latestTokenId || 
            (c.partnerA.address.toLowerCase() === onChainCert.partnerA.toLowerCase() &&
             c.partnerB.address.toLowerCase() === onChainCert.partnerB.toLowerCase() &&
             c.status === 'active')
          );
          
          if (existingIndex === -1) {
            certs.push(activeCert);
          } else {
            certs[existingIndex] = activeCert;
          }
          localStorage.setItem('smartvow_certificates', JSON.stringify(certs));
          
          console.log('Certificate synced from blockchain');
          return; // Don't check localStorage for pending if we have active cert
        }
        
        // 4. If no on-chain cert, check localStorage for pending certificates
        const stored = localStorage.getItem('smartvow_certificates');
        if (stored) {
          const certs: PendingCertificate[] = JSON.parse(stored);
          
          // Find invites where current user is partnerB and status is pending
          const invites = certs.filter(c => 
            c.partnerB.address.toLowerCase() === account.toLowerCase() && 
            c.status === 'pending_partner'
          );
          setPendingInvites(invites);
          
          // Find pending certificate for current user (not yet minted)
          const pending = certs.find(c => 
            (c.partnerA.address.toLowerCase() === account.toLowerCase() || 
             c.partnerB.address.toLowerCase() === account.toLowerCase()) &&
            (c.status === 'pending_partner' || c.status === 'pending_sign')
          );
          
          if (pending) {
            setCertificate(pending);
            setCurrentStep(pending.status === 'pending_sign' ? 3 : 2);
          }
        }
        
      } catch (err) {
        console.error('Error loading certificates:', err);
        // Fallback to localStorage only
        const stored = localStorage.getItem('smartvow_certificates');
        if (stored) {
          const certs: PendingCertificate[] = JSON.parse(stored);
          const invites = certs.filter(c => 
            c.partnerB.address.toLowerCase() === account.toLowerCase() && 
            c.status === 'pending_partner'
          );
          setPendingInvites(invites);
          
          const active = certs.find(c => 
            (c.partnerA.address.toLowerCase() === account.toLowerCase() || 
             c.partnerB.address.toLowerCase() === account.toLowerCase()) &&
            (c.status === 'active' || c.status === 'pending_sign')
          );
          if (active) {
            setCertificate(active);
            setCurrentStep(active.status === 'pending_sign' ? 3 : 4);
          }
        }
      } finally {
        setSyncing(false);
      }
    };
    
    loadCertificates();
  }, [account]);

  // Step 1: Create Certificate (Partner A)
  const handleCreateCertificate = async () => {
    if (!isConnected || !account) {
      setError("Hubungkan wallet terlebih dahulu");
      return;
    }
    if (!partnerAName || !partnerBName || !partnerBAddress) {
      setError("Lengkapi semua data");
      return;
    }
    if (partnerBAddress.toLowerCase() === account.toLowerCase()) {
      setError("Tidak bisa membuat sertifikat dengan diri sendiri");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Generate vows and seal with AI
      const vowsPrompt = customVows || "Kami berjanji untuk setia, transparan dalam keuangan, dan saling melindungi.";
      const [vowResult, sealResult] = await Promise.all([
        generateCertificateVows(vowsPrompt),
        generateCertificateSeal()
      ]);

      const newCert: PendingCertificate = {
        id: `cert_${Date.now()}`,
        partnerA: { name: partnerAName, address: account },
        partnerB: { name: partnerBName, address: partnerBAddress },
        vows: vowResult || vowsPrompt,
        sealUrl: null, // Don't store in localStorage (too large)
        nftImageUrl: null,
        status: 'pending_partner',
        createdAt: Date.now()
      };

      // Save to localStorage (without seal image)
      const stored = localStorage.getItem('smartvow_certificates');
      const certs: PendingCertificate[] = stored ? JSON.parse(stored) : [];
      certs.push(newCert);
      localStorage.setItem('smartvow_certificates', JSON.stringify(certs));

      // Set seal for display only (not saved)
      setCertificate({ ...newCert, sealUrl: sealResult });

      setCertificate(newCert);
      setCurrentStep(2);
      setSuccess("Undangan sertifikat berhasil dibuat! Menunggu pasangan untuk menyetujui.");
    } catch (err: any) {
      setError(err.message || "Gagal membuat sertifikat");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Partner B accepts invitation
  const handleAcceptInvite = async (cert: PendingCertificate) => {
    setLoading(true);
    setError(null);
    
    try {
      // Update certificate status
      const stored = localStorage.getItem('smartvow_certificates');
      const certs: PendingCertificate[] = stored ? JSON.parse(stored) : [];
      const index = certs.findIndex(c => c.id === cert.id);
      if (index !== -1) {
        certs[index].status = 'pending_sign';
        localStorage.setItem('smartvow_certificates', JSON.stringify(certs));
      }

      setCertificate({ ...cert, status: 'pending_sign' });
      setPendingInvites(prev => prev.filter(p => p.id !== cert.id));
      setCurrentStep(3);
      setSuccess("Undangan diterima! Lanjutkan untuk menandatangani sertifikat.");
    } catch (err: any) {
      setError(err.message || "Gagal menerima undangan");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Both partners sign and mint
  const handleSignAndMint = async () => {
    if (!certificate || !isConnected || !account) return;

    setMinting(true);
    setError(null);

    try {
      await certificateNFTService.connect();
      
      // Step 1: Generate NFT image
      setGeneratingImage(true);
      console.log('Generating certificate NFT image...');
      const nftImage = await generateCertificateNFTImage(
        certificate.partnerA.name,
        certificate.partnerB.name
      );
      setGeneratingImage(false);
      
      // Update certificate with image
      setCertificate(prev => prev ? { ...prev, nftImageUrl: nftImage } : null);

      // Step 2: Upload to IPFS and create metadata
      setUploadingIPFS(true);
      console.log('Uploading to IPFS...');
      const metadataURI = await createCertificateMetadata(
        nftImage,
        certificate.partnerA.name,
        certificate.partnerB.name,
        certificate.partnerA.address,
        certificate.partnerB.address,
        certificate.vows,
        new Date(certificate.createdAt)
      );
      setUploadingIPFS(false);
      console.log('Metadata URI:', metadataURI);

      const vowId = Date.now();

      // Determine partner address based on who is minting
      // If current user is partnerA, send partnerB address and vice versa
      const isPartnerA = account.toLowerCase() === certificate.partnerA.address.toLowerCase();
      const isPartnerB = account.toLowerCase() === certificate.partnerB.address.toLowerCase();
      
      console.log('Debug - Current account:', account);
      console.log('Debug - Partner A address:', certificate.partnerA.address);
      console.log('Debug - Partner B address:', certificate.partnerB.address);
      console.log('Debug - Is Partner A:', isPartnerA);
      console.log('Debug - Is Partner B:', isPartnerB);
      
      // Validate that the minter is one of the partners
      if (!isPartnerA && !isPartnerB) {
        throw new Error(`Wallet ${account} bukan partner dalam sertifikat ini. Partner A: ${certificate.partnerA.address}, Partner B: ${certificate.partnerB.address}`);
      }
      
      const partnerAddress = isPartnerA ? certificate.partnerB.address : certificate.partnerA.address;
      const partnerAName = isPartnerA ? certificate.partnerA.name : certificate.partnerB.name;
      const partnerBName = isPartnerA ? certificate.partnerB.name : certificate.partnerA.name;
      
      console.log('Debug - Will mint to partner:', partnerAddress);

      // Step 3: Mint certificate
      console.log('Minting certificate NFT...');
      const result = await certificateNFTService.mintCertificate(
        partnerAddress,
        partnerAName,
        partnerBName,
        certificate.vows,
        vowId,
        metadataURI
      );

      // Update certificate
      const updatedCert: PendingCertificate = {
        ...certificate,
        status: 'active',
        tokenIdA: result.tokenId,
        txHash: result.txHash,
        metadataURI: metadataURI,
        nftImageUrl: nftImage
      };

      // Save to localStorage
      const stored = localStorage.getItem('smartvow_certificates');
      const certs: PendingCertificate[] = stored ? JSON.parse(stored) : [];
      const index = certs.findIndex(c => c.id === certificate.id);
      if (index !== -1) {
        certs[index] = updatedCert;
        localStorage.setItem('smartvow_certificates', JSON.stringify(certs));
      }

      setCertificate(updatedCert);
      setCurrentStep(4);
      setSuccess("Sertifikat pernikahan berhasil di-mint ke blockchain!");
    } catch (err: any) {
      console.error('Mint error:', err);
      setError(err.message || "Gagal mint sertifikat");
    } finally {
      setMinting(false);
      setGeneratingImage(false);
      setUploadingIPFS(false);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            currentStep >= step 
              ? 'bg-indigo-600 text-white' 
              : 'bg-slate-100 text-slate-400'
          }`}>
            {currentStep > step ? <CheckCircleIcon className="h-5 w-5" /> : step}
          </div>
          {step < 4 && (
            <div className={`w-12 h-1 rounded ${currentStep > step ? 'bg-indigo-600' : 'bg-slate-100'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // Render pending invites
  const renderPendingInvites = () => {
    if (pendingInvites.length === 0) return null;

    return (
      <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
        <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-4">
          <HeartIcon className="h-5 w-5" />
          Undangan Sertifikat Pernikahan
        </h3>
        {pendingInvites.map((invite) => (
          <div key={invite.id} className="bg-white p-4 rounded-xl border border-amber-100 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900">{invite.partnerA.name}</p>
              <p className="text-xs text-slate-500 font-mono">{shortenAddress(invite.partnerA.address)}</p>
              <p className="text-sm text-slate-600 mt-1">mengundang Anda untuk membuat sertifikat pernikahan</p>
            </div>
            <button
              onClick={() => handleAcceptInvite(invite)}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <CheckCircleIcon className="h-4 w-4" />
              Terima
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 mb-4">
          <IdentificationIcon className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Marriage Certificate</span>
        </div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 tracking-tight">
          Sertifikat Pernikahan <span className="text-indigo-600">On-Chain</span>
        </h1>
        <p className="text-slate-500 mt-2">
          Buat sertifikat pernikahan digital yang tercatat permanen di blockchain Base.
        </p>
      </header>

      {/* Wallet Warning */}
      {!isConnected && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4">
          <WalletIcon className="h-8 w-8 text-amber-500" />
          <div>
            <p className="font-bold text-amber-800">Wallet Belum Terhubung</p>
            <p className="text-sm text-amber-600">Hubungkan wallet Anda untuk membuat atau menerima sertifikat pernikahan.</p>
          </div>
        </div>
      )}

      {/* Syncing Indicator */}
      {isConnected && syncing && (
        <div className="mb-8 p-6 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-4">
          <ArrowPathIcon className="h-8 w-8 text-indigo-500 animate-spin" />
          <div>
            <p className="font-bold text-indigo-800">Menyinkronkan Data</p>
            <p className="text-sm text-indigo-600">Mengambil sertifikat dari blockchain...</p>
          </div>
        </div>
      )}

      {/* Pending Invites */}
      {isConnected && !syncing && renderPendingInvites()}

      {/* Step Indicator */}
      {isConnected && !syncing && renderStepIndicator()}

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
          <ExclamationCircleIcon className="h-5 w-5 text-rose-500" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {isConnected && !syncing && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Form / Status */}
          <div className="lg:col-span-5 space-y-6">
            {/* Step 1: Create Certificate */}
            {currentStep === 1 && (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 rounded-xl">
                    <UserPlusIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Buat Sertifikat Baru</h3>
                    <p className="text-xs text-slate-500">Langkah 1: Isi data pasangan</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nama Anda (Partner A)</label>
                    <input
                      type="text"
                      value={partnerAName}
                      onChange={(e) => setPartnerAName(e.target.value)}
                      placeholder="Nama lengkap..."
                      className="w-full mt-2 p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1 font-mono">{account ? shortenAddress(account) : ''}</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nama Pasangan (Partner B)</label>
                    <input
                      type="text"
                      value={partnerBName}
                      onChange={(e) => setPartnerBName(e.target.value)}
                      placeholder="Nama lengkap pasangan..."
                      className="w-full mt-2 p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Wallet Address Pasangan</label>
                    <input
                      type="text"
                      value={partnerBAddress}
                      onChange={(e) => setPartnerBAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full mt-2 p-4 rounded-xl border border-slate-200 font-mono text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ikrar Pernikahan (Opsional)</label>
                    <textarea
                      value={customVows}
                      onChange={(e) => setCustomVows(e.target.value)}
                      placeholder="Tulis ikrar khusus atau biarkan kosong untuk generate otomatis..."
                      rows={3}
                      className="w-full mt-2 p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateCertificate}
                  disabled={loading || !partnerAName || !partnerBName || !partnerBAddress}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="h-5 w-5" />
                  )}
                  Kirim Undangan
                </button>
              </div>
            )}

            {/* Step 2: Waiting for Partner */}
            {currentStep === 2 && certificate && (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <ClockIcon className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Menunggu Pasangan</h3>
                    <p className="text-xs text-slate-500">Langkah 2: Pasangan harus menyetujui</p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-sm text-amber-800">
                    Undangan telah dikirim ke <span className="font-bold">{certificate.partnerB.name}</span>
                  </p>
                  <p className="text-xs text-amber-600 font-mono mt-1">{certificate.partnerB.address}</p>
                  <p className="text-xs text-amber-700 mt-3">
                    Pasangan Anda harus connect wallet dan menerima undangan untuk melanjutkan.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Sign and Mint */}
            {currentStep === 3 && certificate && (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <ShieldCheckIcon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Tanda Tangan & Mint</h3>
                    <p className="text-xs text-slate-500">Langkah 3: Finalisasi sertifikat</p>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-sm text-emerald-800">
                    Kedua pasangan telah setuju. Klik tombol di bawah untuk mint sertifikat ke blockchain.
                  </p>
                </div>

                <button
                  onClick={handleSignAndMint}
                  disabled={minting}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {minting ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      {generatingImage ? 'Generating Image...' : 
                       uploadingIPFS ? 'Uploading to IPFS...' : 
                       'Minting NFT...'}
                    </>
                  ) : (
                    <>
                      <DocumentCheckIcon className="h-5 w-5" />
                      Mint Sertifikat NFT
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Step 4: Certificate Active */}
            {currentStep === 4 && certificate && (
              <div className="bg-slate-900 p-8 rounded-2xl text-white space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 rounded-xl">
                    <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold">Sertifikat Aktif</h3>
                    <p className="text-xs text-slate-400">Tercatat di blockchain Base</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Token ID', value: certificate.tokenIdA ? `#${certificate.tokenIdA}` : '-' },
                    { label: 'Status', value: 'ACTIVE', color: 'text-emerald-400' },
                    { label: 'Network', value: 'Base Sepolia' },
                    { label: 'Standard', value: 'ERC-721' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-white/10">
                      <span className="text-xs text-slate-400 uppercase">{item.label}</span>
                      <span className={`text-sm font-bold ${item.color || 'text-white'}`}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {certificate.txHash && (
                  <a
                    href={`https://sepolia.basescan.org/tx/${certificate.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 bg-white/10 text-center rounded-xl text-sm font-bold hover:bg-white/20 transition-all"
                  >
                    <GlobeAltIcon className="h-4 w-4 inline mr-2" />
                    Lihat di BaseScan
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Right: Certificate Preview */}
          <div className="lg:col-span-7">
            <div className="bg-white p-8 md:p-12 rounded-2xl border-8 border-slate-50 shadow-xl min-h-[600px] flex flex-col items-center justify-center text-center relative overflow-hidden">
              {/* Decorative corners */}
              <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-indigo-100" />
              <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-indigo-100" />
              <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-indigo-100" />
              <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-indigo-100" />

              {certificate ? (
                <div className="space-y-8 relative z-10">
                  {/* Header */}
                  <div>
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-[0.3em]">SmartVow Protocol</p>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mt-2">
                      Sertifikat Pernikahan Digital
                    </h2>
                  </div>

                  {/* Partners */}
                  <div className="flex items-center justify-center gap-6 md:gap-10">
                    <div className="text-center">
                      <p className="text-xl md:text-2xl font-serif font-bold text-slate-800">{certificate.partnerA.name}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">{shortenAddress(certificate.partnerA.address)}</p>
                      {certificate.status === 'active' && (
                        <span className="inline-block mt-2 px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">
                          ✓ SIGNED
                        </span>
                      )}
                    </div>
                    <div className="text-3xl text-indigo-300 font-serif">&</div>
                    <div className="text-center">
                      <p className="text-xl md:text-2xl font-serif font-bold text-slate-800">{certificate.partnerB.name}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">{shortenAddress(certificate.partnerB.address)}</p>
                      {certificate.status === 'active' && (
                        <span className="inline-block mt-2 px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">
                          ✓ SIGNED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vows */}
                  <div className="max-w-md mx-auto">
                    <p className="text-slate-600 font-serif italic leading-relaxed">
                      "{certificate.vows}"
                    </p>
                  </div>

                  {/* NFT Image Preview */}
                  {certificate.nftImageUrl && (
                    <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden border-4 border-indigo-100 shadow-lg">
                      <img src={certificate.nftImageUrl} alt="NFT Certificate" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Seal */}
                  {certificate.sealUrl && !certificate.nftImageUrl && (
                    <div className="w-24 h-24 mx-auto">
                      <img src={certificate.sealUrl} alt="Seal" className="w-full h-full object-contain" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                    certificate.status === 'active' 
                      ? 'bg-emerald-100 text-emerald-700'
                      : certificate.status === 'pending_partner' || certificate.status === 'pending_sign'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {certificate.status === 'active' && <CheckCircleIcon className="h-4 w-4" />}
                    {(certificate.status === 'pending_partner' || certificate.status === 'pending_sign') && <ClockIcon className="h-4 w-4" />}
                    {certificate.status === 'active' ? 'AKTIF' : 'MENUNGGU'}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-end w-full pt-8 border-t border-slate-100">
                    <div className="text-left">
                      <p className="text-[10px] text-slate-400 uppercase">Tanggal</p>
                      <p className="text-sm font-bold text-slate-700">
                        {new Date(certificate.createdAt).toLocaleDateString('id-ID', { 
                          day: 'numeric', month: 'long', year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase">TX Hash</p>
                      <p className="text-sm font-mono text-indigo-600">
                        {certificate.txHash ? `${certificate.txHash.slice(0, 10)}...` : 'PENDING'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <IdentificationIcon className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-300">Preview Sertifikat</h3>
                  <p className="text-sm text-slate-400">Isi form di sebelah kiri untuk membuat sertifikat</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateView;
