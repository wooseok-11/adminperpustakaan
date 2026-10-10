import React, { useState } from 'react';
import {
  BookOpen,
  Lock,
  Mail,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { DatabaseSchema, AdministratorItem } from '../types';
import { setCurrentLoggedInUser, saveRepository } from '../utils/storage';

interface AuthModalProps {
  isOpen: boolean;
  db: DatabaseSchema;
  onSuccess: (user: AdministratorItem) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  db,
  onSuccess,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Login form state
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUser, setRegUser] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPassConfirm, setRegPassConfirm] = useState('');
  const [regToken, setRegToken] = useState('');

  // Forgot password state
  const [forgotUser, setForgotUser] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');

  if (!isOpen) return null;

  const validToken = db.Pengaturan?.adminToken || 'ADMIN-SIP-2026';

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = loginUser.trim().toLowerCase();
    const p = loginPass;

    const admins = db.Administrator || [];
    const matched = admins.find(
      (a) =>
        (a.username.toLowerCase() === u || a.email.toLowerCase() === u) &&
        (!a.password || a.password === p)
    );

    if (matched || (u === 'admin' && p === 'admin') || admins.length === 0) {
      const user = matched || admins[0] || {
        id: 'ADM-01',
        nama: 'Administrator Utama',
        username: 'admin',
        email: 'admin@perpus.sch.id',
        role: 'Administrator',
      };
      setCurrentLoggedInUser(user);
      showToast(`Selamat datang kembali, ${user.nama || user.username}!`, 'success');
      onSuccess(user);
    } else {
      showToast('Nama pengguna / email atau kata sandi tidak sesuai', 'error');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = regToken.trim().toUpperCase();

    if (token !== validToken.toUpperCase()) {
      showToast('Token Registrasi tidak valid! Hubungi Pengelola Perpustakaan.', 'error');
      return;
    }

    if (regPass.length < 6) {
      showToast('Kata sandi minimal 6 karakter', 'warning');
      return;
    }

    if (regPass !== regPassConfirm) {
      showToast('Konfirmasi kata sandi tidak cocok', 'error');
      return;
    }

    const cleanUser = regUser.trim().toLowerCase();
    if (db.Administrator.some((a) => a.username.toLowerCase() === cleanUser)) {
      showToast('Nama pengguna sudah terdaftar, silakan pilih nama lain', 'warning');
      return;
    }

    const nextId = `ADM-${String(db.Administrator.length + 1).padStart(2, '0')}`;
    const newAdmin: AdministratorItem = {
      id: nextId,
      nama: regName.trim(),
      username: cleanUser,
      email: regEmail.trim(),
      password: regPass,
      role: 'Administrator',
      foto: '',
      createdAt: new Date().toISOString(),
    };

    db.Administrator.push(newAdmin);
    saveRepository(db);
    setCurrentLoggedInUser(newAdmin);
    showToast('Pendaftaran akun berhasil!', 'success');
    onSuccess(newAdmin);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = forgotUser.trim().toLowerCase();
    const tok = forgotToken.trim().toUpperCase();

    if (tok !== validToken.toUpperCase()) {
      showToast('Token otoritas tidak valid!', 'error');
      return;
    }

    if (forgotNewPass.length < 6) {
      showToast('Kata sandi baru minimal 6 karakter', 'warning');
      return;
    }

    if (forgotNewPass !== forgotConfirmPass) {
      showToast('Konfirmasi kata sandi tidak cocok', 'error');
      return;
    }

    const adm = db.Administrator.find(
      (a) => a.username.toLowerCase() === u || a.email.toLowerCase() === u
    );

    if (!adm) {
      showToast('Akun tidak ditemukan dalam sistem', 'error');
      return;
    }

    adm.password = forgotNewPass;
    saveRepository(db);
    setShowForgotModal(false);
    showToast('Kata sandi berhasil diubah! Silakan masuk kembali.', 'success');
    setLoginUser(adm.username);
    setLoginPass('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row my-auto">
        {/* Sisi Kiri: Branding Modern & Humanized */}
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-8 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <BookOpen className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">SIP-Perpus Modern</h2>
              <p className="text-xs text-teal-200/80 leading-relaxed">
                Platform pengelolaan perpustakaan sekolah yang tertata rapi, ramah pengguna, dan cepat.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Sirkulasi peminjaman & pengembalian otomatis</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Dukungan barcode scanner laser & kamera</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Cetak kartu anggota & label buku siap pakai</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{db.Sekolah?.nama || 'SMA Negeri 1 Edukasi'}</span>
            <span className="font-mono text-teal-400">v2.7 Modern</span>
          </div>
        </div>

        {/* Sisi Kanan: Form Masuk & Registrasi */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 flex flex-col justify-center bg-white">
          <div className="md:hidden flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">SIP-Perpus Modern</h3>
              <p className="text-[11px] text-slate-500">Sistem Informasi Perpustakaan</p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Masuk Petugas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Daftar Petugas Baru
            </button>
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nama Pengguna / Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="admin atau petugas@perpus.sch.id"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700">Kata Sandi</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Lupa sandi?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Masuk ke Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setLoginUser('admin');
                    setLoginPass('admin123');
                    showToast('Data login admin bawaan diisikan otomatis', 'info');
                  }}
                  className="text-[11px] text-slate-500 hover:text-teal-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Akun demo: <strong className="font-mono text-slate-700">admin</strong> / <strong className="font-mono text-slate-700">admin123</strong></span>
                  <span className="text-[10px] text-teal-600 font-semibold underline">(Isi Otomatis)</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzan"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Pengguna
                  </label>
                  <input
                    type="text"
                    required
                    value={regUser}
                    onChange={(e) => setRegUser(e.target.value)}
                    placeholder="afauzan"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="fauzan@perpus.sch.id"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kata Sandi</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regPass}
                      onChange={(e) => setRegPass(e.target.value)}
                      placeholder="Min. 6 digit"
                      className="w-full px-3 pr-8 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Konfirmasi Sandi
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regPassConfirm}
                      onChange={(e) => setRegPassConfirm(e.target.value)}
                      placeholder="Ulangi sandi"
                      className="w-full px-3 pr-8 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">Token Registrasi Otoritas</label>
                  <button
                    type="button"
                    onClick={() => {
                      setRegToken(validToken);
                      showToast(`Token otomatis diisi: ${validToken}`, 'info');
                    }}
                    className="text-[10px] text-teal-600 hover:text-teal-800 font-mono font-medium underline"
                  >
                    Pakai Default: {validToken}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regToken}
                    onChange={(e) => setRegToken(e.target.value)}
                    placeholder={`Masukkan token otoritas (bawaan: ${validToken})`}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-medium uppercase border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>Daftarkan Akun Petugas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Modal Lupa Kata Sandi */}
      {showForgotModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <KeyRound className="w-5 h-5 text-teal-600" />
              <h4 className="font-semibold text-sm">Pemulihan Kata Sandi</h4>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Masukkan nama pengguna dan token otoritas yang berlaku untuk memperbarui kata sandi akun Anda.
            </p>

            <form onSubmit={handleForgotSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Nama Pengguna / Email
                </label>
                <input
                  type="text"
                  required
                  value={forgotUser}
                  onChange={(e) => setForgotUser(e.target.value)}
                  placeholder="admin atau email Anda"
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-700">
                    Token Otoritas Perpustakaan
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotToken(validToken)}
                    className="text-[10px] text-teal-600 font-mono underline"
                  >
                    Pakai: {validToken}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={forgotToken}
                  onChange={(e) => setForgotToken(e.target.value)}
                  placeholder={`Masukkan token (bawaan: ${validToken})`}
                  className="w-full p-2.5 font-mono uppercase font-medium border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Sandi Baru
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                    placeholder="Min. 6 digit"
                    className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Ulangi Sandi
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={forgotConfirmPass}
                    onChange={(e) => setForgotConfirmPass(e.target.value)}
                    placeholder="Ulangi sandi"
                    className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium"
                >
                  Simpan Sandi Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
