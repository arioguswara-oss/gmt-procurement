import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { ErrorBox } from '../components/Ui';

type Preview = { name: string; email: string; expiresAt: string };

export default function AcceptInvitationPage() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || '');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!token) { setError('Tautan undangan tidak lengkap'); return; }
    api<Preview>('/invitations/preview', { method: 'POST', body: JSON.stringify({ token }) })
      .then(setPreview).catch((e) => setError(e instanceof Error ? e.message : 'Undangan tidak valid'));
  }, [token]);

  async function accept(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Konfirmasi password tidak cocok'); return; }
    setBusy(true);
    try {
      await api('/invitations/accept', { method: 'POST', body: JSON.stringify({ token, password }) });
      window.history.replaceState(null, '', '/accept-invite');
      setAccepted(true);
      setPassword(''); setConfirmPassword('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Penerimaan undangan gagal'); }
    finally { setBusy(false); }
  }
  return <div className="login-page"><div className="login-panel">
    <h1>GMT Procurement</h1>
    {accepted ? <><h2>Akun berhasil dibuat</h2><p>Silakan login menggunakan email dan password yang baru dibuat.</p><Link to="/login">Ke halaman Login</Link></> :
      <><h2>Terima undangan</h2><ErrorBox error={error} />
        {preview && <><p>Undangan untuk <strong>{preview.name}</strong> ({preview.email}).</p>
          <p>Berlaku sampai {new Date(preview.expiresAt).toLocaleString('id-ID')}.</p>
          <form className="form-stack" onSubmit={accept}>
            <label>Password baru (minimal 12 karakter)<input type="password" autoComplete="new-password" minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            <label>Konfirmasi password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></label>
            <button className="btn primary wide" disabled={busy}>{busy ? 'Memproses...' : 'Aktifkan akun'}</button>
          </form></>}
      </>}
  </div></div>;
}
