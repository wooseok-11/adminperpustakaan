import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeViewProps {
  value: string;
  size?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  value,
  size = 140,
  className = '',
  darkColor = '#0f172a',
  lightColor = '#ffffff',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 1,
        color: {
          dark: darkColor,
          light: lightColor,
        },
      },
      (error) => {
        if (error) console.error('Error rendering QR code:', error);
      }
    );
  }, [value, size, darkColor, lightColor]);

  return <canvas ref={canvasRef} className={`rounded-lg ${className}`} />;
};
