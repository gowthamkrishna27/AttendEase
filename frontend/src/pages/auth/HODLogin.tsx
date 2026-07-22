import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { LoginLayout } from '../../components/layout/LoginLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export default function HODLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password, 'hod');
      navigate('/hod');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginLayout
      title="HOD Login"
      subtitle="Department head oversight portal"
      icon={<ShieldCheck size={24} className="text-white" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="hod@college.edu"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-[#111111]">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-2.5 pr-11 text-[15px] text-[#111111] bg-white border border-[#E5E7EB] rounded-xl outline-none transition-all duration-150 placeholder:text-[#9CA3AF] focus:border-[#111111] focus:ring-1 focus:ring-[#111111]/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-[13px] text-danger">{error}</p>
        )}

        <Button type="submit" size="lg" fullWidth loading={isLoading} className="mt-2">
          Sign In
        </Button>

        {/* Demo hint */}
        <div className="bg-[#F9FAFB] rounded-xl px-4 py-3 border border-[#E5E7EB]">
          <p className="text-[12px] font-medium text-[#6B7280] mb-1">Demo credentials</p>
          <p className="text-[12px] text-[#9CA3AF]">Email: <span className="text-[#111111] font-medium">hod.cs@college.edu</span></p>
          <p className="text-[12px] text-[#9CA3AF]">Password: <span className="text-[#111111] font-medium">hod123</span></p>
        </div>
      </form>
    </LoginLayout>
  );
}
