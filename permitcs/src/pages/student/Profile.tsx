import { useNavigate } from 'react-router-dom';
import { LogOut, Mail, BookOpen, Hash } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Avatar } from '../../components/shared/Avatar';
import { Button } from '../../components/ui/Button';
import { mockStudent } from '../../data/mock';

export default function Profile() {
  const navigate = useNavigate();

  const fields = [
    { icon: Hash, label: 'Roll Number', value: mockStudent.rollNumber },
    { icon: BookOpen, label: 'Department', value: mockStudent.department },
    { icon: BookOpen, label: 'Semester', value: `Semester ${mockStudent.semester}` },
    { icon: Mail, label: 'Email', value: mockStudent.email },
  ];

  return (
    <PageWrapper role="student">
      <div className="max-w-sm mx-auto">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <Avatar name={mockStudent.name} size="lg" className="mb-4" />
          <h1 className="text-[24px] font-semibold text-[#111111]">{mockStudent.name}</h1>
          <p className="text-[14px] text-[#6B7280] mt-1">{mockStudent.email}</p>
        </div>

        {/* Details */}
        <div className="card divide-y divide-[#E5E7EB] mb-6">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <Icon size={15} className="text-[#9CA3AF] flex-shrink-0" />
                <span className="text-[14px] text-[#6B7280]">{label}</span>
              </div>
              <span className="text-[14px] font-medium text-[#111111]">{value}</span>
            </div>
          ))}
        </div>

        {/* Logout */}
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => navigate('/')}
          className="text-danger border-danger/30 hover:bg-danger/5"
        >
          <LogOut size={16} />
          Log Out
        </Button>
      </div>
    </PageWrapper>
  );
}
