import { useCallback, useState } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';
import { cn } from '../../lib/utils';

interface UploadAreaProps {
  onFileSelect: (file: File | null) => void;
  file: File | null;
  error?: string;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadArea({ onFileSelect, file, error }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string>('');

  const handleFile = useCallback(
    (selectedFile: File) => {
      setFileError('');
      if (!ALLOWED_TYPES.includes(selectedFile.type)) {
        setFileError('Only PDF and image files are allowed.');
        return;
      }
      if (selectedFile.size > MAX_SIZE) {
        setFileError('File size must be under 10MB.');
        return;
      }
      onFileSelect(selectedFile);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const isPDF = file?.type === 'application/pdf';
  const displayError = error || fileError;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[14px] font-medium text-[#111111]">
        Supporting Document
      </label>

      {file ? (
        <div className="flex items-center gap-3 p-4 bg-white border border-[#E5E7EB] rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
            {isPDF ? (
              <FileText size={18} className="text-[#6B7280]" />
            ) : (
              <Image size={18} className="text-[#6B7280]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-[#111111] truncate">{file.name}</p>
            <p className="text-[13px] text-[#6B7280]">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={() => onFileSelect(null)}
            className="p-1 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-xl transition-all duration-150 cursor-pointer',
            isDragging
              ? 'border-[#111111] bg-[#F9FAFB]'
              : 'border-[#E5E7EB] hover:border-[#9CA3AF] bg-[#FAFAFA]',
            displayError && 'border-danger/50'
          )}
        >
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center">
            <Upload size={18} className="text-[#6B7280]" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-medium text-[#111111]">
              Drag and drop, or{' '}
              <span className="underline underline-offset-2">browse</span>
            </p>
            <p className="text-[13px] text-[#6B7280] mt-0.5">PDF, JPG, PNG up to 10MB</p>
          </div>
        </div>
      )}
      {displayError && <p className="text-[13px] text-danger">{displayError}</p>}
    </div>
  );
}
