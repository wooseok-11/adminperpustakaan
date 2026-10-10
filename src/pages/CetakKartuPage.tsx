import React, { useState } from 'react';
import { IdCard, Printer, Search, User } from 'lucide-react';
import { DatabaseSchema, SiswaItem } from '../types';
import { QRCodeView } from '../components/QRCodeView';

interface CetakKartuPageProps {
  db: DatabaseSchema;
  onPrintSingle: (siswa: SiswaItem) => void;
  onPrintAll: () => void;
}

export const CetakKartuPage: React.FC<CetakKartuPageProps> = ({
  db,
  onPrintSingle,
  onPrintAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const siswaList = (db.Siswa || []).filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.nama || '').toLowerCase().includes(q) ||
      (s.id || '').toLowerCase().includes(q) ||
      (s.nisn || '').toLowerCase().includes(q) ||
      (s.kelas || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari siswa untuk cetak kartu..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500"
          />
        </div>

        <button
          onClick={onPrintAll}
          disabled={siswaList.length === 0}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Semua Kartu ({siswaList.length})</span>
        </button>
      </div>

      {/* Card Preview Grid */}
      {siswaList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
          Tidak ada data siswa ditemukan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {siswaList.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              {/* Card Face */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-xl p-4 relative overflow-hidden space-y-3">
                <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div>
                    <h5 className="font-bold text-[11px] text-white tracking-wide truncate max-w-[200px]">
                      {db.Sekolah?.nama || 'SMA Negeri 1 Edukasi'}
                    </h5>
                    <p className="text-[9px] text-teal-300 font-medium">KARTU ANGGOTA PERPUSTAKAAN</p>
                  </div>
                  <span className="font-mono text-[10px] text-teal-400 font-semibold">{s.id}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 text-[11px] leading-tight">
                    <p className="font-semibold text-white text-xs truncate max-w-[170px]">{s.nama}</p>
                    <p className="text-slate-300">Kelas: <span className="font-medium text-white">{s.kelas}</span></p>
                    <p className="text-slate-400 font-mono text-[10px]">NISN: {s.nisn || '-'}</p>
                  </div>

                  <div className="bg-white p-1 rounded-lg shrink-0">
                    <QRCodeView value={s.id} size={64} />
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400 text-[11px] font-mono">{s.kelas}</span>
                <button
                  onClick={() => onPrintSingle(s)}
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium rounded-lg transition-colors flex items-center gap-1.5 border border-teal-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Kartu Ini</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
