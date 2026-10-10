import React, { useState } from 'react';
import { Receipt, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { DatabaseSchema, DendaItem } from '../types';
import { saveRepository } from '../utils/storage';
import { saveItemToCloud } from '../services/firebase';

interface DendaPageProps {
  db: DatabaseSchema;
  onUpdateDb: (updated: DatabaseSchema) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const DendaPage: React.FC<DendaPageProps> = ({
  db,
  onUpdateDb,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const dendaList = db.Denda || [];

  const filteredDenda = dendaList.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const siswa = db.Siswa.find((s) => s.id === d.idSiswa);
    return (
      d.id.toLowerCase().includes(q) ||
      (d.idTrx || '').toLowerCase().includes(q) ||
      (siswa?.nama || '').toLowerCase().includes(q) ||
      (siswa?.id || '').toLowerCase().includes(q)
    );
  });

  const totalDendaNominal = dendaList.reduce((acc, d) => acc + (d.totalDenda || 0), 0);
  const totalDibayar = dendaList.reduce((acc, d) => acc + (d.dibayar || 0), 0);
  const totalSisaBelumLunas = dendaList.reduce((acc, d) => acc + (d.sisa || 0), 0);

  const handlePayFull = (idDenda: string) => {
    const target = dendaList.find((d) => d.id === idDenda);
    if (!target) return;

    const updatedDenda = dendaList.map((d) => {
      if (d.id === idDenda) {
        return {
          ...d,
          dibayar: d.totalDenda,
          sisa: 0,
          status: 'Lunas' as const,
        };
      }
      return d;
    });

    const updated = {
      ...db,
      Denda: updatedDenda,
    };
    const targetFine = updatedDenda.find((d) => d.id === idDenda);
    if (targetFine) {
      saveItemToCloud('denda', idDenda, targetFine as unknown as Record<string, unknown>);
    }
    saveRepository(updated);
    onUpdateDb(updated);
    showToast(`Denda ${target.id} berhasil dilunasi`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Akumulasi Denda</p>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            Rp{totalDendaNominal.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{dendaList.length} catatan keterlambatan</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Kas Diterima (Lunas)</p>
          <p className="text-xl font-bold font-mono text-teal-700 mt-1">
            Rp{totalDibayar.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Telah diselesaikan oleh siswa</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Sisa Belum Dibayar</p>
          <p className="text-xl font-bold font-mono text-rose-600 mt-1">
            Rp{totalSisaBelumLunas.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Tunggakan aktif</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID Denda, Nama Siswa, atau No Anggota..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">ID Denda</th>
                <th className="p-3">Peminjam</th>
                <th className="p-3">Hari Telat</th>
                <th className="p-3">Total Denda</th>
                <th className="p-3">Sisa Tagihan</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDenda.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    Belum ada riwayat denda keterlambatan.
                  </td>
                </tr>
              ) : (
                filteredDenda.map((d) => {
                  const siswa = db.Siswa.find((s) => s.id === d.idSiswa);
                  const isPaid = d.status === 'Lunas';
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-medium text-rose-600">{d.id}</td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-900 block">
                          {siswa?.nama || d.idSiswa}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {siswa?.kelas} · {d.idSiswa}
                        </span>
                      </td>
                      <td className="p-3 font-mono tabular-nums">{d.hariTerlambat} hari</td>
                      <td className="p-3 font-mono font-semibold text-slate-900">
                        Rp{d.totalDenda.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-600">
                        Rp{d.sisa.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`font-mono text-[11px] font-medium px-2 py-0.5 rounded ${
                            isPaid
                              ? 'text-teal-700 bg-teal-50 border border-teal-200'
                              : 'text-rose-700 bg-rose-50 border border-rose-200'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {!isPaid ? (
                          <button
                            onClick={() => handlePayFull(d.id)}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                          >
                            Bayar Lunas
                          </button>
                        ) : (
                          <span className="text-[11px] font-medium text-teal-700">✓ Lunas</span>
                        )}
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
