import React from 'react';
import { Printer, Download, FileText, CheckCircle2, AlertTriangle, BookOpen, Users } from 'lucide-react';
import { DatabaseSchema } from '../types';
import { exportToExcel } from '../utils/excel';

interface LaporanPageProps {
  db: DatabaseSchema;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const LaporanPage: React.FC<LaporanPageProps> = ({ db, showToast }) => {
  const totalSiswa = (db.Siswa || []).length;
  const totalBuku = (db.Buku || []).length;
  const totalEksemplar = (db.Buku || []).reduce((acc, b) => acc + (b.jumlah || 0), 0);
  const totalPeminjaman = (db.Peminjaman || []).length;
  const peminjamanAktif = (db.Peminjaman || []).filter((p) => p.status === 'Dipinjam').length;
  const totalDenda = (db.Denda || []).length;
  const nominalDendaSisa = (db.Denda || [])
    .filter((d) => d.status !== 'Lunas')
    .reduce((acc, d) => acc + (d.sisa || 0), 0);

  const handleExportLaporan = () => {
    const summaryData = [
      { Metrik: 'Total Siswa Anggota', Nilai: totalSiswa, Satuan: 'Orang' },
      { Metrik: 'Total Judul Buku', Nilai: totalBuku, Satuan: 'Judul' },
      { Metrik: 'Total Eksemplar Fisik', Nilai: totalEksemplar, Satuan: 'Buku' },
      { Metrik: 'Total Transaksi Peminjaman', Nilai: totalPeminjaman, Satuan: 'Transaksi' },
      { Metrik: 'Peminjaman Sedang Berjalan', Nilai: peminjamanAktif, Satuan: 'Transaksi' },
      { Metrik: 'Total Kasus Keterlambatan', Nilai: totalDenda, Satuan: 'Kasus' },
      { Metrik: 'Sisa Denda Belum Lunas', Nilai: nominalDendaSisa, Satuan: 'Rupiah' },
    ];
    exportToExcel(
      summaryData,
      `Laporan_Perpustakaan_${new Date().toISOString().split('T')[0]}`,
      'Rekap_Perpus'
    );
    showToast('Laporan berhasil diekspor ke Excel', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-slate-900 text-sm">Rekapitulasi Operasional Perpustakaan</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Laporan sirkulasi, inventaris koleksi, dan kepatuhan pengembalian anggota
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen</span>
          </button>
          <button
            onClick={handleExportLaporan}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="p-3.5">Kategori Rekapitulasi</th>
              <th className="p-3.5">Jumlah Tercatat</th>
              <th className="p-3.5 text-center">Status Operasional</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="hover:bg-slate-50/80">
              <td className="p-3.5 font-medium text-slate-900">Total Anggota Terdaftar (Siswa)</td>
              <td className="p-3.5 font-mono font-semibold text-slate-900 tabular-nums">
                {totalSiswa} Siswa
              </td>
              <td className="p-3.5 text-center">
                <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Aktif
                </span>
              </td>
            </tr>
            <tr className="hover:bg-slate-50/80">
              <td className="p-3.5 font-medium text-slate-900">Koleksi Judul Buku Perpustakaan</td>
              <td className="p-3.5 font-mono font-semibold text-slate-900 tabular-nums">
                {totalBuku} Judul ({totalEksemplar} Eksemplar Fisik)
              </td>
              <td className="p-3.5 text-center">
                <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Tersedia
                </span>
              </td>
            </tr>
            <tr className="hover:bg-slate-50/80">
              <td className="p-3.5 font-medium text-slate-900">Riwayat Transaksi Peminjaman</td>
              <td className="p-3.5 font-mono font-semibold text-slate-900 tabular-nums">
                {totalPeminjaman} Transaksi ({peminjamanAktif} Sedang Berjalan)
              </td>
              <td className="p-3.5 text-center">
                <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Lancar
                </span>
              </td>
            </tr>
            <tr className="hover:bg-slate-50/80">
              <td className="p-3.5 font-medium text-slate-900">Catatan Denda Keterlambatan</td>
              <td className="p-3.5 font-mono font-semibold text-rose-600 tabular-nums">
                {totalDenda} Catatan · Sisa Tunggakan: Rp{nominalDendaSisa.toLocaleString('id-ID')}
              </td>
              <td className="p-3.5 text-center">
                <span className="text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Perlu Penagihan
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
