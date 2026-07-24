import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

        {/* Demo Faculty Cards */}
        <div style={{ marginTop: 4 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Quick Login — Faculty</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              {
                name: 'A. Aswini Priyanka',
                email: 'aapriyanka@srkrec.ac.in',
                dept: 'CSD',
                designation: 'Assistant Professor',
                photo: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1339.jpg',
                color: '#F97316',
                bg: '#FFF7ED',
                border: '#FED7AA',
              },
              {
                name: 'N. Navya',
                email: 'navyanallaparaju@srkrec.ac.in',
                dept: 'CSIT',
                designation: 'Assistant Professor',
                photo: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1259.jpg',
                color: '#6366F1',
                bg: '#EEF2FF',
                border: '#C7D2FE',
              },
            ].map(f => (
              <button
                key={f.email}
                type="button"
                onClick={() => { setEmail(f.email); setPassword('faculty123'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: f.bg, border: `1.5px solid ${f.border}`,
                  borderRadius: 14, padding: '10px 14px',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'box-shadow 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <img
                  src={f.photo}
                  alt={f.name}
                  style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: `2px solid ${f.color}` }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</p>
                  <p style={{ fontSize: 11, color: '#6B7280', margin: '1px 0 0' }}>{f.designation} · {f.dept}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: f.color, background: '#fff', border: `1px solid ${f.border}`, borderRadius: 20, padding: '3px 8px', flexShrink: 0 }}>
                  Click to fill
                </span>
              </button>
            ))}
            <p style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', margin: '4px 0 0' }}>Password: <strong style={{ color: '#374151' }}>faculty123</strong> for all faculty</p>
          </div>
        </div>
      </form>
    </LoginLayout>
  );
}
