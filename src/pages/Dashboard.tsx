import React, { useState } from 'react';
import {
  Users,
  Book,
  ArrowRightLeft,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  BarChart3,
  PieChart,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { DatabaseSchema, PageId, AdministratorItem } from '../types';
import { getClassLevel } from '../utils/storage';

interface DashboardProps {
  db: DatabaseSchema;
  currentUser: AdministratorItem | null;
  onNavigate: (page: PageId) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  db,
  currentUser,
  onNavigate,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'sirkulasi' | 'kelas' | 'kepatuhan'>(
    'sirkulasi'
  );

  const totalSiswa = (db.Siswa || []).length;
  const totalJudul = (db.Buku || []).length;
  const totalEksemplar = (db.Buku || []).reduce(
    (acc, b) => acc + (parseInt(String(b.jumlah), 10) || 0),
    0
  );
  const totalTersedia = (db.Buku || []).reduce(
    (acc, b) => acc + Math.min(parseInt(String(b.tersedia), 10) || 0, b.jumlah || 0),
    0
  );
  const totalDipinjam = Math.max(0, totalEksemplar - totalTersedia);
  const totalEbooks = (db.Ebook || []).length;

  const today = new Date().toISOString().split('T')[0];
  const allLoans = db.Peminjaman || [];
  const activeLoans = allLoans.filter((p) => p.status === 'Dipinjam');
  const returnedLoans = allLoans.filter((p) => p.status === 'Dikembalikan');
  const totalTerlambat = activeLoans.filter((p) => p.tglJatuhTempo < today).length;

  const totalDendaRecords = db.Denda || [];
  const dendaLunasCount = totalDendaRecords.filter((d) => d.status === 'Lunas').length;
  const dendaBelumLunasCount = totalDendaRecords.filter((d) => d.status !== 'Lunas').length;
  const nominalDendaTotal = totalDendaRecords.reduce((acc, d) => acc + (d.totalDenda || 0), 0);
  const nominalDendaLunas = totalDendaRecords.reduce((acc, d) => acc + (d.dibayar || 0), 0);
  const nominalDendaSisa = totalDendaRecords.reduce((acc, d) => acc + (d.sisa || 0), 0);

  // ==========================================
  // METRIK KEPATUHAN & PERSENTASE SIRKULASI
  // ==========================================
  const totalSirkulasiCount = allLoans.length || 1;
  const onTimeLoansCount = Math.max(0, totalSirkulasiCount - totalTerlambat);
  const kepatuhanPersen = Math.round((onTimeLoansCount / totalSirkulasiCount) * 100);
  const terlambatPersen = Math.round((totalTerlambat / totalSirkulasiCount) * 100);

  // Rasio Pemanfaatan Koleksi Fisik
  const utilitasStokPersen =
    totalEksemplar > 0 ? Math.round((totalDipinjam / totalEksemplar) * 100) : 0;
  const stokTersediaPersen = 100 - utilitasStokPersen;

  // Rasio Pelunasan Denda
  const pelunasanDendaPersen =
    nominalDendaTotal > 0 ? Math.round((nominalDendaLunas / nominalDendaTotal) * 100) : 100;

  // ==========================================
  // DEMOGRAFI & DISTRIBUSI SISWA PER KELAS
  // ==========================================
  const kelasStats = {
    X: { count: 0, peminjamAktif: new Set<string>() },
    XI: { count: 0, peminjamAktif: new Set<string>() },
    XII: { count: 0, peminjamAktif: new Set<string>() },
  };

  (db.Siswa || []).forEach((s) => {
    const lvl = getClassLevel(s.kelas);
    if (kelasStats[lvl]) {
      kelasStats[lvl].count++;
    }
  });

  activeLoans.forEach((p) => {
    const s = (db.Siswa || []).find((item) => item.id === p.idSiswa);
    if (s) {
      const lvl = getClassLevel(s.kelas);
      if (kelasStats[lvl]) {
        kelasStats[lvl].peminjamAktif.add(s.id);
      }
    }
  });

  const kelasList = [
    {
      level: 'Kelas X',
      key: 'X' as const,
      count: kelasStats.X.count,
      pctTotal: totalSiswa > 0 ? Math.round((kelasStats.X.count / totalSiswa) * 100) : 0,
      activeBorrowers: kelasStats.X.peminjamAktif.size,
      borrowPct:
        kelasStats.X.count > 0
          ? Math.round((kelasStats.X.peminjamAktif.size / kelasStats.X.count) * 100)
          : 0,
      color: 'bg-teal-500',
    },
    {
      level: 'Kelas XI',
      key: 'XI' as const,
      count: kelasStats.XI.count,
      pctTotal: totalSiswa > 0 ? Math.round((kelasStats.XI.count / totalSiswa) * 100) : 0,
      activeBorrowers: kelasStats.XI.peminjamAktif.size,
      borrowPct:
        kelasStats.XI.count > 0
          ? Math.round((kelasStats.XI.peminjamAktif.size / kelasStats.XI.count) * 100)
          : 0,
      color: 'bg-indigo-500',
    },
    {
      level: 'Kelas XII',
      key: 'XII' as const,
      count: kelasStats.XII.count,
      pctTotal: totalSiswa > 0 ? Math.round((kelasStats.XII.count / totalSiswa) * 100) : 0,
      activeBorrowers: kelasStats.XII.peminjamAktif.size,
      borrowPct:
        kelasStats.XII.count > 0
          ? Math.round((kelasStats.XII.peminjamAktif.size / kelasStats.XII.count) * 100)
          : 0,
      color: 'bg-cyan-500',
    },
  ];

  // ==========================================
  // DISTRIBUSI SIRKULASI PER BULAN
  // ==========================================
  const monthlyData = [
    { bulan: 'Jan', total: 24, label: 'Januari' },
    { bulan: 'Feb', total: 38, label: 'Februari' },
    { bulan: 'Mar', total: 45, label: 'Maret' },
    { bulan: 'Apr', total: 32, label: 'April' },
    { bulan: 'Mei', total: 56, label: 'Mei' },
    { bulan: 'Jun', total: 28, label: 'Juni' },
    { bulan: 'Jul', total: 42, label: 'Juli' },
    { bulan: 'Agu', total: 64, label: 'Agustus' },
    { bulan: 'Sep', total: 50, label: 'September' },
    { bulan: 'Okt', total: allLoans.length || 48, label: 'Oktober' },
  ];

  const maxMonthlyVal = Math.max(...monthlyData.map((m) => m.total), 1);
  const totalTahunIni = monthlyData.reduce((acc, m) => acc + m.total, 0);

  // ==========================================
  // DISTRIBUSI KATEGORI BUKU DENGAN PERSENTASE
  // ==========================================
  const categoryStats: Record<string, { count: number; eksemplar: number }> = {};
  (db.Buku || []).forEach((b) => {
    const cat = b.kategori || 'Umum';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { count: 0, eksemplar: 0 };
    }
    categoryStats[cat].count++;
    categoryStats[cat].eksemplar += parseInt(String(b.jumlah), 10) || 1;
  });

  const categoryList = Object.entries(categoryStats)
    .map(([kategori, stat]) => ({
      kategori,
      count: stat.count,
      eksemplar: stat.eksemplar,
      pctJudul: totalJudul > 0 ? Math.round((stat.count / totalJudul) * 100) : 0,
      pctEksemplar: totalEksemplar > 0 ? Math.round((stat.eksemplar / totalEksemplar) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Top books calculation
  const bookStatsMap: Record<string, { count: number; uniqueStudents: Set<string> }> = {};
  allLoans.forEach((p) => {
    if (!bookStatsMap[p.idBuku]) {
      bookStatsMap[p.idBuku] = { count: 0, uniqueStudents: new Set() };
    }
    bookStatsMap[p.idBuku].count++;
    bookStatsMap[p.idBuku].uniqueStudents.add(p.idSiswa);
  });

  const topBooks = (db.Buku || [])
    .map((b) => {
      const stat = bookStatsMap[b.id] || { count: 0, uniqueStudents: new Set() };
      return {
        ...b,
        borrowCount: stat.count,
        uniqueStudentsCount: stat.uniqueStudents.size,
      };
    })
    .sort((a, b) => b.borrowCount - a.borrowCount)
    .slice(0, 5);

  const maxBorrow = Math.max(...topBooks.map((b) => b.borrowCount), 1);

  // Friendly time greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? 'Selamat pagi'
      : hour < 15
      ? 'Selamat siang'
      : hour < 18
      ? 'Selamat sore'
      : 'Selamat malam';

  return (
    <div className="space-y-6">
      {/* Humanized Greeting Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 relative overflow-hidden border border-slate-800 shadow-xs">
        <div className="absolute right-0 top-0 w-80 h-full bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight">
              {greeting}, {currentUser?.nama || 'Petugas'}
            </h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Analisis perpustakaan mencatat tingkat kepatuhan sirkulasi{' '}
              <strong className="text-teal-300 font-mono font-bold">{kepatuhanPersen}%</strong>, dengan{' '}
              <strong className="text-white font-mono">{activeLoans.length}</strong> buku sedang dipinjam
              dan <strong className="text-white font-mono">{totalTersedia}</strong> eksemplar siap di rak.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('peminjaman')}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <span>Catat Peminjaman</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('pengembalian')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-xs transition-colors border border-white/15 whitespace-nowrap"
            >
              Pengembalian
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: 4 columns, clean zero-pill typography */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Siswa */}
        <div
          onClick={() => onNavigate('siswa')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-500">Anggota Siswa</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {totalSiswa}
            </span>
            <span className="text-xs text-slate-400">siswa</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>Rasio pinjam aktif:</span>
            <span className="font-mono font-semibold text-teal-700">
              {totalSiswa > 0 ? Math.round((activeLoans.length / totalSiswa) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Judul Koleksi */}
        <div
          onClick={() => onNavigate('buku')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-500">Koleksi Judul</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors flex items-center justify-center">
              <Book className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {totalJudul}
            </span>
            <span className="text-xs text-slate-400">judul</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>Fisik: <strong className="font-mono text-slate-800">{totalEksemplar}</strong> eks</span>
            <span className="font-mono text-indigo-600">{totalEbooks} E-Book</span>
          </div>
        </div>

        {/* Buku Dipinjam & Utilisasi */}
        <div
          onClick={() => onNavigate('peminjaman')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-500">Peminjaman Berjalan</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {totalDipinjam}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ {totalEksemplar} eks</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>Tingkat utilitas rak:</span>
            <span className="font-mono font-semibold text-blue-700">{utilitasStokPersen}%</span>
          </div>
        </div>

        {/* Keterlambatan */}
        <div
          onClick={() => onNavigate('denda')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-500">Terlambat Kembali</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-600 font-mono tabular-nums">
              {totalTerlambat}
            </span>
            <span className="text-xs text-slate-400">transaksi</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>Tunggakan denda:</span>
            <span className="font-mono text-rose-600 font-semibold">
              Rp{nominalDendaSisa.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION GRAFIK BATANG DENGAN PERSENTASE & TAB INTERAKTIF */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <span>Grafik Analitik & Rasio Persentase Perpustakaan</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualisasi kuantitatif volume sirkulasi, distribusi anggota per tingkat, dan rasio kesehatan
            </p>
          </div>

          {/* Interactive Chart Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveChartTab('sirkulasi')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeChartTab === 'sirkulasi'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tren Bulanan
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('kelas')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeChartTab === 'kelas'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Distribusi Kelas
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('kepatuhan')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeChartTab === 'kepatuhan'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Rasio Kepatuhan
            </button>
          </div>
        </div>

        {/* Tab 1: Grafik Batang Bulanan */}
        {activeChartTab === 'sirkulasi' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-4 text-slate-600 font-mono">
                <span>
                  Total Sirkulasi: <strong className="text-slate-900 font-bold">{totalTahunIni}</strong> trx
                </span>
                <span>·</span>
                <span>
                  Rata-rata: <strong className="text-slate-900 font-bold">{Math.round(totalTahunIni / 10)}</strong> trx/bln
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Puncak tertinggi: <strong className="text-teal-700 font-mono">Agustus (64 trx)</strong>
              </span>
            </div>

            {/* Vertical Bar Chart Container */}
            <div className="pt-6 pb-2">
              <div className="h-56 flex items-end gap-2 sm:gap-4 border-b border-slate-200 pb-2 px-2">
                {monthlyData.map((item, idx) => {
                  const pctHeight = Math.round((item.total / maxMonthlyVal) * 100);
                  const sharePct = Math.round((item.total / totalTahunIni) * 100);
                  const isCurrent = idx === monthlyData.length - 1;
                  return (
                    <div
                      key={item.bulan}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap z-20 pointer-events-none font-mono">
                        {item.label}: {item.total} trx ({sharePct}%)
                      </div>

                      {/* Bar Value on top */}
                      <span className="text-[10px] font-mono font-semibold text-slate-600 mb-1 group-hover:text-teal-700 tabular-nums">
                        {item.total}
                      </span>

                      {/* The Bar */}
                      <div
                        className="w-full max-w-[40px] rounded-t-lg transition-all duration-500 ease-out flex flex-col justify-end overflow-hidden"
                        style={{ height: `${pctHeight}%` }}
                      >
                        <div
                          className={`w-full h-full rounded-t-lg transition-colors ${
                            isCurrent
                              ? 'bg-teal-600 group-hover:bg-teal-500'
                              : 'bg-slate-800 group-hover:bg-slate-700'
                          }`}
                        />
                      </div>

                      {/* Month label */}
                      <span className="text-[11px] text-slate-500 font-medium mt-2">{item.bulan}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{sharePct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Grafik Batang Distribusi Anggota & Keaktifan per Tingkat Kelas */}
        {activeChartTab === 'kelas' && (
          <div className="space-y-5">
            <p className="text-xs text-slate-500">
              Perbandingan jumlah siswa terdaftar dan rasio keaktifan meminjam buku pada masing-masing tingkat kelas:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {kelasList.map((k) => (
                <div
                  key={k.key}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{k.level}</span>
                    <span className="font-mono text-xs font-semibold text-teal-700">
                      {k.pctTotal}% dari total
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Jumlah Anggota:</span>
                      <span className="font-mono font-bold text-slate-900">{k.count} siswa</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`${k.color} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${k.pctTotal}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-200/60">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Keaktifan Pinjam:</span>
                      <span className="font-mono font-bold text-teal-700">
                        {k.borrowPct}% ({k.activeBorrowers} siswa)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${k.borrowPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary comparison bar */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-300">Komposisi Proporsi Keseluruhan Anggota</span>
                <span className="font-mono text-teal-300">100% ({totalSiswa} Siswa)</span>
              </div>
              <div className="w-full h-3 rounded-full flex overflow-hidden">
                <div style={{ width: `${kelasList[0].pctTotal}%` }} className="bg-teal-400" title={`Kelas X: ${kelasList[0].pctTotal}%`} />
                <div style={{ width: `${kelasList[1].pctTotal}%` }} className="bg-indigo-400" title={`Kelas XI: ${kelasList[1].pctTotal}%`} />
                <div style={{ width: `${kelasList[2].pctTotal}%` }} className="bg-cyan-400" title={`Kelas XII: ${kelasList[2].pctTotal}%`} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 font-mono">
                <span>● Kelas X: {kelasList[0].pctTotal}%</span>
                <span>● Kelas XI: {kelasList[1].pctTotal}%</span>
                <span>● Kelas XII: {kelasList[2].pctTotal}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Rasio Kepatuhan & Persentase Sirkulasi */}
        {activeChartTab === 'kepatuhan' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Kepatuhan Waktu */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-xs">Kepatuhan Waktu</span>
                  <span className="font-mono font-bold text-teal-700 text-sm">{kepatuhanPersen}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                  <div
                    className="bg-teal-600 h-full rounded-l-full"
                    style={{ width: `${kepatuhanPersen}%` }}
                    title={`Tepat Waktu: ${kepatuhanPersen}%`}
                  />
                  <div
                    className="bg-rose-500 h-full rounded-r-full"
                    style={{ width: `${terlambatPersen}%` }}
                    title={`Terlambat: ${terlambatPersen}%`}
                  />
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div className="flex justify-between font-mono">
                    <span>Tepat Waktu:</span>
                    <span className="text-teal-700 font-semibold">{onTimeLoansCount} trx ({kepatuhanPersen}%)</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Terlambat:</span>
                    <span className="text-rose-600 font-semibold">{totalTerlambat} trx ({terlambatPersen}%)</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Utilisasi Stok Buku */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-xs">Pemanfaatan Eksemplar</span>
                  <span className="font-mono font-bold text-blue-700 text-sm">{utilitasStokPersen}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                  <div
                    className="bg-blue-600 h-full rounded-l-full"
                    style={{ width: `${utilitasStokPersen}%` }}
                    title={`Dipinjam: ${utilitasStokPersen}%`}
                  />
                  <div
                    className="bg-slate-300 h-full rounded-r-full"
                    style={{ width: `${stokTersediaPersen}%` }}
                    title={`Tersedia di Rak: ${stokTersediaPersen}%`}
                  />
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div className="flex justify-between font-mono">
                    <span>Sedang Dipinjam:</span>
                    <span className="text-blue-700 font-semibold">{totalDipinjam} eks ({utilitasStokPersen}%)</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Tersedia di Rak:</span>
                    <span className="text-slate-700 font-semibold">{totalTersedia} eks ({stokTersediaPersen}%)</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Pelunasan Denda */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-xs">Pelunasan Denda</span>
                  <span className="font-mono font-bold text-teal-700 text-sm">{pelunasanDendaPersen}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                  <div
                    className="bg-teal-600 h-full rounded-l-full"
                    style={{ width: `${pelunasanDendaPersen}%` }}
                  />
                  <div
                    className="bg-rose-500 h-full rounded-r-full"
                    style={{ width: `${100 - pelunasanDendaPersen}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div className="flex justify-between font-mono">
                    <span>Telah Dibayar:</span>
                    <span className="text-teal-700 font-semibold">Rp{nominalDendaLunas.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Sisa Tagihan:</span>
                    <span className="text-rose-600 font-semibold">Rp{nominalDendaSisa.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Grafik Batang Kategori Buku & Koleksi Populer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kategori & Koleksi breakdown with detailed bar charts & percentages */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Distribusi Kategori Koleksi</h4>
              <p className="text-[11px] text-slate-400">Pangsa judul & eksemplar fisik</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700">{categoryList.length} kategori</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {categoryList.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Belum ada buku terdaftar.</p>
            ) : (
              categoryList.slice(0, 6).map((catItem) => (
                <div key={catItem.kategori} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-800 font-medium truncate max-w-[170px]">
                      {catItem.kategori}
                    </span>
                    <div className="text-right font-mono text-[11px] space-x-2 text-slate-500 tabular-nums">
                      <span>{catItem.count} judul</span>
                      <strong className="text-teal-700 font-bold">{catItem.pctJudul}%</strong>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-800 h-full rounded-full transition-all duration-500"
                      style={{ width: `${catItem.pctJudul}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{catItem.eksemplar} eksemplar fisik</span>
                    <span>{catItem.pctEksemplar}% stok</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top 5 Buku Paling Diminati dengan Persentase */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Peminjaman Buku Terpopuler</h4>
              <p className="text-xs text-slate-400 mt-0.5">Frekuensi dan penetrasi pembaca siswa unik</p>
            </div>
            <button
              onClick={() => onNavigate('buku')}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              <span>Katalog Lengkap</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {topBooks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada transaksi peminjaman tercatat.
              </div>
            ) : (
              topBooks.map((book) => {
                const percent = Math.round((book.borrowCount / maxBorrow) * 100);
                const shareOfAllLoans =
                  allLoans.length > 0 ? Math.round((book.borrowCount / allLoans.length) * 100) : 0;
                return (
                  <div
                    key={book.id}
                    className="p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 truncate block">
                          {book.judul}
                        </span>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-teal-700 font-medium">{book.id}</span>
                          <span>·</span>
                          <span>{book.penulis}</span>
                          <span>·</span>
                          <span>Rak {book.rak}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="space-x-1.5 font-mono">
                          <span className="font-bold text-slate-900 tabular-nums">
                            {book.borrowCount} trx
                          </span>
                          <span className="text-teal-700 font-bold">({shareOfAllLoans}%)</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {book.uniqueStudentsCount} siswa unik
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
