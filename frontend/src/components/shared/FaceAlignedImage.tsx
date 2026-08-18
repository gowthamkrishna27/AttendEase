import React, { useState } from 'react';

interface FaceAlignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  fallbackName?: string;
}

export function FaceAlignedImage({
  src,
  alt = '',
  containerClassName = '',
  containerStyle = {},
  className = '',
  style = {},
  fallbackName,
  onError,
  ...props
}: FaceAlignedImageProps) {
  const [imgError, setImgError] = useState(false);
  const fallbackUrl = fallbackName
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=F97316&color=fff&size=240`
    : undefined;

  const currentSrc = (!imgError && src) ? src : (fallbackUrl || src);

  return (
    <div
      className={`overflow-hidden relative bg-slate-100 ${containerClassName}`}
      style={{ ...containerStyle }}
    >
      <img
        src={currentSrc}
        alt={alt}
        className={`w-full h-full object-cover object-top ${className}`}
        style={{ ...style }}
        onError={(e) => {
          if (!imgError && fallbackUrl) {
            setImgError(true);
          }
          if (onError) onError(e);
        }}
        {...props}
      />
    </div>
  );
}
