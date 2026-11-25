import React, { useState } from 'react';
import { Package } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EDE6D8] via-[#E4DCCB] to-[#D8CEB8] text-[#4D5B52] p-4 text-center ${className}`}
      >
        <Package className="w-7 h-7 text-[#1E3B2F]/45 mb-2" strokeWidth={1.5} />
        <span className="text-[11px] font-medium text-[#1E3B2F]/70 line-clamp-2 max-w-[160px]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
};
