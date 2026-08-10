const LANG = document.documentElement.lang === 'nl' ? 'nl' : 'en';
const I18N = {
  en: { menuOpen: 'Menu', menuClose: 'Close', typeLabels: { paper: 'Paper', preprint: 'Preprint' }, dateLocale: 'en-GB' },
  nl: { menuOpen: 'Menu', menuClose: 'Sluiten', typeLabels: { paper: 'Artikel', preprint: 'Preprint' }, dateLocale: 'nl-BE' },
};
const T = I18N[LANG];

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-header nav');
menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', open);
  menuButton.textContent = open ? T.menuClose : T.menuOpen;
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

function quantumCanvas() {
  const canvas = document.querySelector('#quantum-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const field = document.createElement('canvas');
  const fieldSize = 32;
  field.width = field.height = fieldSize;
  const fieldCtx = field.getContext('2d');
  const pixels = fieldCtx.createImageData(fieldSize, fieldSize);
  let width, height, dpr, lastFrame = 0;

  function resize() {
    dpr = Math.min(devicePixelRatio, 2);
    width = canvas.clientWidth; height = canvas.clientHeight;
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    draw(0);
  }

  function packet(x, y, cx, cy, kx, ky, phase, spread) {
    const dx = x - cx, dy = y - cy;
    const envelope = Math.exp(-(dx * dx + dy * dy) * spread);
    const angle = kx * x + ky * y + phase;
    return [envelope * Math.cos(angle), envelope * Math.sin(angle)];
  }

  function draw(t) {

    const time = t * .00022;
    let offset = 0;
    for (let py = 0; py < fieldSize; py++) {
      const y = (py / (fieldSize - 1) - .5) * 2.35;
      for (let px = 0; px < fieldSize; px++) {
        const x = (px / (fieldSize - 1) - .5) * 2.35;
        const p1 = packet(x, y, -.30 * Math.cos(time), .22 * Math.sin(time), 7, 2, time * 4, 2.5);
        const p2 = packet(x, y, .34 * Math.sin(time * .8), -.24 * Math.cos(time), -4, 6, -time * 3.2, 2.8);
        const p3 = packet(x, y, .12 * Math.cos(time * 1.4), .34 * Math.sin(time * .7), 3, -7, time * 2.3, 3.2);
        const re = p1[0] + p2[0] * .88 + p3[0] * .72;
        const im = p1[1] + p2[1] * .88 + p3[1] * .72;
        const density = Math.min(1, (re * re + im * im) * .52);
        const phase = (Math.atan2(im, re) + Math.PI) / (Math.PI * 2);
        const glow = Math.pow(density, .62);
        const vignette = Math.max(0, 1 - Math.pow(Math.sqrt(x * x + y * y) / 1.55, 3));
        const intensity = glow * vignette;
        pixels.data[offset++] = 23 + intensity * (188 + phase * 18);
        pixels.data[offset++] = 25 + intensity * 218;
        pixels.data[offset++] = 19 + intensity * (42 + (1 - phase) * 18);
        pixels.data[offset++] = 255;
      }
    }
    fieldCtx.putImageData(pixels, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(field, 0, 0, width, height);
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(width, height) * .365, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(214,255,77,.10)';
    ctx.stroke();
  }
  resize(); addEventListener('resize', resize);
}

function flareCanvas() {
  const canvas = document.querySelector('#flare-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d'); let w, h, dpr;
  function resize() { dpr=Math.min(devicePixelRatio,2); w=canvas.clientWidth; h=canvas.clientHeight; canvas.width=w*dpr; canvas.height=h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); draw(0); }
  function draw(t) {
    ctx.clearRect(0,0,w,h); const cx=w*.76, cy=h*.52, r=Math.min(w,h)*.28;
    const glow=ctx.createRadialGradient(cx,cy,r*.05,cx,cy,r*1.8);
    glow.addColorStop(0,'rgba(245,255,186,1)'); glow.addColorStop(.28,'rgba(214,255,77,.9)'); glow.addColorStop(.6,'rgba(205,94,42,.24)'); glow.addColorStop(1,'transparent');
    ctx.fillStyle=glow; ctx.fillRect(0,0,w,h);
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle='#d6ff4d'; ctx.fill();
    for(let i=0;i<35;i++){const a=i*.78; const rr=(i%7)/7*r*.8; ctx.beginPath();ctx.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,1+(i%4),0,7);ctx.fillStyle='rgba(88,45,26,.24)';ctx.fill();}
    for(let j=0;j<5;j++){ctx.beginPath();for(let k=0;k<40;k++){const a=-1.3+j*.47+k*.014;const rr=r+(Math.sin(k*.35+t*.003+j)*12)+k*2.1;const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.55;if(!k)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=`rgba(222,255,103,${.4-j*.04})`;ctx.lineWidth=1.2;ctx.stroke();}
  }
  resize(); addEventListener('resize',resize);
}

const thoughts = [
  '“What changes when the number of particles tends to infinity?”',
  '“Can topology remember what local measurements forget?”',
  '“Where does a phase transition really happen—in matter or in description?”',
  '“How much of a star can be understood from the light it refuses to release?”',
  '“Which approximation is secretly a theorem waiting to be proved?”'
];
document.querySelector('#shuffle-thought')?.addEventListener('click', () => {
  const p = document.querySelector('#random-thought');
  let next; do next = thoughts[Math.floor(Math.random()*thoughts.length)]; while(next === p.textContent);
  p.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:350});
  p.textContent = next;
});


