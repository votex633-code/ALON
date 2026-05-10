// ============================================
// CONFIG SUPABASE
// ============================================
const SUPABASE_URL = 'https://XXXX.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkaGhqd2xwZHhveGJwcXdseWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDA3MDcsImV4cCI6MjA5NDAxNjcwN30.gDRMkUJltt-6iBOInDRYUhe9w1J5aDWCEs1wWQh3xCw'
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

// ============================================
// STATS HERO
// ============================================
async function loadStats() {
  const { data, error } = await supabase.from('stats').select('*')
  if (error) return console.error(error)

  data.forEach(stat => {
    const el = document.querySelector(`[data-stat="${stat.cle}"]`)
    if (el) el.textContent = stat.valeur
  })
}

// ============================================
// EVENTS
// ============================================
async function loadEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date_event', { ascending: true })

  if (error) return console.error(error)

  const container = document.querySelector('.events-grid')
  if (!container) return

  container.innerHTML = ''

  data.forEach(event => {
    const placesRestantes = event.places_max - event.places_prises
    const statut = event.statut

    const badge = statut === 'a_venir' ? '🟢 À venir'
                : statut === 'complet' ? '🔴 Complet'
                : '⚫ Terminé'

    const date = new Date(event.date_event).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    })

    container.innerHTML += `
      <div class="event-card ${statut === 'featured' ? 'featured' : ''}">
        <div class="event-badge">${badge}</div>
        <h3>${event.titre}</h3>
        <p class="event-type">🎮 ${event.type}</p>
        <p class="event-date">📅 ${date}</p>
        <p class="event-lieu">📍 ${event.lieu}</p>
        <p class="event-reward">🏆 ${event.recompense}</p>
        <p class="event-places">👥 ${event.places_prises}/${event.places_max} participants</p>
        <p class="event-desc">${event.description}</p>
        <button class="btn-inscrire" 
          ${statut !== 'a_venir' ? 'disabled' : ''}
          onclick="sInscrire(${event.id})">
          ${statut === 'a_venir' ? "S'inscrire" : badge}
        </button>
      </div>
    `
  })
}

// ============================================
// INSCRIPTION EVENT
// ============================================
async function sInscrire(eventId) {
  const pseudo = prompt("Ton pseudo Discord :")
  if (!pseudo) return

  // Vérifie si déjà inscrit
  const { data: existing } = await supabase
    .from('inscriptions')
    .select('*')
    .eq('event_id', eventId)
    .eq('pseudo', pseudo)
    .single()

  if (existing) {
    alert('❌ Tu es déjà inscrit à cet événement !')
    return
  }

  // Inscrit
  const { error } = await supabase
    .from('inscriptions')
    .insert({ event_id: eventId, pseudo: pseudo })

  if (error) {
    alert('❌ Erreur inscription')
    console.error(error)
    return
  }

  // Met à jour places_prises
  await supabase.rpc('increment_places', { event_id: eventId })

  alert(`✅ ${pseudo} inscrit avec succès !`)
  loadEvents()
}

// ============================================
// CLASSEMENT
// ============================================
async function loadClassement() {
  const { data, error } = await supabase
    .from('classement')
    .select('*')
    .order('rang', { ascending: true })
    .limit(10)

  if (error) return console.error(error)

  const container = document.querySelector('.leaderboard-list')
  if (!container) return

  container.innerHTML = ''

  data.forEach((joueur, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${joueur.rang}`

    container.innerHTML += `
      <div class="lb-row ${index < 3 ? 'top-three' : ''}">
        <span class="lb-rang">${medal}</span>
        <span class="lb-pseudo">${joueur.pseudo}</span>
        <span class="lb-victoires">${joueur.victoires}V</span>
        <span class="lb-points">${joueur.points} pts</span>
      </div>
    `
  })
}

// ============================================
// EQUIPE
// ============================================
async function loadEquipe() {
  const { data, error } = await supabase
    .from('equipe')
    .select('*')
    .order('ordre', { ascending: true })

  if (error) return console.error(error)

  const container = document.querySelector('.team-grid')
  if (!container) return

  container.innerHTML = ''

  data.forEach(membre => {
    container.innerHTML += `
      <div class="team-card">
        <div class="team-avatar">${membre.pseudo.charAt(0).toUpperCase()}</div>
        <h3>${membre.pseudo}</h3>
        <p class="team-role">${membre.role}</p>
        <p class="team-desc">${membre.description}</p>
      </div>
    `
  })
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadStats()
  loadEvents()
  loadClassement()
  loadEquipe()
})
