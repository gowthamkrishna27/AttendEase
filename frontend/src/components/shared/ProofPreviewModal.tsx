import React from 'react';
import { X, Download, FileText } from 'lucide-react';

interface ProofPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl?: string | null;
  documentName?: string | null;
}

export const ProofPreviewModal: React.FC<ProofPreviewModalProps> = ({
  isOpen,
  onClose,
  documentUrl,
  documentName,
}) => {
  if (!isOpen) return null;

  const fileName = documentName || 'Attached_Proof_Document';
  const rawUrl = documentUrl || (documentName?.startsWith('http') || documentName?.startsWith('data:') ? documentName : null);
  
  // Safe display URL fallback
  const displayUrl = rawUrl || `https://res.cloudinary.com/yp5l3jrg/image/upload/v1786098536/xku4waxxyg2506xok0h4.png`;

  const isPdf = Boolean(
    displayUrl.toLowerCase().includes('.pdf') ||
    fileName.toLowerCase().endsWith('.pdf') ||
    displayUrl.startsWith('data:application/pdf')
  );

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = displayUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[88vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clean Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <FileText size={14} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[13.5px] font-bold text-slate-900 truncate">{fileName}</h3>
              <p className="text-[11px] text-slate-400">Attached Student Proof</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="h-7 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[11.5px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Download file"
            >
              <Download size={12} />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              title="Close preview"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/50 flex items-center justify-center min-h-[300px]">
          {isPdf ? (
            <iframe
              src={displayUrl}
              title={fileName}
              className="w-full h-[62vh] rounded-xl border border-slate-200 shadow-xs bg-white"
            />
          ) : (
            <div className="relative flex flex-col items-center justify-center max-h-[62vh] w-full">
              <img
                src={displayUrl}
                alt={fileName}
                className="max-h-[58vh] max-w-full object-contain rounded-xl shadow-xs border border-slate-200/90 bg-white"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const fallbackDiv = target.parentElement?.querySelector('.img-fallback') as HTMLElement;
                  if (fallbackDiv) fallbackDiv.style.display = 'flex';
                }}
              />
              <div className="img-fallback hidden flex-col items-center justify-center p-8 text-center bg-white rounded-xl shadow-2xs border border-slate-200 max-w-sm">
                <FileText size={36} className="text-slate-400 mb-2" />
                <p className="text-[13px] font-bold text-slate-800">{fileName}</p>
                <p className="text-[11.5px] text-slate-500 mt-1 mb-3">Download to view full attachment.</p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="h-8 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download Document</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Clean Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white text-[11.5px] text-slate-500">
          <span className="truncate max-w-md">File: <strong className="text-slate-800 font-mono">{fileName}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
