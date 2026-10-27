const root = document.querySelector('#app');
let language = (await fetch('/api/language').then(r => r.json()).catch(() => ({language:'es'}))).language;
const catalogs = { es: (await fetch('/api/catalog?language=es').then(r=>r.json())).catalog, fr: (await fetch('/api/catalog?language=fr').then(r=>r.json())).catalog };
let catalog = catalogs[language] || catalogs.es;
let state = { sessions: [], chatConfigured: false, audioConfigured: false };
let vocabulary = [];
let view = location.hash.slice(1) || 'inicio';
let recorder = null;
let recordedUrl = null;
let micStream = null;
let selectedWord = '';

let allItems = language==='es' ? catalog.items : [
  ...catalog.poems.map(x => ({ ...x, type: 'poema' })),
  ...catalog.songs.map(x => ({ ...x, type: 'musica' })),
  ...catalog.grammar.map(x => ({ ...x, type: 'gramatica' })),
];
const bookSteps = [
  ['01', 'Ouverture de la conférence', 'Situez la prise de parole et identifiez la question à laquelle elle répond.'],
  ['02', 'Présentation des objections', 'Relevez les objections successives dans votre exemplaire.'],
  ['03', 'Définition de l’existentialisme', 'Reformulez les notions centrales à partir des passages de votre édition.'],
  ['04', 'Choix et responsabilité', 'Suivez le raisonnement reliant choix, action et responsabilité.'],
  ['05', 'Exemples et conséquences', 'Séparez l’exemple mobilisé de la conclusion générale.'],
  ['06', 'Réponse sur l’humanisme', 'Repérez comment Sartre traite le mot « humanisme » dans la fin de la conférence.'],
  ['07', 'Reprise critique', 'Écrivez un résumé fidèle puis formulez votre propre objection.'],
];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const itemById = id => allItems.find(item => item.id === id);
const itemLabel = item => language==='es' ? ({leer:'LEER',escuchar:'ESCUCHAR',conversar:'CONVERSAR',dominar:'DOMINAR'}[item.type]||'APRENDER') : labelFor(item.type);
function setCatalog(lang) { language=lang; catalog=catalogs[lang]; allItems=lang==='es'?catalog.items: [...catalog.poems.map(x=>({...x,type:'poema'})),...catalog.songs.map(x=>({...x,type:'musica'})),...catalog.grammar.map(x=>({...x,type:'gramatica'}))]; }
const draftKey = (id, field) => `francois.draft.${id}.${field}`;
function bindDraft(id, field, selector) { const input = root.querySelector(selector); if (!input) return; input.value = sessionStorage.getItem(draftKey(id, field)) || ''; input.addEventListener('input', () => sessionStorage.setItem(draftKey(id, field), input.value)); }
function clearDrafts(id) { for (const field of ['answer', 'note', 'reader']) sessionStorage.removeItem(draftKey(id, field)); }
const completed = session => ['gramatica','dominar'].includes(session.itemType) ? Boolean(session.correct) : true;
const completedSessions = () => state.sessions.filter(session=>(session.language||'fr')===language).filter(completed);
const reviewWords = () => { try { return JSON.parse(localStorage.getItem('francois.reviewWords') || '[]'); } catch { return []; } };
function currentCycle() {
  const count = completedSessions().length;
  if(language==='es') return catalog.items[count%catalog.items.length];
  const slot = count % 4;
  if (slot === 0) {
    const step = String(Math.floor(count / 4) + 1).padStart(2, '0');
    return { id: `SARTRE-${step}`, type: 'sartre', title: 'L’existentialisme est un humanisme', subtitle: bookSteps[(Number(step) - 1) % bookSteps.length][2], view: 'livro' };
  }
  const groups = [catalog.poems, catalog.songs, catalog.grammar];
  const type = ['poema', 'musica', 'gramatica'][slot - 1];
  return { ...groups[slot - 1][Math.floor(count / 4) % groups[slot - 1].length], type };
}
async function refreshState() {
  try { const response = await fetch('/api/state'); if (!response.ok) throw new Error(); state = await response.json(); }
  catch { state = { sessions: [], chatConfigured: false, audioConfigured:false, offline: true }; }
}
async function refreshVocabulary(){try{vocabulary=(await fetch(`/api/vocabulary?language=${language}`).then(r=>r.json())).words||[];}catch{vocabulary=[];}}
const completeCount = id => state.sessions.filter(session => session.itemId === id && completed(session)).length;
const labelFor = type => ({ poema: 'LIRE', musica: 'ÉCOUTER', gramatica: 'PRATIQUER', sartre: 'LIRE SARTRE' })[type] || 'ÉTUDIER';
const sessionNumber = () => completedSessions().length + 1;
function setView(next) {
  view = next;
  if (location.hash !== `#${next}`) history.replaceState(null, '', `#${next}`);
  document.querySelectorAll('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === (next.startsWith('study:') ? 'estudar' : next)));
  render();
}
function setNavigation() {
  document.querySelectorAll('.nav-link').forEach(button => button.onclick = () => button.dataset.view==='kaline' ? openKaline() : setView(button.dataset.view));
  document.querySelector('.brand').onclick = event => { event.preventDefault(); setView('inicio'); };
  document.querySelector('#progress-count').textContent = `${completedSessions().length} étapes`;
  const brand=document.querySelector('.brand');
  brand.setAttribute('aria-label',language==='es'?'La Kaline, Hoy':'François, Aujourd’hui');
  brand.innerHTML=`<span class="brand-mark">${language==='es'?'K':'F'}</span><span>${language==='es'?'LA KALINE':'FRANÇOIS'}<small>${language==='es'?'TU ESPAÑOL, A TU MANERA':'APPRENDRE LE FRANÇAIS'}</small></span>`;
  const switcher=document.querySelector('#language-switch');
  if(switcher){switcher.textContent=language==='es'?'ES':'FR';switcher.setAttribute('aria-label',language==='es'?'Cambiar al francés':'Passer à l’espagnol');}
  document.documentElement.lang=language==='es'?'pt-BR':'pt-BR';
  root.setAttribute('lang',language==='es'?'es':'fr');
  const footer=document.querySelector('footer'); if(footer) footer.innerHTML=`<span>UNE LANGUE SE VIT.</span><span>${language==='es'?'ESPAÑOL · CULTURA · EDUCACIÓN':'FRANÇAIS · LITTÉRATURE · MUSIQUE'}</span><span id="service-status">${language==='es'?'Contenido local disponible':'Conteúdo local disponível'}</span>`;
}
function renderHome() {
  const item = currentCycle();
  const done = completeCount(item.id) > 0;
  const subtitle = item.subtitle || item.theme || item.semanticNuance || item.explanation || item.objective || '';
  const lastCompletion = sessionStorage.getItem(`francois.lastCompletion.${language}`);
  root.innerHTML = `<section class="home-screen">
    <div class="welcome-line"><div><p class="eyebrow">${language==='es'?'ESPAÑOL · A TU RITMO':'FRANÇAIS · À VOTRE RYTHME'}</p><h1>${language==='es'?'Hola, Ká.':'Bonjour, Ká.'}</h1><p>${language==='es'?'Tu español, a tu manera. Una idea cada día.':'On reprend notre découverte de la langue française.'}</p></div><button class="kaline-avatar" data-view="kaline" aria-label="${language==='es'?'Hablar con La Kaline':'Parler avec Kaline'}"><img src="/Retrato%20intelectual%20na%20biblioteca%20azul.png" alt="" onerror="this.hidden=true"><span>${language==='es'?'La Kaline':'Kaline'}</span></button></div>${lastCompletion ? `<p class="completion-note" role="status">${language==='es'?'Última sesión':'Dernière étape'} · ${escapeHTML(lastCompletion)}</p>` : ''}
    <article class="today-card"><div class="card-topline"><span>${language==='es'?'TU PRÓXIMA SESIÓN':'VOTRE PROCHAINE SÉANCE'}</span><span>${String(sessionNumber()).padStart(2, '0')} · 10 MIN</span></div><p class="item-type">${itemLabel(item)}${item.author ? ` · ${escapeHTML(item.author)}` : item.performer ? ` · ${escapeHTML(item.performer)}` : ''}</p><h2>${escapeHTML(item.title)}</h2><p class="today-subtitle">${escapeHTML(subtitle)}</p><div class="home-progress"><span>${language==='es'?'Recorrido':'Parcours'}</span><div><i style="width:${(completedSessions().length % 4) * 25}%"></i></div><b>${completedSessions().length % 4}/4</b></div><button class="button-primary continue-button" data-continue>${done ? (language==='es'?'RETOMAR':'REPRENDRE') : (language==='es'?'EMPEZAR':'CONTINUER')} <span>→</span></button></article>
    <div class="home-footnote"><span class="flag-mark" aria-hidden="true">${language==='es'?'ES':'FR'}</span><p>${language==='es'?'Leer, escuchar, conversar y dominar: cuatro maneras de avanzar.':'Une page à la fois. Un peu de lecture, d’écoute et de parole chaque jour.'}</p></div>
  </section>`;
  root.querySelector('[data-continue]').onclick = () => openItem(item.id);
  root.querySelector('[data-view]').onclick = openKaline;
}
function navItem(item) { return `<button class="catalog-row" data-open="${escapeHTML(item.id)}"><span class="row-id">${escapeHTML(item.id)}</span><span><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.author || item.performer || item.level || '')}</small></span><span class="row-arrow">→</span></button>`; }
function renderStudyLibrary() {
  if(language==='es'){
    root.innerHTML=`<section class="page-heading study-library-head"><p class="eyebrow">ESTUDIAR · BIBLIOTECA</p><h1>Cuatro formas de avanzar.</h1><p>Las sesiones son cortas. El recorrido de hoy te lleva por lectura, escucha, conversación y práctica.</p></section><section class="library-groups"><div><p class="eyebrow">ESPAÑOL · A1–A2</p>${catalog.items.map(navItem).join('')}</div></section>`;
    root.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>openItem(button.dataset.open)); return;
  }
  root.innerHTML = `<section class="page-heading study-library-head"><p class="eyebrow">ESTUDAR · BIBLIOTECA</p><h1>Choisir un chemin.</h1><p>Votre prochaine séance reste sur Aujourd’hui. La bibliothèque rassemble les ressources disponibles.</p></section><section class="library-groups"><div><p class="eyebrow">LECTURES</p><h2>Poésie · ${catalog.poems.length}</h2>${catalog.poems.map(navItem).join('')}<button class="catalog-row" data-open="SARTRE-01"><span class="row-id">LIVRE</span><span><b>L’existentialisme est un humanisme</b><small>Jean-Paul Sartre · jalons de lecture</small></span><span class="row-arrow">→</span></button></div><div><p class="eyebrow">ÉCOUTE</p><h2>Chanson · ${catalog.songs.length}</h2>${catalog.songs.map(navItem).join('')}</div><div><p class="eyebrow">STRUCTURES</p><h2>Grammaire · ${catalog.grammar.length}</h2>${catalog.grammar.map(navItem).join('')}</div></section>`;
  root.querySelectorAll('[data-open]').forEach(button => button.onclick = () => openItem(button.dataset.open));
}
function renderReview() {
  const misses = state.sessions.filter(s => (s.language||'fr')===language && ['gramatica','dominar'].includes(s.itemType) && !s.correct);
  const words = language==='es' ? vocabulary : reviewWords();
  root.innerHTML = `<section class="page-heading"><p class="eyebrow">${language==='es'?'REVISAR · RECUPERAR':'REVISAR · RETOMAR'}</p><h1>${language==='es'?'Volver a las palabras<br>y las estructuras.':'Revenir aux mots<br>et aux structures.'}</h1><p>${language==='es'?'Las palabras de español y las sesiones de este idioma se guardan por separado en SQLite.':'Les mots de français restent dans ce navigateur; les sessions sont conservées dans SQLite.'}</p></section>
    <section class="review-section"><p class="eyebrow">${language==='es'?'PALABRAS GUARDADAS':'MOTS GARDÉS'} · ${words.length}</p>${words.length ? words.map((word, index) => `<article class="review-row"><div><b>${escapeHTML(word.word)}</b><small>${escapeHTML(word.title)} · ${escapeHTML(word.context)}</small></div><button class="text-button" data-remove-word="${index}" data-word-id="${escapeHTML(word.id||'')}" aria-label="${language==='es'?'Quitar':'Retirer'} ${escapeHTML(word.word)}">${language==='es'?'Quitar':'Retirer'}</button></article>`).join('') : `<p class="empty-note">${language==='es'?'Las palabras elegidas durante una lectura aparecerán aquí.':'Les mots sélectionnés dans une lecture apparaîtront ici.'}</p>`}</section>
    <section class="review-section"><p class="eyebrow">GRAMMAIRE À REPRENDRE · ${misses.length}</p>${misses.length ? misses.map(session => { const item = itemById(session.itemId); return item ? `<button class="review-row review-open" data-open="${item.id}"><div><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.exercise)}</small></div><span>Reprendre →</span></button>` : ''; }).join('') : '<p class="empty-note">Aucune réponse incorrecte enregistrée. Les prochaines difficultés apparaîtront ici.</p>'}</section>`;
  root.querySelectorAll('[data-remove-word]').forEach(button => button.onclick = async () => { if(language==='es'){await fetch(`/api/vocabulary?id=${button.dataset.wordId}`,{method:'DELETE'});await refreshVocabulary();}else{const current=reviewWords();current.splice(Number(button.dataset.removeWord),1);localStorage.setItem('francois.reviewWords',JSON.stringify(current));}renderReview(); });
  root.querySelectorAll('[data-open]').forEach(button => button.onclick = () => openItem(button.dataset.open));
}
function renderBook(item) {
  const number = Number(item.id.slice(-2));
  const [step, title, prompt] = bookSteps[(number - 1) % bookSteps.length];
  const allDone = state.sessions.some(s => s.itemId === `SARTRE-${step}` && completed(s));
  root.innerHTML = `<section class="study-shell"><div class="study-toolbar"><button class="back-link" data-back>← ESTUDAR</button><span class="study-step">${labelFor('sartre')} · ${sessionNumber()} / 4</span></div><article class="study-content literary-content"><p class="eyebrow">JEAN-PAUL SARTRE · FOLIO ESSAIS 284</p><h1>${escapeHTML(title)}</h1><p class="study-prompt">${escapeHTML(prompt)}</p><p class="callout">La pagination et les passages dépendent de votre exemplaire. Le parcours propose un jalon original, pas un sommaire officiel. <a href="https://catalogue.bnf.fr/ark:/12148/cb35802338f" target="_blank" rel="noreferrer">Notice BnF ↗</a></p><label class="file-picker">Ouvrir mon exemplaire autorisé (reste dans ce navigateur)<input id="book-file" type="file" accept="application/pdf,.pdf,text/plain,.txt"></label><div id="book-preview"></div><label class="answer-label">Votre synthèse<textarea id="book-answer" placeholder="Notez l’idée que vous retenez de ce jalon."></textarea></label><button class="button-primary" id="finish-book" ${allDone ? 'disabled' : ''}>${allDone ? 'JALON DÉJÀ ENREGISTRÉ' : 'TERMINER CE JALON'} <span>→</span></button><p id="save-status" class="save-status" role="status"></p></article><button class="study-kaline" data-kaline><img src="/Retrato%20intelectual%20na%20biblioteca%20azul.png" alt="" onerror="this.hidden=true"><span>Une question ? Parler avec Kaline</span></button>${kalinePanel({...item,title})}</section>`;
  root.querySelector('[data-back]').onclick = () => setView('estudar');
  attachKaline({...item,title});
  root.querySelector('#book-file').onchange = async event => { const file = event.target.files?.[0]; const preview = root.querySelector('#book-preview'); if (!file) return; if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) { const url = URL.createObjectURL(file); preview.innerHTML = `<iframe class="book-pdf" title="Exemplaire personnel fourni par l’utilisateur" src="${url}"></iframe>`; } else { preview.textContent = await file.text(); preview.className = 'book-text'; } };
  bindDraft(`SARTRE-${step}`, 'answer', '#book-answer');
  root.querySelector('#finish-book').onclick = async event => { const answer = root.querySelector('#book-answer'); if (answer.value.trim().length < 12) { answer.focus(); answer.setCustomValidity('Écrivez une synthèse d’au moins 12 caractères.'); answer.reportValidity(); return; } const ok = await saveSession(`SARTRE-${step}`, 'sartre', true,{answer:answer.value.trim()}); root.querySelector('#save-status').textContent = ok ? 'Jalon enregistré dans SQLite sur cet appareil.' : 'La lecture n’a pas été enregistrée.'; if (ok) { clearDrafts(`SARTRE-${step}`); sessionStorage.removeItem('francois.activeItem'); sessionStorage.setItem('francois.lastCompletion', title); setView('inicio'); } };
}
function renderStudy(item) {
  if (item.type === 'sartre') return renderBook(item);
  const grammar = ['gramatica','dominar'].includes(item.type);
  const song = ['musica','escuchar'].includes(item.type);
  const reading = item.type === 'leer';
  const speaking = item.type === 'conversar';
  const previous = completeCount(item.id) > 0;
  const frenchContent = grammar ? `<p class="study-explanation">${escapeHTML(item.explanation)}</p><div class="example-line"><span>EXEMPLE</span><p>${escapeHTML(item.example)}</p></div><section class="exercise-box"><p class="eyebrow">À VOUS</p><p class="study-question">${escapeHTML(item.exercise)}</p><form id="exercise-form"><input id="exercise-answer" autocomplete="off" placeholder="Votre réponse" required><button class="button-primary">VÉRIFIER</button></form><div id="answer-feedback" class="answer-feedback" role="status"></div><p id="answer-why" class="answer-why"></p><small>Correction exacte selon le gabarit éditorial de cette unité.</small></section>` : song ? `<section class="listening-focus"><p class="eyebrow">${escapeHTML(item.performer)} · ${escapeHTML(item.year)}</p><h2>Écouter une fois, sans interrompre.</h2><p>${escapeHTML(item.listeningExercise)}</p>${item.audioEmbedUrl ? `<div class="audio-player"><iframe src="${escapeHTML(item.audioEmbedUrl)}" title="${escapeHTML(item.title)} — ${escapeHTML(item.performer)}, lecteur officiel YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><p class="source-note">Audio : <a href="${escapeHTML(item.audioSourceUrl)}" target="_blank" rel="noreferrer">${escapeHTML(item.audioSource)} ↗</a>. ${escapeHTML(item.audioLicense)}</p><a class="button-secondary lyrics-link" href="${escapeHTML(item.lyricsUrl)}" target="_blank" rel="noreferrer">Lire les paroles licenciées sur Paroles.net ↗</a><p class="source-note">${escapeHTML(item.lyricsLicense)}</p>` : `<a class="button-secondary" href="${escapeHTML(item.listenSearch)}" target="_blank" rel="noreferrer">Ouvrir une source d’écoute ↗</a><p class="source-note">Ouverture vers la recherche du service externe; aucune lecture intégrée n’a été vérifiée pour cette fiche.</p>`}<div class="practice-prompt"><span>APRÈS L’ÉCOUTE</span><p>${escapeHTML(item.singingExercise)}</p></div></section>` : `<section class="reader-focus"><p class="eyebrow">${escapeHTML(item.author)} · ${escapeHTML(item.work || item.period || '')}</p><h2>Lire à votre rythme.</h2><p class="reader-instruction">Ouvrez la source, puis collez ou saisissez un passage de votre exemplaire autorisé. Sélectionnez un mot pour garder-le en révision.</p><a class="text-button source-link" href="${escapeHTML(item.source)}" target="_blank" rel="noreferrer">Consulter une source ↗</a><label class="reader-label" for="reader-text">Votre passage</label><textarea id="reader-text" class="reader-text" placeholder="Un vers ou un passage de votre édition autorisée…"></textarea><div class="voice-tools"><button class="text-button" id="speak-button" ${state.audioConfigured ? '' : 'disabled'}>ÉCOUTER UN MOT OU UN EXTRAIT</button><span id="audio-status" role="status">${state.audioConfigured ? 'Voix française via Kokoro.' : 'Voix désactivée : API audio non configurée sur ce serveur.'}</span></div><div id="word-panel" class="word-panel" aria-live="polite"><span class="eyebrow">LECTURE CONTEXTUELLE</span><p>Sélectionnez un mot dans le passage pour voir ce que le catalogue indique.</p></div><div class="context-facts"><p><b>Repère de lecture</b> ${escapeHTML(item.semanticNuance || item.theme || 'Aucun repère sémantique fourni.')}</p><p><b>Vocabulaire signalé</b> ${escapeHTML(item.vocabulary || 'Aucun vocabulaire fourni.')}</p><p class="source-note">Le catalogue ne contient pas de définition mot à mot. Aucune traduction ou étymologie ne sera inventée.</p></div><div class="practice-prompt"><span>POUR ALLER PLUS LOIN</span><p>${escapeHTML(item.interpretationExercise)}</p></div></section>`;
  const spanishContent = reading ? `<section class="reader-focus"><p class="eyebrow">${escapeHTML(item.author)} · ${escapeHTML(item.level)}</p><h2>${escapeHTML(item.title)}</h2><p class="reader-instruction">Lee el texto original con calma. Selecciona una palabra para guardarla o preguntarle a La Kaline.</p><textarea id="reader-text" class="reader-text spanish-reading" lang="es" readonly>${escapeHTML(item.text)}</textarea><div class="voice-tools"><button class="text-button" id="speak-button" ${state.audioConfigured?'':'disabled'}>ESCUCHAR PALABRA O FRAGMENTO</button><span id="audio-status" role="status">${state.audioConfigured?'Voz española mediante Kokoro.':'Voz desactivada: el servicio de audio no está configurado.'}</span></div><p class="source-note"><a href="${escapeHTML(item.source)}" target="_blank" rel="noreferrer">Fuente temática: ${escapeHTML(item.sourceTitle)} ↗</a>. ${escapeHTML(item.rights)}</p><div id="word-panel" class="word-panel"><span class="eyebrow">PALABRA SELECCIONADA</span><p>Selecciona una palabra del texto.</p></div><div class="practice-prompt"><span>COMPRENDER</span><p>${escapeHTML(item.exercise)}</p>${item.choices ? `<form id="exercise-form"><div class="choice-list">${item.choices.map((choice,index)=>`<label><input type="radio" name="reading-choice" value="${index}"> ${escapeHTML(choice)}</label>`).join('')}</div><button class="button-primary">COMPROBAR</button></form><div id="answer-feedback" class="answer-feedback" role="status"></div><p id="answer-why" class="answer-why"></p>`:''}</div></section>` : song ? `<section class="listening-focus"><p class="eyebrow">${escapeHTML(item.author)} · ${escapeHTML(item.level)}</p><h2>${escapeHTML(item.title)}</h2><p>${escapeHTML(item.objective)}</p><a class="button-primary" href="${escapeHTML(item.audioUrl)}" target="_blank" rel="noreferrer">REPRODUCIR EN YOUTUBE ↗</a><p class="source-note"><a href="${escapeHTML(item.source)}" target="_blank" rel="noreferrer">Fuente y descripción institucional ↗</a>. ${escapeHTML(item.rights)}</p><div class="practice-prompt"><span>DESPUÉS DE ESCUCHAR</span><p>${escapeHTML(item.exercise)}</p></div></section>` : speaking ? `<section class="practice-prompt"><p class="eyebrow">PRODUCCIÓN PROPIA · ${escapeHTML(item.level)}</p><h2>${escapeHTML(item.title)}</h2><p>${escapeHTML(item.prompt)}</p><p class="source-note">${escapeHTML(item.criterion)}</p></section>` : `<p class="study-explanation">${escapeHTML(item.explanation)}</p><div class="example-line"><span>EJEMPLO</span><p>${escapeHTML(item.example)}</p></div><section class="exercise-box"><p class="eyebrow">TE TOCA</p><p class="study-question">${escapeHTML(item.exercise)}</p><form id="exercise-form"><input id="exercise-answer" autocomplete="off" placeholder="Tu respuesta" required><button class="button-primary">COMPROBAR</button></form><div id="answer-feedback" class="answer-feedback" role="status"></div><p id="answer-why" class="answer-why"></p><small>Corrección fija de la unidad.</small></section>`;
  const content = language==='es' ? spanishContent : frenchContent;
  root.innerHTML = `<section class="study-shell"><div class="study-toolbar"><button class="back-link" data-back>← ESTUDAR</button><span class="study-step">${itemLabel(item)} · ${sessionNumber()} / 4</span></div><article class="study-content"><p class="eyebrow">${escapeHTML(item.id)} · ${escapeHTML(item.difficulty || item.level || '')}</p><h1>${escapeHTML(item.title)}</h1><p class="study-byline">${escapeHTML(item.author || item.performer || '')}</p>${content}<label class="answer-label">${language==='es'?(grammar?'Tu frase con esta estructura':'Lo que te llevas'):(grammar?'Votre phrase avec cette structure':'Ce que vous retenez')}<textarea id="study-answer" placeholder="${language==='es'?'Escribe unas palabras para guardar lo que aprendiste.':'Quelques mots suffisent pour garder une trace de votre lecture.'}"></textarea></label><button class="button-primary" id="finish-item" ${previous ? 'disabled' : ''}>${previous ? (language==='es'?'SESIÓN YA GUARDADA':'ÉTAPE DÉJÀ ENREGISTRÉE') : (language==='es'?'TERMINAR LA SESIÓN':'TERMINER LA SÉANCE')} <span>→</span></button><p id="save-status" class="save-status" role="status"></p></article><button class="study-kaline" data-kaline aria-expanded="false"><img src="/Retrato%20intelectual%20na%20biblioteca%20azul.png" alt="" onerror="this.hidden=true"> <span>${language==='es'?'Hablar con La Kaline':'Une question ? Parler avec Kaline'}</span></button>${kalinePanel(item)}</section>`;
  root.querySelector('[data-back]').onclick = () => setView('estudar');
  attachKaline(item);
  if (grammar || (language==='es' && reading && item.choices)) {
    let checked = false;
    if(grammar) bindDraft(item.id, 'answer', '#exercise-answer');
    root.querySelector('#exercise-form').onsubmit = async event => { event.preventDefault(); const value=grammar?root.querySelector('#exercise-answer').value:root.querySelector('input[name="reading-choice"]:checked')?.value||''; const ok=grammar?normalize(value)===normalize(item.answer):Number(value)===item.answerIndex; const feedback=root.querySelector('#answer-feedback'); feedback.className=`answer-feedback ${ok?'good':'try-again'}`; feedback.textContent=ok?(language==='es'?'Correcto. Puedes continuar.':'Bonne réponse. Vous pouvez poursuivre.'):`${language==='es'?'Todavía no.':'Pas encore.'} ${item.why||''}`; root.querySelector('#answer-why').textContent=ok?item.why||'':''; checked=true; if(!previous)root.querySelector('#finish-item').disabled=false;root.querySelector('#finish-item').dataset.correct=String(ok);if(!await persistSessionActivity(item)){root.querySelector('#kaline-status').textContent='La respuesta se mostró, pero no se guardó el contexto pedagógico en SQLite.';} };
    root.querySelector('#finish-item').disabled = true;
  } else if (!song && !speaking) {
    const reader = root.querySelector('#reader-text');
    if(language==='fr') bindDraft(item.id, 'reader', '#reader-text');
    reader.addEventListener('select', () => showSelectedWord(reader, item));
    reader.addEventListener('selectionchange', () => showSelectedWord(reader, item));
    reader.addEventListener('keyup', () => showSelectedWord(reader, item));
    reader.addEventListener('mouseup', () => showSelectedWord(reader, item));
    reader.addEventListener('touchend', () => showSelectedWord(reader, item));
    root.querySelector('#speak-button').onclick = () => { const status=root.querySelector('#audio-status'); const button=root.querySelector('#speak-button'); const text=selectedExcerpt()||selectedWord; if(!text){status.textContent='Sélectionnez un mot ou un court extrait autorisé.';return;} speakFrench(text,status,button); };
  }
  bindDraft(item.id, 'note', '#study-answer');
  root.querySelector('#finish-item').onclick = async event => { const answer=root.querySelector('#study-answer'); if(answer.value.trim().length<4){answer.focus();answer.setCustomValidity(language==='es'?'Escribe una respuesta breve para guardar la sesión.':'Ajoutez une courte note avant de terminer.');answer.reportValidity();return;} if(language==='es'&&reading&&!event.currentTarget.dataset.correct){root.querySelector('#exercise-form')?.scrollIntoView({behavior:'smooth'});return;} const ok=(grammar||reading&&item.choices)?event.currentTarget.dataset.correct==='true':false; const artifact={answer:answer.value.trim(),exerciseAnswer:grammar?root.querySelector('#exercise-answer').value.trim():reading?root.querySelector('input[name="reading-choice"]:checked')?.value||'':'',correction:grammar||reading&&item.choices?`${item.answer}. ${item.why||''}`:''}; const saved=await saveSession(item.id,item.type,ok,artifact);root.querySelector('#save-status').textContent=saved?(language==='es'?'Sesión guardada en SQLite.':'Séance enregistrée dans SQLite sur cet appareil.'):(language==='es'?'No se pudo guardar la sesión.':'La séance n’a pas été enregistrée. Réessayez.');if(saved){clearDrafts(item.id);sessionStorage.removeItem('francois.activeItem');if(ok||!grammar&&!reading)sessionStorage.setItem(`francois.lastCompletion.${language}`,item.title);else if(language==='fr')sessionStorage.setItem(`francois.lastCompletion.${language}`,`Réponse à reprendre · ${item.title}`);setView('inicio');} };
}
function showSelectedWord(input, item) {
  const text = input.value.slice(input.selectionStart, input.selectionEnd).trim();
  if (!text) return;
  selectedWord = text;
  const panel = root.querySelector('#word-panel');
  const spanish=language==='es';
  panel.innerHTML = `<span class="eyebrow">${spanish?'PALABRA SELECCIONADA':'MOT SÉLECTIONNÉ'}</span><h3>${escapeHTML(text)}</h3><p>${spanish?'Pista contextual:':'Repère du catalogue :'} ${escapeHTML(item.semanticNuance || item.theme || item.objective || '—')}.</p>${item.vocabulary?.find?.(word=>word.word===text)?`<p>${escapeHTML(item.vocabulary.find(word=>word.word===text).meaningPt)}</p>`:''}<p class="source-note">${spanish?'La ficha ofrece solo las notas de vocabulario indicadas; no inventa una definición.':'La fiche ne fournit ni définition validée de ce mot ni traduction contextuelle.'}</p><button class="text-button" id="save-word">${spanish?'GUARDAR PARA REPASAR':'GARDER POUR RÉVISER'}</button><button class="text-button" id="ask-kaline">${spanish?'PREGUNTAR A LA KALINE':'DEMANDER À KALINE'}</button><span id="word-saved" role="status"></span>`;
  panel.querySelector('#save-word').onclick = async () => { if(spanish){const response=await fetch('/api/vocabulary',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({language,itemId:item.id,word:text,title:item.title,context:item.objective||''})});if(response.ok){await refreshVocabulary();panel.querySelector('#word-saved').textContent='Guardada en SQLite para repasar.';}else panel.querySelector('#word-saved').textContent='No se pudo guardar la palabra.';}else{const words=reviewWords();if(!words.some(word=>word.word===text&&word.itemId===item.id))words.unshift({word:text,title:item.title,context:item.semanticNuance||item.theme||'Contexte non renseigné',itemId:item.id,savedAt:new Date().toISOString()});localStorage.setItem('francois.reviewWords',JSON.stringify(words));panel.querySelector('#word-saved').textContent='Gardé dans Réviser sur ce navigateur.';} };
  panel.querySelector('#ask-kaline').onclick=openKaline;
}
function normalize(value) { return value.trim().toLocaleLowerCase(language==='es'?'es-419':'fr-FR').replace(/[.!?¿¡]/g, '').replace(/\s+/g, ' '); }
async function saveSession(itemId, itemType, correct, artifact = {}) {
  try { const response = await fetch('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId, itemType, correct, artifact, language }) }); if (!response.ok) throw new Error(); await refreshState(); updateProgress(); return true; }
  catch { return false; }
}
function kalinePanel(item) {
  const configured=state.chatConfigured;
  return `<aside class="kaline-panel" id="kaline-panel" hidden aria-label="Conversa com Kaline">
    <div class="kaline-panel-heading"><img src="/Retrato%20intelectual%20na%20biblioteca%20azul.png" alt="" onerror="this.hidden=true"><div><p class="eyebrow">${language==='es'?'LA KALINE':'KALINE FRANÇAISE'}</p><span>${escapeHTML(item.title)}</span></div><button class="text-button" id="kaline-close" aria-label="Fechar conversa">${language==='es'?'CERRAR':'FERMER'}</button></div>
    <p class="chat-state ${configured?'available':'unavailable'}" id="kaline-availability">${configured?(language==='es'?'Conversación y voz disponibles en este servidor.':'Conversa e áudio configurados neste servidor.'):(language==='es'?'Conversación y voz no disponibles: falta OPENROUTER_API_KEY en el servidor local.':'Conversa e áudio indisponíveis: configure OPENROUTER_API_KEY no servidor local.')}</p>
    <div class="messages" id="kaline-messages" aria-live="polite"><p class="empty-note">A conversa salva desta lição aparecerá aqui.</p></div>
    <div class="kaline-voice" aria-label="${language==='es'?'Voz en español':'Voz em francês'}">
      <div class="voice-tools"><button type="button" class="text-button" id="mic-start" ${configured?'':'disabled'}>${language==='es'?'GRABAR':'ENREGISTRER'}</button><button type="button" class="text-button" id="mic-stop" hidden>${language==='es'?'DETENER':'ARRÊTER'}</button><span id="mic-status" role="status">${configured?(language==='es'?'Grabación local temporal · máximo 10 s.':'Enregistrement local temporaire · 10 s maximum.'):(language==='es'?'Micrófono no disponible hasta configurar el servicio.':'Micro indisponible tant que le service n’est pas configuré.')}</span></div>
      <audio id="student-recording" controls hidden></audio><button type="button" class="button-secondary" id="transcribe-audio" hidden disabled>${language==='es'?'TRANSCRIBIR EN ESPAÑOL':'TRANSCRIRE EN FRANÇAIS'}</button>
      <label class="reader-label" for="confirmed-transcript" id="transcript-label" hidden>${language==='es'?'Revisa la transcripción':'Transcription à vérifier'}<textarea id="confirmed-transcript" maxlength="1000" disabled></textarea></label>
      <button type="button" class="button-secondary" id="send-transcript" hidden disabled>${language==='es'?'ENVIAR ESTA FRASE A LA KALINE':'ENVOYER CETTE PHRASE À KALINE'}</button>
    </div>
    <form class="kaline-form" id="kaline-form"><textarea id="kaline-input" maxlength="4000" placeholder="${language==='es'?'Pregunta o conversa en español…':'Posez votre question en français…'}" ${configured?'':'disabled'}></textarea><button class="button-primary" ${configured?'':'disabled'}>${language==='es'?'ENVIAR':'ENVOYER'} →</button></form>
    <p id="kaline-status" class="save-status" role="status"></p>
  </aside>`;
}
function appendChatMessage(message, item) {
  const list=root.querySelector('#kaline-messages'); if(!list)return;
  list.querySelector('.empty-note')?.remove();
  const row=document.createElement('article'); row.className=`message ${message.role==='user'?'user-message':'kaline-message'}${message.status==='failed'?' error-message':''}`;
  row.dataset.messageId=message.id||''; const body=document.createElement('p'); body.textContent=message.content; row.append(body);
  if(message.status==='pending') { const pending=document.createElement('small'); pending.textContent='Envio pendente ou interrompido; nenhuma resposta foi inventada.'; row.append(pending); }
  if(message.role==='assistant'&&state.audioConfigured) {
      const button=document.createElement('button'); button.className='text-button kaline-speak'; button.type='button'; button.textContent=language==='es'?'ESCUCHAR EN ESPAÑOL':'ÉCOUTER EN FRANÇAIS';
    const status=document.createElement('span'); status.className='audio-status'; status.setAttribute('role','status');
    button.onclick=()=>speakFrench(message.content,status,button); row.append(button,status);
  }
  list.append(row); list.scrollTop=list.scrollHeight;
}
async function speakFrench(text,status,button) {
  button.disabled=true; status.textContent='Génération audio en cours…';
  let url='';
  try { const response=await fetch('/api/tts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:text.slice(0,1200),language})}); if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error||`HTTP ${response.status}`); const type=response.headers.get('content-type')||''; if(!type.startsWith('audio/'))throw new Error('La réponse ne contient pas un flux audio.'); const blob=await response.blob(); if(!blob.size)throw new Error('Le fichier audio est vide.'); url=URL.createObjectURL(blob); const audio=new Audio(url); audio.onplaying=()=>status.textContent=language==='es'?'La voz española ha comenzado.':'La voix française a commencé.'; audio.onended=()=>{status.textContent=language==='es'?'Reproducción terminada.':'Lecture terminée.';URL.revokeObjectURL(url);button.disabled=false;}; audio.onerror=()=>{status.textContent='Échec de lecture audio.';URL.revokeObjectURL(url);button.disabled=false;}; await audio.play(); }
  catch(error){if(url)URL.revokeObjectURL(url);status.textContent=`Audio indisponible : ${error.message}`;button.disabled=false;}
}
async function loadConversation(item) {
  const list=root.querySelector('#kaline-messages'); if(!list)return;
  const query=new URLSearchParams({itemId:item.id,sessionNumber:String(sessionNumber())});
  try {const response=await fetch(`/api/conversation?${query}`);const result=await response.json();if(!response.ok)throw new Error(result.error||'Historique indisponible.');list.replaceChildren();if(result.messages.length)result.messages.forEach(message=>appendChatMessage(message,item));else list.innerHTML='<p class="empty-note">Aucun échange enregistré pour cette leçon.</p>';}
  catch(error){list.innerHTML=`<p class="empty-note">Histórico indisponível : ${escapeHTML(error.message)}</p>`;}
}
function selectedExcerpt() {
  const reader=root.querySelector('#reader-text'); if(!reader)return '';
  return reader.value.slice(reader.selectionStart,reader.selectionEnd).trim().slice(0,1200);
}
async function persistSessionActivity(item) {
  const answer=(root.querySelector('#book-answer')||root.querySelector('#study-answer'))?.value.trim()||'';
  const exerciseAnswer=root.querySelector('#exercise-answer')?.value.trim()||'';
  if(!answer&&!exerciseAnswer)return true;
  try{const response=await fetch('/api/session-context',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({itemId:item.id,sessionNumber:sessionNumber(),answer,exerciseAnswer})});if(!response.ok)throw new Error();return true;}catch{return false;}
}
async function sendKalineMessage(item,text) {
  const status=root.querySelector('#kaline-status'); status.textContent='Envoi au service de conversation…';
  if(!await persistSessionActivity(item)){status.textContent='Le contexte de la séance n’a pas été enregistré dans SQLite; la question n’a pas été envoyée.';return false;}
  const body={itemId:item.id,sessionNumber:sessionNumber(),message:text,language,selectedWord,savedWords:(language==='es'?vocabulary:reviewWords()).filter(w=>w.itemId===item.id),excerpt:selectedExcerpt()};
  try {const response=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.error||`HTTP ${response.status}`);await loadConversation(item);status.textContent='Réponse enregistrée dans SQLite.';return true;}
  catch(error){status.textContent=`Réponse indisponible : ${error.message}`;return false;}
}
function attachKaline(item) {
  const panel=root.querySelector('#kaline-panel'); const opener=root.querySelector('[data-kaline]'); if(!panel||!opener)return;
  opener.setAttribute('aria-expanded','false'); opener.onclick=async()=>{const open=panel.hidden;panel.hidden=!open;opener.setAttribute('aria-expanded',String(open));if(open&&!panel.dataset.loaded){await loadConversation(item);panel.dataset.loaded='true';}if(open)root.querySelector('#kaline-input')?.focus();};
  root.querySelector('#kaline-close').onclick=()=>{if(recorder?.state==='recording')recorder.stop();micStream?.getTracks().forEach(track=>track.stop());micStream=null;root.querySelector('#student-recording')?.pause();if(recordedUrl)URL.revokeObjectURL(recordedUrl);recordedUrl=null;panel.hidden=true;opener.setAttribute('aria-expanded','false');opener.focus();};
  root.querySelector('#kaline-form').onsubmit=async event=>{event.preventDefault();const input=root.querySelector('#kaline-input');const text=input.value.trim();if(!text)return;input.value='';await sendKalineMessage(item,text);};
  let chunks=[];let blob=null;
  const start=root.querySelector('#mic-start'),stop=root.querySelector('#mic-stop'),transcribe=root.querySelector('#transcribe-audio'),audio=root.querySelector('#student-recording'),transcriptLabel=root.querySelector('#transcript-label'),transcript=root.querySelector('#confirmed-transcript'),sendTranscript=root.querySelector('#send-transcript'),micStatus=root.querySelector('#mic-status');
  start.onclick=async()=>{try{if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Ce navigateur ne fournit pas MediaRecorder.');micStream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(micStream);recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};recorder.onstop=()=>{micStream?.getTracks().forEach(track=>track.stop());micStream=null;if(panel.hidden)return;blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});if(recordedUrl)URL.revokeObjectURL(recordedUrl);recordedUrl=URL.createObjectURL(blob);audio.src=recordedUrl;audio.hidden=false;transcribe.hidden=false;transcribe.disabled=!blob.size;micStatus.textContent=blob.size?'Enregistrement capturé; écoutez-le puis demandez sa transcription.':'Aucun audio capturé.';};recorder.start();start.hidden=true;stop.hidden=false;micStatus.textContent='Enregistrement en cours…';window.setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();stop.hidden=true;start.hidden=false;},10000);}catch(error){micStatus.textContent=`Micro indisponible : ${error.message}`;micStream?.getTracks().forEach(track=>track.stop());micStream=null;}};
  stop.onclick=()=>{if(recorder?.state==='recording')recorder.stop();stop.hidden=true;start.hidden=false;};
  transcribe.onclick=async()=>{if(!blob)return;transcribe.disabled=true;micStatus.textContent=language==='es'?'Transcripción española en curso…':'Transcription française en cours…';try{const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=reject;reader.readAsDataURL(blob);});const format=(blob.type.split('/')[1]||'webm').split(';')[0];const response=await fetch('/api/stt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({audio:base64,format,language})});const result=await response.json();if(!response.ok)throw new Error(result.error||`HTTP ${response.status}`);transcript.value=result.text;transcript.disabled=false;transcriptLabel.hidden=false;sendTranscript.hidden=false;sendTranscript.disabled=!result.text.trim();micStatus.textContent=language==='es'?'Transcripción recibida. Corrígela y confirma antes de enviarla.':'Transcription reçue. Corrige-a, depois confirme o envio.';}catch(error){micStatus.textContent=`Transcription indisponible : ${error.message}`;transcribe.disabled=false;}};
  transcript.oninput=()=>{sendTranscript.disabled=!transcript.value.trim();};
  sendTranscript.onclick=async()=>{const text=transcript.value.trim();if(!text)return;sendTranscript.disabled=true;const sent=await sendKalineMessage(item,text);if(!sent){sendTranscript.disabled=false;micStatus.textContent='Envoi échoué; corrigez ou réessayez avant de supprimer cet audio local.';return;}micStatus.textContent='Phrase confirmée et envoyée à Kaline.';audio.pause();audio.removeAttribute('src');audio.load();audio.hidden=true;transcriptLabel.hidden=true;sendTranscript.hidden=true;transcribe.hidden=true;transcript.value='';blob=null;if(recordedUrl)URL.revokeObjectURL(recordedUrl);recordedUrl=null;start.hidden=false;};
}
function render() {
  document.querySelectorAll('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === (view.startsWith('study:') ? 'estudar' : view)));
  if (view === 'inicio') return renderHome();
  if (view === 'estudar') return renderStudyLibrary();
  if (view === 'revisar') return renderReview();
  if (view === 'kaline') return renderLegacyKalineRoute();
  if (view.startsWith('study:')) { const id = view.slice(6); const item=id.startsWith('SARTRE-')&&language==='fr'?{...currentCycle(),id,type:'sartre'}:itemById(id);return item?renderStudy(item):setView('inicio'); }
  renderHome();
}
function openItem(id) {
  const item = id.startsWith('SARTRE-') ? { ...currentCycle(), id, type: 'sartre' } : itemById(id);
  if (!item) return;
  sessionStorage.setItem('francois.activeItem', item.id);
  selectedWord = '';
  setView(`study:${item.id}`);
}
function openKaline() {
  if(view.startsWith('study:')) {
    const panel=root.querySelector('#kaline-panel'); const opener=root.querySelector('[data-kaline]');
    if(panel?.hidden)opener?.click();else root.querySelector('#kaline-input')?.focus();
    return;
  }
  const active=sessionStorage.getItem('francois.activeItem');
  const id=active&&!state.sessions.some(s=>s.itemId===active&&completed(s))?active:currentCycle().id;
  openItem(id); root.querySelector('[data-kaline]')?.click();
}
async function changeLanguage(next){if(next===language)return;const response=await fetch('/api/language',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({language:next})});if(!response.ok)return;sessionStorage.removeItem('francois.activeItem');setCatalog(next);await refreshState();await refreshVocabulary();history.replaceState(null,'','#inicio');view='inicio';setNavigation();updateProgress();render();}
function renderLegacyKalineRoute() {
  const active=sessionStorage.getItem('francois.activeItem');
  const id=active&&!state.sessions.some(s=>s.itemId===active&&completed(s))?active:currentCycle().id;
  const item=id.startsWith('SARTRE-')?{...currentCycle(),id,type:'sartre'}:itemById(id);
  if(!item)return renderHome();
  view=`study:${id}`;history.replaceState(null,'',`#${view}`);renderStudy(item);root.querySelector('[data-kaline]')?.click();
}
function updateProgress() { const counter = document.querySelector('#progress-count'); if (counter) counter.textContent = `${completedSessions().length} étapes`; }
window.addEventListener('hashchange', () => { view = location.hash.slice(1) || 'inicio'; render(); });
window.addEventListener('beforeunload', () => { micStream?.getTracks().forEach(track=>track.stop()); if (recordedUrl) URL.revokeObjectURL(recordedUrl); });
await refreshState(); await refreshVocabulary();
if(view.startsWith('study:')){const routeId=view.slice(6);if(!(routeId.startsWith('SARTRE-')&&language==='fr')&&!itemById(routeId)){view='inicio';history.replaceState(null,'','#inicio');}}
setNavigation(); updateProgress();
document.querySelector('#language-switch')?.addEventListener('click',()=>changeLanguage(language==='es'?'fr':'es'));
if (view === 'inicio') { const active=sessionStorage.getItem('francois.activeItem'); const activeAllowed=active&&(active.startsWith('SARTRE-')?language==='fr':Boolean(itemById(active))); if(activeAllowed&&!state.sessions.some(s=>s.itemId===active&&(s.language||'fr')===language&&completed(s))){view=`study:${active}`;history.replaceState(null,'',`#${view}`);} }
render();
