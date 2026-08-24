import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { AttendanceRequest } from '../../lib/api';
import * as api from '../../lib/api';

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
  showCopyOption?: boolean;
}

/** Helper to get or build the dedicated share link URL */
async function resolveShareUrl(request?: AttendanceRequest | null): Promise<string | null> {
  const origin = window.location.origin;

  if (request?.shareUrl && request.shareUrl.startsWith('/r/')) {
    return `${origin}${request.shareUrl}`;
  }

  if (request?.shareToken) {
    return `${origin}/r/${request.shareToken}`;
  }

  // Fetch/create share token from backend (uses the canonical share-link endpoint)
  const reqId = request?.publicId || request?.id || request?.requestId;
  if (reqId) {
    try {
      const linkRes = await api.getRequestShareLink(reqId);
      if (linkRes?.shareToken) {
        return `${origin}/r/${linkRes.shareToken}`;
      }
    } catch (err) {
      console.warn('Could not fetch share link:', err);
    }
  }

  // No valid share URL available — return null so caller can handle gracefully
  return null;
}

export const WhatsAppShareButton: React.FC<WhatsAppShareButtonProps> = ({
  request,
  className = '',
  variant = 'primary',
}) => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);

    try {
      const shareUrl = await resolveShareUrl(request);

      if (!shareUrl) {
        alert('Could not generate share link. Please try again.');
        return;
      }

      // Strict Section 5 Safe Message Format: NO sensitive personal or request details exposed
      const message = `Attendance Permission Request\n\nPlease review my attendance permission request:\n${shareUrl}`;

      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const shareUrl = await resolveShareUrl(request);
      if (!shareUrl) return;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  if (variant === 'round') {
    return (
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={handleShare}
          disabled={loading}
          title="Share Request on WhatsApp"
          className={`w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/30 active:scale-95 transition-all cursor-pointer ${className}`}
        >
          <WhatsAppIcon size={24} />
        </button>
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        title="Share on WhatsApp"
        className={`p-2.5 rounded-full bg-[#25D366]/15 hover:bg-[#25D366] text-[#128C7E] hover:text-white border border-[#25D366]/30 transition-all cursor-pointer ${className}`}
      >
        <WhatsAppIcon size={18} />
      </button>
    );
  }

  if (variant === 'secondary') {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleShare}
          disabled={loading}
          className={`px-3.5 py-2 text-xs font-bold rounded-full bg-[#25D366]/15 hover:bg-[#25D366] text-[#128C7E] hover:text-white border border-[#25D366]/30 transition-all cursor-pointer flex items-center gap-2 ${className}`}
        >
          <WhatsAppIcon size={16} />
          <span>Share on WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={handleCopy}
          title="Copy Link"
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer text-xs"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        className={`w-full h-12 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-[14.5px] font-bold transition-all shadow-md shadow-[#25D366]/25 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5 ${className}`}
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <WhatsAppIcon size={16} />
        </div>
        <span>Share on WhatsApp</span>
      </button>

      <button
        type="button"
        onClick={handleCopy}
        title="Copy Share Link"
        className="w-full sm:w-auto px-4 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13.5px] font-bold border border-slate-200/80 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
      >
        {copied ? (
          <>
            <Check size={16} className="text-emerald-600" />
            <span className="text-emerald-700">Copied</span>
          </>
        ) : (
          <>
            <Copy size={16} />
            <span>Copy Link</span>
          </>
        )}
      </button>
    </div>
  );
};

export const CopyShareLinkButton: React.FC<{ request?: AttendanceRequest | null; className?: string }> = ({
  request,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const shareUrl = await resolveShareUrl(request);
      if (!shareUrl) return;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy Share Link"
      className={`px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold border border-slate-200 transition-all flex items-center gap-2 cursor-pointer ${className}`}
    >
      {copied ? (
        <>
          <Check size={14} className="text-emerald-600" />
          <span className="text-emerald-700 font-semibold">Link Copied!</span>
        </>
      ) : (
        <>
          <Copy size={14} />
          <span>Copy Link</span>
        </>
      )}
    </button>
  );
};
