import React from 'react';
import type { AttendanceRequest } from '../../lib/api';

export const WhatsAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.062-2.122-.531-1.825-.758-2.999-2.617-3.09-2.737-.091-.121-.734-.977-.734-1.864 0-.887.466-1.32.632-1.498.166-.178.363-.223.484-.223.121 0 .243.002.348.01.112.008.261-.043.407.311.152.368.517 1.258.562 1.35.045.091.076.197.015.318-.061.121-.091.197-.182.303-.091.106-.192.237-.274.318-.091.091-.186.19-.08.372.106.182.471.777 1.011 1.258.697.621 1.285.813 1.467.904.182.091.288.076.394-.045.106-.121.455-.53.576-.712.121-.182.243-.152.409-.091.167.061 1.061.501 1.243.592.182.091.303.136.348.212.045.076.045.439-.099.844zM12 2C6.477 2 2 6.477 2 12c0 1.891.527 3.659 1.442 5.168L2 22l4.98-1.309A9.956 9.956 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
  </svg>
);

interface WhatsAppShareButtonProps {
  request?: AttendanceRequest | null;
  className?: string;
  variant?: 'primary' | 'secondary' | 'icon' | 'round';
}

export const WhatsAppShareButton: React.FC<WhatsAppShareButtonProps> = ({
  request,
  className = '',
  variant = 'primary',
}) => {
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();

    const publicId = request?.publicId || request?.id || 'latest';
    const origin = window.location.origin;
    const shareUrl = `${origin}/share/${publicId}`;

    const studentName = request?.student?.name || 'Student';
    const rollNo = request?.student?.rollNumber || request?.studentId || 'N/A';
    const reason = request?.reasonLabel || request?.reason || 'Attendance Permission Request';
    
    let statusText = 'Pending Faculty Review';
    if (request?.status === 'approved') statusText = 'Approved';
    else if (request?.status === 'rejected') statusText = 'Rejected';
    else if (request?.status === 'cancelled') statusText = 'Cancelled';

    const message = `Attendance Permission Request

Student: ${studentName} (${rollNo})
Reason: ${reason}
Status: ${statusText}

Open Request:
${shareUrl}`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'round') {
    return (
      <button
        type="button"
        onClick={handleShare}
        title="Share Request on WhatsApp"
        className={`w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/30 active:scale-95 transition-all cursor-pointer ${className}`}
      >
        <WhatsAppIcon size={24} />
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleShare}
        title="Share on WhatsApp"
        className={`p-2.5 rounded-full bg-[#25D366]/15 hover:bg-[#25D366] text-[#128C7E] hover:text-white border border-[#25D366]/30 transition-all cursor-pointer ${className}`}
      >
        <WhatsAppIcon size={18} />
      </button>
    );
  }

  if (variant === 'secondary') {
    return (
      <button
        type="button"
        onClick={handleShare}
        className={`px-3.5 py-2 text-xs font-bold rounded-full bg-[#25D366]/15 hover:bg-[#25D366] text-[#128C7E] hover:text-white border border-[#25D366]/30 transition-all cursor-pointer flex items-center gap-2 ${className}`}
      >
        <WhatsAppIcon size={16} />
        <span>Share on WhatsApp</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`w-full h-12 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-[14.5px] font-bold transition-all shadow-md shadow-[#25D366]/25 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5 ${className}`}
    >
      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        <WhatsAppIcon size={16} />
      </div>
      <span>Share on WhatsApp</span>
    </button>
  );
};
