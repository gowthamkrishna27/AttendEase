import React from 'react';

interface FaceAlignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}

export function FaceAlignedImage({
  src,
  alt = '',
  containerClassName = '',
  containerStyle = {},
  className = '',
  style = {},
  onError,
  ...props
}: FaceAlignedImageProps) {
  return (
    <div
      className={`overflow-hidden relative bg-slate-100 ${containerClassName}`}
      style={{ ...containerStyle }}
    >
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover object-top ${className}`}
        style={{ ...style }}
        onError={onError}
        {...props}
      />
    </div>
  );
}
