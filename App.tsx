
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './views/Home';
import Dashboard from './views/Dashboard';
import Generator from './views/Generator';
import AIAdvisor from './views/AIAdvisor';
import AssetCreator from './views/AssetCreator';
import Vault from './views/Vault';
import History from './views/History';
import CertificateView from './views/CertificateView';
import SmartVowLogo from './components/Logo';
import WalletButton from './components/WalletButton';
import { Web3Provider } from './contexts/Web3Context';
import { 
  Squares2X2Icon, 
  DocumentPlusIcon, 
  ScaleIcon, 
  SparklesIcon,
  Bars3Icon,
  XMarkIcon,
  CircleStackIcon,
  IdentificationIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  return (
    <Web3Provider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/generator" element={<Generator />} />
            <Route path="/ai-advisor" element={<AIAdvisor />} />
            <Route path="/asset-creator" element={<AssetCreator />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/history" element={<History />} />
            <Route path="/certificate" element={<CertificateView />} />
          </Routes>
        </Layout>
      </Router>
    </Web3Provider>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  if (isHome) return <>{children}</>;

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Squares2X2Icon },
    { name: 'Smart Prenup', path: '/generator', icon: DocumentPlusIcon },
    { name: 'AI Mediator', path: '/ai-advisor', icon: ScaleIcon },
    { name: 'Asset Virtualizer', path: '/asset-creator', icon: SparklesIcon },
    { name: 'Marriage Certificate', path: '/certificate', icon: IdentificationIcon, isFeatured: true },
    { name: 'Shared Vault', path: '/vault', icon: CircleStackIcon },
    { name: 'Riwayat', path: '/history', icon: ClockIcon },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-md lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/60 transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-inner border border-indigo-100/50">
              <SmartVowLogo className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xl font-bold font-serif text-slate-900 block leading-none tracking-tight">SmartVow</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 block">Base Protocol</span>
            </div>
          </div>

          <nav className="flex-1 px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center justify-between px-4 py-3.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive 
                      ? 'bg-slate-900 text-white shadow-lg' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    {item.name}
                  </div>
                  {item.isFeatured && !isActive && (
                    <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-indigo-100 uppercase tracking-tighter">NFT</span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-6">
            <WalletButton />
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex lg:hidden items-center justify-between h-16 px-6 bg-white border-b border-slate-200 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600">
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <SmartVowLogo className="w-6 h-6" />
            <span className="text-xl font-bold font-serif text-indigo-600">SmartVow</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200"></div>
        </header>

        <main className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-7xl mx-auto p-6 md:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
