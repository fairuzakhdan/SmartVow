
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateAssetSpec, generateAssetImage } from '../services/geminiService';
import { assetNFTService } from '../services/web3Service';
import { createAssetMetadata } from '../services/ipfsService';
import { useWeb3 } from '../contexts/Web3Context';
import { 
  SparklesIcon, 
  RocketLaunchIcon, 
  ShieldCheckIcon, 
  LockClosedIcon,
  PhotoIcon,
  ArrowPathIcon,
  FingerPrintIcon,
  HomeIcon,
  IdentificationIcon,
  CommandLineIcon,
  HeartIcon,
  UserIcon,
  UsersIcon,
  TruckIcon,
  BanknotesIcon,
  GiftIcon
} from '@heroicons/react/24/outline';

// Kategori aset untuk pasangan
const ASSET_CATEGORIES = [
  { id: 'property', name: 'Properti', icon: HomeIcon, examples: 'Rumah, Apartemen, Tanah, Ruko' },
  { id: 'vehicle', name: 'Kendaraan', icon: TruckIcon, examples: 'Mobil, Motor, Sepeda' },
  { id: 'investment', name: 'Investasi', icon: BanknotesIcon, examples: 'Emas, Saham, Deposito, Crypto' },
  { id: 'valuable', name: 'Barang Berharga', icon: GiftIcon, examples: 'Perhiasan, Koleksi, Elektronik' },
];

// Tipe kepemilikan
const OWNERSHIP_TYPES = [
  { id: 'personal', name: 'Harta Pribadi', icon: UserIcon, desc: 'Aset milik saya pribadi (sebelum/di luar pernikahan)' },
  { id: 'joint', name: 'Harta Bersama', icon: UsersIcon, desc: 'Aset yang dimiliki bersama dengan pasangan' },
];

interface AssetSpec {
  name: string;
  symbol: string;
  assetClass: string;
  utility: string;
}

