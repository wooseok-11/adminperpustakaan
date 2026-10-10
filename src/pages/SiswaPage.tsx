import React, { useState } from 'react';
import {
  Users,
  Search,
  Camera,
  Plus,
  FileSpreadsheet,
  Download,
  Trash2,
  CheckSquare,
  X,
  Eye,
  EyeOff,
  Edit2,
  Key,
  RotateCw,
  Printer,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { DatabaseSchema, SiswaItem } from '../types';
import {
  normalizeKelas,
  generateStudentPassword,
  generateNextStudentId,
  getClassLevel,
  saveRepository,
} from '../utils/storage';
import { parseExcelFile, importSiswaFromRows, exportToExcel } from '../utils/excel';
import {
  saveItemToCloud,
  deleteItemFromCloud,
  setCloudSyncPaused,
} from '../services/firebase';

interface SiswaPageProps {
  db: DatabaseSchema;
  onUpdateDb: (updated: DatabaseSchema) => void;
  onOpenScanner: (type: 'siswa', onScan: (code: string) => void) => void;
  onPrintCard: (idSiswa: string) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const SiswaPage: React.FC<SiswaPageProps> = ({
  db,
  onUpdateDb,
  onOpenScanner,
  onPrintCard,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Selection mode
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Active / Selected student for modal
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaItem | null>(null);
  const [detailShowPassword, setDetailShowPassword] = useState(false);

  // Add student form
  const [addNama, setAddNama] = useState('');
  const [addKelas, setAddKelas] = useState('');
  const [addNisn, setAddNisn] = useState('');
  const [addAlamat, setAddAlamat] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addShowPassword, setAddShowPassword] = useState(false);

  // Edit student form
  const [editId, setEditId] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editNisn, setEditNisn] = useState('');
  const [editAlamat, setEditAlamat] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editShowPassword, setEditShowPassword] = useState(false);

  // Regenerate prefix
  const [regenPrefix, setRegenPrefix] = useState(db.Pengaturan.prefixSiswa || 'SIP');

  // Excel file ref
  const [importFile, setImportFile] = useState<File | null>(null);

  // Filtered list
  const filteredSiswa = (db.Siswa || []).filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.nama || '').toLowerCase().includes(q) ||
      (s.id || '').toLowerCase().includes(q) ||
      (s.nisn || '').toLowerCase().includes(q) ||
      (s.kelas || '').toLowerCase().includes(q) ||
      (s.alamat || '').toLowerCase().includes(q)
    );
  });

  const totalRecords = filteredSiswa.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const validPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedData = filteredSiswa.slice(startIndex, startIndex + pageSize);

  const toggleSelectSiswa = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAllOnPage = () => {
    const allChecked = paginatedData.every((s) => selectedIds.has(s.id));
    const next = new Set(selectedIds);
    if (allChecked) {
      paginatedData.forEach((s) => next.delete(s.id));
    } else {
      paginatedData.forEach((s) => next.add(s.id));
    }
    setSelectedIds(next);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Hapus ${selectedIds.size} siswa terpilih secara permanen?`)) return;

    const updated = {
      ...db,
      Siswa: db.Siswa.filter((s) => !selectedIds.has(s.id)),
    };
    selectedIds.forEach((id) => deleteItemFromCloud('siswa', id));
    saveRepository(updated);
    onUpdateDb(updated);
    setSelectedIds(new Set());
    setIsSelectMode(false);
    showToast(`${selectedIds.size} siswa berhasil dihapus`, 'success');
  };

  const handleDeleteAll = () => {
    if (db.Siswa.length === 0) return;
    if (!confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data siswa? Tindakan ini tidak dapat dibatalkan.')) return;

    db.Siswa.forEach((s) => deleteItemFromCloud('siswa', s.id));
    const updated = { ...db, Siswa: [] };
    saveRepository(updated);
    onUpdateDb(updated);
    setSelectedIds(new Set());
    showToast('Seluruh data siswa berhasil dihapus', 'info');
  };

  const handleDeleteSingle = (id: string, nama: string) => {
    if (!confirm(`Hapus siswa "${nama}" (${id})?`)) return;
    deleteItemFromCloud('siswa', id);
    const updated = {
      ...db,
      Siswa: db.Siswa.filter((s) => s.id !== id),
    };
    saveRepository(updated);
    onUpdateDb(updated);
    showToast(`Data "${nama}" dihapus`, 'info');
  };

  const openAddModal = () => {
    setAddNama('');
    setAddKelas('');
    setAddNisn('');
    setAddAlamat('');
    setAddPassword('');
    setShowAddModal(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNama = addNama.trim();
    const cleanKelas = normalizeKelas(addKelas);
    const cleanNisn = addNisn.trim() || '-';
    const cleanAlamat = addAlamat.trim() || '-';
    let cleanPass = addPassword.trim();

    if (!cleanNama || !cleanKelas) {
      showToast('Nama dan kelas siswa wajib diisi', 'warning');
      return;
    }

    if (!cleanPass) {
      cleanPass = generateStudentPassword(cleanNama, cleanNisn);
    }

    const nextId = generateNextStudentId(db, cleanKelas);
    if (db.Siswa.some((s) => s.id === nextId)) {
      showToast('Nomor anggota sudah terdaftar!', 'error');
      return;
    }

    const newSiswa: SiswaItem = {
      id: nextId,
      nama: cleanNama,
      nisn: cleanNisn,
      kelas: cleanKelas,
      alamat: cleanAlamat,
      password: cleanPass,
      passwordAutoGenerated: true,
      registeredAt: new Date().toISOString(),
    };

    saveItemToCloud('siswa', newSiswa.id, newSiswa as unknown as Record<string, unknown>);
    const updated = {
      ...db,
      Siswa: [...db.Siswa, newSiswa],
    };
    saveRepository(updated);
    onUpdateDb(updated);
    setShowAddModal(false);
    showToast(`Siswa "${cleanNama}" berhasil ditambahkan (No: ${nextId})`, 'success');
  };

  const openEditModal = (siswa: SiswaItem) => {
    setSelectedSiswa(siswa);
    setEditId(siswa.id);
    setEditNama(siswa.nama);
    setEditKelas(siswa.kelas);
    setEditNisn(siswa.nisn || '');
    setEditAlamat(siswa.alamat || '');
    setEditPassword(siswa.password || '');
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa) return;

    const oldId = selectedSiswa.id;
    const newId = editId.trim();
    const cleanKelas = normalizeKelas(editKelas);

    if (!editNama.trim() || !newId) {
      showToast('Nama dan No Anggota wajib diisi', 'warning');
      return;
    }

    if (newId !== oldId && db.Siswa.some((s) => s.id === newId)) {
      showToast('Nomor anggota sudah dipakai oleh siswa lain', 'error');
      return;
    }

    const updatedSiswaList = db.Siswa.map((s) => {
      if (s.id === oldId) {
        return {
          ...s,
          id: newId,
          nama: editNama.trim(),
          kelas: cleanKelas,
          nisn: editNisn.trim() || '-',
          alamat: editAlamat.trim() || '-',
          password: editPassword.trim() || s.password,
        };
      }
      return s;
    });

    // Cascade to loans & fines if ID changed
    let updatedLoans = db.Peminjaman;
    let updatedFines = db.Denda;
    if (newId !== oldId) {
      updatedLoans = db.Peminjaman.map((p) =>
        p.idSiswa === oldId ? { ...p, idSiswa: newId } : p
      );
      updatedFines = db.Denda.map((d) =>
        d.idSiswa === oldId ? { ...d, idSiswa: newId } : d
      );
      deleteItemFromCloud('siswa', oldId);
    }
    const targetStudent = updatedSiswaList.find((s) => s.id === newId);
    if (targetStudent) {
      saveItemToCloud('siswa', newId, targetStudent as unknown as Record<string, unknown>);
    }

    const updated = {
      ...db,
      Siswa: updatedSiswaList,
      Peminjaman: updatedLoans,
      Denda: updatedFines,
    };
    saveRepository(updated);
    onUpdateDb(updated);
    setShowEditModal(false);
    showToast(`Data siswa "${editNama}" berhasil diperbarui`, 'success');
  };

  const openDetailModal = (siswa: SiswaItem) => {
    setSelectedSiswa(siswa);
    setDetailShowPassword(false);
    setShowDetailModal(true);
  };

  const handleRegenerateIdsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = regenPrefix.trim().toUpperCase() || 'SIP';
    if (!confirm(`Konfirmasi regenerasi seluruh No Anggota dengan prefix "${p}"?`)) return;

    setCloudSyncPaused(true);

    try {
      const counters: Record<string, number> = { X: 0, XI: 0, XII: 0 };
      const oldToNew: Record<string, string> = {};

      const sorted = [...db.Siswa].sort((a, b) => {
        const la = getClassLevel(a.kelas);
        const lb = getClassLevel(b.kelas);
        const order = { X: 1, XI: 2, XII: 3 };
        if (la !== lb) return order[la] - order[lb];
        return a.nama.localeCompare(b.nama);
      });

      const updatedSiswa = sorted.map((s) => {
        const lvl = getClassLevel(s.kelas);
        counters[lvl]++;
        const newId = `${p}-${lvl}-${String(counters[lvl]).padStart(3, '0')}`;
        if (s.id !== newId) oldToNew[s.id] = newId;
        return { ...s, id: newId };
      });

      const updatedLoans = db.Peminjaman.map((l) =>
        oldToNew[l.idSiswa] ? { ...l, idSiswa: oldToNew[l.idSiswa] } : l
      );
      const updatedFines = db.Denda.map((f) =>
        oldToNew[f.idSiswa] ? { ...f, idSiswa: oldToNew[f.idSiswa] } : f
      );

      // Sync to cloud
      updatedSiswa.forEach((s) => {
        saveItemToCloud('siswa', s.id, s as unknown as Record<string, unknown>);
      });
      Object.keys(oldToNew).forEach((oldId) => {
        deleteItemFromCloud('siswa', oldId);
      });
      updatedLoans.forEach((l) => {
        if (oldToNew[l.idSiswa]) {
          saveItemToCloud('peminjaman', l.id, l as unknown as Record<string, unknown>);
        }
      });
      updatedFines.forEach((f) => {
        if (oldToNew[f.idSiswa]) {
          saveItemToCloud('denda', f.id, f as unknown as Record<string, unknown>);
        }
      });

      const updated: DatabaseSchema = {
        ...db,
        Pengaturan: {
          ...db.Pengaturan,
          prefixSiswa: p,
        },
        Siswa: updatedSiswa,
        Peminjaman: updatedLoans,
        Denda: updatedFines,
      };

      saveRepository(updated);
      onUpdateDb(updated);
      setShowRegenModal(false);
      showToast(`Berhasil meregenerasi ${Object.keys(oldToNew).length} No Anggota`, 'success');
    } catch (err) {
      console.error('Gagal regenerasi siswa:', err);
      showToast('Gagal meregenerasi nomor anggota siswa', 'error');
    } finally {
      setCloudSyncPaused(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      showToast('Pilih file Excel terlebih dahulu', 'warning');
      return;
    }

    try {
      const rows = await parseExcelFile(importFile);
      if (rows.length === 0) {
        showToast('File Excel kosong atau tidak terbaca', 'error');
        return;
      }

      const { inserted, skipped, updatedDb } = importSiswaFromRows(rows, db);
      saveRepository(updatedDb);
      onUpdateDb(updatedDb);
      setShowImportModal(false);
      setImportFile(null);
      showToast(`Import selesai: ${inserted} siswa berhasil masuk, ${skipped} dilewati`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses file Excel', 'error');
    }
  };

  const handleExportExcel = () => {
    const exportData = (db.Siswa || []).map((s) => ({
      'No Anggota': s.id,
      Nama: s.nama,
      NISN: s.nisn,
      Kelas: s.kelas,
      Alamat: s.alamat,
      'Kata Sandi': s.password || '',
    }));
    exportToExcel(
      exportData,
      `Data_Siswa_${new Date().toISOString().split('T')[0]}`,
      'Anggota_Perpus'
    );
    showToast('Data siswa berhasil diekspor ke Excel', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari Nama, No Anggota, NISN, atau Kelas..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <button
            onClick={() => {
              onOpenScanner('siswa', (code) => {
                const found = db.Siswa.find(
                  (s) =>
                    s.id.toUpperCase() === code.toUpperCase() ||
                    s.nisn.toUpperCase() === code.toUpperCase()
                );
                if (found) openDetailModal(found);
                else showToast(`Siswa dengan kode "${code}" tidak ditemukan`, 'error');
              });
            }}
            title="Pindai Kartu Siswa"
            className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-medium border border-teal-200 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Pindai</span>
          </button>

          <button
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              if (isSelectMode) setSelectedIds(new Set());
            }}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 shrink-0 ${
              isSelectMode
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="hidden sm:inline">{isSelectMode ? 'Batal Pilih' : 'Pilih'}</span>
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0 border-r border-slate-100 pr-2">
            <span>Baris:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <button
            onClick={openAddModal}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Download className="w-4 h-4 text-teal-600" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setShowRegenModal(true)}
            title="Urutkan & regenerasi No Anggota berurutan per tingkat kelas"
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <RotateCw className="w-4 h-4 text-indigo-600" />
            <span>Regenerasi No</span>
          </button>

          <button
            onClick={handleDeleteAll}
            title="Hapus Seluruh Data Siswa"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Batch Selection Banner */}
      {isSelectMode && (
        <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-teal-900 font-medium">
            <CheckSquare className="w-4 h-4 text-teal-600" />
            <span>
              {selectedIds.size} siswa terpilih dari {totalRecords} data
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                {isSelectMode && (
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedData.length > 0 &&
                        paginatedData.every((s) => selectedIds.has(s.id))
                      }
                      onChange={handleSelectAllOnPage}
                      className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-3">Nama Anggota</th>
                <th className="p-3">No. Anggota</th>
                <th className="p-3">NISN</th>
                <th className="p-3">Kelas</th>
                <th className="p-3">Alamat</th>
                <th className="p-3 text-center">Akses Sandi</th>
                <th className="p-3 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSelectMode ? 8 : 7}
                    className="p-8 text-center text-slate-400 italic"
                  >
                    Tidak ada data siswa ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedData.map((s) => {
                  const isChecked = selectedIds.has(s.id);
                  const hasPass = Boolean(s.password && s.password.trim().length > 0);
                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? 'bg-teal-50/60' : ''
                      }`}
                    >
                      {isSelectMode && (
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectSiswa(s.id)}
                            className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-3 font-semibold text-slate-900">{s.nama}</td>
                      <td className="p-3 font-mono font-medium text-teal-700">{s.id}</td>
                      <td className="p-3 font-mono text-slate-500">{s.nisn || '-'}</td>
                      <td className="p-3 font-medium text-slate-700">{s.kelas}</td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">{s.alamat || '-'}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`font-mono text-[11px] ${
                            hasPass ? 'text-teal-700' : 'text-slate-400'
                          }`}
                        >
                          {hasPass ? '••••••••' : 'Belum diatur'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openDetailModal(s)}
                            title="Lihat Detail Profil & Sandi"
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(s)}
                            title="Edit Data"
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(s.id, s.nama)}
                            title="Hapus"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-semibold text-slate-700">{totalRecords > 0 ? startIndex + 1 : 0}</span> –{' '}
            <span className="font-semibold text-slate-700">
              {Math.min(startIndex + pageSize, totalRecords)}
            </span>{' '}
            dari <span className="font-semibold text-slate-700">{totalRecords}</span> anggota
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={validPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-mono text-slate-700 font-medium">
              Hal {validPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={validPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Tambah Siswa */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <span>Pendaftaran Anggota Siswa Baru</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={addNama}
                  onChange={(e) => {
                    setAddNama(e.target.value);
                    if (!addPassword) {
                      setAddPassword(generateStudentPassword(e.target.value, addNisn));
                    }
                  }}
                  placeholder="Contoh: Muhammad Rizki"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Kelas (Otomatis Romawi)
                  </label>
                  <input
                    type="text"
                    required
                    value={addKelas}
                    onChange={(e) => setAddKelas(normalizeKelas(e.target.value))}
                    placeholder="Contoh: X IPA 1 / XI IPS 2"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">NISN Siswa</label>
                  <input
                    type="text"
                    value={addNisn}
                    onChange={(e) => {
                      setAddNisn(e.target.value);
                      if (!addPassword) {
                        setAddPassword(generateStudentPassword(addNama, e.target.value));
                      }
                    }}
                    placeholder="Contoh: 0061234567"
                    className="w-full p-2.5 font-mono border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Alamat Tinggal</label>
                <input
                  type="text"
                  value={addAlamat}
                  onChange={(e) => setAddAlamat(e.target.value)}
                  placeholder="Alamat rumah siswa"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              {/* Password auto-generator */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-teal-600" />
                    Kata Sandi Akun Siswa
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddPassword(generateStudentPassword(addNama, addNisn))}
                    className="text-[11px] text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Generate Ulang
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={addShowPassword ? 'text' : 'password'}
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Sandi otomatis: 4 digit NISN + inisial"
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg outline-none font-mono font-medium text-slate-800 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setAddShowPassword(!addShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {addShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Format default: 4 digit terakhir NISN + 2 huruf nama (contoh:{' '}
                  <span className="font-mono text-slate-600">4567Mu</span>).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium shadow-xs"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Siswa */}
      {showEditModal && selectedSiswa && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-teal-600" />
                <span>Perbarui Data Siswa</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">No Anggota</label>
                  <input
                    type="text"
                    required
                    value={editId}
                    onChange={(e) => setEditId(e.target.value)}
                    className="w-full p-2.5 font-mono font-bold text-teal-700 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kelas</label>
                  <input
                    type="text"
                    required
                    value={editKelas}
                    onChange={(e) => setEditKelas(normalizeKelas(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">NISN</label>
                <input
                  type="text"
                  value={editNisn}
                  onChange={(e) => setEditNisn(e.target.value)}
                  className="w-full p-2.5 font-mono border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Alamat Tinggal</label>
                <input
                  type="text"
                  value={editAlamat}
                  onChange={(e) => setEditAlamat(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Kata Sandi Akun</label>
                <div className="relative">
                  <input
                    type={editShowPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPassword(!editShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {editShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Siswa */}
      {showDetailModal && selectedSiswa && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Detail Anggota Perpustakaan</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-14 h-14 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-lg uppercase shrink-0 shadow-xs">
                {selectedSiswa.nama.substring(0, 2)}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{selectedSiswa.nama}</h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  No: {selectedSiswa.id} · NISN: {selectedSiswa.nisn || '-'}
                </p>
                <p className="text-xs text-teal-700 font-medium">Kelas {selectedSiswa.kelas}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Kelas:</span>
                <span className="font-semibold text-slate-800">{selectedSiswa.kelas}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">NISN:</span>
                <span className="font-mono font-semibold text-slate-800">{selectedSiswa.nisn || '-'}</span>
              </div>
              <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Alamat Tinggal:</span>
                <span className="text-slate-800">{selectedSiswa.alamat || '-'}</span>
              </div>
            </div>

            {/* Password Reveal Section */}
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-teal-800 block">Kata Sandi Akun:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {detailShowPassword ? selectedSiswa.password || '(Belum diset)' : '••••••••'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailShowPassword(!detailShowPassword)}
                className="px-3 py-1.5 bg-white border border-teal-200 text-teal-800 rounded-lg text-xs font-medium hover:bg-teal-50 transition-colors flex items-center gap-1.5"
              >
                {detailShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{detailShowPassword ? 'Sembunyikan' : 'Lihat Sandi'}</span>
              </button>
            </div>

            {/* Currently borrowed books */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h5 className="font-semibold text-xs text-slate-800">
                Buku yang Sedang Dipinjam:
              </h5>
              {(() => {
                const active = (db.Peminjaman || []).filter(
                  (p) => p.idSiswa === selectedSiswa.id && p.status === 'Dipinjam'
                );
                if (active.length === 0) {
                  return (
                    <p className="text-xs text-slate-400 italic">
                      Tidak ada buku yang sedang dipinjam saat ini.
                    </p>
                  );
                }
                return (
                  <div className="space-y-1.5">
                    {active.map((loan) => {
                      const book = (db.Buku || []).find((b) => b.id === loan.idBuku);
                      return (
                        <div
                          key={loan.id}
                          className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium text-slate-800">{book?.judul || loan.idBuku}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              Jatuh tempo: {loan.tglJatuhTempo}
                            </p>
                          </div>
                          <span className="text-[11px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Dipinjam
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  onPrintCard(selectedSiswa.id);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kartu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Regenerate All IDs */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
              <RotateCw className="w-4 h-4 text-teal-600" />
              <h4 className="font-semibold text-sm">Regenerasi No Anggota Siswa</h4>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Perhatian:
              </p>
              <p className="leading-relaxed">
                Nomor anggota seluruh siswa akan diurutkan ulang berurutan (001, 002, ...)
                berdasarkan tingkatan kelas (X, XI, XII). Riwayat peminjaman dan denda otomatis
                diperbarui mengikuti nomor baru.
              </p>
            </div>

            <form onSubmit={handleRegenerateIdsSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Prefix No Anggota</label>
                <input
                  type="text"
                  required
                  value={regenPrefix}
                  onChange={(e) => setRegenPrefix(e.target.value.toUpperCase())}
                  placeholder="SIP"
                  className="w-full p-2.5 font-mono uppercase font-bold text-teal-700 border border-slate-200 rounded-xl outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Format:{' '}
                  <span className="font-mono font-medium text-slate-600">
                    {regenPrefix || 'SIP'}-X-001, {regenPrefix || 'SIP'}-XI-001, ...
                  </span>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegenModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium"
                >
                  Terapkan & Urutkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Import Excel */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Import Siswa dari Excel</span>
              </h4>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Pilih file <span className="font-mono">.xlsx</span> atau{' '}
              <span className="font-mono">.xls</span>. Sistem secara cerdas mendeteksi kolom seperti{' '}
              <strong>Nama</strong>, <strong>Kelas</strong>, <strong>NISN</strong>, dan{' '}
              <strong>Alamat</strong> dalam urutan apa pun.
            </p>

            <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!importFile}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-medium shadow-xs"
                >
                  Proses Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
