import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ErrorBox } from '../components/Ui';

type Person = { id: string; name: string; email: string; role: string; active: boolean };
type Created = { token: string; expiresAt: string; email: string; name: string };

export default function AdminUsersPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('OPERATIONS');
  const [users, setUsers] = useState<Person[]>([]);
  const [link, setLink] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const items = await api<Person[]>('/invitations/users');
    setUsers(items);
  }
  useEffect(() => { load().catch((e) => setError(String(e))); }, []);

  async function invite(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true); setLink('');
    try {
      const result = await api<Created>('/invitations', {
        method: 'POST', body: JSON.stringify({ name, email, role }),
      });
      // URL fragments are not transmitted in HTTP requests or server access logs.
      setLink(`${window.location.origin}/accept-invite#token=${result.token}`);
      setExpiresAt(result.expiresAt);
      setName(''); setEmail('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Undangan gagal'); }
    finally { setBusy(false); }
  }
  async function setActive(user: Person) {
    if (!window.confirm(`${user.active ? 'Nonaktifkan' : 'Aktifkan'} akun ${user.name}?`)) return;
    try {
      await api(`/invitations/users/${user.id}/active`, {
        method: 'PATCH', body: JSON.stringify({ active: !user.active }),
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memperbarui akun'); }
  }
  return <div className="page-content" style={{ padding: 24 }}>
    <h1>Undang Pengguna</h1>
    <p>Hanya SUPER_ADMIN. Tautan berlaku 24 jam dan sekali pakai. Bagikan langsung kepada penerima lewat jalur tepercaya.</p>
    <ErrorBox error={error} />
    <form className="form-stack" onSubmit={invite} style={{ maxWidth: 520 }}>
      <label>Nama calon pengguna<input value={name} maxLength={150} onChange={(e) => setName(e.target.value)} required /></label>
      <label>Email<input type="email" value={email} maxLength={190} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Peran<select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="OPERATIONS">OPERATIONS (penguji)</option>
        <option value="ADMIN">ADMIN</option>
        <option value="FINANCE">FINANCE</option>
        <option value="VIEWER">VIEWER (tidak bisa verifikasi Coretax)</option>
      </select></label>
      <button className="btn primary" disabled={busy}>{busy ? 'Membuat...' : 'Buat undangan'}</button>
    </form>
    {link && <section style={{ marginTop: 20 }}>
      <h2>Tautan undangan baru</h2>
      <p>Berlaku sampai {new Date(expiresAt).toLocaleString('id-ID')}. Salin sekarang; tautan tidak dapat diminta ulang.</p>
      <input readOnly value={link} style={{ width: '100%' }} />
      <button className="btn" onClick={() => navigator.clipboard.writeText(link).catch(() => setError('Salin tautan secara manual'))}>Salin tautan</button>
    </section>}
    <h2 style={{ marginTop: 32 }}>Akun yang terdaftar</h2>
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%' }}>
      <thead><tr><th>ID</th><th>Nama</th><th>Email</th><th>Peran</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>{users.map((person) => <tr key={person.id}>
        <td>{person.id}</td><td>{person.name}</td><td>{person.email}</td><td>{person.role}</td>
        <td>{person.active ? 'Aktif' : 'Tidak aktif'}</td>
        <td>{person.role !== 'SUPER_ADMIN' && <button className="btn ghost" onClick={() => setActive(person)}>
          {person.active ? 'Nonaktifkan' : 'Aktifkan'}
        </button>}</td>
      </tr>)}</tbody>
    </table></div>
    <p>Untuk verifikasi Coretax, Rio mengisi CORETAX_VERIFIER_USER_ID pada konfigurasi server dengan ID akun Pak Supri yang muncul di atas (tanpa karakter tersembunyi), lalu restart aplikasi.</p>
  </div>;
}
