'use client';

import { useEffect, useState } from 'react';

export default function SuccessPage() {
  const [purchase, setPurchase] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let timer;
    const controller = new AbortController();
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const key = `beat-store-access:${sessionId}`;
    let token;
    try {
      token = new URLSearchParams(window.location.hash.slice(1)).get('access');
      if (token) {
        sessionStorage.setItem(key, token);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } else token = sessionStorage.getItem(key);
    } catch { /* The fragment still works if session storage is unavailable. */ }
    if (!sessionId || !token) { setPurchase({ status: 'missing' }); return; }
    let count = 0;
    async function check() {
      try {
        const response = await fetch('/api/orders/access', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, token }), cache: 'no-store', signal: controller.signal
        });
        const result = await response.json();
        if (!response.ok) throw new Error('unavailable');
        if (cancelled) return;
        setPurchase(result);
        if (['pending', 'preparing'].includes(result.status) && ++count < 20) timer = setTimeout(check, 3000);
      } catch {
        if (!cancelled) setPurchase({ status: 'error' });
      }
    }
    setPurchase({ status: 'loading' });
    check();
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [attempt]);

  const messages = {
    loading: 'Checking your payment securely…',
    pending: 'Your payment is still being confirmed. Delayed payment methods may take longer. Check again shortly.',
    preparing: 'Payment confirmed. Your beat files and license are being prepared. Check again shortly.',
    ready: 'Payment confirmed. Your purchase is ready. Download links expire after five minutes; refresh them here when needed.',
    missing: 'Open the purchase access page from your checkout in the same browser. If you have lost access, contact the store with your receipt.',
    expired: 'This purchase access link has expired. Contact the store with your receipt for help.',
    error: 'Purchase access is temporarily unavailable. Please try again.'
  };
  return (
    <main className="success">
      <p className="eyebrow">YOUR PURCHASE</p>
      <h1>{purchase.status === 'ready' ? <>BEATS<br />READY.</> : <>ORDER<br />STATUS.</>}</h1>
      <p role="status" aria-live="polite">{messages[purchase.status]}</p>
      {purchase.beatTitle && <p>{purchase.beatTitle} — {purchase.licenseName}</p>}
      {purchase.downloads && <ul className="downloads">{purchase.downloads.map((file, index) => (
        <li key={index}><a className="primary" href={file.url} rel="noreferrer">DOWNLOAD {file.name}</a></li>
      ))}</ul>}
      {!['missing', 'expired', 'loading'].includes(purchase.status) && <button className="primary" onClick={() => setAttempt(value => value + 1)}>{purchase.status === 'ready' ? 'REFRESH DOWNLOAD LINKS' : 'CHECK AGAIN'}</button>}
      <p><a href="/">BACK TO BEATS</a></p>
    </main>
  );
}
