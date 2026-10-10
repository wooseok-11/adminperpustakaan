import React, { useState } from 'react';
import {
  RotateCcw,
  Search,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { DatabaseSchema, PeminjamanItem, DendaItem } from '../types';
import { saveRepository } from '../utils/storage';
import { saveItemToCloud } from '../services/firebase';

interface PengembalianPageProps {
  db: DatabaseSchema;
  onUpdateDb: (updated: DatabaseSchema) => void;
  onOpenScanner: (type: 'pengembalian', onScan: (code: string) => void) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const PengembalianPage: React.FC<PengembalianPageProps> = ({
  db,
  onUpdateDb,
  onOpenScanner,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const activeLoans = (db.Peminjaman || []).filter((p) => p.status === 'Dipinjam');

  const filteredLoans = activeLoans.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const siswa = db.Siswa.find((s) => s.id === p.idSiswa);
    const buku = db.Buku.find((b) => b.id === p.idBuku);
    return (
      p.id.toLowerCase().includes(q) ||
      (p.kodeEksemplar || '').toLowerCase().includes(q) ||
      (siswa?.nama || '').toLowerCase().includes(q) ||
      (siswa?.id || '').toLowerCase().includes(q) ||
      (buku?.judul || '').toLowerCase().includes(q) ||
      (buku?.id || '').toLowerCase().includes(q)
    );
  });

  const handleProcessReturn = (idTrx: string) => {
    const targetLoan = db.Peminjaman.find((p) => p.id === idTrx);
    if (!targetLoan) return;

    const dTempo = new Date(targetLoan.tglJatuhTempo);
    const dReturn = new Date(today);
    const diffTime = dReturn.getTime() - dTempo.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const lateDays = diffDays > 0 ? diffDays : 0;
    const tarifDenda = db.Pengaturan?.tarifDenda || 1000;
    const totalDenda = lateDays * tarifDenda;

    // Update loan
    const updatedLoans = db.Peminjaman.map((p) => {
      if (p.id === idTrx) {
        return {
          ...p,
          status: 'Dikembalikan' as const,
          tglKembali: today,
        };
      }
      return p;
    });

    // Update book & physical exemplar
    const updatedBukuList = db.Buku.map((b) => {
      if (b.id === targetLoan.idBuku) {
        const exemplars = b.eksemplar || [];
        const updatedEx = exemplars.map((ex) => {
          if (ex.kode === targetLoan.kodeEksemplar) {
            return { ...ex, status: 'Tersedia' as const };
          }
          return ex;
        });
        return {
          ...b,
          tersedia: b.tersedia + 1,
          eksemplar: updatedEx,
        };
      }
      return b;
    });

    // Add fine record if overdue
    const updatedDendaList = [...(db.Denda || [])];
    if (lateDays > 0) {
      const fineId = `FNE-2026-${String(updatedDendaList.length + 1).padStart(4, '0')}`;
      const newDenda: DendaItem = {
        id: fineId,
        idTrx: targetLoan.id,
        idSiswa: targetLoan.idSiswa,
        hariTerlambat: lateDays,
        totalDenda,
        dibayar: 0,
        sisa: totalDenda,
        status: 'Belum Lunas',
        tgl: today,
      };
      updatedDendaList.push(newDenda);
      saveItemToCloud('denda', fineId, newDenda as unknown as Record<string, unknown>);
    }

    // Sync updated loan and book to cloud
    const returnedLoanData = updatedLoans.find((p) => p.id === idTrx);
    if (returnedLoanData) {
      saveItemToCloud('peminjaman', idTrx, returnedLoanData as unknown as Record<string, unknown>);
    }
    const updatedBookData = updatedBukuList.find((b) => b.id === targetLoan.idBuku);
    if (updatedBookData) {
      saveItemToCloud('buku', targetLoan.idBuku, updatedBookData as unknown as Record<string, unknown>);
    }

    const updatedDb: DatabaseSchema = {
      ...db,
      Buku: updatedBukuList,
      Peminjaman: updatedLoans,
      Denda: updatedDendaList,
    };

    saveRepository(updatedDb);
    onUpdateDb(updatedDb);

    if (lateDays > 0) {
      showToast(
        `Buku dikembalikan. Terlambat ${lateDays} hari (Denda: Rp${totalDenda.toLocaleString('id-ID')})`,
        'warning'
      );
    } else {
      showToast('Buku berhasil dikembalikan tepat waktu!', 'success');
    }
  };

  const handleScanReturn = () => {
    onOpenScanner('pengembalian', (scannedCode) => {
      const up = scannedCode.trim().toUpperCase();
      const match = db.Peminjaman.find(
        (p) =>
          p.status === 'Dipinjam' &&
          (p.id.toUpperCase() === up ||
            (p.kodeEksemplar && p.kodeEksemplar.toUpperCase() === up) ||
            p.idBuku.toUpperCase() === up)
      );

      if (match) {
        handleProcessReturn(match.id);
      } else {
        showToast(`Transaksi aktif tidak ditemukan untuk kode barcode "${up}"`, 'error');
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Search and Scan Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID Transaksi, Siswa, Judul, atau Barcode..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500"
          />
        </div>

        <button
          onClick={handleScanReturn}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
        >
          <Camera className="w-4 h-4" />
          <span>Pindai Barcode Buku</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">ID Transaksi</th>
                <th className="p-3">Peminjam</th>
                <th className="p-3">Buku & Eksemplar</th>
                <th className="p-3">Tgl Pinjam</th>
                <th className="p-3">Jatuh Tempo</th>
                <th className="p-3 text-center">Status Tenggat</th>
                <th className="p-3 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    {activeLoans.length === 0
                      ? 'Tidak ada buku yang sedang dipinjam saat ini. Semua buku telah dikembalikan.'
                      : 'Pencarian tidak menemukan transaksi peminjaman aktif.'}
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const siswa = db.Siswa.find((s) => s.id === loan.idSiswa);
                  const buku = db.Buku.find((b) => b.id === loan.idBuku);
                  const isLate = loan.tglJatuhTempo < today;
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-medium text-teal-700">{loan.id}</td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-900 block">
                          {siswa?.nama || loan.idSiswa}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {siswa?.kelas} · {loan.idSiswa}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-900 block max-w-xs truncate">
                          {buku?.judul || loan.idBuku}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {loan.kodeEksemplar || loan.idBuku} · Rak {buku?.rak || '-'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{loan.tglPinjam}</td>
                      <td className="p-3 font-mono font-medium text-slate-800">
                        {loan.tglJatuhTempo}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`font-mono text-[11px] font-medium px-2 py-0.5 rounded ${
                            isLate
                              ? 'text-rose-700 bg-rose-50 border border-rose-200'
                              : 'text-teal-700 bg-teal-50 border border-teal-200'
                          }`}
                        >
                          {isLate ? 'Terlambat' : 'Masih Berjalan'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleProcessReturn(loan.id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                        >
                          Kembalikan
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
