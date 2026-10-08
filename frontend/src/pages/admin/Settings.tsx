import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, MessageSquare } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

export default function AdminSettings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <PageWrapper role="admin">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <span className="text-[11px] font-semibold text-[#18181b] bg-[#edf0f2] px-2 py-0.5 rounded-[5px]">
              ADMIN PREFERENCES
            </span>
            <h1 className="text-[22px] font-bold text-[#18181b] tracking-tight mt-1">Settings</h1>
            <p className="text-[13px] text-[#6b7280]">Manage admin credentials and session preferences</p>
          </div>
          <a
            href="https://forms.gle/girGw3vVdUfCR5zR6"
            target="_blank"
            rel="noopener noreferrer"
            title="Give Feedback & Report Issues"
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-600 border border-slate-200 hover:border-orange-300 shadow-2xs transition-all text-xs font-semibold active:scale-95 group shrink-0"
          >
            <MessageSquare size={13.5} className="text-orange-500 group-hover:scale-110 transition-transform" />
            <span>Feedback</span>
          </a>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        >
          <h2 className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wider mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-xl bg-[#edf0f2] p-2 flex items-center justify-center border border-slate-200/60 shrink-0">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-[#18181b]">{user?.name || 'Root Administrator'}</p>
              <p className="text-[13px] text-[#6b7280]">System Administrator</p>
              <p className="text-[12px] text-[#88929e] mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wider block mb-1.5">Full Name</label>
              <input
                type="text"
                defaultValue={user?.name}
                readOnly
                className="w-full h-[40px] px-3.5 text-[13.5px] bg-[#edf0f2] text-[#374151] rounded-lg outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                defaultValue={user?.email}
                readOnly
                className="w-full h-[40px] px-3.5 text-[13.5px] bg-[#edf0f2] text-[#374151] rounded-lg outline-none cursor-not-allowed"
              />
            </div>
          </div>
        </motion.div>

        {/* Session Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        >
          <h2 className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">Account Session</h2>
          <p className="text-[13px] text-[#6b7280] mb-4">Log out of your AttendEase Admin account on this browser.</p>
          <button
            onClick={handleLogout}
            className="h-[38px] px-4 bg-[#edf0f2] hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-medium text-[13px] rounded-lg border border-transparent hover:border-rose-200 flex items-center gap-2 transition-all cursor-pointer"
          >
            <LogOut size={15} />
            <span>Log Out</span>
          </button>
        </motion.div>

      </div>
    </PageWrapper>
  );
}
