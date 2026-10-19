import { FormEvent, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ErrorBox } from '../components/Ui';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@gayuhmandala.co.id');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await login(email, password); }
    catch (err) { setError(err instanceof Error ? err.message : 'Login gagal'); }
    finally { setBusy(false); }
  }

  return <div className="login-page">
    <div className="login-panel">
      <div className="login-brand"><div className="brand-mark large">GM</div><div><h1>GMT Procurement</h1><p>PT Gayuh Mandala Teknika</p></div></div>
      <h2>Masuk ke aplikasi</h2>
      <p className="muted">Project, quotation, PO, partial delivery, invoice dan dokumen dalam satu workspace.</p>
      <ErrorBox error={error} />
      <form onSubmit={submit} className="form-stack">
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className="btn primary wide" disabled={busy}>{busy ? 'Memproses...' : 'Login'}</button>
      </form>
    </div>
    <div className="login-art"><div><span>PT GAYUH MANDALA TEKNIKA</span><h2>Procurement Workflow</h2><p>Dari sumber project sampai pembayaran, dengan histori dokumen yang tetap terhubung.</p></div></div>
  </div>;
}
