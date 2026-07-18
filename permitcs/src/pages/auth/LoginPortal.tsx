import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, BookOpen, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth, MOCK_CREDENTIALS } from '../../context/AuthContext';
import type { UserRole } from '../../context/AuthContext';

type Tab = 'student' | 'faculty' | 'hod';

const TABS: { key: Tab; label: string; icon: typeof GraduationCap }[] = [
  { key: 'student', label: 'Student', icon: GraduationCap },
  { key: 'faculty', label: 'Faculty', icon: BookOpen },
  { key: 'hod', label: 'HOD', icon: ShieldCheck },
];

const DEMO_HINTS: Record<Tab, { fields: { label: string; value: string }[] }> = {
  student: {
    fields: [
      { label: 'Roll Number', value: '21CS047' },
      { label: 'Password', value: 'student123' },
    ],
  },
  faculty: {
    fields: [
      { label: 'Email', value: 'priya.nair@college.edu' },
      { label: 'Password', value: 'faculty123' },
    ],
  },
  hod: {
    fields: [
      { label: 'Email', value: 'hod.cs@college.edu' },
      { label: 'Password', value: 'hod123' },
    ],
  },
};

export default function LoginPortal() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when switching tabs
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setIdentifier('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));

    const creds = MOCK_CREDENTIALS[activeTab];
    const identifierField =
      activeTab === 'student'
        ? (creds as typeof MOCK_CREDENTIALS.student).rollNumber
        : creds.email;

    if (
      identifier.trim().toLowerCase() === identifierField.toLowerCase() &&
      password === creds.password
    ) {
      const role: UserRole = activeTab;
      const user =
        activeTab === 'student'
          ? {
              id: creds.id,
              name: creds.name,
              email: creds.email,
              role,
              department: (creds as typeof MOCK_CREDENTIALS.student).department,
              rollNumber: (creds as typeof MOCK_CREDENTIALS.student).rollNumber,
              semester: (creds as typeof MOCK_CREDENTIALS.student).semester,
            }
          : {
              id: creds.id,
              name: creds.name,
              email: creds.email,
              role,
              department: creds.department,
            };

      login(user);
      navigate(
        activeTab === 'student' ? '/student' : activeTab === 'faculty' ? '/faculty' : '/hod'
      );
    } else {
      setError(
        activeTab === 'student'
          ? 'Invalid roll number or password.'
          : 'Invalid email or password.'
      );
    }

    setIsLoading(false);
  };

  const currentTab = TABS.find(t => t.key === activeTab)!;
  const hint = DEMO_HINTS[activeTab];

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 mb-10"
      >
        <div className="w-8 h-8 bg-[#111111] rounded-xl flex items-center justify-center">
          <span className="text-white text-[12px] font-bold tracking-tight">AE</span>
        </div>
        <span className="text-[20px] font-semibold text-[#111111] tracking-tight">AttendEase</span>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-sm"
      >
        {/* Card header */}
        <div className="text-center mb-6">
          <h1 className="text-[26px] font-bold text-[#111111]">Login Portal</h1>
          <p className="text-[14px] text-[#6B7280] mt-1">
            Select your role and sign in
          </p>
        </div>

        <div className="card p-6">
          {/* Role tab switcher */}
          <div className="flex items-center gap-1 bg-[#F3F4F6] p-1 rounded-xl mb-6">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 text-[13px] font-medium rounded-lg transition-colors duration-150 ${
                    isActive
                      ? 'bg-white text-[#111111] shadow-subtle'
                      : 'text-[#6B7280] hover:text-[#111111]'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Role icon + title */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center flex-shrink-0">
                  <currentTab.icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#111111]">
                    {currentTab.label} Sign In
                  </p>
                  <p className="text-[12px] text-[#9CA3AF]">
                    {activeTab === 'student'
                      ? 'Enter your roll number and password'
                      : 'Enter your college email and password'}
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Identifier field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] font-medium text-[#111111]">
                    {activeTab === 'student' ? 'Roll Number' : 'Email Address'}
                  </label>
                  <input
                    type={activeTab === 'student' ? 'text' : 'email'}
                    placeholder={
                      activeTab === 'student'
                        ? 'e.g. 21CS047'
                        : 'your.name@college.edu'
                    }
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    autoComplete={activeTab === 'student' ? 'username' : 'email'}
                    className="w-full px-4 py-2.5 text-[15px] text-[#111111] bg-white border border-[#E5E7EB] rounded-xl outline-none transition-all duration-150 placeholder:text-[#9CA3AF] focus:border-[#111111] focus:ring-1 focus:ring-[#111111]/10"
                  />
                </div>

                {/* Password */}
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

                {/* Error */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[13px] text-danger"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Submit */}
                <Button type="submit" size="lg" fullWidth loading={isLoading}>
                  Sign In as {currentTab.label}
                </Button>
              </form>

              {/* Demo hint */}
              <div className="mt-4 bg-[#F9FAFB] rounded-xl px-4 py-3 border border-[#E5E7EB]">
                <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1.5">
                  Demo credentials
                </p>
                {hint.fields.map(f => (
                  <p key={f.label} className="text-[12px] text-[#9CA3AF]">
                    {f.label}:{' '}
                    <span className="text-[#111111] font-medium">{f.value}</span>
                  </p>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-[12px] text-[#9CA3AF] mt-6">
          © {new Date().getFullYear()} AttendEase · College Attendance Management
        </p>
      </motion.div>
    </div>
  );
}
