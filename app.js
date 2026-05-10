// ============================================
// CONFIG SUPABASE
// ============================================
const SUPABASE_URL = 'https://adhhjwlpdxoxbpqwlyih.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkaGhqd2xwZHhveGJwcXdseWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDA3MDcsImV4cCI6MjA5NDAxNjcwN30.gDRMkUJltt-6iBOInDRYUhe9w1J5aDWCEs1wWQh3xCw';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// STATE
// ============================================
let currentUser = null;
let allEvents = [];
let currentFilter = 'tous';

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
  await loadStats();
  await loadNextEvent();
  await loadEvents();
  await loadClassement();
  startOnlineCounter();
});

// ============================================
// AUTH
// ============================================
async function checkSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    updateNavAuth();
  }
}

function updateNavAuth() {
  const btnCo = document.querySelector('.btn-connexion');
  if (currentUser && btnCo) {
    btnCo.textContent = '👤 ' + (currentUser.user_metadata?.username || currentUser.email.split('@')[0]).toUpperCase();
    btnCo.onclick = logout;
  }
}

async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  location.reload();
}

// Tab switch dans modal login
function switchTab(tab) {
  document.querySelectorAll('.mtab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
}

async function loginUser() {
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-pass').value;
  const msg = document.getElementById('login-msg');

  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) {
    msg.textContent = '❌ ' + error.message;
    msg.className = 'auth-msg error';
  } else {
    msg.textContent = '✅ Connecté !';
    msg.className = 'auth-msg success';
    setTimeout(() => location.reload(), 1000);
  }
}

async function registerUser() {
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const pass = document.getElementById('reg-pass').value;
  const msg = document.getElementById('reg-msg');

  const { error } = await sb.auth.signUp({
    email, password: pass,
    options: { data: { username } }
  });

  if (error) {
    msg.textContent = '❌ ' + error.message;
    msg.className = 'auth-msg error';
  } else {
    msg.textContent = '✅ Compte créé ! Vérifie ton email.';
    msg.className = 'auth-msg success';
  }
}

async function staffLogin() {
  const pass = document.getElementById('staff-pass').value;
  const msg = document.getElementById('staff-msg');

  if (pass === 'gtamind2025') {
    msg.textContent = '✅ Accès staff accordé !';
    msg.className = 'auth-msg success';
    setTimeout(() => {
      closeModal('staff');
      openModal('staffpanel');
    }, 800);
  } else {
    msg.textContent = '❌ Mot de passe incorrect';
    msg.className = 'auth-msg error';
  }
}

// ============================================
// STATS
// ============================================
async function loadStats() {
  const { data } = await sb.from('stats').select('*').single();
  if (data) {
    animateCount('stat-events', data.events || 128);
    animateCount('stat-participants', data.participants || 1247);
    animateCount('stat-gagnants', data.gagnants || 340);
    animateCount('stat-satisfaction', data.satisfaction || 4.9, true);
  } else {
    animateCount('stat-events', 128);
    animateCount('stat-participants', 1247);
    animateCount('stat-gagnants', 340);
    animateCount('stat-satisfaction', 4.9, true);
  }
}

function animateCount(id, target, isFloat = false) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const duration = 1500;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { start = target; clearInterval(timer); }
    el.textContent = isFloat ? parseFloat(start).toFixed(1) : Math.floor(start);
  }, 16);
}

// ============================================
// NEXT EVENT
// ============================================
async function loadNextEvent() {
  const { data } = await sb.from('events').select('*').eq('is_next', true).single();
  const container = document.getElementById('next-event-container');
  if (!container) return;

  const event = data || {
    title: 'GRAND PRIX DE LOS SANTOS — SAISON 3',
    type: 'course',
    location: 'Los Santos Circuit',
    max_places: 32,
    registered: 24,
    date_label: 'Sam. 15 Fév — 20h00',
    reward: 50000,
    level: 'Expert',
    event_datetime: new Date(Date.now() + 130807000).toISOString()
  };

  const fill = Math.round((event.registered / event.max_places) * 100);

  container.innerHTML = `
    <div class="next-event-card">
      <div class="live-badge">● BIENTÔT EN DIRECT</div>
      <h3>${event.title}</h3>
      <div class="next-meta">
        <span>🚗 ${event.type}</span>
        <span>|</span>
        <span>📍 ${event.location || 'Los Santos'}</span>
        <span>|</span>
        <span>👥 ${event.max_places} places max</span>
      </div>
      <div class="countdown" id="countdown"></div>
      <div class="progress-wrap">
        <span>Inscriptions ouvertes</span>
        <span class="pink">${event.registered} / ${event.max_places} places</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${fill}%"></div></div>
      <div class="next-footer">
        <div class="next-infos">
          <span>📅 ${event.date_label}</span>
          <span>🏆 Récompense : ${event.reward?.toLocaleString()} $</span>
          <span>📊 ${event.level}</span>
        </div>
        <button class="btn-primary" onclick="handleInscription()">S'INSCRIRE →</button>
      </div>
    </div>
  `;

  startCountdown(event.event_datetime);
}

