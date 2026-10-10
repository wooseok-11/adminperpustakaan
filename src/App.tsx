import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import {
  DatabaseSchema,
  PageId,
  AdministratorItem,
  SiswaItem,
  BukuItem,
} from './types';
import {
  loadRepository,
  saveRepository,
  sanitizeDatabase,
  getCurrentLoggedInUser,
  setCurrentLoggedInUser,
  findSiswaByCode,
  findBukuByCode,
  findEksemplarByKode,
  buildEksemplarList,
  beepScan,
} from './utils/storage';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { ScannerModal } from './components/ScannerModal';
import { QRCodeView } from './components/QRCodeView';

import { Dashboard } from './pages/Dashboard';
import { SiswaPage } from './pages/SiswaPage';
import { BukuPage } from './pages/BukuPage';
import { EbookPage } from './pages/EbookPage';
import { AdminPage } from './pages/AdminPage';
import { PeminjamanPage } from './pages/PeminjamanPage';
import { PengembalianPage } from './pages/PengembalianPage';
import { DendaPage } from './pages/DendaPage';
import { ProfilPage } from './pages/ProfilPage';
import { CetakKartuPage } from './pages/CetakKartuPage';
import { LaporanPage } from './pages/LaporanPage';
import { PengaturanPage } from './pages/PengaturanPage';
import { subscribeToCloudChanges, isFirebaseAvailable } from './services/firebase';

interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function App() {
  const [db, setDb] = useState<DatabaseSchema>(() => loadRepository());
  const [currentUser, setCurrentUser] = useState<AdministratorItem | null>(() =>
    getCurrentLoggedInUser()
  );
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('SIP_SIDEBAR_COLLAPSED') === '1';
    } catch {
      return false;
    }
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerType, setScannerType] = useState<'siswa' | 'buku' | 'pengembalian'>('buku');
  const scannerCallbackRef = useRef<((code: string) => void) | null>(null);

  // Laser scanner buffer
  const scannerBufferRef = useRef<string>('');
  const scannerLastKeyTimeRef = useRef<number>(0);
  const scannerFastKeysRef = useRef<number>(0);
  const scannerTimeoutRef = useRef<number | null>(null);

  // Printable area state
  const [printContent, setPrintContent] = useState<{
    type: 'single-card' | 'all-cards' | 'a4-barcodes';
    siswa?: SiswaItem;
    buku?: BukuItem;
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  // Toggle desktop sidebar (Ctrl+B)
  const toggleDesktopSidebar = useCallback(() => {
    setIsDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('SIP_SIDEBAR_COLLAPSED', next ? '1' : '0');
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  // Listen to Firestore real-time cloud updates
  useEffect(() => {
    const unsubscribe = subscribeToCloudChanges((updater) => {
      setDb((prev) => {
        const next = sanitizeDatabase(updater(prev));
        saveRepository(next);
        return next;
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B shortcut to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleDesktopSidebar();
        return;
      }

      // Hardware keyboard wedge laser scanner detection
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return;

      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        scannerBufferRef.current = '';
        scannerFastKeysRef.current = 0;
        return;
      }

      const now = performance.now();
      const gap = now - scannerLastKeyTimeRef.current;
      scannerLastKeyTimeRef.current = now;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (scannerBufferRef.current.length >= 4 && scannerFastKeysRef.current >= 3) {
          e.preventDefault();
          e.stopPropagation();
          const scannedCode = scannerBufferRef.current.trim();
          scannerBufferRef.current = '';
          scannerFastKeysRef.current = 0;
          handleHardwareScan(scannedCode);
        } else {
          scannerBufferRef.current = '';
          scannerFastKeysRef.current = 0;
        }
        return;
      }

      if (e.key.length === 1) {
        if (gap > 120) {
          scannerBufferRef.current = '';
          scannerFastKeysRef.current = 0;
        } else {
          scannerFastKeysRef.current++;
        }
        scannerBufferRef.current += e.key;

        if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
        scannerTimeoutRef.current = window.setTimeout(() => {
          if (scannerFastKeysRef.current >= 5 && scannerBufferRef.current.length >= 6) {
            const scannedCode = scannerBufferRef.current.trim();
            scannerBufferRef.current = '';
            scannerFastKeysRef.current = 0;
            handleHardwareScan(scannedCode);
          } else {
            scannerBufferRef.current = '';
            scannerFastKeysRef.current = 0;
          }
        }, 220);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activePage, db, toggleDesktopSidebar]);

  const handleHardwareScan = (code: string) => {
    beepScan();
    const up = code.toUpperCase();

    if (activePage === 'peminjaman') {
      showToast(`Scanner mendeteksi: ${code}`, 'info');
      // If student code, or book code
    } else if (activePage === 'pengembalian') {
      const match = db.Peminjaman.find(
        (p) =>
          p.status === 'Dipinjam' &&
          (p.id.toUpperCase() === up ||
            (p.kodeEksemplar && p.kodeEksemplar.toUpperCase() === up) ||
            p.idBuku.toUpperCase() === up)
      );
      if (match) {
        showToast(`Buku ${match.id} diproses pengembalian via scanner`, 'info');
      } else {
        showToast(`Kode "${code}" tidak ditemukan dalam peminjaman aktif`, 'error');
      }
    } else {
      const s = findSiswaByCode(db, up);
      if (s) {
        setActivePage('siswa');
        showToast(`Siswa ditemukan: ${s.nama} (${s.id})`, 'success');
        return;
      }
      const b = findBukuByCode(db, up);
      if (b) {
        setActivePage('buku');
        showToast(`Buku ditemukan: ${b.judul} (${b.id})`, 'success');
      }
    }
  };

  const openScanner = (type: 'siswa' | 'buku' | 'pengembalian', onScan: (code: string) => void) => {
    setScannerType(type);
    scannerCallbackRef.current = onScan;
    setScannerOpen(true);
  };

  const handleBackup = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute(
      'download',
      `backup-perpustakaan-${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Cadangan database JSON berhasil diunduh', 'success');
  };

  const handleLogout = () => {
    if (confirm('Apakah Anda yakin ingin keluar dari sesi petugas?')) {
      setCurrentLoggedInUser(null);
      setCurrentUser(null);
      showToast('Anda telah keluar dari sistem', 'info');
    }
  };

  // Print Handlers
  const handlePrintSingleCard = (siswa: SiswaItem) => {
    setPrintContent({ type: 'single-card', siswa });
    setTimeout(() => {
      window.print();
      setPrintContent(null);
    }, 200);
  };

  const handlePrintAllCards = () => {
    setPrintContent({ type: 'all-cards' });
    setTimeout(() => {
      window.print();
      setPrintContent(null);
    }, 300);
  };

  const handlePrintA4Barcodes = (buku: BukuItem) => {
    setPrintContent({ type: 'a4-barcodes', buku });
    setTimeout(() => {
      window.print();
      setPrintContent(null);
    }, 300);
  };

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard db={db} currentUser={currentUser} onNavigate={setActivePage} />;
      case 'siswa':
        return (
          <SiswaPage
            db={db}
            onUpdateDb={setDb}
            onOpenScanner={openScanner}
            onPrintCard={(id) => {
              const s = db.Siswa.find((item) => item.id === id);
              if (s) handlePrintSingleCard(s);
            }}
            showToast={showToast}
          />
        );
      case 'buku':
        return (
          <BukuPage
            db={db}
            onUpdateDb={setDb}
            onOpenScanner={openScanner}
            onPrintA4Barcodes={handlePrintA4Barcodes}
            showToast={showToast}
          />
        );
      case 'ebook':
        return <EbookPage db={db} onUpdateDb={setDb} showToast={showToast} />;
      case 'admin':
        return (
          <AdminPage
            db={db}
            currentUser={currentUser}
            onUpdateDb={setDb}
            onNavigateToProfile={() => setActivePage('profil')}
            showToast={showToast}
          />
        );
      case 'peminjaman':
        return (
          <PeminjamanPage
            db={db}
            onUpdateDb={setDb}
            onOpenScanner={openScanner}
            showToast={showToast}
          />
        );
      case 'pengembalian':
        return (
          <PengembalianPage
            db={db}
            onUpdateDb={setDb}
            onOpenScanner={openScanner}
            showToast={showToast}
          />
        );
      case 'denda':
        return <DendaPage db={db} onUpdateDb={setDb} showToast={showToast} />;
      case 'cetak-kartu':
        return (
          <CetakKartuPage
            db={db}
            onPrintSingle={handlePrintSingleCard}
            onPrintAll={handlePrintAllCards}
          />
        );
      case 'laporan':
        return <LaporanPage db={db} showToast={showToast} />;
      case 'profil':
        return (
          <ProfilPage
            db={db}
            currentUser={currentUser}
            onUpdateCurrentUser={setCurrentUser}
            onUpdateDb={setDb}
            showToast={showToast}
          />
        );
      case 'pengaturan':
        return <PengaturanPage db={db} onUpdateDb={setDb} showToast={showToast} />;
      default:
        return <Dashboard db={db} currentUser={currentUser} onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-slate-100/70 text-slate-800 antialiased font-sans">
      {/* Auth Portal Overlay if not logged in */}
      <AuthModal
        isOpen={!currentUser}
        db={db}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
        showToast={showToast}
      />

      {/* Main Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        isDesktopCollapsed={isDesktopCollapsed}
        currentUser={currentUser}
        sekolah={db.Sekolah}
        onLogout={handleLogout}
        onBackup={handleBackup}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header
          activePage={activePage}
          isDesktopCollapsed={isDesktopCollapsed}
          onToggleDesktop={toggleDesktopSidebar}
          onOpenMobile={() => setIsMobileOpen(true)}
          onBackup={handleBackup}
          onLogout={handleLogout}
          onTriggerScanner={() => openScanner('buku', () => {})}
          scannerActive={activePage === 'peminjaman' || activePage === 'pengembalian'}
          isCloudConnected={isFirebaseAvailable()}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">{renderActivePage()}</div>
        </main>
      </div>

      {/* Camera Scanner Modal */}
      <ScannerModal
        isOpen={scannerOpen}
        type={scannerType}
        onScan={(code) => {
          if (scannerCallbackRef.current) {
            scannerCallbackRef.current(code);
          }
        }}
        onClose={() => setScannerOpen(false)}
      />

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-60 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';
          const isError = toast.type === 'error';
          return (
            <div
              key={toast.id}
              className={`p-3.5 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2.5 transition-all duration-200 pointer-events-auto ${
                isSuccess
                  ? 'bg-slate-900 border-teal-500/40 text-white'
                  : isWarning
                  ? 'bg-amber-900/95 border-amber-600 text-white'
                  : isError
                  ? 'bg-rose-900/95 border-rose-600 text-white'
                  : 'bg-slate-900 border-slate-700 text-white'
              }`}
            >
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />}
              {!isSuccess && !isWarning && !isError && (
                <Info className="w-4 h-4 text-teal-400 shrink-0" />
              )}
              <span className="flex-1 leading-snug">{toast.message}</span>
            </div>
          );
        })}
      </div>

      {/* Hidden Printable Area */}
      <div id="printable-area" className="hidden">
        {printContent?.type === 'single-card' && printContent.siswa && (
          <div
            style={{
              width: '340px',
              border: '2px solid #0f172a',
              borderRadius: '12px',
              padding: '16px',
              fontFamily: 'sans-serif',
              background: '#ffffff',
              margin: '20px auto',
              pageBreakInside: 'avoid',
            }}
          >
            <div
              style={{
                textAlign: 'center',
                borderBottom: '2px solid #0f172a',
                paddingBottom: '8px',
                marginBottom: '12px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>
                {db.Sekolah?.nama || 'SMA Negeri 1 Edukasi'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#0d9488', fontWeight: 700 }}>
                KARTU ANGGOTA PERPUSTAKAAN
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div
                style={{
                  width: '60px',
                  height: '75px',
                  background: '#f1f5f9',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  color: '#64748b',
                }}
              >
                FOTO
              </div>
              <div style={{ fontSize: '11px', lineHeight: '1.4', flex: 1 }}>
                <p style={{ margin: '2px 0', fontWeight: 'bold' }}>{printContent.siswa.nama}</p>
                <p style={{ margin: '2px 0' }}>
                  <strong>No:</strong> {printContent.siswa.id}
                </p>
                <p style={{ margin: '2px 0' }}>
                  <strong>NISN:</strong> {printContent.siswa.nisn || '-'}
                </p>
                <p style={{ margin: '2px 0' }}>
                  <strong>Kelas:</strong> {printContent.siswa.kelas}
                </p>
              </div>
            </div>

            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <QRCodeView value={printContent.siswa.id} size={90} />
            </div>
          </div>
        )}

        {printContent?.type === 'all-cards' && (
          <div style={{ width: '100%', padding: '10mm', boxSizing: 'border-box' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
              }}
            >
              {(db.Siswa || []).map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: '2px solid #0f172a',
                    borderRadius: '10px',
                    padding: '12px',
                    fontFamily: 'sans-serif',
                    background: '#fff',
                    pageBreakInside: 'avoid',
                  }}
                >
                  <div
                    style={{
                      textAlign: 'center',
                      borderBottom: '2px solid #0f172a',
                      paddingBottom: '6px',
                      marginBottom: '8px',
                    }}
                  >
                    <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800 }}>
                      {db.Sekolah?.nama || 'SMA Negeri 1 Edukasi'}
                    </h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#0d9488', fontWeight: 700 }}>
                      KARTU ANGGOTA PERPUSTAKAAN
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ fontSize: '10px', lineHeight: '1.4', flex: 1 }}>
                      <p style={{ margin: '2px 0', fontWeight: 'bold' }}>{s.nama}</p>
                      <p style={{ margin: '2px 0' }}>
                        <strong>No:</strong> {s.id}
                      </p>
                      <p style={{ margin: '2px 0' }}>
                        <strong>Kelas:</strong> {s.kelas}
                      </p>
                    </div>
                    <QRCodeView value={s.id} size={65} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {printContent?.type === 'a4-barcodes' && printContent.buku && (
          <div style={{ width: '100%', padding: '10mm', boxSizing: 'border-box' }}>
            <div
              style={{
                textAlign: 'center',
                borderBottom: '2px solid #000',
                paddingBottom: '8px',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                {db.Sekolah?.nama}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>
                LABEL BARCODE EKSEMPLAR: {printContent.buku.judul} ({printContent.buku.jumlah} eks)
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}
            >
              {(
                printContent.buku.eksemplar ||
                buildEksemplarList(printContent.buku.id, printContent.buku.jumlah)
              ).map((ex) => (
                <div
                  key={ex.kode}
                  style={{
                    border: '1px dashed #64748b',
                    borderRadius: '8px',
                    padding: '10px',
                    textAlign: 'center',
                    background: '#fff',
                    pageBreakInside: 'avoid',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: '10px',
                      fontWeight: 800,
                      color: '#1e293b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {printContent.buku?.judul}
                  </p>
                  <div style={{ margin: '8px auto', display: 'flex', justifyContent: 'center' }}>
                    <QRCodeView value={ex.kode} size={80} />
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#0d9488' }}>
                    {ex.kode}
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#64748b' }}>
                    Status: {ex.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
