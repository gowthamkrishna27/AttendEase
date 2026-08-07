import React from 'react';
import { X, Download, FileText } from 'lucide-react';
import { Button } from '../ui/Button';

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

  const fileName = documentName || 'Uploaded_Proof_Document';
  // Standard fallback preview if url is missing
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">{fileName}</h3>
              <p className="text-xs font-semibold text-orange-600">Attached Student Proof Document</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              title="Close preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-6 bg-slate-950/5 flex items-center justify-center min-h-[350px]">
          {isPdf ? (
            <iframe
              src={displayUrl}
              title={fileName}
              className="w-full h-[65vh] rounded-xl border border-slate-200 shadow-inner bg-white"
            />
          ) : (
            <div className="relative flex flex-col items-center justify-center max-h-[65vh] w-full">
              <img
                src={displayUrl}
                alt={fileName}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-200/80 bg-white"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const fallbackDiv = target.parentElement?.querySelector('.img-fallback') as HTMLElement;
                  if (fallbackDiv) fallbackDiv.style.display = 'flex';
                }}
              />
              <div className="img-fallback hidden flex-col items-center justify-center p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md">
                <FileText size={48} className="text-orange-500 mb-3" />
                <p className="text-sm font-bold text-slate-800">{fileName}</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Click below to download the attached proof file directly.</p>
                <Button onClick={handleDownload} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                  Download Proof File
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
          <p className="text-xs text-slate-400 truncate max-w-md">
            Proof Document: <span className="font-semibold text-slate-700">{fileName}</span>
          </p>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleDownload}
              className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1.5"
            >
              <Download size={14} />
              Download Proof
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
