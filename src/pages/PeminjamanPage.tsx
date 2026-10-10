import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Users,
  Book,
  Camera,
  Search,
  CheckCircle2,
  Trash2,
  Calendar,
  AlertCircle,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DatabaseSchema, SiswaItem, BukuItem, PeminjamanItem } from '../types';
import { saveRepository, buildEksemplarList } from '../utils/storage';
import { saveItemToCloud } from '../services/firebase';

interface PeminjamanPageProps {
  db: DatabaseSchema;
  onUpdateDb: (updated: DatabaseSchema) => void;
  onOpenScanner: (type: 'siswa' | 'buku', onScan: (code: string) => void) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const PeminjamanPage: React.FC<PeminjamanPageProps> = ({
  db,
  onUpdateDb,
  onOpenScanner,
  onToast,
  showToast,
}: PeminjamanPageProps & { onToast?: unknown }) => {
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaItem | null>(null);
  const [loanCart, setLoanCart] = useState<BukuItem[]>([]);

  // Search autocomplete states
  const [siswaQuery, setSiswaQuery] = useState('');
  const [showSiswaDropdown, setShowSiswaDropdown] = useState(false);

  const [bukuQuery, setBukuQuery] = useState('');
  const [showBukuDropdown, setShowBukuDropdown] = useState(false);

  const masaPinjamDays = db.Pengaturan?.masaPinjam || 7;
  const today = new Date().toISOString().split('T')[0];

  const getDueDate = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const dueDate = getDueDate(masaPinjamDays);

  // Filter siswa for dropdown
  const filteredSiswaList = (db.Siswa || []).filter((s) => {
    const q = siswaQuery.toLowerCase().trim();
    if (!q) return false;
    return (
      (s.nama || '').toLowerCase().includes(q) ||
      (s.id || '').toLowerCase().includes(q) ||
      (s.nisn || '').toLowerCase().includes(q) ||
      (s.kelas || '').toLowerCase().includes(q)
    );
  });

  // Filter buku for dropdown
  const filteredBukuList = (db.Buku || []).filter((b) => {
    const q = bukuQuery.toLowerCase().trim();
    if (!q) return false;
    return (
      (b.judul || '').toLowerCase().includes(q) ||
      (b.id || '').toLowerCase().includes(q) ||
      (b.isbn || '').toLowerCase().includes(q) ||
      (b.rak || '').toLowerCase().includes(q)
    );
  });

  const handleSelectSiswa = (siswa: SiswaItem) => {
    setSelectedSiswa(siswa);
    setSiswaQuery(`${siswa.nama} (${siswa.kelas})`);
    setShowSiswaDropdown(false);
  };

  const handleAddBookToCart = (buku: BukuItem) => {
    if (!selectedSiswa) {
      showToast('Pilih anggota siswa terlebih dahulu!', 'warning');
      return;
    }

    if (buku.tersedia <= 0) {
      showToast(`Stok buku "${buku.judul}" saat ini sedang habis di rak`, 'error');
      return;
    }

    if (loanCart.some((b) => b.id === buku.id)) {
      showToast(`Buku "${buku.judul}" sudah ada dalam daftar peminjaman`, 'warning');
      return;
    }

    const maxBuku = db.Pengaturan?.maxBukuPinjam || 3;
    if (loanCart.length >= maxBuku) {
      showToast(`Batas maksimal peminjaman adalah ${maxBuku} buku sekaligus`, 'warning');
      return;
    }

    setLoanCart([...loanCart, buku]);
    setBukuQuery('');
    setShowBukuDropdown(false);
    showToast(`Buku "${buku.judul}" ditambahkan ke keranjang`, 'info');
  };

  const handleRemoveFromCart = (index: number) => {
    const updated = [...loanCart];
    updated.splice(index, 1);
    setLoanCart(updated);
  };

  const handleSubmitPeminjaman = () => {
    if (!selectedSiswa) {
      showToast('Pilih anggota siswa terlebih dahulu', 'warning');
      return;
    }
    if (loanCart.length === 0) {
      showToast('Keranjang peminjaman masih kosong', 'warning');
      return;
    }

    const newTransactions: PeminjamanItem[] = [];
    const updatedBukuList = [...db.Buku];

    for (const item of loanCart) {
      const bookIndex = updatedBukuList.findIndex((b) => b.id === item.id);
      if (bookIndex === -1) continue;

      const targetBook = { ...updatedBukuList[bookIndex] };
      let exemplars = Array.isArray(targetBook.eksemplar) && targetBook.eksemplar.length > 0
        ? [...targetBook.eksemplar]
        : buildEksemplarList(targetBook.id, targetBook.jumlah || 1);
      let availableEx = exemplars.find((e) => e.status === 'Tersedia');

      if (!availableEx) {
        const nextIdx = exemplars.length + 1;
        availableEx = {
          kode: `${targetBook.id}-${String(nextIdx).padStart(3, '0')}`,
          status: 'Tersedia',
        };
        exemplars.push(availableEx);
      }

      availableEx.status = 'Dipinjam';
      targetBook.eksemplar = exemplars;
      targetBook.tersedia = Math.max(0, (targetBook.tersedia ?? 1) - 1);
      updatedBukuList[bookIndex] = targetBook;

      const trxId = `TRX-2026-${String((db.Peminjaman?.length || 0) + newTransactions.length + 1).padStart(6, '0')}`;
      const trxData: PeminjamanItem = {
        id: trxId,
        idSiswa: selectedSiswa.id,
        idBuku: targetBook.id,
        kodeEksemplar: availableEx.kode,
        tglPinjam: today,
        tglJatuhTempo: dueDate,
        status: 'Dipinjam',
      };
      newTransactions.push(trxData);
      saveItemToCloud('peminjaman', trxId, trxData as unknown as Record<string, unknown>);
      saveItemToCloud('buku', targetBook.id, targetBook as unknown as Record<string, unknown>);
    }

    const updatedDb: DatabaseSchema = {
      ...db,
      Buku: updatedBukuList,
      Peminjaman: [...(db.Peminjaman || []), ...newTransactions],
    };

    saveRepository(updatedDb);
    onUpdateDb(updatedDb);

    try {
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
    } catch {
      // Ignore confetti failure
    }

    showToast(
      `Peminjaman ${loanCart.length} buku atas nama ${selectedSiswa.nama} berhasil dicatat!`,
      'success'
    );

    setSelectedSiswa(null);
    setSiswaQuery('');
    setLoanCart([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Workflow Steps 1 & 2 */}
      <div className="lg:col-span-2 space-y-5">
        {/* Step 1: Identitas Siswa */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                1
              </span>
              <span>Identitas Peminjam (Siswa)</span>
            </h4>
            <button
              onClick={() => {
                onOpenScanner('siswa', (code) => {
                  const s = db.Siswa.find(
                    (item) =>
                      item.id.toUpperCase() === code.toUpperCase() ||
                      item.nisn.toUpperCase() === code.toUpperCase()
                  );
                  if (s) {
                    handleSelectSiswa(s);
                    showToast(`Siswa "${s.nama}" terpilih`, 'success');
                  } else {
                    showToast(`Kode kartu siswa "${code}" tidak ditemukan`, 'error');
                  }
                });
              }}
              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-medium border border-teal-200 transition-colors flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Pindai Kartu</span>
            </button>
          </div>

          {/* Autocomplete Input Siswa */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={siswaQuery}
              onChange={(e) => {
                setSiswaQuery(e.target.value);
                setShowSiswaDropdown(true);
              }}
              onFocus={() => setShowSiswaDropdown(true)}
              placeholder="Ketik nama, NISN, atau kelas siswa..."
              className="w-full pl-9 pr-8 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500"
            />
            {siswaQuery && (
              <button
                onClick={() => {
                  setSiswaQuery('');
                  setSelectedSiswa(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Dropdown Siswa */}
            {showSiswaDropdown && filteredSiswaList.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto z-30 divide-y divide-slate-100 text-xs custom-scrollbar">
                {filteredSiswaList.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSiswa(s)}
                    className="p-2.5 hover:bg-teal-50/60 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{s.nama}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {s.id} · NISN: {s.nisn} · Kelas {s.kelas}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                      Pilih
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Siswa Card */}
          {selectedSiswa ? (
            <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                  {selectedSiswa.nama.substring(0, 2)}
                </div>
                <div>
                  <h5 className="font-semibold text-slate-900 text-xs">{selectedSiswa.nama}</h5>
                  <p className="text-[11px] text-slate-500 font-mono">
                    No: {selectedSiswa.id} · Kelas: {selectedSiswa.kelas}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                Terverifikasi
              </span>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 italic">
              Belum ada siswa dipilih. Gunakan pencarian di atas atau pindai kartu perpustakaan.
            </div>
          )}
        </div>

        {/* Step 2: Pilih Buku Dipinjam */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                2
              </span>
              <span>Koleksi Buku Dipinjam</span>
            </h4>
            <button
              onClick={() => {
                if (!selectedSiswa) {
                  showToast('Pilih siswa terlebih dahulu!', 'warning');
                  return;
                }
                onOpenScanner('buku', (code) => {
                  const b = db.Buku.find(
                    (item) =>
                      item.id.toUpperCase() === code.toUpperCase() ||
                      item.isbn.replace(/[^0-9Xx]/g, '').toUpperCase() ===
                        code.replace(/[^0-9Xx]/g, '').toUpperCase()
                  );
                  if (b) {
                    handleAddBookToCart(b);
                  } else {
                    showToast(`Buku dengan kode "${code}" tidak ditemukan`, 'error');
                  }
                });
              }}
              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-medium border border-teal-200 transition-colors flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Pindai Barcode Buku</span>
            </button>
          </div>

          {/* Autocomplete Input Buku */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={bukuQuery}
              onChange={(e) => {
                setBukuQuery(e.target.value);
                setShowBukuDropdown(true);
              }}
              onFocus={() => setShowBukuDropdown(true)}
              placeholder="Ketik judul buku, ISBN, atau kode buku..."
              className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500"
            />

            {/* Dropdown Buku */}
            {showBukuDropdown && filteredBukuList.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto z-30 divide-y divide-slate-100 text-xs custom-scrollbar">
                {filteredBukuList.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => handleAddBookToCart(b)}
                    className="p-2.5 hover:bg-teal-50/60 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{b.judul}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {b.id} · Rak: {b.rak} · Stok: {b.tersedia}/{b.jumlah}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                      Tambah
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Kode Buku</th>
                  <th className="p-3">Judul Buku</th>
                  <th className="p-3">Rak</th>
                  <th className="p-3 text-center">Batal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loanCart.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400 italic">
                      Keranjang peminjaman masih kosong.
                    </td>
                  </tr>
                ) : (
                  loanCart.map((buku, idx) => (
                    <tr key={buku.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-medium text-teal-700">{buku.id}</td>
                      <td className="p-3 font-semibold text-slate-900">{buku.judul}</td>
                      <td className="p-3 text-slate-500 font-mono">{buku.rak}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemoveFromCart(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Rincian Transaksi Sidebar */}
      <div className="space-y-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <h4 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-3">
            Rincian Peminjaman
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-400">Tanggal Pinjam:</span>
              <span className="font-mono font-medium text-slate-800">{today}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-400">Jatuh Tempo:</span>
              <span className="font-mono font-semibold text-teal-700">{dueDate}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-400">Durasi Peminjaman:</span>
              <span className="font-medium text-slate-800">{masaPinjamDays} hari kalender</span>
            </div>

            <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-100">
              <span className="font-medium text-slate-700">Jumlah Buku:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {loanCart.length} eksemplar
              </span>
            </div>
          </div>

          <button
            onClick={handleSubmitPeminjaman}
            disabled={!selectedSiswa || loanCart.length === 0}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>Konfirmasi Peminjaman</span>
          </button>
        </div>

        {/* Info box */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500 space-y-1.5">
          <p className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            Ketentuan Sirkulasi
          </p>
          <p className="text-[11px] leading-relaxed">
            Keterlambatan pengembalian buku setelah tanggal jatuh tempo dikenakan denda{' '}
            <strong className="text-slate-700">
              Rp{(db.Pengaturan?.tarifDenda || 1000).toLocaleString('id-ID')} / hari
            </strong>{' '}
            per eksemplar buku.
          </p>
        </div>
      </div>
    </div>
  );
};
