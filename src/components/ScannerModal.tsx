import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, CheckCircle2, AlertCircle, Keyboard } from 'lucide-react';
import { beepScan } from '../utils/storage';

interface ScannerModalProps {
  isOpen: boolean;
  type: 'siswa' | 'buku' | 'pengembalian';
  title?: string;
  onScan: (code: string) => void;
  onClose: () => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  type,
  title,
  onScan,
  onClose,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      setScannedResult(null);
      setErrorMessage(null);
      setManualCode('');
      return;
    }

    const timer = setTimeout(() => {
      startCamera();
    }, 200);

    return () => {
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [isOpen, type]);

  const cleanupScanner = async () => {
    if (scannerInstanceRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop();
        }
        await scannerInstanceRef.current.clear();
      } catch {
        // Ignore stop error
      } finally {
        scannerInstanceRef.current = null;
        isStoppingRef.current = false;
      }
    }
  };

  const startCamera = async () => {
    try {
      await cleanupScanner();
      setErrorMessage(null);

      const formats =
        type === 'siswa'
          ? [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
            ]
          : [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
            ];

      const html5QrCode = new Html5Qrcode('interactive-scanner-container', {
        formatsToSupport: formats,
        verbose: false,
      });
      scannerInstanceRef.current = html5QrCode;

      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      const config = {
        fps: isMobile ? 10 : 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          if (type === 'siswa') {
            const s = Math.floor(minEdge * 0.75);
            return { width: s, height: s };
          }
          return {
            width: Math.floor(viewfinderWidth * 0.85),
            height: Math.floor(minEdge * 0.6),
          };
        },
        videoConstraints: {
          facingMode: { ideal: 'environment' },
        },
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          const clean = decodedText.trim();
          if (clean.length < 3) return;
          beepScan();
          setScannedResult(clean);
          setTimeout(() => {
            onScan(clean);
            onClose();
          }, 350);
        },
        () => {
          // ignore frame scan failures
        }
      );
    } catch (err) {
      console.warn('Camera error:', err);
      const errStr = String(err);
      if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
        setErrorMessage('Izin akses kamera belum diberikan. Aktifkan izin kamera di pengaturan browser.');
      } else {
        setErrorMessage('Kamera tidak dapat diakses atau sedang digunakan oleh aplikasi lain. Anda dapat memasukkan kode secara manual di bawah.');
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    beepScan();
    onScan(manualCode.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-teal-600" />
            <h3 className="font-semibold text-slate-800 text-sm">
              {title || `Pindai ${type === 'siswa' ? 'Kartu Anggota' : 'Buku / Barcode'}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-[260px] flex items-center justify-center border border-slate-800">
            <div id="interactive-scanner-container" className="w-full min-h-[260px]" />

            {scannedResult && (
              <div className="absolute inset-0 bg-teal-600/95 flex flex-col items-center justify-center text-white z-20">
                <CheckCircle2 className="w-12 h-12 mb-2 animate-bounce" />
                <p className="font-semibold text-sm">Kode Berhasil Terdeteksi</p>
                <p className="font-mono text-xs text-teal-100 mt-1">{scannedResult}</p>
              </div>
            )}

            {errorMessage && !scannedResult && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-slate-300 z-10 space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <p className="text-xs text-slate-200 leading-relaxed">{errorMessage}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              Atau Masukkan Kode Manual
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Contoh: SIP-X-001 atau BUK-2026-0001"
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                Gunakan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
