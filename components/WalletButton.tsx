import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { WalletIcon, ArrowRightOnRectangleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const WalletButton: React.FC = () => {
  const { isConnected, isConnecting, account, error, connectWallet, disconnectWallet, switchToBase, shortenAddress } = useWeb3();
  const [showMenu, setShowMenu] = useState(false);

  const handleConnect = async () => {
    try {
      await connectWallet();
      await switchToBase(true); // Switch to Base Sepolia
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-2">
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <WalletIcon className="h-4 w-4" />
              Connect Wallet
            </>
          )}
        </button>
        {error && (
          <div className="flex items-center gap-2 text-rose-500 text-[10px] bg-rose-50 p-2 rounded-lg">
            <ExclamationCircleIcon className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all"
      >
        <div className="flex items-center gap-3">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${account}`}
            className="w-10 h-10 rounded-xl bg-indigo-100"
            alt="avatar"
          />
          <div className="flex-1 text-left overflow-hidden">
            <p className="text-[10px] font-black text-slate-900 uppercase">Connected</p>
            <p className="text-[10px] text-indigo-500 font-mono font-bold truncate">
              {account ? shortenAddress(account) : ''}
            </p>
          </div>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </div>
      </button>

      {showMenu && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
          <button
            onClick={async () => {
              await switchToBase(true);
              setShowMenu(false);
            }}
            className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all border-b border-slate-100"
          >
            Switch to Base Sepolia
          </button>
          <button
            onClick={() => {
              disconnectWallet();
              setShowMenu(false);
            }}
            className="w-full px-4 py-3 text-left text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all flex items-center gap-2"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletButton;
