import React from 'react';
import { Share2 } from 'lucide-react';
import type { AttendanceRequest } from '../../lib/api';

interface WhatsAppShareButtonProps {
  request: AttendanceRequest;
  className?: string;
  variant?: 'primary' | 'secondary' | 'icon';
}

export const WhatsAppShareButton: React.FC<WhatsAppShareButtonProps> = ({
  request,
  className = '',
  variant = 'primary',
}) => {
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();

    const publicId = request.publicId || request.id;
    const origin = window.location.origin;
    const shareUrl = `${origin}/share/${publicId}`;

    const studentName = request.student?.name || 'Student';
    const rollNo = request.student?.rollNumber || request.studentId || 'N/A';
    const reason = request.reasonLabel || request.reason || 'Attendance Request';
    
    let statusText = 'Pending Faculty Review';
    if (request.status === 'approved') statusText = 'Approved';
    else if (request.status === 'rejected') statusText = 'Rejected';
    else if (request.status === 'cancelled') statusText = 'Cancelled';

    const message = `📋 Attendance Permission Request

Student:
${studentName}

Roll No:
${rollNo}

Reason:
${reason}

Status:
${statusText}

Open Request:
${shareUrl}`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleShare}
        title="Share on WhatsApp"
        className={`p-2 rounded-xl transition-colors cursor-pointer border ${className}`}
        style={{ background: '#5ff797', borderColor: '#3de07a', color: '#14532d' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#3de07a')}
        onMouseLeave={e => (e.currentTarget.style.background = '#5ff797')}
      >
        <Share2 size={16} />
      </button>
    );
  }

  if (variant === 'secondary') {
    return (
      <button
        type="button"
        onClick={handleShare}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border ${className}`}
        style={{ background: '#5ff797', borderColor: '#3de07a', color: '#14532d' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#3de07a')}
        onMouseLeave={e => (e.currentTarget.style.background = '#5ff797')}
      >
        <Share2 size={14} />
        <span>Share on WhatsApp</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 ${className}`}
      style={{ background: '#5ff797', color: '#14532d' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#3de07a')}
      onMouseLeave={e => (e.currentTarget.style.background = '#5ff797')}
    >
      <Share2 size={15} />
      <span>Share on WhatsApp</span>
    </button>
  );
};

