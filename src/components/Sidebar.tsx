import React from 'react';
import {
  LayoutDashboard,
  Users,
  Book,
  FileText,
  UserCheck,
  ArrowRightLeft,
  RotateCcw,
  Receipt,
  IdCard,
  Printer,
  Settings,
  LogOut,
  Download,
  BookOpen,
  X,
  User,
} from 'lucide-react';
import { PageId, AdministratorItem, SekolahConfig } from '../types';

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isDesktopCollapsed: boolean;
  currentUser: AdministratorItem | null;
  sekolah: SekolahConfig;
  onLogout: () => void;
  onBackup: () => void;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ElementType;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  isDesktopCollapsed,
  currentUser,
  sekolah,
  onLogout,
  onBackup,
}) => {
  const masterNavs: NavItem[] = [
    { id: 'siswa', label: 'Data Anggota', icon: Users },
    { id: 'buku', label: 'Katalog Buku', icon: Book },
    { id: 'ebook', label: 'Koleksi E-Book', icon: BookOpen },
    { id: 'admin', label: 'Data Petugas', icon: UserCheck },
  ];

  const circulationNavs: NavItem[] = [
    { id: 'peminjaman', label: 'Peminjaman', icon: ArrowRightLeft },
    { id: 'pengembalian', label: 'Pengembalian', icon: RotateCcw },
    { id: 'denda', label: 'Denda & Pembayaran', icon: Receipt },
  ];

  const reportNavs: NavItem[] = [
    { id: 'profil', label: 'Profil Saya', icon: User },
    { id: 'cetak-kartu', label: 'Kartu Anggota', icon: IdCard },
    { id: 'laporan', label: 'Laporan Sirkulasi', icon: Printer },
    { id: 'pengaturan', label: 'Pengaturan Sistem', icon: Settings },
  ];

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-0.5">
      <div className="px-3 pt-3 pb-1 text-[11px] font-medium text-slate-400 tracking-wider">
        {title}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              onNavigate(item.id);
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left whitespace-nowrap ${
              isActive
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 ease-out select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isDesktopCollapsed ? 'lg:w-0 lg:border-r-0 lg:overflow-hidden lg:opacity-0' : 'w-64 shrink-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h1 className="font-bold text-slate-900 text-xs tracking-tight truncate">
                {sekolah.nama || 'SIP-Perpus'}
              </h1>
              <p className="text-[11px] text-slate-400 font-normal truncate">Perpustakaan Digital</p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items Scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
          {/* Dashboard item */}
          <button
            onClick={() => {
              onNavigate('dashboard');
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
              activePage === 'dashboard'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard
              className={`w-4 h-4 shrink-0 ${
                activePage === 'dashboard' ? 'text-teal-400' : 'text-slate-400'
              }`}
            />
            <span>Ringkasan Dasbor</span>
          </button>

          {renderNavGroup('DATA MASTER', masterNavs)}
          {renderNavGroup('SIRKULASI', circulationNavs)}
          {renderNavGroup('AKUN & LAPORAN', reportNavs)}
        </div>

        {/* User Card & Actions Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 shrink-0 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              onNavigate('profil');
              onCloseMobile();
            }}
            className="flex items-center gap-2.5 overflow-hidden text-left flex-1 hover:opacity-80 transition-opacity p-1 rounded-lg"
          >
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-semibold text-xs flex items-center justify-center shrink-0 overflow-hidden border border-teal-200">
              {currentUser?.foto ? (
                <img
                  src={currentUser.foto}
                  alt={currentUser.nama}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>
                  {(currentUser?.nama || currentUser?.username || 'AP')
                    .substring(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {currentUser?.nama || currentUser?.username || 'Petugas'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {currentUser?.role || 'Administrator'}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onBackup}
              title="Cadangkan Database"
              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onLogout}
              title="Keluar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
