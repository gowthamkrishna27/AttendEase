import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, ShieldAlert } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useAuth } from '../../context/AuthContext';

export default function AdminSettings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <PageWrapper role="admin">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <p className="text-[12px] font-bold text-orange-500 uppercase tracking-widest mb-1">Admin</p>
          <h1 className="text-[26px] font-heading font-bold text-slate-900">Settings</h1>
          <p className="text-[14px] text-slate-400 mt-1">Manage admin account preferences</p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="card px-6 py-5 mb-4"
        >
          <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-5">
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              overflow: 'hidden', flexShrink: 0,
              background: '#F1F5F9', border: '2px solid #FED7AA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            }}>
              <ShieldAlert size={36} className="text-orange-500" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-slate-900">{user?.name}</p>
              <p className="text-[13px] text-slate-500">Root System Administrator</p>
              <p className="text-[12px] text-slate-400 mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Full Name</label>
              <input
                type="text"
                defaultValue={user?.name}
                readOnly
                className="w-full px-3.5 py-2.5 text-[14px] bg-slate-100 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                defaultValue={user?.email}
                readOnly
                className="w-full px-3.5 py-2.5 text-[14px] bg-slate-100 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
        </motion.div>

        {/* Session Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card px-6 py-5 mb-6"
        >
          <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-2">Account Session</h2>
          <p className="text-[13px] text-slate-500 mb-4">Log out of your AttendEase Admin account on this device.</p>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[13px] rounded-xl border border-rose-200 flex items-center gap-2 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </motion.div>

      </div>
    </PageWrapper>
  );
}
