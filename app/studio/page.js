'use client';
import { useEffect, useState } from 'react';
import './studio.css';

export default function Studio() {
  const [auth, setAuth] = useState(false), [loading, setLoading] = useState(true), [beats, setBeats] = useState([]);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [selected, setSelected] = useState(''), [progress, setProgress] = useState(0);
  async function api(url, options) {
    const r = await fetch(url, options);
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) setAuth(false);
    if (!r.ok) throw new Error(data.error || 'Please sign in again or retry.');
    return data;
  }
  async function refresh() { setBeats((await api('/api/studio/beats')).beats); }
  useEffect(() => { api('/api/studio/session').then(async d => { setAuth(d.authenticated); if (d.authenticated) await refresh(); }).catch(e => setMessage(e.message)).finally(() => setLoading(false)); }, []);
  async function login(e) {
    e.preventDefault(); setBusy(true); setMessage('');
    const password = new FormData(e.currentTarget).get('password');
    try { await api('/api/studio/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); setAuth(true); await refresh(); }
    catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }
  async function create(e) {
    e.preventDefault(); const form = e.currentTarget, f = new FormData(form); setBusy(true); setMessage('');
    try {
      const { beat } = await api('/api/studio/beats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: f.get('title'), bpm: f.get('bpm') ? Number(f.get('bpm')) : null, musical_key: f.get('key'), tags: f.get('tags'), price_cents: f.get('price') ? Math.round(Number(f.get('price')) * 100) : null }) });
      setSelected(beat.id); form.reset(); await refresh(); setMessage('Draft saved. Add your files below.');
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }
  async function upload(e) {
    e.preventDefault(); const form = e.currentTarget, f = new FormData(form), file = f.get('file'), kind = f.get('kind');
    if (!file?.size) return setMessage('Choose a file first.');
    if (file.size > (kind === 'artwork' ? 10 : 250) * 1024 * 1024) return setMessage('File too large: audio/stems up to 250 MB, artwork up to 10 MB.');
    setBusy(true); setMessage('Uploading… Keep this page open.'); setProgress(0);
    try {
      await new Promise((resolve, reject) => {
        const x = new XMLHttpRequest();
        x.open('PUT', '/api/studio/files?' + new URLSearchParams({ id: selected, kind, name: file.name }));
        x.upload.onprogress = ev => ev.lengthComputable && setProgress(Math.round(ev.loaded / ev.total * 100));
        x.onload = () => { if (x.status >= 200 && x.status < 300) resolve(); else { let msg = 'Upload failed. Retry your file.'; try { msg = JSON.parse(x.responseText).error || msg; } catch {} reject(new Error(msg)); } };
        x.onerror = () => reject(new Error('Connection interrupted. Retry your file.'));
        x.send(file);
      });
      form.reset(); await refresh(); setMessage('File uploaded and saved privately.');
    } catch (e) { setMessage(e.message); } finally { setBusy(false); setProgress(0); }
  }
  async function download(key) { try { const d = await api('/api/studio/files?' + new URLSearchParams({ key })); window.location.assign(d.url); } catch (e) { setMessage(e.message); } }
  return <main className="studio"><header><a className="brand" href="/">TREVOR PILZ <span>BEATS</span></a><a href="/">View store ↗</a></header><div className="studioWrap">
    <p className="eyebrow">PRIVATE PRODUCER STUDIO</p><h1>Your sound.<br/><i>Your library.</i></h1>
    <p className="studioIntro">Upload and organize your beats. Files stay private and beats are saved as drafts until licensing and checkout are ready.</p>
    <p role="status" aria-live="polite" className="studioMessage">{message}</p>
    {loading ? <p>Opening studio…</p> : !auth ? <form className="studioPanel" onSubmit={login}><h2>Owner sign in</h2><label>Studio password<input name="password" type="password" autoComplete="current-password" required /></label><button className="primary" disabled={busy}>Open studio</button></form> : <>
      <button className="studioLink" disabled={busy} onClick={async () => { try { await api('/api/studio/session', { method: 'DELETE' }); setAuth(false); setBeats([]); setMessage('Signed out.'); } catch (e) { setMessage(e.message); } }}>Sign out</button>
      <div className="studioGrid"><form className="studioPanel" onSubmit={create}><p className="eyebrow">01 · CREATE A DRAFT</p><h2>Add a beat</h2><label>Title<input name="title" required maxLength={150}/></label><div className="studioPair"><label>Tempo (BPM)<input name="bpm" type="number" min="20" max="300" /></label><label>Musical key<input name="key" placeholder="C minor" maxLength={40}/></label></div><label>Tags<input name="tags" placeholder="Trap, dark, cinematic" maxLength={300}/></label><label>Planned starting price (USD)<input name="price" type="number" min="0" max="100000" step="0.01" placeholder="Optional"/></label><button className="primary" disabled={busy}>Save draft</button></form>
      <form className="studioPanel" onSubmit={upload}><p className="eyebrow">02 · ADD YOUR FILES</p><h2>Upload</h2><label>Beat<select value={selected} onChange={e => setSelected(e.target.value)} required><option value="">Select a beat</option>{beats.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label><label>File type<select name="kind"><option value="audio">Full audio · MP3 / WAV</option><option value="preview">Tagged preview · MP3</option><option value="stems">Stems · ZIP</option><option value="artwork">Artwork · JPG / PNG / WebP</option></select></label><label>File<input name="file" type="file" accept=".mp3,.wav,.zip,.jpg,.jpeg,.png,.webp" required/></label><p className="studioHint">Up to 250 MB per audio or ZIP file. Artwork up to 10 MB. Upload each file separately.</p><button className="primary" disabled={busy || !selected}>Upload privately</button>{busy && progress > 0 && <progress value={progress} max="100" aria-label="Upload progress"/>}</form></div>
      <section className="studioLibrary"><p className="eyebrow">YOUR PRIVATE CATALOG</p><h2>Beat library <span>({beats.length})</span></h2>{!beats.length && <p>No beats yet. Create your first draft above.</p>}{beats.map(b => <article className="studioPanel" key={b.id}><div className="studioRow"><h3>{b.title}</h3><span className="studioBadge">DRAFT</span></div><p className="studioHint">{[b.bpm && `${b.bpm} BPM`, b.musical_key, b.tags, b.price_cents != null && `$${(b.price_cents / 100).toFixed(2)} planned`].filter(Boolean).join(' · ')}</p>{!b.files.length && <p className="studioHint">No files uploaded yet.</p>}<ul>{b.files.map(f => <li key={f.key}><button className="studioLink" onClick={() => download(f.key)}>{f.name} ↓</button><span className="studioHint"> {f.kind} · {(f.size / 1048576).toFixed(1)} MB</span></li>)}</ul><button className="studioLink" disabled={busy} onClick={() => { setSelected(b.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Add files to this beat ↑</button></article>)}</section>
    </>}
  </div></main>;
}