function startCountdown(dateStr) {
  const target = new Date(dateStr).getTime();
  const el = document.getElementById('countdown');
  if (!el) return;

  function update() {
    const diff = target - Date.now();
    if (diff <= 0) { el.innerHTML = '<div class="count-box"><span>00</span><small>TERMINÉ</small></div>'; return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.innerHTML = `
      <div class="count-box"><span>${String(d).padStart(2,'0')}</span><small>JOURS</small></div>
      <div class="count-sep">:</div>
      <div class="count-box"><span>${String(h).padStart(2,'0')}</span><small>HEURES</small></div>
      <div class="count-sep">:</div>
      <div class="count-box"><span>${String(m).padStart(2,'0')}</span><small>MINUTES</small></div>
      <div class="count-sep">:</div>
      <div class="count-box"><span>${String(s).padStart(2,'0')}</span><small>SECONDES</small></div>
    `;
  }
  update();
  setInterval(update, 1000);
}

// ============================================
// EVENTS
// ============================================
async function loadEvents(filter = 'tous') {
  const grid = document.getElementById('events-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading">Chargement...</div>';

  let query = sb.from('events').select('*').order('created_at', { ascending: false });
  if (filter !== 'tous') query = query.eq('type', filter);

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    allEvents = getFakeEvents();
  } else {
    allEvents = data;
  }

  renderEvents(allEvents);
}

function renderEvents(events) {
  const grid = document.getElementById('events-grid');
  if (!grid) return;

  if (events.length === 0) {
    grid.innerHTML = '<div class="loading">Aucun event trouvé.</div>';
    return;
  }

  grid.innerHTML = events.map(ev => {
    const fill = Math.round((ev.registered / ev.max_places) * 100);
    const stars = getStars(ev.level);
    const typeClass = 'badge-' + ev.type;
    const typeLabel = ev.type?.toUpperCase();
    const img = ev.image_url || getDefaultImg(ev.type);

    return `
      <div class="event-card">
        <div class="event-card-img">
          <img src="${img}" alt="${ev.title}" onerror="this.src='https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400'">
          <div class="event-type-badge ${typeClass}">${typeLabel}</div>
          <div class="event-level">${stars} ${ev.level}</div>
        </div>
        <div class="event-card-body">
          <h4>${ev.title}</h4>
          <div class="event-card-meta">📅 ${ev.date_label}</div>
          <div class="event-card-row">
            <span>👥 ${ev.registered}/${ev.max_places} places</span>
            <span class="pink">💰 ${ev.reward?.toLocaleString()} $</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${fill}%"></div></div>
          <div class="event-card-footer">
            <div class="orga">
              <div class="orga-avatar">${(ev.organizer || 'M')[0].toUpperCase()}</div>
              <span>par ${ev.organizer || 'GTA Mind'}</span>
            </div>
            <button class="btn-inscrire" onclick="handleInscription(${ev.id})">S'INSCRIRE</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterEvents(type) {
  currentFilter = type;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  const filtered = type === 'tous' ? allEvents : allEvents.filter(e => e.type === type);
  renderEvents(filtered);
}

function getStars(level) {
  if (level === 'Expert') return '⭐⭐⭐';
  if (level === 'Confirmé') return '⭐⭐';
  return '⭐';
}

function getDefaultImg(type) {
  const imgs = {
    course: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400',
    combat: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
    rp: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
    tournoi: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400'
  };
  return imgs[type] || imgs.tournoi;
}

function getFakeEvents() {
  return [
    { id:1, title:'GRAND PRIX SAISON 3', type:'course', date_label:'Sam. 15 Fév — 20h00', registered:24, max_places:32, reward:50000, level:'Expert', organizer:'MaxEvent' },
    { id:2, title:'BATTLE ROYALE LS', type:'combat', date_label:'Dim. 16 Fév — 21h00', registered:18, max_places:50, reward:30000, level:'Confirmé', organizer:'KingOrga' },
    { id:3, title:'BRAQUAGE DE BANQUE', type:'rp', date_label:'Ven. 21 Fév — 19h30', registered:6, max_places:10, reward:20000, level:'Débutant', organizer:'SkyMaster' },
    { id:4, title:'TOURNOI MIND CUP #4', type:'tournoi', date_label:'Sam. 22 Fév — 18h00', registered:30, max_places:64, reward:100000, level:'Expert', organizer:'AdminPôle' },
    { id:5, title:'DRIFT CHAMPIONSHIP', type:'course', date_label:'Lun. 24 Fév — 20h00', registered:12, max_places:20, reward:25000, level:'Confirmé', organizer:'RaceKing' },
    { id:6, title:'GANG WARS — ZONE NORD', type:'combat', date_label:'Mar. 25 Fév — 21h30', registered:8, max_places:30, reward:40000, level:'Confirmé', organizer:'ZeroEvent' }
  ];
}

// ============================================
// INSCRIPTION
// ============================================
async function handleInscription(eventId) {
  if (!currentUser) {
    openModal('register');
    return;
  }

  const { error } = await sb.from('inscriptions').insert({
    user_id: currentUser.id,
    event_id: eventId,
    username: currentUser.user_metadata?.username || currentUser.email
  });

  if (error) {
    alert('❌ Erreur ou déjà inscrit !');
  } else {
    alert('✅ Inscription confirmée !');
  }
}

// ============================================
// CLASSEMENT
// ============================================
async function loadClassement() {
  const { data } = await sb.from('classement').select('*').order('score', { ascending: false }).limit(10);
  const players = data?.length ? data : getFakePlayers();
  renderClassement(players);
}

function renderClassement(players) {
  const container = document.getElementById('classement-table');
  if (!container) return;

  container.innerHTML = players.map((p, i) => {
    const cls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
    return `
      <div class="classement-row ${cls}">
        <div class="rank">${medal || '#' + (i+1)}</div>
        <div class="player-avatar">${(p.username || 'P')[0].toUpperCase()}</div>
        <div class="player-info">
          <div class="player-name">${p.username || 'Joueur'}</div>
          <div class="player-stats">${p.wins || 0} victoires · ${p.events || 0} events</div>
        </div>
        <div class="player-score">${(p.score || 0).toLocaleString()} pts</div>
      </div>
    `;
  }).join('');
}

function getFakePlayers() {
  return [
    { username:'MaxSpeed', wins:24, events:42, score:98500 },
    { username:'KingOrga', wins:19, events:38, score:87200 },
    { username:'RaceKing', wins:17, events:35, score:76400 },
    { username:'SkyMaster', wins:14, events:30, score:65100 },
    { username:'ZeroEvent', wins:12, events:28, score:54800 },
    { username:'NightRacer', wins:10, events:25, score:44200 },
    { username:'AdminPôle', wins:8, events:22, score:38700 },
    { username:'StreetKing', wins:6, events:18, score:29300 },
    { username:'DriftLord', wins:4, events:15, score:19800 },
    { username:'LsLegend', wins:2, events:10, score:9500 }
  ];
}

// ============================================
// STAFF — CREATE EVENT
// ============================================
async function createEvent() {
  const msg = document.getElementById('staff-event-msg');
  const ev = {
    title: document.getElementById('ev-title').value,
    type: document.getElementById('ev-type').value,
    date_label: document.getElementById('ev-date').value,
    event_datetime: document.getElementById('ev-datetime').value,
    max_places: parseInt(document.getElementById('ev-places').value),
    reward: parseInt(document.getElementById('ev-reward').value),
    level: document.getElementById('ev-level').value,
    image_url: document.getElementById('ev-image').value,
    organizer: document.getElementById('ev-orga').value,
    registered: 0,
    is_next: document.getElementById('ev-next').checked
  };

  const { error } = await sb.from('events').insert(ev);
  if (error) {
    msg.textContent = '❌ Erreur : ' + error.message;
    msg.className = 'auth-msg error';
  } else {
    msg.textContent = '✅ Event publié !';
    msg.className = 'auth-msg success';
    await loadEvents();
    await loadNextEvent();
  }
}

// ============================================
// MODALS
// ============================================
function openModal(id) {
  const el = document.getElementById('modal-' + id);
  if (el) el.classList.add('active');
}

function closeModal(id) {
  const el = document.getElementById('modal-' + id);
  if (el) el.classList.remove('active');
}

// Fermer en cliquant dehors
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// ============================================
// ONLINE COUNTER (simulation)
// ============================================
function startOnlineCounter() {
  const el = document.getElementById('onlineCount');
  if (!el) return;
  let base = 250;
  setInterval(() => {
    base += Math.floor(Math.random() * 7) - 3;
    if (base < 200) base = 200;
    if (base > 350) base = 350;
    el.textContent = base;
  }, 4000);
}
