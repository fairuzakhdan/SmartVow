import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SmartVowLogo from '../components/Logo';
import { 
  ShieldCheckIcon, 
  LockClosedIcon, 
  ScaleIcon, 
  SparklesIcon,
  CubeTransparentIcon,
  DocumentCheckIcon,
  BanknotesIcon,
  PhotoIcon,
  CheckBadgeIcon,
  ArrowRightIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  WalletIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  BookOpenIcon,
  EyeIcon,
  CpuChipIcon,
  GlobeAltIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

// Custom hook for scroll animation
const useScrollAnimation = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
};

// Animated Section wrapper
const AnimatedSection: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ 
  children, 
  className = '',
  delay = 0 
}) => {
  const { ref, isVisible } = useScrollAnimation();
  
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)'
      }}
    >
      {children}
    </div>
  );
};

const Home: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const navHeight = 80;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - navHeight,
        behavior: 'smooth'
      });
    }
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { id: 'features', label: 'Fitur' },
    { id: 'vision', label: 'Visi' },
    { id: 'technology', label: 'Teknologi' },
    { id: 'how-it-works', label: 'Cara Kerja' },
    { id: 'whitepaper', label: 'Whitepaper' },
    { id: 'faq', label: 'FAQ' },
  ];

  const features = [
    {
      icon: DocumentCheckIcon,
      title: 'Perjanjian Digital',
      description: 'Buat perjanjian pranikah yang tercatat permanen di blockchain. Tidak bisa diubah atau dihapus oleh siapapun.',
      color: 'from-indigo-500 to-purple-600'
    },
    {
      icon: BanknotesIcon,
      title: 'Brankas Bersama',
      description: 'Kelola aset bersama pasangan dengan transparansi penuh. Setiap transaksi tercatat on-chain.',
      color: 'from-emerald-500 to-teal-600'
    },
    {
      icon: PhotoIcon,
      title: 'NFT Sertifikat',
      description: 'Dapatkan sertifikat pernikahan dalam bentuk NFT yang unik dan tidak bisa dipalsukan.',
      color: 'from-purple-500 to-pink-600'
    },
    {
      icon: ScaleIcon,
      title: 'Klaim Otomatis',
      description: 'Sistem klaim yang adil dengan distribusi otomatis ke brankas pribadi masing-masing pasangan.',
      color: 'from-rose-500 to-orange-600'
    },
    {
      icon: SparklesIcon,
      title: 'AI Advisor',
      description: 'Konsultasi dengan AI untuk membantu menyusun kondisi perjanjian yang sesuai kebutuhan.',
      color: 'from-amber-500 to-yellow-600'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Keamanan Maksimal',
      description: 'Smart contract yang telah diaudit dengan standar keamanan tinggi. Dana Anda aman.',
      color: 'from-cyan-500 to-blue-600'
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Hubungkan Wallet',
      description: 'Koneksikan wallet crypto Anda (MetaMask, Coinbase Wallet, dll) ke platform SmartVow.',
      icon: WalletIcon
    },
    {
      step: 2,
      title: 'Buat Perjanjian',
      description: 'Isi detail perjanjian pranikah dengan bantuan AI untuk hasil yang optimal.',
      icon: DocumentTextIcon
    },
    {
      step: 3,
      title: 'Tanda Tangan Digital',
      description: 'Kedua pasangan menandatangani perjanjian secara digital melalui wallet masing-masing.',
      icon: CheckCircleIcon
    },
    {
      step: 4,
      title: 'Tercatat di Blockchain',
      description: 'Perjanjian tercatat permanen di Base L2 dan NFT sertifikat diterbitkan.',
      icon: CubeTransparentIcon
    }
  ];

  const technologies = [
    {
      icon: CubeTransparentIcon,
      title: 'Base L2 Blockchain',
      description: 'Dibangun di atas Base, Layer 2 Ethereum yang cepat, murah, dan aman. Transaksi instan dengan biaya minimal.'
    },
    {
      icon: LockClosedIcon,
      title: 'Smart Contract',
      description: 'Kontrak pintar yang teraudit dan terverifikasi. Kode sumber terbuka untuk transparansi penuh.'
    },
    {
      icon: PhotoIcon,
      title: 'ERC-721 NFT',
      description: 'Sertifikat pernikahan dalam standar NFT yang diakui secara global dan dapat diverifikasi.'
    },
    {
      icon: CpuChipIcon,
      title: 'IPFS Storage',
      description: 'Penyimpanan terdesentralisasi untuk metadata dan dokumen pendukung yang permanen.'
    },
    {
      icon: SparklesIcon,
      title: 'Gemini AI',
      description: 'Integrasi AI canggih untuk membantu menyusun perjanjian yang komprehensif dan adil.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Multi-Sig Security',
      description: 'Keamanan berlapis dengan sistem multi-signature untuk transaksi penting.'
    }
  ];

  const faqs = [
    {
      question: 'Apa itu SmartVow?',
      answer: 'SmartVow adalah platform perjanjian pranikah berbasis blockchain yang memungkinkan pasangan membuat, menandatangani, dan mengelola perjanjian secara terdesentralisasi dengan keamanan dan transparansi tinggi.'
    },
    {
      question: 'Apakah perjanjian di SmartVow sah secara hukum?',
      answer: 'SmartVow menyediakan bukti digital yang tidak dapat diubah. Untuk keabsahan hukum penuh, kami menyarankan untuk tetap berkonsultasi dengan notaris atau pengacara di yurisdiksi Anda.'
    },
    {
      question: 'Berapa biaya menggunakan SmartVow?',
      answer: 'Biaya utama adalah gas fee di jaringan Base yang sangat terjangkau (biasanya kurang dari $1). Platform tidak memungut biaya tambahan untuk fitur dasar.'
    },
    {
      question: 'Bagaimana jika terjadi sengketa?',
      answer: 'SmartVow memiliki sistem mediator yang dapat ditunjuk oleh kedua belah pihak. Mediator memiliki wewenang untuk memutuskan distribusi escrow sesuai kondisi yang telah disepakati.'
    },
    {
      question: 'Apakah data saya aman?',
      answer: 'Ya, semua data sensitif dienkripsi dan disimpan di IPFS. Hanya pihak yang berwenang yang dapat mengakses detail perjanjian Anda.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-slate-900/95 backdrop-blur-md shadow-lg shadow-indigo-500/10' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <SmartVowLogo className="w-10 h-10" />
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                SmartVow
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="px-4 py-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                >
                  {link.label}
                </button>
              ))}
              <Link
                to="/dashboard"
                className="ml-4 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25"
              >
                Launch App
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900/95 backdrop-blur-md border-t border-slate-800">
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="block w-full text-left px-4 py-3 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  {link.label}
                </button>
              ))}
              <Link
                to="/dashboard"
                className="block w-full text-center px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl mt-4"
              >
                Launch App
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
              <CubeTransparentIcon className="w-5 h-5 text-indigo-400 mr-2" />
              <span className="text-indigo-300 text-sm font-medium">Powered by Base L2 Blockchain</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Perjanjian Pranikah
              <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                On-Chain & Terdesentralisasi
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10">
              SmartVow menghadirkan cara baru mengelola perjanjian pranikah dengan teknologi blockchain. 
              Transparan, aman, dan tidak dapat dimanipulasi.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/dashboard"
                className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 flex items-center"
              >
                Mulai Sekarang
                <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => scrollToSection('whitepaper')}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all duration-200 flex items-center"
              >
                <BookOpenIcon className="w-5 h-5 mr-2" />
                Baca Whitepaper
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '3', label: 'Smart Contracts' },
              { value: 'Base L2', label: 'Network' },
              { value: '<$1', label: 'Gas Fee' },
              { value: '100%', label: 'On-Chain' },
            ].map((stat, index) => (
              <div key={index} className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Fitur Unggulan
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              SmartVow menyediakan berbagai fitur untuk mengelola perjanjian pranikah secara digital dan terdesentralisasi.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <AnimatedSection key={index} delay={index * 100}>
                <div className="group h-full p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-indigo-950/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Visi Kami
              </h2>
              <p className="text-slate-400 mb-6 text-lg">
                SmartVow lahir dari visi untuk membawa transparansi dan keadilan dalam perjanjian pranikah. 
                Dengan teknologi blockchain, kami memastikan setiap kesepakatan tercatat secara permanen dan tidak dapat dimanipulasi.
              </p>
              <div className="space-y-4">
                {[
                  { icon: EyeIcon, text: 'Transparansi penuh dalam setiap transaksi' },
                  { icon: ShieldCheckIcon, text: 'Keamanan data dengan enkripsi tingkat tinggi' },
                  { icon: ScaleIcon, text: 'Keadilan melalui smart contract yang netral' },
                  { icon: GlobeAltIcon, text: 'Aksesibilitas global tanpa batas geografis' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <span className="text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>
            <AnimatedSection delay={200}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
                <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-8">
                  <div className="flex items-center justify-center mb-6">
                    <HeartIcon className="w-20 h-20 text-pink-400" />
                  </div>
                  <blockquote className="text-center">
                    <p className="text-xl text-white italic mb-4">
                      "Membangun kepercayaan dalam pernikahan dengan teknologi yang tidak bisa berbohong"
                    </p>
                    <footer className="text-slate-400">— SmartVow Team</footer>
                  </blockquote>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section id="technology" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Teknologi yang Digunakan
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              SmartVow dibangun dengan teknologi terdepan untuk memastikan keamanan dan performa terbaik.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {technologies.map((tech, index) => (
              <AnimatedSection key={index} delay={index * 100}>
                <div className="h-full p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-cyan-500/50 transition-all duration-300">
                  <tech.icon className="w-10 h-10 text-cyan-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">{tech.title}</h3>
                  <p className="text-slate-400 text-sm">{tech.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-purple-950/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Cara Kerja
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Empat langkah mudah untuk membuat perjanjian pranikah on-chain.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((item, index) => (
              <AnimatedSection key={index} delay={index * 150}>
                <div className="relative h-full">
                  {index < howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-indigo-500 to-transparent z-0" />
                  )}
                  <div className="relative z-10 text-center p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 h-full">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                      {item.step}
                    </div>
                    <item.icon className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400 text-sm">{item.description}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Whitepaper Section */}
      <section id="whitepaper" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Whitepaper
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Pelajari lebih dalam tentang arsitektur, smart contract, dan mekanisme SmartVow.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Contract Overview */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <CubeTransparentIcon className="w-6 h-6 text-indigo-400 mr-3" />
                Smart Contracts
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">SmartVow</span>
                    <span className="text-xs text-slate-400 font-mono">0x00A2...4de</span>
                  </div>
                  <p className="text-slate-400 text-sm">Contract utama untuk perjanjian pranikah, brankas pribadi & bersama, dan sistem klaim.</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">MarriageCertificateNFT</span>
                    <span className="text-xs text-slate-400 font-mono">0x0B14...693</span>
                  </div>
                  <p className="text-slate-400 text-sm">NFT ERC-721 untuk sertifikat pernikahan digital yang unik dan terverifikasi.</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">AssetNFT</span>
                    <span className="text-xs text-slate-400 font-mono">0x6c2F...368</span>
                  </div>
                  <p className="text-slate-400 text-sm">NFT untuk virtualisasi aset digital (Harta Pribadi & Harta Bersama).</p>
                </div>
              </div>
            </div>

            {/* Key Features */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <DocumentTextIcon className="w-6 h-6 text-purple-400 mr-3" />
                Mekanisme Utama
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckBadgeIcon className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium">Dual Vault System</h4>
                    <p className="text-slate-400 text-sm">Brankas Pribadi untuk dana personal dan Brankas Bersama per sertifikat pernikahan.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckBadgeIcon className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium">Escrow Mechanism</h4>
                    <p className="text-slate-400 text-sm">Dana terkunci dalam escrow hingga perjanjian selesai atau ada klaim yang disetujui.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckBadgeIcon className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium">Condition-Based Claims</h4>
                    <p className="text-slate-400 text-sm">Klaim berdasarkan kondisi yang disepakati: Infidelity, KDRT, Financial, atau Custom.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckBadgeIcon className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium">Auto Distribution</h4>
                    <p className="text-slate-400 text-sm">Distribusi otomatis ke brankas pribadi masing-masing sesuai persentase yang disepakati.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Flow Diagram */}
            <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <ArrowRightIcon className="w-6 h-6 text-cyan-400 mr-3" />
                Alur Penggunaan
              </h3>
              <div className="grid md:grid-cols-6 gap-4">
                {[
                  { step: '1', title: 'Mint Certificate', desc: 'Buat sertifikat NFT' },
                  { step: '2', title: 'Deposit', desc: 'Isi brankas pribadi' },
                  { step: '3', title: 'Transfer', desc: 'Ke brankas bersama' },
                  { step: '4', title: 'Create Vow', desc: 'Buat perjanjian' },
                  { step: '5', title: 'Sign & Activate', desc: 'TTD & aktivasi' },
                  { step: '6', title: 'Claim/Resolve', desc: 'Klaim atau selesai' },
                ].map((item, index) => (
                  <div key={index} className="text-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-2 text-white font-bold">
                      {item.step}
                    </div>
                    <h4 className="text-white text-sm font-medium">{item.title}</h4>
                    <p className="text-slate-500 text-xs">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Network Info */}
            <div className="lg:col-span-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl border border-indigo-500/20 p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Network: Base Sepolia Testnet</h3>
                  <p className="text-slate-400">Chain ID: 84532 | RPC: sepolia.base.org</p>
                </div>
                <div className="flex gap-4">
                  <a
                    href="https://sepolia.basescan.org/address/0x00A263B85F7212BaBF0C1B1A542098D936bD14de"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium rounded-xl transition-all flex items-center"
                  >
                    <EyeIcon className="w-5 h-5 mr-2" />
                    View on Basescan
                  </a>
                  <a
                    href="https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all flex items-center"
                  >
                    <BanknotesIcon className="w-5 h-5 mr-2" />
                    Get Testnet ETH
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Pertanyaan Umum
            </h2>
            <p className="text-slate-400">
              Temukan jawaban untuk pertanyaan yang sering diajukan.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                  <span className="text-white font-medium">{faq.question}</span>
                  <ChevronDownIcon
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5">
                    <p className="text-slate-400">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-slate-500 text-sm uppercase tracking-wider mb-4">Dibangun dengan Teknologi Terpercaya</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60">
            {/* Base */}
            <div className="flex items-center space-x-2 text-slate-400">
              <svg className="w-8 h-8" viewBox="0 0 111 111" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H0C2.35281 87.8625 26.0432 110.034 54.921 110.034Z" fill="currentColor"/>
              </svg>
              <span className="font-semibold">Base</span>
            </div>
            {/* Ethereum */}
            <div className="flex items-center space-x-2 text-slate-400">
              <svg className="w-6 h-8" viewBox="0 0 256 417" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M127.961 0L125.166 9.5V285.168L127.961 287.958L255.923 212.32L127.961 0Z" fill="currentColor" fillOpacity="0.6"/>
                <path d="M127.962 0L0 212.32L127.962 287.959V154.158V0Z" fill="currentColor"/>
                <path d="M127.961 312.187L126.386 314.107V412.306L127.961 416.905L255.999 236.587L127.961 312.187Z" fill="currentColor" fillOpacity="0.6"/>
                <path d="M127.962 416.905V312.187L0 236.587L127.962 416.905Z" fill="currentColor"/>
              </svg>
              <span className="font-semibold">Ethereum</span>
            </div>
            {/* IPFS */}
            <div className="flex items-center space-x-2 text-slate-400">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L1.608 6v12L12 24l10.392-6V6L12 0zm-1.073 1.445h.001a1.8 1.8 0 0 0 2.138 0l7.534 4.35a1.794 1.794 0 0 0 0 .403l-7.535 4.35a1.8 1.8 0 0 0-2.137 0l-7.536-4.35a1.795 1.795 0 0 0 0-.402l7.535-4.35zm-9.194 5.478l7.535 4.35a1.794 1.794 0 0 0 1.07 1.852v8.7a1.795 1.795 0 0 0-.347.202l-7.536-4.35a1.795 1.795 0 0 0-1.069-1.852v-8.7c.124-.06.242-.132.347-.202zm20.534 0a1.8 1.8 0 0 0 .348.202v8.7a1.794 1.794 0 0 0-1.07 1.852l-7.535 4.35a1.8 1.8 0 0 0-.348-.202v-8.7a1.794 1.794 0 0 0 1.07-1.852l7.535-4.35z"/>
              </svg>
              <span className="font-semibold">IPFS</span>
            </div>
            {/* Gemini */}
            <div className="flex items-center space-x-2 text-slate-400">
              <SparklesIcon className="w-8 h-8" />
              <span className="font-semibold">Gemini AI</span>
            </div>
            {/* Solidity */}
            <div className="flex items-center space-x-2 text-slate-400">
              <svg className="w-6 h-8" viewBox="0 0 520 520" fill="currentColor">
                <path d="M260.5 0L130.25 225H0L130.25 0H260.5Z" fillOpacity="0.45"/>
                <path d="M260.5 0L390.75 225H260.5L130.25 225L260.5 0Z" fillOpacity="0.6"/>
                <path d="M260.5 520L130.25 295H0L130.25 520H260.5Z" fillOpacity="0.8"/>
                <path d="M260.5 520L390.75 295H260.5L130.25 295L260.5 520Z" fillOpacity="0.45"/>
                <path d="M520 225H389.75L259.5 0H389.75L520 225Z" fillOpacity="0.45"/>
                <path d="M520 295H389.75L259.5 520H389.75L520 295Z" fillOpacity="0.6"/>
              </svg>
              <span className="font-semibold">Solidity</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm rounded-3xl border border-indigo-500/20 p-12">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Siap Memulai?
              </h2>
              <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
                Buat perjanjian pranikah on-chain pertama Anda sekarang. Transparan, aman, dan tidak dapat dimanipulasi.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/dashboard"
                  className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 flex items-center"
                >
                  Launch App
                  <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="https://sepolia.basescan.org/address/0x00A263B85F7212BaBF0C1B1A542098D936bD14de"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all duration-200 flex items-center"
                >
                  <EyeIcon className="w-5 h-5 mr-2" />
                  View Contract
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <SmartVowLogo className="w-10 h-10" />
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  SmartVow
                </span>
              </div>
              <p className="text-slate-400 mb-6 max-w-md">
                Platform perjanjian pranikah berbasis blockchain pertama di Indonesia. 
                Transparan, aman, dan tidak dapat dimanipulasi.
              </p>
              <div className="flex items-center space-x-4">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li><button onClick={() => scrollToSection('features')} className="text-slate-400 hover:text-white transition-colors">Fitur</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="text-slate-400 hover:text-white transition-colors">Cara Kerja</button></li>
                <li><button onClick={() => scrollToSection('whitepaper')} className="text-slate-400 hover:text-white transition-colors">Whitepaper</button></li>
                <li><button onClick={() => scrollToSection('faq')} className="text-slate-400 hover:text-white transition-colors">FAQ</button></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><a href="https://sepolia.basescan.org/address/0x00A263B85F7212BaBF0C1B1A542098D936bD14de" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">Smart Contract</a></li>
                <li><a href="https://docs.base.org" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">Base Docs</a></li>
                <li><a href="https://www.coinbase.com/faucets/base-ethereum-goerli-faucet" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">Testnet Faucet</a></li>
                <li><Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">Launch App</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-6 text-slate-500 text-sm">
                <span>Built on Base L2</span>
                <span>•</span>
                <span>Powered by Gemini AI</span>
              </div>
              <p className="text-slate-500 text-sm">© 2026 SmartVow. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