const AssetCreator: React.FC = () => {
  const { account, isConnected, getUserVows, getVow } = useWeb3();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [ownershipType, setOwnershipType] = useState<string>('personal');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [spec, setSpec] = useState<AssetSpec | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isMinted, setIsMinted] = useState(false);
  const [mintStatus, setMintStatus] = useState<string>('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [partnerAddress, setPartnerAddress] = useState<string>('');

  const selectedCategoryData = ASSET_CATEGORIES.find(c => c.id === selectedCategory);
  const selectedOwnership = OWNERSHIP_TYPES.find(o => o.id === ownershipType);

  // Load partner address from active vow OR existing joint assets
  useEffect(() => {
    const loadPartner = async () => {
      if (!account || !isConnected) return;
      
      try {
        // Method 1: Get from SmartVow contracts
        const vowIds = await getUserVows();
        if (vowIds.length > 0) {
          // Get the most recent vow
          const vow = await getVow(vowIds[vowIds.length - 1]);
          // Partner is the other person (not current account)
          const partner = vow.partnerA.toLowerCase() === account.toLowerCase() 
            ? vow.partnerB 
            : vow.partnerA;
          setPartnerAddress(partner);
          console.log('Partner address loaded from SmartVow:', partner);
          return;
        }

        // Method 2: Get from existing joint assets (if no SmartVow found)
        await assetNFTService.connect();
        const myAssets = await assetNFTService.getUserAssets(account);
        
        for (const tokenId of myAssets) {
          try {
            const asset = await assetNFTService.getAsset(tokenId);
            // If this is a joint asset with a partner
            if (Number(asset.ownershipType) === 1 && asset.partner && asset.partner !== '0x0000000000000000000000000000000000000000') {
              setPartnerAddress(asset.partner);
              console.log('Partner address loaded from existing joint asset:', asset.partner);
              return;
            }
          } catch (e) {
            console.error('Failed to check asset:', e);
          }
        }
        
        console.log('No partner found from SmartVow or existing assets');
      } catch (error) {
        console.error('Failed to load partner:', error);
      }
    };
    
    loadPartner();
  }, [account, isConnected]);

  const handleGenerateAsset = async () => {
    if (!prompt.trim() || !selectedCategory) return;
    setLoading(true);
    setImageLoading(true);
    
    // Enhance prompt dengan konteks pranikah
    const enhancedPrompt = `${prompt}. Kategori: ${selectedCategoryData?.name}. Status kepemilikan: ${selectedOwnership?.name} dalam konteks perjanjian pranikah.`;
    
    try {
      const [specResult, imageResult] = await Promise.all([
        generateAssetSpec(enhancedPrompt),
        generateAssetImage(prompt)
      ]);
      
      setSpec(specResult);
      setImageUrl(imageResult);
    } catch (error) {
      console.error("Generation failed", error);
    } finally {
      setLoading(false);
      setImageLoading(false);
    }
  };

  const handleMint = async () => {
    if (!spec || !imageUrl || !isConnected || !account) {
      if (!isConnected) {
        setMintStatus('Silakan connect wallet terlebih dahulu');
      }
      return;
    }
    
    setLoading(true);
    setMintStatus('Menghubungkan ke wallet...');
    
    try {
      await assetNFTService.connect();
      
      setMintStatus('Mengupload ke IPFS...');
      const { metadataURI, imageURI } = await createAssetMetadata(
        imageUrl,
        spec.name,
        spec.symbol,
        spec.assetClass,
        spec.utility,
        account,
        selectedOwnership?.name,  // Pass ownership to IPFS metadata
        selectedCategoryData?.name // Pass category to IPFS metadata
      );
      
      // Convert ipfs:// to gateway URL for display
      const ipfsHash = imageURI.replace('ipfs://', '');
      const imageGatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      
      setMintStatus('Minting NFT ke blockchain... (konfirmasi di wallet)');
      
      // Determine if joint and partner address
      const isJoint = ownershipType === 'joint';
      const partner = isJoint && partnerAddress ? partnerAddress : '0x0000000000000000000000000000000000000000';
      
      console.log('Minting with:', { isJoint, partner, ownershipType });
      
      const result = await assetNFTService.mintAsset(
        spec.name,
        spec.symbol,
        spec.assetClass,
        spec.utility,
        metadataURI,
        isJoint,
        partner
      );
      
      setTxHash(result.txHash);
      setTokenId(result.tokenId);
      
      // Save to localStorage with IPFS gateway URL (small string, not base64)
      const newAsset = {
        id: result.tokenId,
        name: spec.name,
        type: spec.assetClass,
        category: selectedCategoryData?.name,
        ownership: selectedOwnership?.name,
        icon: imageGatewayUrl,
        symbol: spec.symbol,
        isUserGenerated: true,
        date: new Date().toLocaleDateString(),
        txHash: result.txHash,
        tokenId: result.tokenId,
        onChain: true
      };
      const existingAssets = JSON.parse(localStorage.getItem('chainvow_assets') || '[]');
      const trimmedAssets = existingAssets.slice(0, 19); // Keep max 20 items
      localStorage.setItem('chainvow_assets', JSON.stringify([newAsset, ...trimmedAssets]));
      
      setMintStatus('');
      setIsMinted(true);
    } catch (error: any) {
      console.error('Minting failed:', error);
      setMintStatus(`Error: ${error.message || 'Minting gagal'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsMinted(false);
    setSpec(null);
    setImageUrl(null);
    setPrompt('');
    setTxHash(null);
    setTokenId(null);
    setSelectedCategory('');
    setOwnershipType('joint');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-100 pb-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2 py-1 bg-rose-50 text-rose-600 rounded-md border border-rose-100">
            <HeartIcon className="h-3 w-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Inventaris Pranikah</span>
          </div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 tracking-tight leading-none">Daftarkan Aset Bersama</h1>
          <p className="text-slate-400 text-sm max-w-lg mt-2 font-medium">Dokumentasikan harta bawaan & harta bersama sebagai NFT on-chain untuk perlindungan hukum digital.</p>
        </div>
        <div className="flex gap-4 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
           <div className="px-4 py-1 text-center border-r border-slate-100">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Biaya Registrasi</p>
             <p className="text-sm font-bold text-slate-900">0.002 ETH</p>
           </div>
           <div className="px-4 py-1 text-center">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Jaringan</p>
             <p className="text-sm font-bold text-indigo-600">Base L2</p>
           </div>
        </div>
      </div>

      {!isMinted ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Pilih Kategori */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <h2 className="font-bold text-slate-900">Pilih Kategori Aset</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ASSET_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedCategory === cat.id 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <cat.icon className={`h-5 w-5 mb-2 ${selectedCategory === cat.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <p className={`text-xs font-bold ${selectedCategory === cat.id ? 'text-indigo-900' : 'text-slate-700'}`}>{cat.name}</p>
                    <p className="text-[9px] text-slate-400 mt-1">{cat.examples}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Pilih Kepemilikan */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <h2 className="font-bold text-slate-900">Status Kepemilikan</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {OWNERSHIP_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setOwnershipType(type.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      ownershipType === type.id 
                        ? 'border-rose-500 bg-rose-50' 
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <type.icon className={`h-5 w-5 mb-2 ${ownershipType === type.id ? 'text-rose-600' : 'text-slate-400'}`} />
                    <p className={`text-xs font-bold ${ownershipType === type.id ? 'text-rose-900' : 'text-slate-700'}`}>{type.name}</p>
                    <p className="text-[9px] text-slate-400 mt-1">{type.desc}</p>
                  </button>
                ))}
              </div>

              {/* Partner Address Input for Joint Assets */}
              {ownershipType === 'joint' && (
                <div className="mt-4 p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                  <label className="text-[10px] font-bold text-rose-600 uppercase mb-2 block">
                    Alamat Wallet Pasangan
                  </label>
                  <input
                    type="text"
                    value={partnerAddress}
                    onChange={(e) => setPartnerAddress(e.target.value)}
                    placeholder="0x... (otomatis terdeteksi dari perjanjian/aset sebelumnya)"
                    className="w-full p-3 border border-rose-200 rounded-xl font-mono text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none bg-white"
                  />
                  <p className="text-[9px] text-rose-500 mt-1">
                    💡 Alamat ini otomatis terdeteksi dari perjanjian SmartVow atau aset bersama sebelumnya
                  </p>
                </div>
              )}
            </div>

            {/* Step 3: Deskripsi */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <h2 className="font-bold text-slate-900">Deskripsikan Aset</h2>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-auto flex items-center gap-1">
                  <SparklesIcon className="h-3 w-3" /> AI Generate
                </span>
              </div>
              
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-5 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none h-32 text-sm font-medium transition-all placeholder:text-slate-300 leading-relaxed"
                placeholder={selectedCategoryData 
                  ? `Contoh: ${selectedCategoryData.examples.split(',')[0]} di Jakarta, dibeli tahun 2023, luas 120m2...`
                  : 'Pilih kategori aset terlebih dahulu...'
                }
                disabled={!selectedCategory}
              />

              <div className="flex gap-3">
                <div className="flex-1 p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center gap-2">
                  <IdentificationIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Metadata On-Chain</span>
                </div>
                <div className="flex-1 p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center gap-2">
                  <FingerPrintIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Bukti Kepemilikan</span>
                </div>
              </div>
              
              <button 
                onClick={handleGenerateAsset}
                disabled={loading || !prompt.trim() || !selectedCategory}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl disabled:opacity-30 flex items-center justify-center gap-3"
              >
                {loading ? <ArrowPathIcon className="h-5 w-5 animate-spin text-indigo-400" /> : <SparklesIcon className="h-5 w-5 text-indigo-400" />}
                Generate Sertifikat Digital
              </button>
            </div>

            {/* Generated Spec */}
            {spec && (
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-5 animate-in slide-in-from-bottom-5">
                <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                   <h3 className="font-bold text-slate-900">Detail Aset Terverifikasi</h3>
                   <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">
                     <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-0.5">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Nama Aset</p>
                    <p className="text-xs font-bold text-slate-900">{spec.name}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Kategori</p>
                    <p className="text-xs font-bold text-indigo-600">{selectedCategoryData?.name}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Status Kepemilikan</p>
                    <p className="text-xs font-bold text-rose-600">{selectedOwnership?.name}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Jaringan</p>
                    <p className="text-xs font-bold text-slate-400">Base Sepolia</p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Catatan Hukum</p>
                  <p className="text-xs text-amber-800/70 leading-relaxed font-medium">
                    "{spec.utility}"
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Preview Card */}
          <div className="lg:col-span-5 lg:sticky lg:top-8">
            <div className="bg-slate-900 p-5 rounded-[2.5rem] shadow-2xl border border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Sertifikat Preview</span>
                  </div>
                  <LockClosedIcon className="h-3.5 w-3.5 text-white/20" />
                </div>

                <div className="aspect-[4/5] w-full bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner relative">
                  {imageLoading ? (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <ArrowPathIcon className="h-10 w-10 text-rose-500 animate-spin" />
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Generating...</p>
                    </div>
                  ) : imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt="Asset Visual" 
                      className="w-full h-full object-cover animate-in fade-in zoom-in-105 duration-700" 
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-white/10 p-8 text-center">
                      <PhotoIcon className="h-12 w-12" />
                      <p className="text-[9px] font-black uppercase tracking-wide">Pilih kategori & deskripsikan aset untuk generate sertifikat</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 px-2 pb-2 space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="space-y-0.5">
                      <h3 className="text-lg font-bold text-white tracking-tight">{spec?.name || 'Nama Aset'}</h3>
                      <div className="flex items-center gap-2">
                        {selectedOwnership && (
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            ownershipType === 'joint' ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'
                          }`}>
                            {selectedOwnership.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Status</p>
                       <p className="text-[10px] text-emerald-500 font-bold uppercase">{spec ? 'Siap Mint' : 'Menunggu'}</p>
                    </div>
                  </div>

                  {spec && !imageLoading && (
                    <>
                      {mintStatus && (
                        <div className="text-xs text-center text-rose-300 animate-pulse">
                          {mintStatus}
                        </div>
                      )}
                      <button 
                        onClick={handleMint}
                        disabled={loading || !isConnected}
                        className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:from-rose-600 hover:to-pink-600 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {!isConnected ? 'Connect Wallet Dulu' : loading ? 'Minting...' : 'Daftarkan ke Blockchain'}
                      </button>
                    </>
                  )}
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-2">Mengapa perlu didaftarkan?</h4>
              <ul className="text-[10px] text-slate-500 space-y-1.5">
                <li className="flex items-start gap-2">
                  <ShieldCheckIcon className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Bukti kepemilikan yang tidak bisa dimanipulasi</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheckIcon className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Tercatat permanen di blockchain Base</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheckIcon className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Memperjelas status harta bawaan vs bersama</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheckIcon className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Terintegrasi dengan perjanjian SmartVow</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Success Screen */
        <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl text-center space-y-8 animate-in zoom-in duration-700 max-w-2xl mx-auto">
          <div className="relative inline-block">
             <div className="absolute inset-0 bg-rose-500/10 blur-[100px] rounded-full scale-150 animate-pulse"></div>
             <div className="w-48 h-64 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto overflow-hidden border-4 border-white shadow-2xl relative z-10">
                {imageUrl ? (
                  <img src={imageUrl} alt="Final Asset" className="w-full h-full object-cover" />
                ) : (
                  <RocketLaunchIcon className="h-16 w-16 text-white" />
                )}
             </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Aset Berhasil Didaftarkan!</h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
              <span className="font-bold text-slate-700">{spec?.name}</span> telah tercatat sebagai <span className="font-bold text-rose-600">{selectedOwnership?.name}</span> di blockchain.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-center gap-2 font-mono text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              {txHash ? `${txHash.slice(0, 24)}...${txHash.slice(-8)}` : '-'}
            </div>
            {txHash && (
              <a 
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-white px-4 py-2 rounded-lg text-indigo-600 font-bold text-[10px] uppercase tracking-widest shadow-sm border border-slate-100 hover:bg-indigo-50 transition-colors"
              >
                Lihat di BaseScan →
              </a>
            )}
          </div>

          {tokenId && (
            <p className="text-sm text-slate-500">
              Token ID: <span className="font-bold text-slate-700">#{tokenId}</span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
             <button onClick={resetForm} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs uppercase tracking-widest">
               Daftarkan Aset Lain
             </button>
             <Link to="/vault" className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black shadow-xl hover:translate-y-[-2px] transition-all text-xs uppercase tracking-widest">
               Lihat Brankas
             </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetCreator;
