import React, { useState } from 'react';
import {
  Settings,
  Building,
  Clock,
  KeyRound,
  Download,
  Upload,
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle2,
  X,
  Cloud,
} from 'lucide-react';
import { DatabaseSchema, SekolahConfig, PengaturanConfig } from '../types';
import { defaultDB, saveRepository } from '../utils/storage';
import { migrateAllToCloud, isFirebaseAvailable } from '../services/firebase';

interface PengaturanPageProps {
  db: DatabaseSchema;
  onUpdateDb: (updated: DatabaseSchema) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const PengaturanPage: React.FC<PengaturanPageProps> = ({
  db,
  onUpdateDb,
  showToast,
}) => {
  const [sekolah, setSekolah] = useState<SekolahConfig>({ ...db.Sekolah });
  const [pengaturan, setPengaturan] = useState<PengaturanConfig>({ ...db.Pengaturan });

  // Restore state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreData, setRestoreData] = useState<DatabaseSchema | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: DatabaseSchema = {
      ...db,
      Sekolah: { ...sekolah },
      Pengaturan: {
        ...pengaturan,
        masaPinjam: Number(pengaturan.masaPinjam) || 7,
        tarifDenda: Number(pengaturan.tarifDenda) || 1000,
        prefixSiswa: (pengaturan.prefixSiswa || 'SIP').toUpperCase(),
        adminToken: (pengaturan.adminToken || 'ADMIN-SIP-2026').toUpperCase(),
      },
    };

