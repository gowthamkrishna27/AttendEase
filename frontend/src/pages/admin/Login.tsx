import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, User, ArrowRight, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import srkrEmblem from '../../assets/srkr-emblem.png';

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
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .admin-login-page {
          min-height: 100vh;
          width: 100%;
          background: #F3F6FB;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Inter','Segoe UI',system-ui,sans-serif;
        }
        .admin-login-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.04), 0 1px 8px rgba(0,0,0,0.02);
          border: 1px solid #EEF2F7;
          padding: 32px 28px;
          box-sizing: border-box;
        }
        @media (max-width: 640px) {
          .admin-login-page {
            padding: 16px 12px;
          }
          .admin-login-card {
            padding: 24px 18px;
            border-radius: 20px;
          }
        }
      `}</style>

      <div className="admin-login-page">
        <motion.div
          className="admin-login-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24 }}>
            <img src={srkrEmblem} alt="SRKR Logo" style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 12 }} />
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Admin Portal</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Smart Attendance Permission System</p>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#F97316', background: 'rgba(249,115,22,0.1)', padding: '2px 7px', borderRadius: 99, border: '1px solid rgba(249,115,22,0.2)' }}>
                v1.1.2.6
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Admin Email
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1', pointerEvents: 'none' }} />
                <input
                  type="email"
                  placeholder="admin@college.edu"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  autoComplete="email"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    height: 46, paddingLeft: 38, paddingRight: 14,
                    fontSize: 14, color: '#1E293B',
                    background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                    borderRadius: 12, outline: 'none',
                    transition: 'all 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 4px rgba(249,115,22,0.08)'; e.target.style.background = '#fff'; }}
                  onBlur={e  => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    height: 46, paddingLeft: 38, paddingRight: 42,
                    fontSize: 14, color: '#1E293B',
                    background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                    borderRadius: 12, outline: 'none',
                    transition: 'all 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 4px rgba(249,115,22,0.08)'; e.target.style.background = '#fff'; }}
                  onBlur={e  => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                >
                  {showPassword ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '9px 13px' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.01 }}
              whileTap={{ scale: 0.985 }}
              style={{
                width: '100%', height: 48, borderRadius: 12,
                background: '#F97316',
                color: '#fff', fontSize: 14, fontWeight: 700,
                border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 18px rgba(249,115,22,0.25)',
                opacity: isLoading ? 0.85 : 1,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#000000'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F97316'; }}
            >
              {isLoading ? (
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <>
                  <span>Sign In as Admin</span>
                  <ArrowRight size={15} />
                </>
              )}
            </motion.button>
          </form>



          {/* Back Link */}
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: 20, width: '100%', background: 'none', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: '#64748B', cursor: 'pointer'
            }}
          >
            <Home size={13} />
            <span>Back to Home</span>
          </button>
        </motion.div>
      </div>
    </>
  );
}
