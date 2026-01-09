
import React from 'react';
import { Link } from 'react-router-dom';
import SmartVowLogo from '../components/Logo';
import { ShieldCheckIcon, LockClosedIcon, ScaleIcon, BoltIcon, LinkIcon, SparklesIcon } from '@heroicons/react/24/outline';

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
            <a href="#features" className="hover:text-indigo-600 transition-colors">Teknologi</a>
            <a href="#vision" className="hover:text-indigo-600 transition-colors">Visi Kami</a>
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg mb-8 border border-slate-200">
            <SmartVowLogo className="h-4 w-4" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">The New Standard of Marriage Security</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-serif font-bold text-slate-900 leading-[0.95] mb-8 tracking-tighter">
            Janji Suci dalam <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-indigo-400 to-rose-400 italic">Kode yang Abadi.</span>
          </h1>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl leading-relaxed font-medium">
            SmartVow mendigitalisasi komitmen pernikahan melalui <span className="text-slate-900 font-bold">Smart Prenup</span>. Amankan aset, lindungi hak, dan bangun masa depan di atas fondasi blockchain yang transparan.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-md">
            <Link to="/generator" className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-indigo-100 hover:scale-[1.02] transition-all text-center">
              Susun Perjanjian
            </Link>
            <Link to="/ai-advisor" className="w-full py-5 bg-white text-slate-900 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] hover:bg-slate-50 transition-all text-center">
              Konsultasi AI
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-6 mb-32">
        <div className="bg-slate-50 rounded-[3.5rem] p-16 grid grid-cols-2 md:grid-cols-4 gap-12 text-center border border-slate-100 shadow-inner">
           <div>
             <p className="text-4xl font-black text-slate-900 mb-2">99.9%</p>
             <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Keamanan Protokol</p>
           </div>
           <div>
             <p className="text-4xl font-black text-slate-900 mb-2">Immutable</p>
             <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Database Janji</p>
           </div>
           <div>
             <p className="text-4xl font-black text-slate-900 mb-2">$0</p>
             <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Biaya Mediasi Legal</p>
           </div>
           <div>
             <p className="text-4xl font-black text-slate-900 mb-2">Real-time</p>
             <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Oracle Monitoring</p>
           </div>
        </div>
      </div>

      {/* Features */}
      <section id="features" className="py-32 bg-slate-900 text-white rounded-t-[5rem] relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-5xl font-bold font-serif italic tracking-tight">Teknologi di Balik Ketenangan.</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base leading-relaxed">SmartVow menggabungkan kearifan hukum tradisional dengan presisi matematis teknologi blockchain.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { 
                title: 'Smart Prenup', 
                desc: 'Kontrak digital yang otomatis mengeksekusi pembagian aset jika terjadi pelanggaran komitmen.',
                icon: BoltIcon,
                color: 'bg-indigo-500'
              },
              { 
                title: 'Escrow Vault', 
                desc: 'Dana bersama dikunci secara kriptografis. Aman dari penarikan sepihak tanpa izin bersama.',
                icon: LockClosedIcon,
                color: 'bg-rose-500'
              },
              { 
                title: 'AI Mediator', 
                desc: 'Asisten cerdas yang membantu menyusun syarat yang adil bagi kedua belah pihak secara objektif.',
                icon: ScaleIcon,
                color: 'bg-indigo-400'
              }
            ].map((f, i) => (
              <div key={i} className="group space-y-6 p-12 rounded-[3rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-500">
                <div className={`w-16 h-16 ${f.color} rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all`}>
                  <f.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-slate-950 text-white border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <SmartVowLogo className="h-8 w-8" />
            <span className="text-2xl font-bold font-serif tracking-tighter">SmartVow</span>
          </div>
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">© 2025 SmartVow Protocol. Built for Base Indonesia Hackathon.</p>
          <div className="flex gap-10 text-[9px] font-black uppercase tracking-widest text-slate-400">
            <a href="#" className="hover:text-indigo-400 transition-colors">Twitter</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Docs</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