    saveRepository(updated);
    onUpdateDb(updated);
    showToast('Konfigurasi perpustakaan berhasil disimpan', 'success');
  };

  const handleBackupJSON = () => {
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

  const handleFileRestoreSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.Siswa || !parsed.Buku || !parsed.Peminjaman) {
          showToast('File JSON bukan cadangan SIP-Perpus yang valid', 'error');
          return;
        }
        setRestoreData(parsed);
      } catch {
        showToast('Gagal membaca isi file JSON', 'error');
      }
    };
    reader.readAsText(file);
  };

  const executeRestore = () => {
    if (!restoreData) return;
    saveRepository(restoreData);
    onUpdateDb(restoreData);
    setShowRestoreModal(false);
    setRestoreData(null);
    showToast('Database berhasil dipulihkan dari file cadangan', 'success');
  };

  const handleResetToDefault = () => {
    if (
      !confirm(
        'PERINGATAN: Apakah Anda yakin ingin mengembalikan seluruh data ke data bawaan demo? Seluruh data baru akan hilang.'
      )
    )
      return;

    const fresh = JSON.parse(JSON.stringify(defaultDB));
    saveRepository(fresh);
    onUpdateDb(fresh);
    showToast('Database berhasil direset ke data awal demo', 'info');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Identitas Sekolah */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-teal-600" />
            <h4 className="font-semibold text-sm">Profil & Identitas Sekolah</h4>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Resmi Sekolah</label>
              <input
                type="text"
                required
                value={sekolah.nama}
                onChange={(e) => setSekolah({ ...sekolah, nama: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">NPSN</label>
                <input
                  type="text"
                  value={sekolah.npsn}
                  onChange={(e) => setSekolah({ ...sekolah, npsn: e.target.value })}
                  className="w-full p-2.5 font-mono border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nomor Telepon</label>
                <input
                  type="text"
                  value={sekolah.telepon}
                  onChange={(e) => setSekolah({ ...sekolah, telepon: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Alamat Lengkap</label>
              <input
                type="text"
                value={sekolah.alamat}
                onChange={(e) => setSekolah({ ...sekolah, alamat: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Sekolah</label>
                <input
                  type="email"
                  value={sekolah.email}
                  onChange={(e) => setSekolah({ ...sekolah, email: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Situs Web</label>
                <input
                  type="text"
                  value={sekolah.website}
                  onChange={(e) => setSekolah({ ...sekolah, website: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Aturan Sirkulasi & Token */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-teal-600" />
            <h4 className="font-semibold text-sm">Ketentuan Sirkulasi & Otoritas</h4>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Nama Ruang Perpustakaan
              </label>
              <input
                type="text"
                value={pengaturan.namaPerpus}
                onChange={(e) => setPengaturan({ ...pengaturan, namaPerpus: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Masa Pinjam Buku (Hari)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={pengaturan.masaPinjam}
                  onChange={(e) =>
                    setPengaturan({ ...pengaturan, masaPinjam: Number(e.target.value) })
                  }
                  className="w-full p-2.5 font-mono border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Tarif Denda (Rp / Hari / Buku)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  required
                  value={pengaturan.tarifDenda}
                  onChange={(e) =>
                    setPengaturan({ ...pengaturan, tarifDenda: Number(e.target.value) })
                  }
                  className="w-full p-2.5 font-mono border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Prefix No Anggota Siswa
                </label>
                <input
                  type="text"
                  required
                  value={pengaturan.prefixSiswa}
                  onChange={(e) =>
                    setPengaturan({ ...pengaturan, prefixSiswa: e.target.value.toUpperCase() })
                  }
                  className="w-full p-2.5 font-mono uppercase font-bold text-teal-700 border border-slate-200 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Token Registrasi Admin
                </label>
                <input
                  type="text"
                  required
                  value={pengaturan.adminToken}
                  onChange={(e) =>
                    setPengaturan({ ...pengaturan, adminToken: e.target.value.toUpperCase() })
                  }
                  className="w-full p-2.5 font-mono uppercase font-bold text-teal-700 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Seluruh Pengaturan</span>
            </button>
          </div>
        </div>
      </form>

      {/* Cadangan & Pemeliharaan Database */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
        <h4 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-3">
          Pemeliharaan & Cadangan Database
        </h4>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              showToast('Memulai sinkronisasi & migrasi ke Cloud Firestore...', 'info');
              const success = await migrateAllToCloud(db);
              if (success) {
                showToast('✅ Berhasil menyinkronkan seluruh database ke Firebase Firestore!', 'success');
              } else {
                showToast('Gagal terhubung ke Firebase Firestore', 'error');
              }
            }}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Cloud className="w-4 h-4 text-white" />
            <span>Migrasikan ke Cloud Firestore</span>
          </button>

          <button
            type="button"
            onClick={handleBackupJSON}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>Unduh Cadangan JSON</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRestoreData(null);
              setShowRestoreModal(true);
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-medium transition-colors flex items-center gap-1.5 border border-slate-200"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Pulihkan dari File JSON</span>
          </button>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-medium transition-colors border border-rose-200 flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset ke Demo Awal</span>
          </button>
        </div>
      </div>

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-teal-600" />
                <span>Pemulihan Database Perpustakaan</span>
              </h4>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              <p className="font-semibold mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Peringatan:
              </p>
              <p className="leading-relaxed">
                Pemulihan database akan mengganti seluruh data perpustakaan saat ini dengan isi file
                cadangan. Pastikan file yang diunggah adalah cadangan resmi SIP-Perpus.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Pilih File Cadangan (.json)
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileRestoreSelect}
                  className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              {restoreData && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="font-semibold text-slate-800">Pratinjau Data Cadangan:</p>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 font-mono text-[11px]">
                    <div>
                      Siswa: <span className="font-bold text-slate-900">{restoreData.Siswa?.length || 0}</span>
                    </div>
                    <div>
                      Buku: <span className="font-bold text-slate-900">{restoreData.Buku?.length || 0}</span>
                    </div>
                    <div>
                      Transaksi: <span className="font-bold text-slate-900">{restoreData.Peminjaman?.length || 0}</span>
                    </div>
                    <div>
                      Denda: <span className="font-bold text-slate-900">{restoreData.Denda?.length || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!restoreData}
                onClick={executeRestore}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Pulihkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
