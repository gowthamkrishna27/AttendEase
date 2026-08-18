import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier]     = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [isLoading, setIsLoading]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    try {
      await login(identifier.trim(), password, 'admin');
      navigate('/admin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f5f7] flex flex-col items-center justify-center p-4 font-sans antialiased text-[#1f2937]">
      {/* Top Emblem & Title */}
      <div className="flex flex-col items-center text-center mb-6">
        <img
          src={logo}
          alt="AttendEase Logo"
          className="w-12 h-12 object-contain mb-3 drop-shadow-xs"
        />
        <h1 className="text-[20px] font-semibold text-[#18181b] tracking-tight">
          Login to AttendEase
        </h1>
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[450px] bg-white rounded-xl px-9 py-10 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border border-slate-100/80"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Email / Identifier */}
          <div>
            <input
              type="text"
              placeholder="jane@example.com"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              autoComplete="username"
              className="w-full h-[42px] px-3.5 bg-[#edf0f2] text-[#1f2937] placeholder:text-[#88929e] text-[13.5px] rounded-[7px] outline-none border border-transparent focus:border-slate-300 focus:bg-white transition-all font-normal"
            />
          </div>

          {/* Password */}
          <div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="•••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full h-[42px] pl-3.5 pr-14 bg-[#edf0f2] text-[#1f2937] placeholder:text-[#88929e] text-[13.5px] rounded-[7px] outline-none border border-transparent focus:border-slate-300 focus:bg-white transition-all font-normal tracking-wide"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 text-[12px] font-medium text-[#717b88] hover:text-[#18181b] transition-colors cursor-pointer"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={() => alert('Please contact the System Administrator to reset your admin credentials.')}
              className="text-[12px] text-[#717b88] hover:text-[#18181b] transition-colors cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 font-medium">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[42px] bg-[#18181b] hover:bg-[#27272a] active:bg-[#09090b] text-white text-[13.5px] font-semibold rounded-[7px] transition-all duration-150 cursor-pointer disabled:opacity-70 flex items-center justify-center shadow-xs mt-1"
          >
            {isLoading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
            ) : (
              'Login'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
