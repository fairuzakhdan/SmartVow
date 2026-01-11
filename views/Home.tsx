import React from 'react';
import { Link } from 'react-router-dom';
import SmartVowLogo from '../components/Logo';
import { 
  ShieldCheckIcon, 
  LockClosedIcon, 
  ScaleIcon, 
  BoltIcon, 
  SparklesIcon,
  CpuChipIcon,
  GlobeAltIcon,
  CubeTransparentIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  BanknotesIcon,
  HeartIcon,
  CheckBadgeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-2xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <SmartVowLogo className="h-7 w-7" variant="light" />
            </div>
            <span className="text-2xl font-black font-serif tracking-tighter">SmartVow</span>
          </div>
          <div className="hidden md:flex items-center gap-10 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <a href="#technology" className="hover:text-indigo-600 transition-colors">Teknologi</a>
            <a href="#features" className="hover:text-indigo-600 transition-colors">Fitur</a>
            <Link to="/dashboard" className="px-7 py-3.5 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95">Buka Dashboard</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-48 pb-32 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-40">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-100 blur-[120px] rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 mb-8">
            <CubeTransparentIcon className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Powered by Base L2</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black font-serif tracking-tight leading-[1.1] mb-6">
            Perjanjian Pranikah
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 bg-clip-text text-transparent">
              On-Chain
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mb-10 leading-relaxed">
            Lindungi masa depan pernikahan Anda dengan smart contract. Transparan, otomatis, dan tidak bisa dimanipulasi.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              to="/generator" 
              className="px-8 py-4 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
            >
              Buat Perjanjian <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link 
              to="/dashboard" 
              className="px-8 py-4 bg-white text-slate-700 rounded-xl font-black text-sm uppercase tracking-widest border-2 border-slate-200 hover:border-slate-300 transition-all flex items-center gap-2"
            >
              Lihat Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <p className="text-4xl font-black text-indigo-600">~$5</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Biaya Pembuatan</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-indigo-600">100%</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">On-Chain</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-indigo-600">Auto</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Eksekusi</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-indigo-600">Base</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">L2 Network</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black font-serif mb-4">Fitur Utama</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Semua yang Anda butuhkan untuk perlindungan pernikahan digital</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-8 bg-white rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6">
                <DocumentCheckIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Smart Contract Perjanjian</h3>
              <p className="text-sm text-slate-500">Buat perjanjian pranikah dengan klausul yang otomatis dieksekusi oleh blockchain.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="p-8 bg-white rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-6">
                <LockClosedIcon className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Escrow Vault</h3>
              <p className="text-sm text-slate-500">Dana terkunci aman di smart contract dan otomatis didistribusikan sesuai klausul.</p>
            </div>
            
            {/* Feature 3 */}
            <div className="p-8 bg-white rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mb-6">
                <SparklesIcon className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Asset NFT Registry</h3>
              <p className="text-sm text-slate-500">Daftarkan aset sebagai NFT dengan status kepemilikan yang jelas dan transparan.</p>
            </div>
            
            {/* Feature 4 */}
            <div className="p-8 bg-white rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-6">
                <CpuChipIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">AI Legal Assistant</h3>
              <p className="text-sm text-slate-500">Gemini AI membantu menyusun klausul yang adil dan mudah dipahami.</p>
            </div>
            
            {/* Feature 5 */}
            <div className="p-8 bg-white rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-6">
                <HeartIcon className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Marriage Certificate NFT</h3>
              <p className="text-sm text-slate-500">Sertifikat pernikahan digital yang permanen dan tidak bisa dipalsukan.</p>
            </div>
            
            {/* Feature 6 */}
            <div className="p-8 bg-white rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                <BoltIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Base L2 Network</h3>
              <p className="text-sm text-slate-500">Transaksi cepat dengan biaya gas minimal di jaringan Base Layer 2.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section id="technology" className="py-32 px-6 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black font-serif mb-4">Teknologi</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Dibangun dengan teknologi blockchain terdepan</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700">
              <CubeTransparentIcon className="h-10 w-10 text-indigo-400 mb-4" />
              <h3 className="text-lg font-bold mb-2">Base L2</h3>
              <p className="text-sm text-slate-400">Layer 2 Ethereum dengan biaya gas minimal dan kecepatan tinggi.</p>
            </div>
            <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700">
              <CpuChipIcon className="h-10 w-10 text-purple-400 mb-4" />
              <h3 className="text-lg font-bold mb-2">Gemini AI</h3>
              <p className="text-sm text-slate-400">AI untuk membantu menyusun klausul dan mediasi netral.</p>
            </div>
            <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700">
              <GlobeAltIcon className="h-10 w-10 text-rose-400 mb-4" />
              <h3 className="text-lg font-bold mb-2">IPFS Storage</h3>
              <p className="text-sm text-slate-400">Penyimpanan metadata terdesentralisasi via Pinata.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-black font-serif mb-6">Siap Melindungi Masa Depan?</h2>
          <p className="text-lg text-indigo-100 mb-10 max-w-2xl mx-auto">
            Buat perjanjian pranikah digital Anda sekarang. Transparan, otomatis, dan terjangkau.
          </p>
          <Link 
            to="/generator" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl"
          >
            Mulai Sekarang <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <SmartVowLogo className="h-5 w-5" variant="light" />
            </div>
            <span className="text-lg font-black font-serif">SmartVow</span>
          </div>
          <p className="text-sm text-slate-500">© 2025 SmartVow. Built on Base.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;