import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../shared/Avatar';

interface NavbarProps {
  role?: 'student' | 'faculty' | 'hod';
}

export function Navbar({ role = 'student' }: NavbarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navLinks =
    role === 'student'
      ? [
          { to: '/student', label: 'Home' },
          { to: '/student/history', label: 'History' },
          { to: '/student/profile', label: 'Profile' },
        ]
      : role === 'faculty'
      ? [{ to: '/faculty', label: 'Dashboard' }]
      : [{ to: '/hod', label: 'Overview' }];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-[#E5E7EB]">
      <div className="page-container">
        <nav className="flex items-center justify-between h-[60px]">
          {/* Logo */}
          <Link
            to={role === 'student' ? '/student' : role === 'faculty' ? '/faculty' : '/hod'}
            className="flex items-center gap-2"
          >
            <div className="w-7 h-7 bg-[#111111] rounded-lg flex items-center justify-center">
              <span className="text-white text-[11px] font-bold tracking-tight">AE</span>
            </div>
            <span className="text-[16px] font-semibold text-[#111111] tracking-tight">
              AttendEase
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 text-[14px] font-medium rounded-lg transition-colors duration-150 ${
                    isActive
                      ? 'bg-[#F3F4F6] text-[#111111]'
                      : 'text-[#6B7280] hover:text-[#111111] hover:bg-[#F9FAFB]'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right — user info + logout */}
          <div className="flex items-center gap-2">
            {role === 'student' && (
              <button className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] transition-colors">
                <Bell size={18} />
              </button>
            )}
            {user && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <p className="text-[13px] font-medium text-[#111111] leading-tight">{user.name}</p>
                  <p className="text-[11px] text-[#9CA3AF] capitalize">{user.role === 'hod' ? 'HOD' : user.role}</p>
                </div>
                <button onClick={handleLogout} className="relative group">
                  <Avatar name={user.name} size="sm" />
                  <span className="absolute -bottom-7 right-0 hidden group-hover:flex items-center bg-[#111111] text-white text-[11px] px-2 py-1 rounded-lg whitespace-nowrap">
                    Log out
                  </span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="flex md:hidden gap-1 pb-2">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              className={({ isActive }) =>
                `px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#F3F4F6] text-[#111111]'
                    : 'text-[#6B7280] hover:text-[#111111]'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
}
