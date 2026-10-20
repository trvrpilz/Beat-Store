'use client';

import { useState } from 'react';

const beats = [
  { id: 'midnight-run', title: 'MIDNIGHT RUN', bpm: 142, key: 'C Minor', tags: ['Dark', 'Trap', 'Cinematic'] },
  { id: 'deep-shadows', title: 'DEEP SHADOWS', bpm: 88, key: 'F Minor', tags: ['Soul', 'Grimy', 'Boom Bap'] },
  { id: 'poolside', title: 'POOLSIDE', bpm: 104, key: 'A Minor', tags: ['West Coast', 'Luxury', 'Summer'] }
];

const licenses = [
  { name: 'MP3 Lease', price: 29, details: 'MP3 file · basic commercial use' },
  { name: 'WAV Lease', price: 49, details: 'WAV + MP3 · higher quality' },
  { name: 'Trackout / Stems', price: 99, details: 'Stems + WAV · more control', featured: true },
  { name: 'Unlimited', price: 199, details: 'Maximum usage · WAV + stems' }
];

export default function Home() {
  const [playing, setPlaying] = useState(null);
  const [busy, setBusy] = useState(false);

  async function buy(beat, license) {
    try {
      setBusy(true);
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beatId: beat.id, licenseName: license.name })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to start checkout.');
      window.location.href = data.url;
    } catch (error) {
      alert(error.message);
      setBusy(false);
    }
  }

  return (
    <main>
      <header>
        <div className="brand">TREVOR PILZ <span>BEATS</span></div>
        <nav>
          <a href="#beats">BEATS</a>
          <a href="#licensing">LICENSING</a>
          <a href="#about">ABOUT</a>
        </nav>
      </header>

      <section className="hero">
        <p className="eyebrow">ORIGINAL PRODUCTION · INSTANT LICENSING</p>
        <h1>FIND YOUR<br /><i>SOUND.</i></h1>
        <p>Original beats. Clear licensing. Instant checkout.</p>
        <a className="primary" href="#beats">BROWSE BEATS ↓</a>
      </section>

      <section id="beats" className="section">
        <div className="sectionHead">
          <div>
            <p className="eyebrow">CATALOG</p>
            <h2>BEATS</h2>
          </div>
          <span>{beats.length} TRACKS</span>
        </div>

        <div className="beatlist">
          {beats.map((beat, index) => (
            <article className="beat" key={beat.id}>
              <button className="play" aria-label={`Preview ${beat.title}`} onClick={() => setPlaying(playing === beat.id ? null : beat.id)}>
                {playing === beat.id ? 'Ⅱ' : '▶'}
              </button>
              <div className="track">
                <small>0{index + 1}</small>
                <div>
                  <h3>{beat.title}</h3>
                  <p>{beat.tags.join(' · ')}</p>
                </div>
              </div>
              <div className="meta"><span>{beat.bpm} BPM</span><span>{beat.key}</span></div>
              <div className="wave" aria-hidden="true">▁▃▆▂▅▇▃▁▅▆▂▇▅▃▆▁</div>
              <details>
                <summary>LICENSE +</summary>
                <div className="licenseMenu">
                  {licenses.map((license) => (
                    <button key={license.name} disabled={busy} onClick={() => buy(beat, license)}>
                      <span>{license.name}</span><b>${license.price}</b>
                    </button>
                  ))}
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section id="licensing" className="licenses section">
        <p className="eyebrow">SIMPLE TERMS</p>
        <h2>CHOOSE YOUR LICENSE</h2>
        <div className="cards">
          {licenses.map((license) => (
            <div className={`card ${license.featured ? 'featured' : ''}`} key={license.name}>
              {license.featured && <em>POPULAR</em>}
              <h3>{license.name}</h3>
              <strong>${license.price}</strong>
              <p>{license.details}</p>
              <a href="#beats">SELECT A BEAT</a>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="about section">
        <p className="eyebrow">THE PRODUCER</p>
        <h2>TREVOR PILZ</h2>
        <p>Independent production built for artists who want records with character. Preview a beat, choose the rights you need, and license it directly.</p>
      </section>

      <footer>© 2026 TREVOR PILZ <span>BEATS · LICENSING · CONTACT</span></footer>
    </main>
  );
}
