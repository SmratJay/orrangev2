'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { 
  X, ArrowUpRight, Wallet, Loader2, CheckCircle2, AlertCircle,
  Copy, ExternalLink
} from 'lucide-react';
import { ethers } from 'ethers';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string | null;
}

// USDC Contract ABI (minimal for transfer)
const USDC_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

// Sepolia USDC contract address
const USDC_CONTRACT_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

export function WithdrawModal({ isOpen, onClose, walletAddress }: WithdrawModalProps) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get embedded wallet
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');

  // Fetch USDC balance
  useEffect(() => {
    if (!isOpen || !embeddedWallet) return;
    
    const fetchBalance = async () => {
      try {
        const provider = await embeddedWallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        const usdcContract = new ethers.Contract(USDC_CONTRACT_SEPOLIA, USDC_ABI, ethersProvider);
        
        const rawBalance = await usdcContract.balanceOf(embeddedWallet.address);
        const decimals = await usdcContract.decimals();
        const formatted = ethers.formatUnits(rawBalance, decimals);
        
        setBalance(parseFloat(formatted).toFixed(2));
      } catch (err) {
        console.error('Failed to fetch balance:', err);
        setBalance('0.00');
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [isOpen, embeddedWallet]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDestinationAddress('');
      setStatus('idle');
      setErrorMessage('');
      setTxHash(null);
    }
  }, [isOpen]);

  const handleMaxAmount = () => {
    if (balance) setAmount(balance);
  };

  const validateAddress = (addr: string) => {
    try {
      ethers.getAddress(addr);
      return true;
    } catch {
      return false;
    }
  };

  const handleWithdraw = async () => {
    if (!embeddedWallet || !amount || !destinationAddress) return;

    // Validation
    if (!validateAddress(destinationAddress)) {
      setStatus('error');
      setErrorMessage('Invalid destination address');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setStatus('error');
      setErrorMessage('Invalid amount');
      return;
    }

    if (balance && numAmount > parseFloat(balance)) {
      setStatus('error');
      setErrorMessage('Insufficient balance');
      return;
    }

    setLoading(true);
    setStatus('loading');

    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      
      const usdcContract = new ethers.Contract(USDC_CONTRACT_SEPOLIA, USDC_ABI, signer);
      
      // Convert amount to USDC decimals (6)
      const amountInUnits = ethers.parseUnits(amount, 6);
      
      // Execute transfer
      const tx = await usdcContract.transfer(destinationAddress, amountInUnits);
      
      setTxHash(tx.hash);
      
      // Wait for confirmation (but don't block UI)
      tx.wait().then(() => {
        setStatus('success');
        // Refresh balance
        usdcContract.balanceOf(embeddedWallet.address).then((raw: any) => {
          setBalance(ethers.formatUnits(raw, 6));
        });
      }).catch((err: any) => {
        console.error('Transaction failed:', err);
        setStatus('error');
        setErrorMessage('Transaction failed. Please try again.');
      });

    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to execute withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const copyTxHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={status !== 'loading' ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(15,16,18,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#FF7A1A,#FF8F3A)' }}
            >
              <ArrowUpRight className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Withdraw USDC</h3>
              <p className="text-xs text-muted-foreground">Send funds to any address</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={status === 'loading'}
            className="p-2 rounded-lg hover:bg-white/5 transition disabled:opacity-50"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Balance Display */}
          <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Available Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{balance !== null ? balance : '—'}</span>
              <span className="text-sm text-muted-foreground">USDC</span>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-1">Sepolia Testnet</p>
          </div>

          {status === 'success' ? (
            // Success State
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Withdrawal Initiated!</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {amount} USDC is being sent to<br />
                <span className="font-mono text-xs">{destinationAddress.slice(0, 6)}...{destinationAddress.slice(-4)}</span>
              </p>
              {txHash && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <code className="text-xs font-mono text-muted-foreground bg-black/30 px-2 py-1 rounded">
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </code>
                  <button 
                    onClick={copyTxHash}
                    className="p-1.5 rounded hover:bg-white/10 transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-white/10 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                </div>
              )}
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#FF7A1A,#FF8F3A)' }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Amount Input */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Amount to Withdraw
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={status === 'loading'}
                    className="w-full px-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition disabled:opacity-50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">USDC</span>
                    <button
                      onClick={handleMaxAmount}
                      disabled={status === 'loading'}
                      className="text-xs px-2 py-1 rounded bg-white/10 text-orange-400 hover:bg-white/15 transition disabled:opacity-50"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Destination Address */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Destination Address
                </label>
                <div className="relative">
                  <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    placeholder="0x..."
                    disabled={status === 'loading'}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition font-mono text-sm disabled:opacity-50"
                  />
                </div>
                <p className="text-xs text-muted-foreground/60 mt-1.5">
                  Supports any Ethereum address on Sepolia
                </p>
              </div>

              {/* Error Message */}
              {status === 'error' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-400">{errorMessage}</p>
                </div>
              )}

              {/* Execute Button */}
              <button
                onClick={handleWithdraw}
                disabled={loading || !amount || !destinationAddress}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#FF7A1A,#FF8F3A)' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4" />
                    Execute Withdrawal
                  </>
                )}
              </button>

              {/* Loading State Info */}
              {status === 'loading' && (
                <p className="text-xs text-center text-muted-foreground">
                  Confirm the transaction in your wallet...
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