function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
}

function formatTalkDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return escapeHtml(value);
  return date.toLocaleDateString(T.dateLocale, { day: '2-digit', month: 'short', year: 'numeric' });
}

function renderTalks() {
  const list = document.querySelector('[data-talk-list]');
  if (!list) return;
  const talks = window.TALKS || [];
  list.innerHTML = talks.map(talk => {
    const event = escapeHtml(talk.event);
    const venue = escapeHtml(talk.venue);
    const location = event && venue ? `${event} &middot; ${venue}` : event || venue;
    return `<article class="talk-item"><time datetime="${escapeHtml(talk.date)}">${formatTalkDate(talk.date)}</time><div><p class="institution">${location}</p><h3>${escapeHtml(talk.title)}</h3></div></article>`;
  }).join('');
}

function renderPublications() {
  if (!document.querySelector('.publication-toolbar')) return;
  const pubs = window.PUBLICATIONS || [];
  document.querySelectorAll('.filter').forEach(btn => {
    const type = btn.dataset.filter;
    btn.querySelector('span').textContent = type === 'all' ? pubs.length : pubs.filter(p => p.type === type).length;
  });
  if (!pubs.length) return;
  const empty = document.querySelector('.empty-publications');
  empty.innerHTML = '<div class="publication-list"></div>';
  const list = empty.querySelector('.publication-list');
  const search = document.querySelector('#pub-search');
  let filter = 'all';
  function update() {
    const query = search.value.toLowerCase();
    const shown = pubs.filter(p => (filter === 'all' || p.type === filter) && JSON.stringify(p).toLowerCase().includes(query));
    list.innerHTML = shown.map(p => `<article class="pub-item"><span>${p.year}</span><div><p>${T.typeLabels[p.type] || p.type}</p><h3>${p.title}</h3><small>${p.authors} · ${p.venue}</small></div><a href="${p.url}" target="_blank" rel="noopener">↗</a></article>`).join('');
  }
  document.querySelectorAll('.filter').forEach(btn => btn.addEventListener('click', () => {
    document.querySelector('.filter.active').classList.remove('active'); btn.classList.add('active'); filter=btn.dataset.filter; update();
  }));
  search.addEventListener('input', update); update();
}
quantumCanvas(); flareCanvas(); renderTalks(); renderPublications();
