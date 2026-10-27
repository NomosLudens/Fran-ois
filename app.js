const root = document.querySelector('#app');
const catalog = await fetch('/content/catalog.json').then(r => r.json());
let state = { sessions: [], chatConfigured: false };
let view = location.hash.slice(1) || 'inicio';
let speechRecognition = null;
let recorder = null;
let recordedUrl = null;
let selectedWord = '';

const allItems = [
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
const draftKey = (id, field) => `francois.draft.${id}.${field}`;
function bindDraft(id, field, selector) { const input = root.querySelector(selector); if (!input) return; input.value = sessionStorage.getItem(draftKey(id, field)) || ''; input.addEventListener('input', () => sessionStorage.setItem(draftKey(id, field), input.value)); }
function clearDrafts(id) { for (const field of ['answer', 'note', 'reader']) sessionStorage.removeItem(draftKey(id, field)); }
const completed = session => session.itemType === 'gramatica' ? Boolean(session.correct) : true;
const completedSessions = () => state.sessions.filter(completed);
const reviewWords = () => { try { return JSON.parse(localStorage.getItem('francois.reviewWords') || '[]'); } catch { return []; } };
function currentCycle() {
  const count = completedSessions().length;
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
  catch { state = { sessions: [], chatConfigured: false, offline: true }; }
}
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
  document.querySelectorAll('.nav-link').forEach(button => button.onclick = () => setView(button.dataset.view));
  document.querySelector('.brand').onclick = event => { event.preventDefault(); setView('inicio'); };
  document.querySelector('#progress-count').textContent = `${completedSessions().length} étapes`;
}
function renderHome() {
  const item = currentCycle();
  const done = completeCount(item.id) > 0;
  const subtitle = item.subtitle || item.theme || item.semanticNuance || item.explanation || '';
  const lastCompletion = sessionStorage.getItem('francois.lastCompletion');
  root.innerHTML = `<section class="home-screen">
    <div class="welcome-line"><div><p class="eyebrow">FRANÇAIS · À VOTRE RYTHME</p><h1>Bonjour, Ká.</h1><p>On reprend notre découverte de la langue française.</p></div><button class="kaline-avatar" data-view="kaline" aria-label="Parler avec Kaline"><img src="/Retrato%20intelectual%20na%20biblioteca%20azul.png" alt=""><span>Kaline</span></button></div>${lastCompletion ? `<p class="completion-note" role="status">Dernière étape · ${escapeHTML(lastCompletion)}</p>` : ''}
    <article class="today-card"><div class="card-topline"><span>VOTRE PROCHAINE SÉANCE</span><span>${String(sessionNumber()).padStart(2, '0')} · 10 MIN</span></div><p class="item-type">${labelFor(item.type)}${item.author ? ` · ${escapeHTML(item.author)}` : item.performer ? ` · ${escapeHTML(item.performer)}` : ''}</p><h2>${escapeHTML(item.title)}</h2><p class="today-subtitle">${escapeHTML(subtitle)}</p><div class="home-progress"><span>Parcours</span><div><i style="width:${(completedSessions().length % 4) * 25}%"></i></div><b>${completedSessions().length % 4}/4</b></div><button class="button-primary continue-button" data-continue>${done ? 'REPRENDRE' : 'CONTINUER'} <span>→</span></button></article>
    <div class="home-footnote"><span class="flag-mark" aria-hidden="true">FR</span><p>Une page à la fois. Un peu de lecture, d’écoute et de parole chaque jour.</p></div>
  </section>`;
  root.querySelector('[data-continue]').onclick = () => openItem(item.id);
  root.querySelector('[data-view]').onclick = () => setView('kaline');
}
function navItem(item) { return `<button class="catalog-row" data-open="${escapeHTML(item.id)}"><span class="row-id">${escapeHTML(item.id)}</span><span><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.author || item.performer || item.level || '')}</small></span><span class="row-arrow">→</span></button>`; }
function renderStudyLibrary() {
  root.innerHTML = `<section class="page-heading study-library-head"><p class="eyebrow">ESTUDAR · BIBLIOTECA</p><h1>Choisir un chemin.</h1><p>Votre prochaine séance reste sur Aujourd’hui. La bibliothèque rassemble les ressources disponibles.</p></section><section class="library-groups"><div><p class="eyebrow">LECTURES</p><h2>Poésie · ${catalog.poems.length}</h2>${catalog.poems.map(navItem).join('')}<button class="catalog-row" data-open="SARTRE-01"><span class="row-id">LIVRE</span><span><b>L’existentialisme est un humanisme</b><small>Jean-Paul Sartre · jalons de lecture</small></span><span class="row-arrow">→</span></button></div><div><p class="eyebrow">ÉCOUTE</p><h2>Chanson · ${catalog.songs.length}</h2>${catalog.songs.map(navItem).join('')}</div><div><p class="eyebrow">STRUCTURES</p><h2>Grammaire · ${catalog.grammar.length}</h2>${catalog.grammar.map(navItem).join('')}</div></section>`;
  root.querySelectorAll('[data-open]').forEach(button => button.onclick = () => openItem(button.dataset.open));
}
function renderReview() {
  const misses = state.sessions.filter(s => s.itemType === 'gramatica' && !s.correct);
  const words = reviewWords();
  root.innerHTML = `<section class="page-heading"><p class="eyebrow">REVISAR · RETOMAR</p><h1>Revenir aux mots<br>et aux structures.</h1><p>Les réponses grammaticales à retravailler viennent de SQLite. Les mots enregistrés sont conservés dans ce navigateur.</p></section>
    <section class="review-section"><p class="eyebrow">MOTS GARDÉS · ${words.length}</p>${words.length ? words.map((word, index) => `<article class="review-row"><div><b>${escapeHTML(word.word)}</b><small>${escapeHTML(word.title)} · ${escapeHTML(word.context)}</small></div><button class="text-button" data-remove-word="${index}" aria-label="Retirer ${escapeHTML(word.word)}">Retirer</button></article>`).join('') : '<p class="empty-note">Les mots sélectionnés dans une lecture apparaîtront ici.</p>'}</section>
    <section class="review-section"><p class="eyebrow">GRAMMAIRE À REPRENDRE · ${misses.length}</p>${misses.length ? misses.map(session => { const item = itemById(session.itemId); return item ? `<button class="review-row review-open" data-open="${item.id}"><div><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.exercise)}</small></div><span>Reprendre →</span></button>` : ''; }).join('') : '<p class="empty-note">Aucune réponse incorrecte enregistrée. Les prochaines difficultés apparaîtront ici.</p>'}</section>`;
  root.querySelectorAll('[data-remove-word]').forEach(button => button.onclick = () => { const current = reviewWords(); current.splice(Number(button.dataset.removeWord), 1); localStorage.setItem('francois.reviewWords', JSON.stringify(current)); renderReview(); });
  root.querySelectorAll('[data-open]').forEach(button => button.onclick = () => openItem(button.dataset.open));
}
function renderBook(item) {
  const number = Number(item.id.slice(-2));
  const [step, title, prompt] = bookSteps[(number - 1) % bookSteps.length];
  const allDone = state.sessions.some(s => s.itemId === `SARTRE-${step}` && completed(s));
  root.innerHTML = `<section class="study-shell"><div class="study-toolbar"><button class="back-link" data-back>← ESTUDAR</button><span class="study-step">${labelFor('sartre')} · ${sessionNumber()} / 4</span></div><article class="study-content literary-content"><p class="eyebrow">JEAN-PAUL SARTRE · FOLIO ESSAIS 284</p><h1>${escapeHTML(title)}</h1><p class="study-prompt">${escapeHTML(prompt)}</p><p class="callout">La pagination et les passages dépendent de votre exemplaire. Le parcours propose un jalon original, pas un sommaire officiel. <a href="https://catalogue.bnf.fr/ark:/12148/cb35802338f" target="_blank" rel="noreferrer">Notice BnF ↗</a></p><label class="file-picker">Ouvrir mon exemplaire autorisé (reste dans ce navigateur)<input id="book-file" type="file" accept="application/pdf,.pdf,text/plain,.txt"></label><div id="book-preview"></div><label class="answer-label">Votre synthèse<textarea id="book-answer" placeholder="Notez l’idée que vous retenez de ce jalon."></textarea></label><button class="button-primary" id="finish-book" ${allDone ? 'disabled' : ''}>${allDone ? 'JALON DÉJÀ ENREGISTRÉ' : 'TERMINER CE JALON'} <span>→</span></button><p id="save-status" class="save-status" role="status"></p></article></section>`;
  root.querySelector('[data-back]').onclick = () => setView('estudar');
  root.querySelector('#book-file').onchange = async event => { const file = event.target.files?.[0]; const preview = root.querySelector('#book-preview'); if (!file) return; if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) { const url = URL.createObjectURL(file); preview.innerHTML = `<iframe class="book-pdf" title="Exemplaire personnel fourni par l’utilisateur" src="${url}"></iframe>`; } else { preview.textContent = await file.text(); preview.className = 'book-text'; } };
  bindDraft(`SARTRE-${step}`, 'answer', '#book-answer');
  root.querySelector('#finish-book').onclick = async event => { const answer = root.querySelector('#book-answer'); if (answer.value.trim().length < 12) { answer.focus(); answer.setCustomValidity('Écrivez une synthèse d’au moins 12 caractères.'); answer.reportValidity(); return; } const ok = await saveSession(`SARTRE-${step}`, 'sartre', true); root.querySelector('#save-status').textContent = ok ? 'Jalon enregistré dans SQLite sur cet appareil.' : 'La lecture n’a pas été enregistrée.'; if (ok) { clearDrafts(`SARTRE-${step}`); sessionStorage.removeItem('francois.activeItem'); sessionStorage.setItem('francois.lastCompletion', title); setView('inicio'); } };
}
function renderStudy(item) {
  if (item.type === 'sartre') return renderBook(item);
  const grammar = item.type === 'gramatica';
  const song = item.type === 'musica';
  const previous = completeCount(item.id) > 0;
  const content = grammar ? `<p class="study-explanation">${escapeHTML(item.explanation)}</p><div class="example-line"><span>EXEMPLE</span><p>${escapeHTML(item.example)}</p></div><section class="exercise-box"><p class="eyebrow">À VOUS</p><p class="study-question">${escapeHTML(item.exercise)}</p><form id="exercise-form"><input id="exercise-answer" autocomplete="off" placeholder="Votre réponse" required><button class="button-primary">VÉRIFIER</button></form><div id="answer-feedback" class="answer-feedback" role="status"></div><p id="answer-why" class="answer-why"></p><small>Correction exacte selon le gabarit éditorial de cette unité.</small></section>` : song ? `<section class="listening-focus"><p class="eyebrow">${escapeHTML(item.performer)} · ${escapeHTML(item.year)}</p><h2>Écouter une fois, sans interrompre.</h2><p>${escapeHTML(item.listeningExercise)}</p>${item.audioEmbedUrl ? `<div class="audio-player"><iframe src="${escapeHTML(item.audioEmbedUrl)}" title="${escapeHTML(item.title)} — ${escapeHTML(item.performer)}, lecteur officiel YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><p class="source-note">Audio : <a href="${escapeHTML(item.audioSourceUrl)}" target="_blank" rel="noreferrer">${escapeHTML(item.audioSource)} ↗</a>. ${escapeHTML(item.audioLicense)}</p><a class="button-secondary lyrics-link" href="${escapeHTML(item.lyricsUrl)}" target="_blank" rel="noreferrer">Lire les paroles licenciées sur Paroles.net ↗</a><p class="source-note">${escapeHTML(item.lyricsLicense)}</p>` : `<a class="button-secondary" href="${escapeHTML(item.listenSearch)}" target="_blank" rel="noreferrer">Ouvrir une source d’écoute ↗</a><p class="source-note">Ouverture vers la recherche du service externe; aucune lecture intégrée n’a été vérifiée pour cette fiche.</p>`}<div class="practice-prompt"><span>APRÈS L’ÉCOUTE</span><p>${escapeHTML(item.singingExercise)}</p></div></section>` : `<section class="reader-focus"><p class="eyebrow">${escapeHTML(item.author)} · ${escapeHTML(item.work || item.period || '')}</p><h2>Lire à votre rythme.</h2><p class="reader-instruction">Ouvrez la source, puis collez ou saisissez un passage de votre exemplaire autorisé. Sélectionnez un mot pour garder-le en révision.</p><a class="text-button source-link" href="${escapeHTML(item.source)}" target="_blank" rel="noreferrer">Consulter une source ↗</a><label class="reader-label" for="reader-text">Votre passage</label><textarea id="reader-text" class="reader-text" placeholder="Un vers ou un passage de votre édition autorisée…"></textarea><div class="voice-tools"><button class="text-button" id="speak-button" ${'speechSynthesis' in window ? '' : 'disabled'}>ÉCOUTER LE PASSAGE</button><span id="audio-status" role="status">${'speechSynthesis' in window ? 'Synthèse vocale du navigateur.' : 'Synthèse vocale absente dans ce navigateur.'}</span></div><div id="word-panel" class="word-panel" aria-live="polite"><span class="eyebrow">LECTURE CONTEXTUELLE</span><p>Sélectionnez un mot dans le passage pour voir ce que le catalogue indique.</p></div><div class="context-facts"><p><b>Repère de lecture</b> ${escapeHTML(item.semanticNuance || item.theme || 'Aucun repère sémantique fourni.')}</p><p><b>Vocabulaire signalé</b> ${escapeHTML(item.vocabulary || 'Aucun vocabulaire fourni.')}</p><p class="source-note">Le catalogue ne contient pas de définition mot à mot. Aucune traduction ou étymologie ne sera inventée.</p></div><div class="practice-prompt"><span>POUR ALLER PLUS LOIN</span><p>${escapeHTML(item.interpretationExercise)}</p></div></section>`;
  root.innerHTML = `<section class="study-shell"><div class="study-toolbar"><button class="back-link" data-back>← ESTUDAR</button><span class="study-step">${labelFor(item.type)} · ${sessionNumber()} / 4</span></div><article class="study-content"><p class="eyebrow">${escapeHTML(item.id)} · ${escapeHTML(item.difficulty || item.level || '')}</p><h1>${escapeHTML(item.title)}</h1><p class="study-byline">${escapeHTML(item.author || item.performer || '')}</p>${content}<label class="answer-label">${grammar ? 'Votre phrase avec cette structure' : 'Ce que vous retenez'}<textarea id="study-answer" placeholder="Quelques mots suffisent pour garder une trace de votre lecture."></textarea></label><button class="button-primary" id="finish-item" ${previous ? 'disabled' : ''}>${previous ? 'ÉTAPE DÉJÀ ENREGISTRÉE' : 'TERMINER LA SÉANCE'} <span>→</span></button><p id="save-status" class="save-status" role="status"></p></article><button class="study-kaline" data-kaline><img src="/Retrato%20intelectual%20na%20biblioteca%20azul.png" alt=""> <span>Une question ? Parler avec Kaline</span></button></section>`;
  root.querySelector('[data-back]').onclick = () => setView('estudar');
  root.querySelector('[data-kaline]').onclick = () => setView('kaline');
  if (grammar) {
    let checked = false;
    bindDraft(item.id, 'answer', '#exercise-answer');
    root.querySelector('#exercise-form').onsubmit = event => { event.preventDefault(); const value = root.querySelector('#exercise-answer').value; const ok = normalize(value) === normalize(item.answer); const feedback = root.querySelector('#answer-feedback'); feedback.className = `answer-feedback ${ok ? 'good' : 'try-again'}`; feedback.textContent = ok ? 'Bonne réponse. Vous pouvez poursuivre.' : `Pas encore. La réponse attendue est « ${item.answer} ». ${item.why || ''}`; root.querySelector('#answer-why').textContent = ok ? item.why || '' : ''; checked = true; if (!previous) root.querySelector('#finish-item').disabled = false; root.querySelector('#finish-item').dataset.correct = String(ok); };
    root.querySelector('#finish-item').disabled = true;
  } else if (!song) {
    const reader = root.querySelector('#reader-text');
    bindDraft(item.id, 'reader', '#reader-text');
    reader.addEventListener('select', () => showSelectedWord(reader, item));
    reader.addEventListener('keyup', () => showSelectedWord(reader, item));
    if ('speechSynthesis' in window) root.querySelector('#speak-button').onclick = () => { const status = root.querySelector('#audio-status'); const button = root.querySelector('#speak-button'); const text = selectedWord || reader.value.trim(); if (!text) { status.textContent = 'Collez ou sélectionnez un passage avant de lancer la synthèse.'; return; } window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'fr-FR'; const voice = window.speechSynthesis.getVoices().find(candidate => candidate.lang.toLowerCase().startsWith('fr')); if (voice) utterance.voice = voice; status.textContent = 'Demande envoyée à la synthèse du navigateur…'; utterance.onstart = () => status.textContent = `Lecture vocale active${voice ? ` · ${voice.name}` : ''}.`; utterance.onend = () => status.textContent = 'Lecture vocale terminée.'; utterance.onerror = () => { status.textContent = 'La synthèse vocale a échoué dans ce navigateur; ce contrôle est désactivé.'; button.disabled = true; button.textContent = 'SYNTHÈSE INDISPONIBLE'; }; window.speechSynthesis.speak(utterance); };
  }
  bindDraft(item.id, 'note', '#study-answer');
  root.querySelector('#finish-item').onclick = async event => { const answer = root.querySelector('#study-answer'); if (answer.value.trim().length < 4) { answer.focus(); answer.setCustomValidity('Ajoutez une courte note avant de terminer.'); answer.reportValidity(); return; } const ok = grammar ? event.currentTarget.dataset.correct === 'true' : false; const saved = await saveSession(item.id, item.type, ok); root.querySelector('#save-status').textContent = saved ? 'Séance enregistrée dans SQLite sur cet appareil.' : 'La séance n’a pas été enregistrée. Réessayez.'; if (saved) { clearDrafts(item.id); sessionStorage.removeItem('francois.activeItem'); if (ok || !grammar) sessionStorage.setItem('francois.lastCompletion', item.title); else sessionStorage.setItem('francois.lastCompletion', `Réponse à reprendre · ${item.title}`); setView('inicio'); } };
}
function showSelectedWord(input, item) {
  const text = input.value.slice(input.selectionStart, input.selectionEnd).trim();
  if (!text) return;
  selectedWord = text;
  const panel = root.querySelector('#word-panel');
  panel.innerHTML = `<span class="eyebrow">MOT SÉLECTIONNÉ</span><h3>${escapeHTML(text)}</h3><p>Repère du catalogue : ${escapeHTML(item.semanticNuance || item.theme || 'aucun contexte fourni')}.</p><p class="source-note">La fiche ne fournit ni définition validée de ce mot ni traduction contextuelle.</p><button class="text-button" id="save-word">GARDER POUR RÉVISER</button><span id="word-saved" role="status"></span>`;
  panel.querySelector('#save-word').onclick = () => { const words = reviewWords(); if (!words.some(word => word.word === text && word.itemId === item.id)) words.unshift({ word: text, title: item.title, context: item.semanticNuance || item.theme || 'Contexte non renseigné', itemId: item.id, savedAt: new Date().toISOString() }); localStorage.setItem('francois.reviewWords', JSON.stringify(words)); panel.querySelector('#word-saved').textContent = 'Gardé dans Réviser sur ce navigateur.'; };
}
function normalize(value) { return value.trim().toLocaleLowerCase('fr-FR').replace(/[.!?¿]/g, '').replace(/\s+/g, ' '); }
async function saveSession(itemId, itemType, correct) {
  try { const response = await fetch('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId, itemType, correct }) }); if (!response.ok) throw new Error(); await refreshState(); updateProgress(); return true; }
  catch { return false; }
}
function renderChat() {
  const activeId = sessionStorage.getItem('francois.activeItem');
  const activeItem = view.startsWith('study:') ? itemById(view.slice(6)) : activeId?.startsWith('SARTRE-') ? { ...currentCycle(), id: activeId } : itemById(activeId) || currentCycle();
  const configured = state.chatConfigured;
  root.innerHTML = `<section class="chat-layout"><div class="chat-intro"><p class="eyebrow">KALINE FRANÇAISE</p><h1>Parlons de français.</h1><p>Une interlocutrice pour explorer les mots, la grammaire et vos lectures.</p><p class="chat-state ${configured ? 'available' : 'unavailable'}">${configured ? 'Service de conversation configuré.' : 'Service indisponible : OPENROUTER_API_KEY n’est pas configurée sur ce serveur.'}</p></div><div class="chat-panel"><div class="chat-context"><span>CONTEXTE DE SÉANCE</span><b>${escapeHTML(activeItem?.title || 'Aucune séance')}</b>${selectedWord ? `<small>Mot sélectionné : ${escapeHTML(selectedWord)}</small>` : ''}</div><div id="messages" class="messages"><div class="message kaline-message">${configured ? 'Bonjour. Quel détail de français aimeriez-vous explorer ?' : 'La conversation est désactivée tant que le service n’est pas configuré.'}</div></div><form id="chat-form"><textarea id="chat-input" maxlength="4000" placeholder="Une tournure, un passage, une question…" ${configured ? '' : 'disabled'}></textarea><button class="button-primary" ${configured ? '' : 'disabled'}>ENVOYER →</button></form></div></section>`;
  root.querySelector('#chat-form').onsubmit = async event => { event.preventDefault(); const input = root.querySelector('#chat-input'); const text = input.value.trim(); if (!text) return; const messages = root.querySelector('#messages'); messages.insertAdjacentHTML('beforeend', `<div class="message user-message">${escapeHTML(text)}</div>`); input.value = ''; const pending = document.createElement('div'); pending.className = 'message kaline-message'; pending.textContent = 'Demande envoyée au service…'; messages.append(pending); try { const response = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: `Contexte de séance: ${activeItem?.title || 'aucun'}. Mot sélectionné: ${selectedWord || 'aucun'}. Question: ${text}` }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); pending.textContent = result.reply; } catch (error) { pending.textContent = `Réponse indisponible : ${error.message}`; pending.classList.add('error-message'); } };
}
function render() {
  document.querySelectorAll('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === (view.startsWith('study:') ? 'estudar' : view)));
  if (view === 'inicio') return renderHome();
  if (view === 'estudar') return renderStudyLibrary();
  if (view === 'revisar') return renderReview();
  if (view === 'kaline') return renderChat();
  if (view.startsWith('study:')) { const id = view.slice(6); return renderStudy(id.startsWith('SARTRE-') ? { ...currentCycle(), id, type: 'sartre' } : itemById(id)); }
  renderHome();
}
function openItem(id) {
  const item = id.startsWith('SARTRE-') ? { ...currentCycle(), id, type: 'sartre' } : itemById(id);
  if (!item) return;
  sessionStorage.setItem('francois.activeItem', item.id);
  selectedWord = '';
  setView(`study:${item.id}`);
}
function updateProgress() { const counter = document.querySelector('#progress-count'); if (counter) counter.textContent = `${completedSessions().length} étapes`; }
window.addEventListener('hashchange', () => { view = location.hash.slice(1) || 'inicio'; render(); });
window.addEventListener('beforeunload', () => { if (recordedUrl) URL.revokeObjectURL(recordedUrl); });
await refreshState(); setNavigation(); updateProgress();
if (view === 'inicio') { const active = sessionStorage.getItem('francois.activeItem'); if (active && !state.sessions.some(s => s.itemId === active && completed(s))) { view = `study:${active}`; history.replaceState(null, '', `#${view}`); } }
render();
