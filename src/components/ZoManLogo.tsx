import React, { useState, useEffect } from 'react';

interface Props {
  className?: string;
  size?: number;
  showShadow?: boolean;
  imageUrl?: string;
  onClick?: () => void;
}

export const ZoManLogo: React.FC<Props> = ({
  className = '',
  size = 52,
  showShadow = false,
  imageUrl,
  onClick,
}) => {
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    return imageUrl || localStorage.getItem('zoman_custom_logo') || null;
  });
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (imageUrl !== undefined) {
      setCustomLogo(imageUrl || null);
      setImgFailed(false);
    }
  }, [imageUrl]);

  useEffect(() => {
    const handleStorage = () => {
      setCustomLogo(localStorage.getItem('zoman_custom_logo'));
      setImgFailed(false);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('zoman_logo_updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('zoman_logo_updated', handleStorage);
    };
  }, []);

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none ${
        showShadow ? 'filter drop-shadow-sm' : ''
      } ${className}`}
      style={{ width: size, height: size }}
      title="ZôMAN - Tuyển Dụng Lao Động & Việc Làm Phổ Thông (Đã tách nền)"
    >
      {customLogo && !imgFailed ? (
        <img
          src={customLogo}
          alt="Logo ZôMAN"
          className="w-full h-full object-contain pointer-events-none"
          onError={() => {
            setImgFailed(true);
          }}
        />
      ) : (
        /* Vector ZôMAN chuẩn đã tách nền trong suốt 100% (Inline SVG - Không bao giờ lỗi 404) */
        <svg
          viewBox="0 0 500 500"
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* 1. Vòng xoáy trên màu xám chì than */}
          <path
            d="M 140 55 C 240 25, 370 55, 435 140 C 475 195, 480 270, 445 340 C 430 370, 405 395, 375 415 C 385 395, 390 370, 390 345 C 390 280, 360 215, 315 165 C 265 110, 200 75, 140 55 Z"
            fill="#4B5563"
          />

          {/* 2. Vòng xoáy dưới màu đỏ rực */}
          <path
            d="M 360 445 C 260 475, 130 445, 65 360 C 25 305, 20 230, 55 160 C 70 130, 95 105, 125 85 C 115 105, 110 130, 110 155 C 110 220, 140 285, 185 335 C 235 390, 300 425, 360 445 Z"
            fill="#DC2626"
          />

          {/* 3. Huy hiệu tròn Z ở góc trên bên phải */}
          <g transform="translate(330, 190)">
            <path
              d="M -32 -18 A 38 38 0 0 1 36 -6"
              stroke="#4B5563"
              strokeWidth="5.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 32 18 A 38 38 0 0 1 -36 6"
              stroke="#DC2626"
              strokeWidth="5.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M -16 -12 L 16 -12 L -14 14 L 18 14"
              stroke="#DC2626"
              strokeWidth="8.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>

          {/* 4. Chữ ZÔMAN */}
          <path
            d="M 95 235 L 165 235 L 100 310 L 175 310"
            stroke="#DC2626"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M 195 224 L 210 210 L 225 224"
            stroke="#DC2626"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <rect
            x="185"
            y="238"
            width="52"
            height="68"
            rx="17"
            fill="#DC2626"
          />
          <rect
            x="200"
            y="253"
            width="22"
            height="38"
            rx="8"
            fill="#FFFFFF"
          />
          <text
            x="250"
            y="310"
            fill="#1F2937"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            fontWeight="900"
            fontSize="76"
            letterSpacing="2"
          >
            MAN
          </text>
        </svg>
      )}
    </div>
  );
};
