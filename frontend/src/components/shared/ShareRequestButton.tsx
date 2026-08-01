import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { formatDate, formatTime } from '../../lib/utils';
import type { AttendanceRequest } from '../../types';

interface ShareRequestButtonProps {
  request: AttendanceRequest;
  variant?: 'primary' | 'secondary' | 'whatsapp' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ShareRequestButton({
  request,
  variant = 'whatsapp',
  size = 'md',
  className = '',
}: ShareRequestButtonProps) {
  const [copied, setCopied] = useState(false);

  const getRequestUrl = () => {
    return `${window.location.origin}/faculty/request/${request.id}`;
  };

  const generateWhatsAppMessage = () => {
    const studentName = request.student?.name || 'Student';
    const rollNo = request.student?.rollNumber ? ` (${request.student.rollNumber})` : '';
    const dateStr = formatDate(request.date);
    const timeStr = `${formatTime(request.startTime)} - ${formatTime(request.endTime)}`;
    const statusStr = request.status.toUpperCase();
    const url = getRequestUrl();

    const text = 
      `🎓 *AttendEase Attendance Request*\n\n` +
      `📌 *Reason:* ${request.reasonLabel}\n` +
      `👤 *Student:* ${studentName}${rollNo}\n` +
      `📅 *Date:* ${dateStr}\n` +
      `⏰ *Time:* ${timeStr}\n` +
      `📊 *Status:* ${statusStr}\n\n` +
      `👇 *Click link to view request:*\n` +
      `${url}`;

    return encodeURIComponent(text);
  };

  const handleWhatsAppShare = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const encoded = generateWhatsAppMessage();
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(getRequestUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const handleNativeShare = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `AttendEase Request: ${request.reasonLabel}`,
          text: `Attendance Permission Request for ${request.student?.name || 'Student'} (${request.reasonLabel})`,
          url: getRequestUrl(),
        });
        return;
      } catch (err) {
        // User cancelled or share failed
      }
    }
    handleWhatsAppShare();
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleNativeShare}
        title="Share request"
        className={`p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 transition-colors cursor-pointer ${className}`}
      >
        <Share2 size={16} />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      {/* Primary WhatsApp Action Button */}
      <button
        type="button"
        onClick={handleWhatsAppShare}
        className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.98] ${
          variant === 'whatsapp'
            ? 'bg-[#25D366] hover:bg-[#20bd5a] text-white border border-emerald-600/30'
            : variant === 'primary'
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
        } ${
          size === 'sm'
            ? 'px-3 py-1.5 text-[12px]'
            : size === 'lg'
            ? 'px-5 py-3 text-[14px]'
            : 'px-4 py-2 text-[13px]'
        } ${className}`}
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-0.999 3.648 3.742-0.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
        <span>Share via WhatsApp</span>
      </button>

      {/* Copy Link Action Button */}
      <button
        type="button"
        onClick={handleCopyLink}
        title={copied ? 'Copied!' : 'Copy request link'}
        className={`inline-flex items-center gap-1.5 font-medium rounded-xl transition-all cursor-pointer border ${
          copied
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
        } ${
          size === 'sm'
            ? 'px-2.5 py-1.5 text-[12px]'
            : size === 'lg'
            ? 'px-4 py-3 text-[14px]'
            : 'px-3.5 py-2 text-[13px]'
        }`}
      >
        {copied ? (
          <>
            <Check size={14} className="text-emerald-600" />
            <span className="font-semibold">Link Copied!</span>
          </>
        ) : (
          <>
            <Copy size={14} className="text-slate-500" />
            <span>Copy Link</span>
          </>
        )}
      </button>
    </div>
  );
}
