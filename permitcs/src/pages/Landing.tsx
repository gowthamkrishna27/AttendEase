import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, GraduationCap, BookOpen, ShieldCheck } from 'lucide-react';

const features = [
  { icon: GraduationCap, label: 'Students', desc: 'Submit permission requests' },
  { icon: BookOpen,      label: 'Faculty',  desc: 'Review & approve requests' },
  { icon: ShieldCheck,   label: 'HOD',      desc: 'Department oversight'       },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 mb-14"
      >
        <div className="w-8 h-8 bg-[#111111] rounded-xl flex items-center justify-center">
          <span className="text-white text-[12px] font-bold">AE</span>
        </div>
        <span className="text-[20px] font-semibold text-[#111111]">AttendEase</span>
      </motion.div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.05 }}
        className="text-center mb-10 max-w-md"
      >
        <h1 className="text-[34px] font-bold text-[#111111] leading-tight mb-3">
          Attendance Permissions,<br />simplified.
        </h1>
        <p className="text-[16px] text-[#6B7280]">
          One platform for students, faculty and department heads to manage attendance requests effortlessly.
        </p>
      </motion.div>

      {/* Role pills */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="flex items-center gap-3 mb-10 flex-wrap justify-center"
      >
        {features.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-full"
          >
            <Icon size={14} className="text-[#6B7280]" />
            <span className="text-[13px] font-medium text-[#111111]">{label}</span>
            <span className="text-[12px] text-[#9CA3AF] hidden sm:inline">— {desc}</span>
          </div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: 0.14 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/login')}
        className="flex items-center gap-2 bg-[#111111] text-white px-7 py-3.5 rounded-2xl text-[15px] font-semibold cursor-pointer transition-colors"
      >
        Sign in to Login Portal
        <ArrowRight size={16} />
      </motion.button>

      <p className="text-[12px] text-[#9CA3AF] mt-10">
        © {new Date().getFullYear()} AttendEase · College Attendance Management
      </p>
    </div>
  );
}
