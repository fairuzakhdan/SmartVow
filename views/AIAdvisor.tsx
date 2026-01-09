
import React, { useState, useRef, useEffect } from 'react';
import { getLegalAdvice, generateMediationSummary } from '../services/geminiService';
import { ChatMessage } from '../types';
import { PaperAirplaneIcon, ScaleIcon, DocumentArrowDownIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

const AIAdvisor: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Halo! Saya adalah SmartVow AI Mediator. Saya ahli dalam mediasi kontrak pernikahan digital dan pembagian aset blockchain. Apa yang ingin Anda diskusikan terkait komitmen atau perlindungan aset hari ini?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await getLegalAdvice(userMsg, messages);
      setMessages(prev => [...prev, { role: 'model', content: response || "Maaf, modul mediator sedang mengalami gangguan. Mohon coba sesaat lagi." }]);
    } catch (error) {
      console.error('AI Mediator error:', error);
      setMessages(prev => [...prev, { role: 'model', content: "Terjadi kesalahan pada jaringan. Pastikan API key Gemini sudah dikonfigurasi dengan benar di file .env.local" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (messages.length < 3) {
      alert("Minimal 2 percakapan diperlukan untuk membuat ringkasan.");
      return;
    }
    
    setIsExporting(true);
    try {
      const summary = await generateMediationSummary(messages);
      
      // Create downloadable file
      const blob = new Blob([`RINGKASAN MEDIASI SMARTVOW\n${'='.repeat(50)}\nTanggal: ${new Date().toLocaleDateString('id-ID')}\n\n${summary}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mediasi-smartvow-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert("Gagal membuat ringkasan. Pastikan API key sudah dikonfigurasi.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col max-w-3xl mx-auto animate-in fade-in duration-700">
      <div className="bg-slate-900 rounded-t-[2rem] p-6 flex items-center justify-between text-white shrink-0 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <ScaleIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base tracking-tight">SmartVow AI Mediator</h2>
            <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
              Identity-Based Encryption Active
            </p>
          </div>
        </div>
        <button 
          onClick={handleGenerateSummary}
          disabled={isExporting || messages.length < 3}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-slate-700 disabled:opacity-50"
        >
          {isExporting ? (
            <ArrowPathIcon className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
          ) : (
            <DocumentArrowDownIcon className="h-3.5 w-3.5 text-indigo-400" />
          )}
          Export Log
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 bg-white border-x border-slate-100 space-y-6 scroll-smooth"
      >
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex gap-1.5">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white rounded-b-[2rem] border border-t-0 border-slate-100 shrink-0 shadow-sm">
        <div className="relative">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ketik pesan mediasi atau konsultasi di sini..."
            className="w-full bg-slate-50 border border-slate-200 p-4 pr-14 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-black disabled:opacity-50 transition-all shadow-md active:scale-95"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-center items-center gap-3 mt-4 opacity-40">
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Powered by Gemini Pro</p>
          <div className="h-1 w-1 bg-slate-300 rounded-full"></div>
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">End-to-End Encrypted</p>
        </div>
      </div>
    </div>
  );
};

export default AIAdvisor;
