import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, Eye, EyeOff } from 'lucide-react';
import { LoginLayout } from '../../components/layout/LoginLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export default function FacultyLogin() {
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
      await login(email.trim(), password, 'faculty');
      navigate('/faculty');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginLayout
      title="Faculty Login"
      subtitle="Review student attendance requests"
      icon={<BookOpen size={24} className="text-white" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="your.name@college.edu"
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

        <div className="mt-5 pt-4 border-t border-[#F1F5F9] text-center text-[12px] text-[#64748B]">
          <span className="block mb-1.5 text-[#94A3B8]">Need another portal?</span>
          <div className="flex items-center justify-center gap-3">
            <Link to="/login/student" className="text-[#F97316] font-semibold hover:underline">Student Login</Link>
            <span className="text-[#CBD5E1]">·</span>
            <Link to="/login/hod" className="text-[#F97316] font-semibold hover:underline">HOD Login</Link>
            <span className="text-[#CBD5E1]">·</span>
            <Link to="/admin/login" className="text-[#F97316] font-semibold hover:underline">Admin Login</Link>
          </div>
        </div>

      </form>
    </LoginLayout>
  );
}
