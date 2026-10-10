import React, { useEffect, useState } from 'react';
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
  Barcode,
  Power,
  ChevronRight,
  Cloud,
} from 'lucide-react';
import { PageId } from '../types';

interface HeaderProps {
  activePage: PageId;
  isDesktopCollapsed: boolean;
  onToggleDesktop: () => void;
  onOpenMobile: () => void;
  onBackup: () => void;
  onLogout: () => void;
  onTriggerScanner: () => void;
  scannerActive: boolean;
  isCloudConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  isDesktopCollapsed,
  onToggleDesktop,
  onOpenMobile,
  onBackup,
  onLogout,
  onTriggerScanner,
  scannerActive,
  isCloudConnected = true,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
      setDateStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPageInfo = (page: PageId): { title: string; subtitle: string; category: string } => {
    switch (page) {
      case 'dashboard':
        return {
          category: 'Beranda',
          title: 'Dasbor Utama',
          subtitle: 'Ringkasan operasional dan statistik aktivitas perpustakaan',
        };
      case 'siswa':
        return {
          category: 'Data Master',
          title: 'Data Anggota Siswa',
          subtitle: 'Daftar anggota perpustakaan, pencarian NISN, dan cetak kartu',
        };
      case 'buku':
        return {
          category: 'Data Master',
          title: 'Katalog Koleksi Buku',
          subtitle: 'Koleksi judul, eksemplar fisik, nomor rak, dan barcode buku',
        };
      case 'ebook':
        return {
          category: 'Data Master',
          title: 'Koleksi E-Book Digital',
          subtitle: 'Buku digital terhubung dengan Google Drive dan unduhan PDF',
        };
      case 'admin':
        return {
          category: 'Data Master',
          title: 'Petugas Administrator',
          subtitle: 'Otoritas akun petugas dan konfigurasi token registrasi',
        };
      case 'peminjaman':
        return {
          category: 'Sirkulasi',
          title: 'Transaksi Peminjaman',
          subtitle: 'Pencatatan peminjaman buku berbasis scan kartu dan barcode',
        };
      case 'pengembalian':
        return {
          category: 'Sirkulasi',
          title: 'Transaksi Pengembalian',
          subtitle: 'Pengembalian buku dan kalkulasi denda keterlambatan otomatis',
        };
      case 'denda':
        return {
          category: 'Sirkulasi',
          title: 'Denda & Pembayaran',
          subtitle: 'Riwayat denda keterlambatan dan pencatatan pelunasan',
        };
      case 'profil':
        return {
          category: 'Akun',
          title: 'Profil Saya',
          subtitle: 'Informasi akun pribadi, foto profil, dan kata sandi',
        };
      case 'cetak-kartu':
        return {
          category: 'Layanan',
          title: 'Cetak Kartu Anggota',
          subtitle: 'Pembuatan kartu perpustakaan siswa dengan kode QR',
        };
      case 'laporan':
        return {
          category: 'Laporan',
          title: 'Laporan Sirkulasi',
          subtitle: 'Rekapitulasi transaksi peminjaman, pengembalian, dan denda',
        };
      case 'pengaturan':
        return {
          category: 'Sistem',
          title: 'Pengaturan Perpustakaan',
          subtitle: 'Identitas sekolah, ketentuan sirkulasi, dan cadangan data',
        };
    }
  };

  const pageInfo = getPageInfo(activePage);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 select-none">
      {/* Zone 1: Navigation triggers & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onToggleDesktop}
          title={isDesktopCollapsed ? 'Tampilkan Menu (Ctrl+B)' : 'Sembunyikan Menu (Ctrl+B)'}
          className="hidden lg:flex p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {isDesktopCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 hidden sm:inline">{pageInfo.category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
          <h2 className="font-bold text-slate-900 text-sm">{pageInfo.title}</h2>
        </div>
      </div>

      {/* Zone 2 & 3: Status & Primary Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Cloud sync indicator */}
        <div
          title={
            isCloudConnected
              ? 'Terhubung dengan Firebase Firestore (Realtime Cloud Sync)'
              : 'Mode Penyimpanan Lokal'
          }
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border bg-slate-50 border-slate-200 text-slate-700"
        >
          <Cloud className={`w-3.5 h-3.5 ${isCloudConnected ? 'text-teal-600' : 'text-slate-400'}`} />
          <span className="text-[11px] text-slate-600 font-sans hidden lg:inline">
            {isCloudConnected ? 'Cloud Sync' : 'Lokal'}
          </span>
        </div>

        {/* Scanner wedge status indicator */}
        <button
          onClick={onTriggerScanner}
          title="Buka Pindai Kamera (atau gunakan scanner barcode USB langsung)"
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
            scannerActive
              ? 'bg-teal-50 border-teal-200 text-teal-700'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Barcode className="w-4 h-4 text-teal-600" />
          <span className="hidden md:inline">
            {scannerActive ? 'Scanner Siap' : 'Pindai Kamera'}
          </span>
        </button>

        {/* Clock */}
        <div className="text-right hidden sm:block border-l border-slate-100 pl-3">
          <div className="font-mono text-xs font-semibold text-slate-800 tabular-nums">
            {timeStr}
          </div>
          <div className="text-[10px] text-slate-400">{dateStr}</div>
        </div>

        {/* Backup button */}
        <button
          onClick={onBackup}
          title="Cadangkan data ke file JSON"
          className="p-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors border border-transparent hover:border-teal-200"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Logout button */}
        <button
          onClick={onLogout}
          title="Keluar dari sesi petugas"
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
        >
          <Power className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
