/* ============================================================
   PYLÔNE PRODUCTION — app.js
   Stockage: localStorage (clé "pyloneDB_v1")
   Aucun module Qualité / Non-Conformité inclus (par exigence).
   ============================================================ */

const DB_KEY = 'pyloneDB_v1';
const uid = (p = '') => p + Math.random().toString(36).slice(2, 9);

const STATUTS_PYLONE = ['À produire', 'En production', 'Terminé'];
const STATUTS_EXPED = ['Préparée', 'Expédiée', 'En galvanisation', 'Retour partiel', 'Retour complet'];
const PROFILS_STD = ['L30x3','L40x3','L40x4','L45x3','L50x3','L50x4','L50x5','L60x4','L60x5','L60x6','L70x6','L70x7','L80x7','L80x8','L90x8','L90x9','L100x10','L120x10','L120x12','L120x15','L150x10','L150x15','L210x15','Autre cornière'];
const ACIERS_STD = ['S235','S275','S355'];

/* ---------- DB ---------- */
function emptyDB(){
  return {
    pieces: [],
    projects: [],
    pylones: [],
    nomenclature: [],
    production: [],
    expeditions: [],
    retours: [],
    machines: [{id:uid('m_'),name:'Ficep Rapid 16T'},{id:uid('m_'),name:'Ficep Endeavour'},{id:uid('m_'),name:'Poinçonneuse P1'}],
    aciers: [...ACIERS_STD],
    profils: [...PROFILS_STD],
    seq: {exped:0, pylone:0},
    settings: {factoryName:'Usine Pylônes', role:'Admin'}
  };
}

let DB = load();

function load(){
  try{
    const raw = localStorage.getItem(DB_KEY);
    if(!raw) { const d = emptyDB(); seedDemo(d); localStorage.setItem(DB_KEY, JSON.stringify(d)); return d; }
    return JSON.parse(raw);
  }catch(e){ const d = emptyDB(); return d; }
}
function save(){ localStorage.setItem(DB_KEY, JSON.stringify(DB)); }

function seedDemo(d){
  // pieces
  const p1 = {id:uid('pc_'), repere:'101R-P60B', designation:'Montant principal', profil:'L60x5', longueur:6000, type_acier:'S275', poids_unitaire:14.2};
  const p2 = {id:uid('pc_'), repere:'2000-P60B', designation:'Diagonale', profil:'L50x4', longueur:4500, type_acier:'S235', poids_unitaire:6.8};
  const p3 = {id:uid('pc_'), repere:'5C', designation:'Traverse', profil:'L40x3', longueur:3000, type_acier:'S275', poids_unitaire:2.7};
  d.pieces.push(p1,p2,p3);
  const proj = {id:uid('pr_'), name:'Pylône électrique 2026', total:87, created_at:new Date().toISOString(), status:'En production',
    phases:[{id:uid('ph_'),name:'Phase 1',count:30},{id:uid('ph_'),name:'Phase 2',count:30},{id:uid('ph_'),name:'Phase 3',count:27}]};
  d.projects.push(proj);
  generatePylones(d, proj);
  d.nomenclature.push(
    {id:uid('nm_'), project_id:proj.id, piece_id:p1.id, qty:12},
    {id:uid('nm_'), project_id:proj.id, piece_id:p2.id, qty:24},
    {id:uid('nm_'), project_id:proj.id, piece_id:p3.id, qty:8},
  );
  const machine = d.machines[0].id;
  d.production.push(
    {id:uid('pd_'), date: isoDate(-1), machine, piece_id:p1.id, project_id:proj.id, quantite:250, barres:22, commentaire:''},
    {id:uid('pd_'), date: isoDate(0), machine, piece_id:p1.id, project_id:proj.id, quantite:120, barres:11, commentaire:''},
    {id:uid('pd_'), date: isoDate(0), machine, piece_id:p2.id, project_id:proj.id, quantite:480, barres:40, commentaire:''},
    {id:uid('pd_'), date: isoDate(-2), machine, piece_id:p3.id, project_id:proj.id, quantite:180, barres:15, commentaire:''},
  );
  const expId = uid('ex_');
  d.seq.exped = 15;
  d.expeditions.push({id:expId, numero:'GAL-2026-015', date: isoDate(-3), statut:'En galvanisation',
    lines:[
      {piece_id:p1.id, quantite:120, poids: +(120*p1.poids_unitaire).toFixed(1)},
      {piece_id:p2.id, quantite:480, poids: +(480*p2.poids_unitaire).toFixed(1)},
      {piece_id:p3.id, quantite:30, poids: +(30*p3.poids_unitaire).toFixed(1)},
    ]});
}
function isoDate(offsetDays){ const dt = new Date(); dt.setDate(dt.getDate()+offsetDays); return dt.toISOString().slice(0,10); }

function generatePylones(d, proj){
  d.pylones = d.pylones.filter(p=>p.project_id!==proj.id);
  proj.phases.forEach((ph,pi)=>{
    for(let i=1;i<=ph.count;i++){
      d.seq.pylone++;
      d.pylones.push({id:uid('py_'), project_id:proj.id, phase_id:ph.id, numero:`PYL-${String(d.seq.pylone).padStart(3,'0')}`, status:'À produire', progress:0, date_debut:'', date_fin:''});
    }
  });
}

/* ---------- computed helpers ---------- */
function piecesById(){ const m={}; DB.pieces.forEach(p=>m[p.id]=p); return m; }
function producedQty(pieceId, projectId){
  return DB.production.filter(p=>p.piece_id===pieceId && (!projectId || p.project_id===projectId)).reduce((s,p)=>s+Number(p.quantite||0),0);
}
function shippedQty(pieceId){
  let s=0; DB.expeditions.forEach(e=> e.lines.forEach(l=>{ if(l.piece_id===pieceId) s+=Number(l.quantite||0); })); return s;
}
function stockActuel(pieceId, projectId){ return producedQty(pieceId, projectId) - shippedQty(pieceId); }
function neededQty(pieceId, projectId){
  const nm = DB.nomenclature.find(n=>n.piece_id===pieceId && n.project_id===projectId);
  if(!nm) return 0;
  const proj = DB.projects.find(p=>p.id===projectId);
  const total = proj ? proj.phases.reduce((s,ph)=>s+Number(ph.count||0),0) : 0;
  return nm.qty * total;
}
function weightOf(piece, qty){ return +(Number(piece.poids_unitaire||0)*Number(qty||0)).toFixed(1); }
function kg(n){ return (n||0).toLocaleString('fr-FR',{maximumFractionDigits:1}) + ' kg'; }
function tonnes(n){ return ((n||0)/1000).toLocaleString('fr-FR',{maximumFractionDigits:2}) + ' t'; }
function num(n){ return (n||0).toLocaleString('fr-FR'); }
function fmtDate(s){ if(!s) return '—'; const d=new Date(s); return d.toLocaleDateString('fr-FR'); }

function statusBadgeClass(status){
  const m = {'À produire':'muted','En production':'warn','Terminé':'ok',
    'Préparée':'muted','Expédiée':'info','En galvanisation':'warn','Retour partiel':'warn','Retour complet':'ok',
    'OK':'ok','MANQUANT':'bad','EXCÉDENT':'info'};
  return m[status] || 'muted';
}

/* ---------- toast / modal ---------- */
function toast(msg){
  const el = document.createElement('div');
  el.className='toast'; el.textContent=msg;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 2600);
}
function openModal(title, bodyHtml, onMount){
  closeModal();
  const wrap = document.createElement('div');
  wrap.className='overlay'; wrap.id='modalOverlay';
  wrap.innerHTML = `<div class="modal"><button class="modal-close" onclick="closeModal()">✕</button><h3>${title}</h3>${bodyHtml}</div>`;
  wrap.addEventListener('click', (e)=>{ if(e.target===wrap) closeModal(); });
  document.body.appendChild(wrap);
  if(onMount) onMount(wrap);
}
function closeModal(){ const m=document.getElementById('modalOverlay'); if(m) m.remove(); }

/* ---------- router / nav ---------- */
const TABS = [
  {key:'dashboard', label:'Dashboard', ic:'▦'},
  {key:'pylones', label:'Pylônes', ic:'⌂'},
  {key:'nomenclature', label:'Nomenclature', ic:'≣'},
  {key:'pieces', label:'Repérés / Pièces', ic:'◆'},
  {key:'production', label:'Production', ic:'⚙'},
  {key:'stock', label:'Stock', ic:'▤'},
  {key:'galvanisation', label:'Galvanisation', ic:'⇄'},
  {key:'rapports', label:'Rapports', ic:'▥'},
  {key:'parametres', label:'Paramètres', ic:'⚑'},
];
let currentTab = 'dashboard';
let currentSub = {};

function renderShell(){
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="sidebar" id="sidebar">
      <div class="brand"><div class="bolt"></div> Pylône Production</div>
      <div class="nav" id="nav"></div>
      <div class="nav-foot">${DB.settings.factoryName}<br><span class="role-tag" id="roleTag">${DB.settings.role}</span></div>
    </div>
    <div class="main">
      <div class="topbar">
        <div style="display:flex;align-items:center;gap:10px;">
          <button class="menu-btn" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>
          <div><h1 id="pageTitle"></h1><div class="sub" id="pageSub"></div></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="btn btn-icon" title="Recherche rapide" onclick="openSearch()">⌕</button>
          <button class="btn btn-icon" title="Sauvegarder / Exporter" onclick="openBackup()">⇩</button>
        </div>
      </div>
      <div class="content" id="content"></div>
    </div>
    <div class="fab-nav" id="fabNav"></div>
  `;
  renderNav();
  renderTab();
}

function renderNav(){
  const nav = document.getElementById('nav');
  nav.innerHTML = TABS.map(t=>`<div class="nav-item ${t.key===currentTab?'active':''}" onclick="goTab('${t.key}')"><span class="ic">${t.ic}</span>${t.label}</div>`).join('');
  const fab = document.getElementById('fabNav');
  const fabTabs = ['dashboard','production','stock','galvanisation','rapports'];
  fab.innerHTML = fabTabs.map(k=>{ const t=TABS.find(x=>x.key===k); return `<div class="fab-item ${k===currentTab?'active':''}" onclick="goTab('${k}')"><span class="ic">${t.ic}</span>${t.label}</div>`; }).join('');
}
function goTab(key){ currentTab = key; document.getElementById('sidebar').classList.remove('open'); renderNav(); renderTab(); }

function renderTab(){
  const c = document.getElementById('content');
  const titles = {
    dashboard:['Dashboard','Vue d’ensemble de la production et de la galvanisation'],
    pylones:['Pylônes','Projets, phases et suivi des pylônes'],
    nomenclature:['Nomenclature','Composition en pièces de chaque projet'],
    pieces:['Repérés / Pièces','Catalogue des pièces (profils, longueurs, acier)'],
    production:['Production','Saisie quotidienne et suivi par machine'],
    stock:['Stock','État du stock par pièce'],
    galvanisation:['Galvanisation','Expéditions, suivi et retours'],
    rapports:['Rapports','Production et galvanisation'],
    parametres:['Paramètres','Machines, aciers, sauvegarde'],
  };
  document.getElementById('pageTitle').textContent = titles[currentTab][0];
  document.getElementById('pageSub').textContent = titles[currentTab][1];
  const renderers = {dashboard:renderDashboard, pylones:renderPylones, nomenclature:renderNomenclature, pieces:renderPieces, production:renderProduction, stock:renderStock, galvanisation:renderGalvanisation, rapports:renderRapports, parametres:renderParametres};
  c.innerHTML = '';
  renderers[currentTab](c);
}

/* ============================================================ DASHBOARD */
function renderDashboard(c){
  const totalPylones = DB.pylones.length;
  const aProduire = DB.pylones.filter(p=>p.status==='À produire').length;
  const enProd = DB.pylones.filter(p=>p.status==='En production').length;
  const termine = DB.pylones.filter(p=>p.status==='Terminé').length;

  const today = isoDate(0);
  const prodToday = DB.production.filter(p=>p.date===today).reduce((s,p)=>s+Number(p.quantite||0),0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-7);
  const prodWeek = DB.production.filter(p=>new Date(p.date)>=weekStart).reduce((s,p)=>s+Number(p.quantite||0),0);
  const monthStart = new Date(); monthStart.setDate(monthStart.getDate()-30);
  const prodMonth = DB.production.filter(p=>new Date(p.date)>=monthStart).reduce((s,p)=>s+Number(p.quantite||0),0);

  const pmap = piecesById();
  let stockTotal=0, poidsStock=0;
  DB.pieces.forEach(pc=>{ const s = stockActuel(pc.id); stockTotal += Math.max(s,0); poidsStock += weightOf(pc, Math.max(s,0)); });

  let poidsEnvoye=0, poidsRecu=0, poidsEnCours=0;
  DB.expeditions.forEach(e=>{
    const w = e.lines.reduce((s,l)=>s+Number(l.poids||0),0);
    poidsEnvoye += w;
    const ret = DB.retours.find(r=>r.expedition_id===e.id);
    if(ret) poidsRecu += Number(ret.poids_recu||0); else poidsEnCours += w;
  });

  let qteManquante=0, piecesManquantes=0;
  DB.retours.forEach(r=>{
    const exp = DB.expeditions.find(e=>e.id===r.expedition_id);
    if(!exp) return;
    exp.lines.forEach(l=>{
      const rl = r.lines.find(x=>x.piece_id===l.piece_id);
      const recu = rl? Number(rl.quantite_recue||0):0;
      const diff = l.quantite - recu;
      if(diff>0){ qteManquante += diff; piecesManquantes++; }
    });
  });

  c.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-value">${num(totalPylones)}</div><div class="kpi-label">Pylônes total</div></div>
      <div class="kpi-card warn"><div class="kpi-value">${num(aProduire)}</div><div class="kpi-label">À produire</div></div>
      <div class="kpi-card info"><div class="kpi-value">${num(enProd)}</div><div class="kpi-label">En production</div></div>
      <div class="kpi-card ok"><div class="kpi-value">${num(termine)}</div><div class="kpi-label">Terminés</div></div>
      <div class="kpi-card"><div class="kpi-value">${num(prodToday)}</div><div class="kpi-label">Production aujourd’hui</div></div>
      <div class="kpi-card"><div class="kpi-value">${num(prodWeek)}</div><div class="kpi-label">Production semaine</div></div>
      <div class="kpi-card"><div class="kpi-value">${num(prodMonth)}</div><div class="kpi-label">Production mois</div></div>
      <div class="kpi-card"><div class="kpi-value">${num(stockTotal)}</div><div class="kpi-label">Stock total (pièces)</div></div>
      <div class="kpi-card"><div class="kpi-value">${tonnes(poidsStock)}</div><div class="kpi-label">Poids total en stock</div></div>
      <div class="kpi-card info"><div class="kpi-value">${tonnes(poidsEnvoye)}</div><div class="kpi-label">Poids envoyé galva</div></div>
      <div class="kpi-card warn"><div class="kpi-value">${tonnes(poidsEnCours)}</div><div class="kpi-label">Poids en galvanisation</div></div>
      <div class="kpi-card ok"><div class="kpi-value">${tonnes(poidsRecu)}</div><div class="kpi-label">Poids retourné</div></div>
      <div class="kpi-card bad"><div class="kpi-value">${num(qteManquante)}</div><div class="kpi-label">Quantité manquante</div></div>
      <div class="kpi-card bad"><div class="kpi-value">${num(piecesManquantes)}</div><div class="kpi-label">Repérés manquants</div></div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h2>Progression des pylônes</h2></div>
        <div class="panel-body" id="progWrap"></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Dernières expéditions galvanisation</h2></div>
        <div class="panel-body table-wrap" id="lastExped"></div>
      </div>
    </div>
  `;

  const progWrap = c.querySelector('#progWrap');
  if(DB.projects.length===0){ progWrap.innerHTML = `<div class="empty">Aucun projet. Créez un projet dans l’onglet Pylônes.</div>`; }
  DB.projects.forEach(proj=>{
    const projPylones = DB.pylones.filter(p=>p.project_id===proj.id);
    const done = projPylones.filter(p=>p.status==='Terminé').length;
    progWrap.innerHTML += `<div class="phase-row"><div class="lbl"><span>${proj.name} — ${proj.total} pylônes</span><span>${done}/${projPylones.length}</span></div><div class="bar"><div style="width:${projPylones.length? (done/projPylones.length*100):0}%"></div></div></div>`;
    proj.phases.forEach(ph=>{
      const phPylones = projPylones.filter(p=>p.phase_id===ph.id);
      const phDone = phPylones.filter(p=>p.status==='Terminé').length;
      progWrap.innerHTML += `<div class="phase-row" style="padding-left:14px;"><div class="lbl"><span>↳ ${ph.name} (${ph.count} pylônes)</span><span>${phDone}/${phPylones.length}</span></div><div class="bar"><div style="width:${phPylones.length? (phDone/phPylones.length*100):0}%"></div></div></div>`;
    });
  });

  const lastExped = c.querySelector('#lastExped');
  const recent = [...DB.expeditions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  lastExped.innerHTML = recent.length ? `<table><thead><tr><th>N°</th><th>Date</th><th>Poids</th><th>Statut</th></tr></thead><tbody>
    ${recent.map(e=>`<tr><td>${e.numero}</td><td>${fmtDate(e.date)}</td><td>${kg(e.lines.reduce((s,l)=>s+Number(l.poids||0),0))}</td><td><span class="badge ${statusBadgeClass(e.statut)}">${e.statut}</span></td></tr>`).join('')}
  </tbody></table>` : `<div class="empty">Aucune expédition.</div>`;
}

/* ============================================================ PYLÔNES / PROJETS */
function renderPylones(c){
  currentSub.pylones = currentSub.pylones || (DB.projects[0]? DB.projects[0].id : null);
  c.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Projets</h2><button class="btn btn-primary btn-sm" onclick="newProjectModal()">+ Nouveau projet</button></div>
      <div class="panel-body table-wrap">
        ${DB.projects.length? `<table><thead><tr><th>Projet</th><th>Total</th><th>Phases</th><th>Statut</th><th>Créé</th><th></th></tr></thead><tbody>
          ${DB.projects.map(p=>`<tr>
            <td class="wrap"><strong>${p.name}</strong></td>
            <td>${num(p.total)}</td>
            <td class="wrap">${p.phases.map(ph=>`${ph.name}: ${ph.count}`).join(' · ')}</td>
            <td><span class="badge info">${p.status}</span></td>
            <td>${fmtDate(p.created_at)}</td>
            <td><button class="btn btn-sm" onclick="viewProject('${p.id}')">Voir pylônes</button>
                <button class="btn btn-sm" onclick="editProjectModal('${p.id}')">✎</button></td>
          </tr>`).join('')}
        </tbody></table>` : `<div class="empty">Aucun projet créé. Cliquez sur « Nouveau projet ».</div>`}
      </div>
    </div>
    <div id="pylonesListWrap"></div>
  `;
  if(currentSub.pylones) renderPylonesList(c.querySelector('#pylonesListWrap'), currentSub.pylones);
}
function viewProject(id){ currentSub.pylones = id; renderTab(); }

function renderPylonesList(wrap, projectId){
  const proj = DB.projects.find(p=>p.id===projectId);
  if(!proj){ wrap.innerHTML=''; return; }
  const list = DB.pylones.filter(p=>p.project_id===projectId);
  const filterPhase = currentSub.phaseFilter || 'all';
  const filtered = filterPhase==='all'? list : list.filter(p=>p.phase_id===filterPhase);
  wrap.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h2>Pylônes — ${proj.name}</h2>
        <div class="chip-row">
          <span class="chip ${filterPhase==='all'?'active':''}" onclick="setPhaseFilter('all')">Toutes phases</span>
          ${proj.phases.map(ph=>`<span class="chip ${filterPhase===ph.id?'active':''}" onclick="setPhaseFilter('${ph.id}')">${ph.name}</span>`).join('')}
        </div>
      </div>
      <div class="panel-body table-wrap">
        <table><thead><tr><th>N°</th><th>Phase</th><th>Statut</th><th>Progression</th><th>Début</th><th>Fin</th><th></th></tr></thead><tbody>
        ${filtered.map(py=>{
          const ph = proj.phases.find(p=>p.id===py.phase_id);
          return `<tr>
            <td>${py.numero}</td>
            <td>${ph? ph.name:'—'}</td>
            <td><span class="badge ${statusBadgeClass(py.status)}">${py.status}</span></td>
            <td>
              <input type="range" min="0" max="100" value="${py.progress}" style="width:90px;vertical-align:middle;" onchange="updatePylone('${py.id}',{progress:Number(this.value)})">
              <span class="mono">${py.progress}%</span>
            </td>
            <td><input type="date" value="${py.date_debut}" style="width:130px;" onchange="updatePylone('${py.id}',{date_debut:this.value})"></td>
            <td><input type="date" value="${py.date_fin}" style="width:130px;" onchange="updatePylone('${py.id}',{date_fin:this.value})"></td>
            <td><select onchange="updatePylone('${py.id}',{status:this.value})">${STATUTS_PYLONE.map(s=>`<option ${s===py.status?'selected':''}>${s}</option>`).join('')}</select></td>
          </tr>`;
        }).join('')}
        </tbody></table>
        ${filtered.length===0? '<div class="empty">Aucun pylône dans cette phase.</div>':''}
      </div>
    </div>
  `;
}
function setPhaseFilter(v){ currentSub.phaseFilter=v; renderTab(); }
function updatePylone(id, patch){
  const py = DB.pylones.find(p=>p.id===id); if(!py) return;
  Object.assign(py, patch);
  if(patch.status==='Terminé') py.progress=100;
  save(); renderTab();
}

function newProjectModal(){
  openModal('Nouveau projet', `
    <div class="form-grid">
      <div class="field" style="grid-column:1/-1;"><label>Nom du projet</label><input id="npName" placeholder="Ex: Pylône électrique 2026"></div>
      <div class="field"><label>Nombre total de pylônes</label><input id="npTotal" type="number" min="1" value="90"></div>
      <div class="field"><label>Nombre de phases</label><input id="npPhases" type="number" min="1" max="10" value="3" onchange="rebuildPhaseInputs()"></div>
    </div>
    <div id="phaseInputs" style="margin-top:12px;"></div>
    <div class="form-actions"><button class="btn" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="createProject()">Créer le projet</button></div>
  `, ()=>{ rebuildPhaseInputs(); });
}
function rebuildPhaseInputs(){
  const n = Number(document.getElementById('npPhases').value)||1;
  const total = Number(document.getElementById('npTotal').value)||0;
  const base = Math.floor(total/n); const rem = total - base*n;
  const wrap = document.getElementById('phaseInputs');
  let html = '<div class="hint">Répartition des pylônes par phase (modifiable)</div><div class="line-list" style="margin-top:8px;">';
  for(let i=0;i<n;i++){
    const c = base + (i<rem?1:0);
    html += `<div class="line-item" style="grid-template-columns:1fr 100px;"><input value="Phase ${i+1}" id="phName${i}"><input type="number" min="0" value="${c}" id="phCount${i}"></div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
}
function createProject(){
  const name = document.getElementById('npName').value.trim();
  if(!name){ toast('Nom du projet requis'); return; }
  const n = Number(document.getElementById('npPhases').value)||1;
  const phases=[];
  for(let i=0;i<n;i++){ phases.push({id:uid('ph_'), name:document.getElementById('phName'+i).value||('Phase '+(i+1)), count:Number(document.getElementById('phCount'+i).value)||0}); }
  const total = phases.reduce((s,p)=>s+p.count,0);
  const proj = {id:uid('pr_'), name, total, created_at:new Date().toISOString(), status:'À produire', phases};
  DB.projects.push(proj);
  generatePylones(DB, proj);
  save(); closeModal(); toast('Projet créé — ' + total + ' pylônes générés');
  currentSub.pylones = proj.id;
  renderTab();
}
function editProjectModal(id){
  const proj = DB.projects.find(p=>p.id===id); if(!proj) return;
  openModal('Modifier le projet', `
    <div class="form-grid">
      <div class="field" style="grid-column:1/-1;"><label>Nom</label><input id="epName" value="${proj.name}"></div>
      <div class="field"><label>Statut</label><select id="epStatus">${['À produire','En production','Terminé'].map(s=>`<option ${s===proj.status?'selected':''}>${s}</option>`).join('')}</select></div>
    </div>
    <div class="hint" style="margin-top:10px;">Répartition par phase — modifier la quantité régénère la liste des pylônes de cette phase.</div>
    <div class="line-list" style="margin-top:8px;">
      ${proj.phases.map((ph,i)=>`<div class="line-item" style="grid-template-columns:1fr 100px;"><input value="${ph.name}" id="ephName${i}"><input type="number" value="${ph.count}" id="ephCount${i}"></div>`).join('')}
    </div>
    <div class="form-actions"><button class="btn" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveProjectEdit('${id}')">Enregistrer</button></div>
  `);
}
function saveProjectEdit(id){
  const proj = DB.projects.find(p=>p.id===id); if(!proj) return;
  proj.name = document.getElementById('epName').value.trim() || proj.name;
  proj.status = document.getElementById('epStatus').value;
  proj.phases.forEach((ph,i)=>{ ph.name = document.getElementById('ephName'+i).value || ph.name; ph.count = Number(document.getElementById('ephCount'+i).value)||0; });
  proj.total = proj.phases.reduce((s,p)=>s+p.count,0);
  generatePylones(DB, proj);
  save(); closeModal(); toast('Projet mis à jour'); renderTab();
}

/* ============================================================ NOMENCLATURE */
function renderNomenclature(c){
  if(DB.projects.length===0){ c.innerHTML = `<div class="panel"><div class="panel-body"><div class="empty">Créez d’abord un projet dans l’onglet Pylônes.</div></div></div>`; return; }
  currentSub.nomProject = currentSub.nomProject || DB.projects[0].id;
  const proj = DB.projects.find(p=>p.id===currentSub.nomProject);
  const pmap = piecesById();
  const lines = DB.nomenclature.filter(n=>n.project_id===proj.id);
  c.innerHTML = `
    <div class="tabs">${DB.projects.map(p=>`<div class="tab ${p.id===proj.id?'active':''}" onclick="setNomProject('${p.id}')">${p.name}</div>`).join('')}</div>
    <div class="panel">
      <div class="panel-head"><h2>Nomenclature — ${proj.name} (${proj.total} pylônes)</h2>
        <button class="btn btn-primary btn-sm" onclick="addNomLineModal('${proj.id}')">+ Ajouter une pièce</button></div>
      <div class="panel-body table-wrap">
        ${lines.length? `<table><thead><tr><th>Repéré</th><th>Profil</th><th>Long.</th><th>Acier</th><th>Qté / pylône</th><th>Qté totale</th><th>Produit</th><th>Reste</th><th></th></tr></thead><tbody>
        ${lines.map(l=>{
          const pc = pmap[l.piece_id]; if(!pc) return '';
          const totalNeed = l.qty * proj.total;
          const produced = producedQty(pc.id, proj.id);
          const reste = totalNeed - produced;
          return `<tr>
            <td>${pc.repere}</td><td>${pc.profil}</td><td>${num(pc.longueur)} mm</td><td>${pc.type_acier}</td>
            <td><input type="number" value="${l.qty}" style="width:70px;" onchange="updateNomQty('${l.id}',this.value)"></td>
            <td>${num(totalNeed)}</td>
            <td>${num(produced)}</td>
            <td><span class="badge ${reste<=0?'ok':'warn'}">${num(reste)}</span></td>
            <td><button class="btn btn-sm btn-danger" onclick="removeNomLine('${l.id}')">✕</button></td>
          </tr>`;
        }).join('')}
        </tbody></table>` : `<div class="empty">Aucune pièce définie pour ce projet.</div>`}
      </div>
    </div>
  `;
}
function setNomProject(id){ currentSub.nomProject=id; renderTab(); }
function updateNomQty(id, val){ const l = DB.nomenclature.find(n=>n.id===id); if(!l) return; l.qty = Number(val)||0; save(); renderTab(); }
function removeNomLine(id){ DB.nomenclature = DB.nomenclature.filter(n=>n.id!==id); save(); renderTab(); }
function addNomLineModal(projectId){
  const used = DB.nomenclature.filter(n=>n.project_id===projectId).map(n=>n.piece_id);
  const options = DB.pieces.filter(p=>!used.includes(p.id));
  if(options.length===0){ toast('Toutes les pièces sont déjà dans la nomenclature — créez une nouvelle pièce.'); return; }
  openModal('Ajouter une pièce à la nomenclature', `
    <div class="form-grid">
      <div class="field" style="grid-column:1/-1;"><label>Pièce (repéré)</label>
        <select id="nlPiece">${options.map(p=>`<option value="${p.id}">${p.repere} — ${p.profil} — ${p.longueur}mm</option>`).join('')}</select></div>
      <div class="field"><label>Quantité par pylône</label><input id="nlQty" type="number" min="1" value="1"></div>
    </div>
    <div class="form-actions"><button class="btn" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveNomLine('${projectId}')">Ajouter</button></div>
  `);
}
function saveNomLine(projectId){
  const piece_id = document.getElementById('nlPiece').value;
  const qty = Number(document.getElementById('nlQty').value)||1;
  DB.nomenclature.push({id:uid('nm_'), project_id:projectId, piece_id, qty});
  save(); closeModal(); renderTab();
}

/* ============================================================ PIÈCES / REPÉRÉS */
function renderPieces(c){
  const q = (currentSub.pieceSearch||'').toLowerCase();
  const list = DB.pieces.filter(p=> !q || p.repere.toLowerCase().includes(q) || p.designation.toLowerCase().includes(q) || p.profil.toLowerCase().includes(q));
  c.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h2>Catalogue des pièces</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <input placeholder="Rechercher un repéré..." value="${currentSub.pieceSearch||''}" oninput="filterPieces(this.value)" style="width:180px;">
          <button class="btn btn-sm" onclick="openExcelImportModal()">⇧ Importer Excel</button>
          <button class="btn btn-sm" onclick="openOcrImportModal()">📷 Scanner une photo</button>
          <button class="btn btn-primary btn-sm" onclick="newPieceModal()">+ Nouvelle pièce</button>
        </div>
      </div>
      <div class="panel-body table-wrap">
        ${list.length? `<table><thead><tr><th>Repéré</th><th>Désignation</th><th>Profil</th><th>Longueur</th><th>Acier</th><th>Poids unit.</th><th>Stock</th><th></th></tr></thead><tbody>
        ${list.map(p=>`<tr>
          <td><strong>${p.repere}</strong></td><td class="wrap">${p.designation||'—'}</td><td>${p.profil}</td><td>${num(p.longueur)} mm</td><td>${p.type_acier}</td><td>${p.poids_unitaire} kg</td>
          <td>${num(stockActuel(p.id))}</td>
          <td><button class="btn btn-sm" onclick="editPieceModal('${p.id}')">✎</button> <button class="btn btn-sm btn-danger" onclick="deletePiece('${p.id}')">✕</button></td>
        </tr>`).join('')}
        </tbody></table>` : `<div class="empty">Aucune pièce trouvée.</div>`}
      </div>
    </div>
  `;
}
function filterPieces(v){ currentSub.pieceSearch=v; renderTab(); }
function pieceFormFields(p={}){
  return `
    <div class="form-grid">
      <div class="field"><label>Repéré</label><input id="pRepere" value="${p.repere||''}" placeholder="Ex: 101R-P60B"></div>
      <div class="field" style="grid-column:span 2;"><label>Désignation</label><input id="pDesignation" value="${p.designation||''}" placeholder="Ex: Montant principal"></div>
      <div class="field"><label>Profil</label>
        <select id="pProfil">${DB.profils.map(pr=>`<option ${pr===p.profil?'selected':''}>${pr}</option>`).join('')}</select></div>
      <div class="field"><label>Longueur (mm)</label><input id="pLongueur" type="number" value="${p.longueur||''}"></div>
      <div class="field"><label>Type acier</label>
        <select id="pAcier">${DB.aciers.map(a=>`<option ${a===p.type_acier?'selected':''}>${a}</option>`).join('')}</select></div>
      <div class="field"><label>Poids unitaire (kg)</label><input id="pPoids" type="number" step="0.01" value="${p.poids_unitaire||''}"></div>
    </div>
  `;
}
function newPieceModal(){
  openModal('Nouvelle pièce', pieceFormFields() + `<div class="form-actions"><button class="btn" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="savePiece()">Créer</button></div>`);
}
function editPieceModal(id){
  const p = DB.pieces.find(x=>x.id===id); if(!p) return;
  openModal('Modifier la pièce', pieceFormFields(p) + `<div class="form-actions"><button class="btn" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="savePiece('${id}')">Enregistrer</button></div>`);
}
function savePiece(id){
  const repere = document.getElementById('pRepere').value.trim();
  if(!repere){ toast('Le repéré est obligatoire'); return; }
  const data = {
    repere,
    designation: document.getElementById('pDesignation').value.trim(),
    profil: document.getElementById('pProfil').value,
    longueur: Number(document.getElementById('pLongueur').value)||0,
    type_acier: document.getElementById('pAcier').value,
    poids_unitaire: Number(document.getElementById('pPoids').value)||0,
  };
  if(id){ Object.assign(DB.pieces.find(p=>p.id===id), data); }
  else { DB.pieces.push({id:uid('pc_'), ...data}); }
  save(); closeModal(); toast('Pièce enregistrée'); renderTab();
}
function deletePiece(id){
  if(!confirm('Supprimer cette pièce ? Cette action est irréversible.')) return;
  DB.pieces = DB.pieces.filter(p=>p.id!==id);
  DB.nomenclature = DB.nomenclature.filter(n=>n.piece_id!==id);
  save(); renderTab();
}

/* ============================================================ PRODUCTION */
function renderProduction(c){
  currentSub.prodView = currentSub.prodView || 'saisie';
  c.innerHTML = `
    <div class="tabs">
      <div class="tab ${currentSub.prodView==='saisie'?'active':''}" onclick="setProdView('saisie')">Saisie journalière</div>
      <div class="tab ${currentSub.prodView==='machine'?'active':''}" onclick="setProdView('machine')">Par machine</div>
    </div>
    <div id="prodBody"></div>
  `;
  const body = c.querySelector('#prodBody');
  if(currentSub.prodView==='saisie') renderProdSaisie(body); else renderProdByMachine(body);
}
function setProdView(v){ currentSub.prodView=v; renderTab(); }

function renderProdSaisie(wrap){
  const pmap = piecesById();
  const entries = [...DB.production].sort((a,b)=>b.date.localeCompare(a.date));
  wrap.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Nouvelle entrée de production</h2></div>
      <div class="panel-body">
        <div class="form-grid">
          <div class="field"><label>Date</label><input id="pdDate" type="date" value="${isoDate(0)}"></div>
          <div class="field"><label>Machine</label><select id="pdMachine">${DB.machines.map(m=>`<option value="${m.id}">${m.name}</option>`).join('')}</select></div>
          <div class="field" style="grid-column:span 2;"><label>Repéré / Pièce</label><select id="pdPiece">${DB.pieces.map(p=>`<option value="${p.id}">${p.repere} — ${p.profil} — ${p.longueur}mm — ${p.type_acier}</option>`).join('')}</select></div>
          <div class="field"><label>Projet (pour calcul du reste)</label><select id="pdProject"><option value="">— Général —</option>${DB.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select></div>
          <div class="field"><label>Quantité produite</label><input id="pdQty" type="number" min="1"></div>
          <div class="field"><label>Nombre de barres utilisées</label><input id="pdBarres" type="number" min="0"></div>
          <div class="field" style="grid-column:1/-1;"><label>Commentaire</label><input id="pdComment" placeholder="Optionnel"></div>
        </div>
        <div class="form-actions"><button class="btn btn-primary" onclick="saveProduction()">Valider — met à jour le stock</button></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Historique de production</h2></div>
      <div class="panel-body table-wrap">
        ${entries.length? `<table><thead><tr><th>Date</th><th>Machine</th><th>Repéré</th><th>Profil</th><th>Qté</th><th>Barres</th><th>Projet</th><th></th></tr></thead><tbody>
        ${entries.map(e=>{
          const pc = pmap[e.piece_id]; const m = DB.machines.find(x=>x.id===e.machine); const proj = DB.projects.find(p=>p.id===e.project_id);
          return `<tr><td>${fmtDate(e.date)}</td><td class="wrap">${m?m.name:'—'}</td><td>${pc?pc.repere:'—'}</td><td>${pc?pc.profil:'—'}</td><td>${num(e.quantite)}</td><td>${num(e.barres)}</td><td class="wrap">${proj?proj.name:'Général'}</td>
          <td><button class="btn btn-sm btn-danger" onclick="deleteProduction('${e.id}')">✕</button></td></tr>`;
        }).join('')}
        </tbody></table>` : `<div class="empty">Aucune production enregistrée.</div>`}
      </div>
    </div>
  `;
}
function saveProduction(){
  const piece_id = document.getElementById('pdPiece').value;
  const qty = Number(document.getElementById('pdQty').value);
  if(!piece_id || !qty || qty<=0){ toast('Sélectionnez une pièce et une quantité valide'); return; }
  DB.production.push({
    id:uid('pd_'), date: document.getElementById('pdDate').value || isoDate(0),
    machine: document.getElementById('pdMachine').value,
    piece_id, project_id: document.getElementById('pdProject').value || '',
    quantite: qty, barres: Number(document.getElementById('pdBarres').value)||0,
    commentaire: document.getElementById('pdComment').value.trim(),
  });
  save(); toast('Production enregistrée — stock mis à jour'); renderTab();
}
function deleteProduction(id){ if(!confirm('Supprimer cette entrée ?')) return; DB.production = DB.production.filter(p=>p.id!==id); save(); renderTab(); }

function renderProdByMachine(wrap){
  const period = currentSub.prodPeriod || 'today';
  const today = new Date(); today.setHours(0,0,0,0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-7);
  const monthStart = new Date(); monthStart.setDate(monthStart.getDate()-30);
  function inRange(dateStr, p){
    const d = new Date(dateStr);
    if(p==='today') return isoDate(0)===dateStr;
    if(p==='week') return d>=weekStart;
    if(p==='month') return d>=monthStart;
    return true;
  }
  const rows = DB.machines.map(m=>{
    const todayQ = DB.production.filter(p=>p.machine===m.id && isoDate(0)===p.date).reduce((s,p)=>s+Number(p.quantite||0),0);
    const weekQ = DB.production.filter(p=>p.machine===m.id && new Date(p.date)>=weekStart).reduce((s,p)=>s+Number(p.quantite||0),0);
    const monthQ = DB.production.filter(p=>p.machine===m.id && new Date(p.date)>=monthStart).reduce((s,p)=>s+Number(p.quantite||0),0);
    return {m, todayQ, weekQ, monthQ};
  });
  wrap.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Production par machine</h2></div>
      <div class="panel-body table-wrap">
        <table><thead><tr><th>Machine</th><th>Aujourd’hui</th><th>Cette semaine</th><th>Ce mois</th></tr></thead><tbody>
        ${rows.map(r=>`<tr><td class="wrap">${r.m.name}</td><td>${num(r.todayQ)}</td><td>${num(r.weekQ)}</td><td>${num(r.monthQ)}</td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>
  `;
}

/* ============================================================ STOCK */
function renderStock(c){
  const q = (currentSub.stockSearch||'').toLowerCase();
  const pieces = DB.pieces.filter(p=> !q || p.repere.toLowerCase().includes(q) || p.profil.toLowerCase().includes(q) || p.type_acier.toLowerCase().includes(q));
  let totalQty=0, totalWeight=0;
  c.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Stock par pièce</h2>
        <input placeholder="Filtrer par repéré, profil, acier..." value="${currentSub.stockSearch||''}" oninput="filterStock(this.value)" style="width:220px;"></div>
      <div class="panel-body table-wrap" id="stockTable"></div>
    </div>
  `;
  const rows = pieces.map(p=>{
    const produced = producedQty(p.id);
    const shipped = shippedQty(p.id);
    const s = produced - shipped;
    const w = weightOf(p, Math.max(s,0));
    totalQty += Math.max(s,0); totalWeight += w;
    return {p, produced, shipped, s, w};
  });
  document.getElementById('stockTable').innerHTML = rows.length? `<table><thead><tr><th>Repéré</th><th>Profil</th><th>Longueur</th><th>Acier</th><th>Production cumulée</th><th>Sorties (galva)</th><th>Stock actuel</th><th>Poids</th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td><strong>${r.p.repere}</strong></td><td>${r.p.profil}</td><td>${num(r.p.longueur)} mm</td><td>${r.p.type_acier}</td><td>${num(r.produced)}</td><td>${num(r.shipped)}</td>
      <td><span class="badge ${r.s<0?'bad':'ok'}">${num(r.s)}</span></td><td>${kg(r.w)}</td></tr>`).join('')}
    </tbody></table>
    <div class="hint" style="margin-top:10px;">Total stock: <strong class="mono">${num(totalQty)}</strong> pièces — <strong class="mono">${tonnes(totalWeight)}</strong></div>
    ` : `<div class="empty">Aucune pièce.</div>`;
}
function filterStock(v){ currentSub.stockSearch=v; renderTab(); }

/* ============================================================ GALVANISATION */
function renderGalvanisation(c){
  currentSub.galvView = currentSub.galvView || 'expeditions';
  c.innerHTML = `
    <div class="tabs">
      <div class="tab ${currentSub.galvView==='expeditions'?'active':''}" onclick="setGalvView('expeditions')">Expéditions</div>
      <div class="tab ${currentSub.galvView==='suivi'?'active':''}" onclick="setGalvView('suivi')">Suivi en cours</div>
      <div class="tab ${currentSub.galvView==='retours'?'active':''}" onclick="setGalvView('retours')">Retours</div>
      <div class="tab ${currentSub.galvView==='historique'?'active':''}" onclick="setGalvView('historique')">Historique &amp; écarts</div>
    </div>
    <div id="galvBody"></div>
  `;
  const body = c.querySelector('#galvBody');
  ({expeditions:renderGalvExpeditions, suivi:renderGalvSuivi, retours:renderGalvRetours, historique:renderGalvHistorique})[currentSub.galvView](body);
}
function setGalvView(v){ currentSub.galvView=v; renderTab(); }

function renderGalvExpeditions(wrap){
  const pmap = piecesById();
  const list = [...DB.expeditions].sort((a,b)=>b.numero.localeCompare(a.numero));
  wrap.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Expéditions vers la galvanisation</h2><button class="btn btn-primary btn-sm" onclick="newExpeditionModal()">+ Nouvelle expédition</button></div>
      <div class="panel-body table-wrap">
        ${list.length? `<table><thead><tr><th>N°</th><th>Date</th><th>Pièces</th><th>Poids</th><th>Statut</th></tr></thead><tbody>
        ${list.map(e=>`<tr><td><strong>${e.numero}</strong></td><td>${fmtDate(e.date)}</td><td>${num(e.lines.reduce((s,l)=>s+Number(l.quantite||0),0))}</td><td>${kg(e.lines.reduce((s,l)=>s+Number(l.poids||0),0))}</td><td><span class="badge ${statusBadgeClass(e.statut)}">${e.statut}</span></td></tr>`).join('')}
        </tbody></table>` : `<div class="empty">Aucune expédition.</div>`}
      </div>
    </div>
  `;
}
let expeditionDraftLines = [];
function newExpeditionModal(){
  expeditionDraftLines = [];
  DB.seq.exped = (DB.seq.exped||0)+1;
  const numero = `GAL-${new Date().getFullYear()}-${String(DB.seq.exped).padStart(3,'0')}`;
  openModal('Nouvelle expédition galvanisation', `
    <div class="form-grid">
      <div class="field"><label>N° expédition</label><input id="exNumero" value="${numero}" readonly></div>
      <div class="field"><label>Date</label><input id="exDate" type="date" value="${isoDate(0)}"></div>
    </div>
    <div class="hint" style="margin:12px 0 6px;">Sélectionner les pièces du stock à expédier — le système vérifie la disponibilité.</div>
    <div class="line-item" style="font-size:11px;color:var(--muted);margin-bottom:4px;"><span>Pièce</span><span>Stock dispo</span><span>Qté à envoyer</span><span>Poids</span><span></span></div>
    <div class="line-list" id="exLines"></div>
    <button class="btn btn-sm" style="margin-top:8px;" onclick="addExpLine()">+ Ajouter une ligne</button>
    <div class="hint" id="exTotals" style="margin-top:12px;"></div>
    <div class="form-actions"><button class="btn" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveExpedition('${numero}')">Créer l’expédition</button></div>
  `, ()=>{ addExpLine(); });
}
function addExpLine(){
  expeditionDraftLines.push({piece_id: DB.pieces[0]? DB.pieces[0].id:'', qty:0});
  renderExpLines();
}
function renderExpLines(){
  const wrap = document.getElementById('exLines');
  wrap.innerHTML = expeditionDraftLines.map((l,i)=>{
    const p = DB.pieces.find(x=>x.id===l.piece_id);
    const disp = p? stockActuel(p.id):0;
    const w = p? weightOf(p,l.qty):0;
    return `<div class="line-item">
      <select onchange="setExpLinePiece(${i},this.value)">${DB.pieces.map(pc=>`<option value="${pc.id}" ${pc.id===l.piece_id?'selected':''}>${pc.repere}</option>`).join('')}</select>
      <span class="mono">${num(disp)}</span>
      <input type="number" min="0" max="${disp}" value="${l.qty}" onchange="setExpLineQty(${i},this.value)">
      <span class="mono">${kg(w)}</span>
      <button class="rm" onclick="removeExpLine(${i})">✕</button>
    </div>`;
  }).join('');
  const totQty = expeditionDraftLines.reduce((s,l)=>s+Number(l.qty||0),0);
  const totW = expeditionDraftLines.reduce((s,l)=>{ const p=DB.pieces.find(x=>x.id===l.piece_id); return s+(p?weightOf(p,l.qty):0);},0);
  document.getElementById('exTotals').innerHTML = `Total pièces: <strong class="mono">${num(totQty)}</strong> — Total: <strong class="mono">${kg(totW)}</strong> (${tonnes(totW)})`;
}
function setExpLinePiece(i,v){ expeditionDraftLines[i].piece_id=v; renderExpLines(); }
function setExpLineQty(i,v){ expeditionDraftLines[i].qty=Number(v)||0; renderExpLines(); }
function removeExpLine(i){ expeditionDraftLines.splice(i,1); renderExpLines(); }
function saveExpedition(numero){
  const lines = expeditionDraftLines.filter(l=>l.qty>0);
  if(lines.length===0){ toast('Ajoutez au moins une ligne avec une quantité.'); return; }
  for(const l of lines){
    const p = DB.pieces.find(x=>x.id===l.piece_id);
    const disp = stockActuel(p.id);
    if(l.qty>disp){ toast(`Quantité insuffisante en stock pour ${p.repere} (disponible: ${disp})`); return; }
  }
  const finalLines = lines.map(l=>{ const p=DB.pieces.find(x=>x.id===l.piece_id); return {piece_id:l.piece_id, quantite:l.qty, poids:weightOf(p,l.qty)}; });
  DB.expeditions.push({id:uid('ex_'), numero, date:document.getElementById('exDate').value||isoDate(0), statut:'En galvanisation', lines:finalLines});
  save(); closeModal(); toast('Expédition créée — stock mis à jour'); renderTab();
}

function renderGalvSuivi(wrap){
  const enCours = DB.expeditions.filter(e=> !DB.retours.find(r=>r.expedition_id===e.id));
  wrap.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Marchandises en galvanisation</h2></div>
      <div class="panel-body table-wrap">
        ${enCours.length? `<table><thead><tr><th>Expédition</th><th>Date départ</th><th>Pièces</th><th>Poids</th><th>Statut</th></tr></thead><tbody>
        ${enCours.map(e=>`<tr><td><strong>${e.numero}</strong></td><td>${fmtDate(e.date)}</td><td>${num(e.lines.reduce((s,l)=>s+Number(l.quantite||0),0))}</td><td>${kg(e.lines.reduce((s,l)=>s+Number(l.poids||0),0))}</td><td><span class="badge ${statusBadgeClass(e.statut)}">${e.statut}</span></td></tr>`).join('')}
        </tbody></table>` : `<div class="empty">Aucune marchandise actuellement en galvanisation.</div>`}
      </div>
    </div>
  `;
}

let retourDraftLines = [];
function renderGalvRetours(wrap){
  const enAttente = DB.expeditions.filter(e=> !DB.retours.find(r=>r.expedition_id===e.id));
  wrap.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Enregistrer un retour</h2></div>
      <div class="panel-body">
        ${enAttente.length===0? `<div class="empty">Aucune expédition en attente de retour.</div>` : `
        <div class="form-grid">
          <div class="field" style="grid-column:1/-1;"><label>Expédition</label><select id="rtExped" onchange="loadRetourLines()">${enAttente.map(e=>`<option value="${e.id}">${e.numero} — ${fmtDate(e.date)} — ${kg(e.lines.reduce((s,l)=>s+Number(l.poids||0),0))}</option>`).join('')}</select></div>
          <div class="field"><label>Date de retour</label><input id="rtDate" type="date" value="${isoDate(0)}"></div>
          <div class="field"><label>Poids envoyé</label><input id="rtPoidsEnvoye" readonly></div>
          <div class="field"><label>Poids reçu (kg)</label><input id="rtPoidsRecu" type="number" step="0.1"></div>
        </div>
        <div class="hint" style="margin:14px 0 6px;">Quantité reçue par repéré</div>
        <div class="line-item" style="font-size:11px;color:var(--muted);margin-bottom:4px;"><span>Repéré</span><span>Envoyé</span><span>Reçu</span><span>Écart</span></div>
        <div id="rtLines" class="line-list"></div>
        <div class="form-actions"><button class="btn btn-primary" onclick="saveRetour()">Valider le retour</button></div>
        `}
      </div>
    </div>
  `;
  if(enAttente.length) loadRetourLines();
}
function loadRetourLines(){
  const expId = document.getElementById('rtExped').value;
  const exp = DB.expeditions.find(e=>e.id===expId);
  const pmap = piecesById();
  document.getElementById('rtPoidsEnvoye').value = exp.lines.reduce((s,l)=>s+Number(l.poids||0),0) + ' kg';
  retourDraftLines = exp.lines.map(l=>({piece_id:l.piece_id, envoye:l.quantite, recu:l.quantite}));
  renderRetourLines();
}
function renderRetourLines(){
  const pmap = piecesById();
  document.getElementById('rtLines').innerHTML = retourDraftLines.map((l,i)=>{
    const p = pmap[l.piece_id];
    const ecart = l.recu - l.envoye;
    return `<div class="line-item" style="grid-template-columns:1.4fr 90px 90px 90px 30px;">
      <span>${p?p.repere:'—'}</span>
      <span class="mono">${num(l.envoye)}</span>
      <input type="number" min="0" value="${l.recu}" onchange="setRetourQty(${i},this.value)">
      <span class="mono ${ecart<0?'stat-diff neg':(ecart>0?'stat-diff pos':'')}">${ecart>0?'+':''}${num(ecart)}</span>
      <span></span>
    </div>`;
  }).join('');
}
function setRetourQty(i,v){ retourDraftLines[i].recu = Number(v)||0; renderRetourLines(); }
function saveRetour(){
  const expId = document.getElementById('rtExped').value;
  const poidsRecu = Number(document.getElementById('rtPoidsRecu').value);
  if(!poidsRecu || poidsRecu<=0){ toast('Renseignez le poids reçu'); return; }
  const exp = DB.expeditions.find(e=>e.id===expId);
  const lines = retourDraftLines.map(l=>({piece_id:l.piece_id, quantite_recue:l.recu}));
  const totalEnvoye = exp.lines.reduce((s,l)=>s+Number(l.quantite||0),0);
  const totalRecu = lines.reduce((s,l)=>s+Number(l.quantite_recue||0),0);
  const statut = totalRecu>=totalEnvoye ? 'Retour complet' : 'Retour partiel';
  DB.retours.push({id:uid('rt_'), expedition_id:expId, date:document.getElementById('rtDate').value||isoDate(0), poids_recu:poidsRecu, lines});
  exp.statut = statut;
  save(); toast('Retour enregistré'); renderTab();
}

function renderGalvHistorique(wrap){
  const rows = DB.expeditions.map(e=>{
    const ret = DB.retours.find(r=>r.expedition_id===e.id);
    const poidsEnv = e.lines.reduce((s,l)=>s+Number(l.poids||0),0);
    const poidsRecu = ret? Number(ret.poids_recu||0): null;
    const ecartKg = poidsRecu!==null? +(poidsRecu-poidsEnv).toFixed(1) : null;
    const ecartPct = poidsRecu!==null && poidsEnv? +((ecartKg/poidsEnv)*100).toFixed(2) : null;
    return {e, poidsEnv, poidsRecu, ecartKg, ecartPct};
  }).sort((a,b)=>b.e.numero.localeCompare(a.e.numero));
  wrap.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Historique des expéditions</h2>
        <div style="display:flex;gap:8px;"><button class="btn btn-sm" onclick="exportCSV()">Export CSV</button></div></div>
      <div class="panel-body table-wrap">
        ${rows.length? `<table><thead><tr><th>N° expédition</th><th>Date</th><th>Pièces</th><th>Poids envoyé</th><th>Poids reçu</th><th>Écart kg</th><th>Écart %</th><th>Statut</th></tr></thead><tbody>
        ${rows.map(r=>`<tr><td><strong>${r.e.numero}</strong></td><td>${fmtDate(r.e.date)}</td><td>${num(r.e.lines.reduce((s,l)=>s+Number(l.quantite||0),0))}</td>
          <td>${kg(r.poidsEnv)}</td><td>${r.poidsRecu!==null?kg(r.poidsRecu):'—'}</td>
          <td class="${r.ecartKg<0?'stat-diff neg':(r.ecartKg>0?'stat-diff pos':'')}">${r.ecartKg!==null?(r.ecartKg>0?'+':'')+r.ecartKg+' kg':'—'}</td>
          <td class="${r.ecartPct<0?'stat-diff neg':(r.ecartPct>0?'stat-diff pos':'')}">${r.ecartPct!==null?(r.ecartPct>0?'+':'')+r.ecartPct+'%':'—'}</td>
          <td><span class="badge ${statusBadgeClass(r.e.statut)}">${r.e.statut}</span></td>
        </tr>`).join('')}
        </tbody></table>` : `<div class="empty">Aucune expédition.</div>`}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Comparaison détaillée par repéré (dernier retour)</h2></div>
      <div class="panel-body table-wrap" id="detailCompare"></div>
    </div>
  `;
  const pmap = piecesById();
  const lastRet = [...DB.retours].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const dc = wrap.querySelector('#detailCompare');
  if(!lastRet){ dc.innerHTML = `<div class="empty">Aucun retour enregistré.</div>`; return; }
  const exp = DB.expeditions.find(e=>e.id===lastRet.expedition_id);
  dc.innerHTML = `<div class="hint" style="margin-bottom:8px;">Expédition ${exp.numero}</div>
    <table><thead><tr><th>Repéré</th><th>Qté envoyée</th><th>Qté reçue</th><th>Écart</th><th>Statut</th></tr></thead><tbody>
    ${exp.lines.map(l=>{
      const rl = lastRet.lines.find(x=>x.piece_id===l.piece_id);
      const recu = rl? Number(rl.quantite_recue||0):0;
      const ecart = recu - l.quantite;
      const st = ecart===0?'OK':(ecart<0?'MANQUANT':'EXCÉDENT');
      return `<tr><td>${pmap[l.piece_id]?pmap[l.piece_id].repere:'—'}</td><td>${num(l.quantite)}</td><td>${num(recu)}</td><td>${ecart>0?'+':''}${num(ecart)}</td><td><span class="badge ${statusBadgeClass(st)}">${st}</span></td></tr>`;
    }).join('')}
    </tbody></table>`;
}
function exportCSV(){
  const rows = [['N° expedition','Date','Poids envoyé (kg)','Poids reçu (kg)','Écart (kg)','Statut']];
  DB.expeditions.forEach(e=>{
    const ret = DB.retours.find(r=>r.expedition_id===e.id);
    const poidsEnv = e.lines.reduce((s,l)=>s+Number(l.poids||0),0);
    const poidsRecu = ret?ret.poids_recu:'';
    const ecart = ret? +(ret.poids_recu-poidsEnv).toFixed(1):'';
    rows.push([e.numero, e.date, poidsEnv, poidsRecu, ecart, e.statut]);
  });
  downloadCSV('historique_galvanisation.csv', rows);
}
function downloadCSV(filename, rows){
  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

/* ============================================================ RAPPORTS */
function renderRapports(c){
  const pmap = piecesById();
  const today = isoDate(0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-7);
  const monthStart = new Date(); monthStart.setDate(monthStart.getDate()-30);

  const byProfil = {};
  DB.production.forEach(p=>{ const pc=pmap[p.piece_id]; if(!pc) return; byProfil[pc.profil]=(byProfil[pc.profil]||0)+Number(p.quantite||0); });
  const byMachine = {};
  DB.production.forEach(p=>{ const m=DB.machines.find(x=>x.id===p.machine); const name=m?m.name:'—'; byMachine[name]=(byMachine[name]||0)+Number(p.quantite||0); });

  const totalEnvoye = DB.expeditions.reduce((s,e)=>s+e.lines.reduce((ss,l)=>ss+Number(l.poids||0),0),0);
  const totalRecu = DB.retours.reduce((s,r)=>s+Number(r.poids_recu||0),0);
  const enCoursCount = DB.expeditions.filter(e=>!DB.retours.find(r=>r.expedition_id===e.id)).length;
  let totalManquant=0, totalExcedent=0;
  DB.retours.forEach(r=>{
    const exp = DB.expeditions.find(e=>e.id===r.expedition_id); if(!exp) return;
    exp.lines.forEach(l=>{ const rl=r.lines.find(x=>x.piece_id===l.piece_id); const recu=rl?Number(rl.quantite_recue||0):0; const diff=recu-l.quantite;
      if(diff<0) totalManquant += -diff; if(diff>0) totalExcedent += diff; });
  });

  const maxProfil = Math.max(1,...Object.values(byProfil));
  const maxMachine = Math.max(1,...Object.values(byMachine));

  c.innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h2>Rapport production — par profil</h2></div>
        <div class="panel-body">
          ${Object.keys(byProfil).length? Object.entries(byProfil).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`
            <div class="phase-row"><div class="lbl"><span>${k}</span><span class="mono">${num(v)}</span></div><div class="bar"><div style="width:${v/maxProfil*100}%"></div></div></div>
          `).join('') : '<div class="empty">Aucune donnée.</div>'}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Rapport production — par machine</h2></div>
        <div class="panel-body">
          ${Object.keys(byMachine).length? Object.entries(byMachine).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`
            <div class="phase-row"><div class="lbl"><span>${k}</span><span class="mono">${num(v)}</span></div><div class="bar"><div style="width:${v/maxMachine*100}%"></div></div></div>
          `).join('') : '<div class="empty">Aucune donnée.</div>'}
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Rapport galvanisation</h2></div>
      <div class="panel-body">
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-value">${num(DB.expeditions.length)}</div><div class="kpi-label">Total expéditions</div></div>
          <div class="kpi-card"><div class="kpi-value">${num(DB.retours.length)}</div><div class="kpi-label">Total retours</div></div>
          <div class="kpi-card warn"><div class="kpi-value">${num(enCoursCount)}</div><div class="kpi-label">En galvanisation</div></div>
          <div class="kpi-card bad"><div class="kpi-value">${num(totalManquant)}</div><div class="kpi-label">Total manquant (pièces)</div></div>
          <div class="kpi-card info"><div class="kpi-value">${num(totalExcedent)}</div><div class="kpi-label">Total excédent (pièces)</div></div>
          <div class="kpi-card"><div class="kpi-value">${tonnes(totalEnvoye)}</div><div class="kpi-label">Poids total envoyé</div></div>
          <div class="kpi-card"><div class="kpi-value">${tonnes(totalRecu)}</div><div class="kpi-label">Poids total reçu</div></div>
          <div class="kpi-card ${(totalRecu-totalEnvoye)<0?'bad':'ok'}"><div class="kpi-value">${(totalRecu-totalEnvoye>=0?'+':'')}${(totalRecu-totalEnvoye).toFixed(1)} kg</div><div class="kpi-label">Différence totale</div></div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Rapport quotidien — ${fmtDate(today)}</h2></div>
      <div class="panel-body table-wrap">
        ${renderDailyReportTable(today, pmap)}
      </div>
    </div>
  `;
}
function renderDailyReportTable(date, pmap){
  const rows = DB.production.filter(p=>p.date===date);
  if(!rows.length) return `<div class="empty">Aucune production ce jour.</div>`;
  return `<table><thead><tr><th>Machine</th><th>Repéré</th><th>Profil</th><th>Quantité</th><th>Poids</th></tr></thead><tbody>
    ${rows.map(r=>{ const pc=pmap[r.piece_id]; const m=DB.machines.find(x=>x.id===r.machine); return `<tr><td class="wrap">${m?m.name:'—'}</td><td>${pc?pc.repere:'—'}</td><td>${pc?pc.profil:'—'}</td><td>${num(r.quantite)}</td><td>${pc?kg(weightOf(pc,r.quantite)):'—'}</td></tr>`; }).join('')}
  </tbody></table>`;
}

/* ============================================================ PARAMÈTRES */
function renderParametres(c){
  c.innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h2>Machines</h2><button class="btn btn-sm btn-primary" onclick="addMachine()">+ Ajouter</button></div>
        <div class="panel-body">
          ${DB.machines.map(m=>`<div class="line-item" style="grid-template-columns:1fr 30px;margin-bottom:6px;"><input value="${m.name}" onchange="renameMachine('${m.id}',this.value)"><button class="rm" onclick="removeMachine('${m.id}')">✕</button></div>`).join('')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Types d’acier</h2><button class="btn btn-sm btn-primary" onclick="addAcier()">+ Ajouter</button></div>
        <div class="panel-body chip-row">
          ${DB.aciers.map(a=>`<span class="chip active">${a} <span style="cursor:pointer;color:var(--bad);margin-left:4px;" onclick="removeAcier('${a}')">✕</span></span>`).join('')}
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Rôle utilisateur (accès simplifié)</h2></div>
      <div class="panel-body">
        <div class="field" style="max-width:260px;"><label>Rôle actif</label>
          <select onchange="setRole(this.value)">${['Admin','Production','Magasin','Galvanisation','Lecture seule'].map(r=>`<option ${r===DB.settings.role?'selected':''}>${r}</option>`).join('')}</select>
        </div>
        <div class="hint">Le rôle détermine les permissions dans une version connectée à un serveur multi-utilisateur.</div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Sauvegarde &amp; données</h2></div>
      <div class="panel-body" style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn" onclick="openBackup()">Exporter / Importer une sauvegarde</button>
        <button class="btn btn-danger" onclick="resetDemo()">Réinitialiser avec les données de démonstration</button>
      </div>
    </div>
  `;
}
function addMachine(){ DB.machines.push({id:uid('m_'), name:'Nouvelle machine'}); save(); renderTab(); }
function renameMachine(id,v){ const m=DB.machines.find(x=>x.id===id); if(m){ m.name=v; save(); } }
function removeMachine(id){ DB.machines = DB.machines.filter(m=>m.id!==id); save(); renderTab(); }
function addAcier(){ const v = prompt('Nouveau type d’acier (ex: S460)'); if(v && !DB.aciers.includes(v)){ DB.aciers.push(v); save(); renderTab(); } }
function removeAcier(a){ DB.aciers = DB.aciers.filter(x=>x!==a); save(); renderTab(); }
function setRole(r){ DB.settings.role=r; save(); document.getElementById('roleTag').textContent=r; }
function resetDemo(){ if(!confirm('Cela remplace toutes les données actuelles par les données de démonstration. Continuer ?')) return; localStorage.removeItem(DB_KEY); DB = load(); renderShell(); }

/* ============================================================ RECHERCHE RAPIDE */
function openSearch(){
  openModal('Recherche rapide', `
    <input id="searchInput" placeholder="Rechercher un repéré, un pylône, une expédition, une machine..." style="width:100%;" oninput="doSearch(this.value)">
    <div id="searchResults" style="margin-top:14px;"></div>
  `, (m)=>{ setTimeout(()=>document.getElementById('searchInput').focus(),50); });
}
function doSearch(q){
  const res = document.getElementById('searchResults');
  q = q.trim().toLowerCase();
  if(q.length<1){ res.innerHTML=''; return; }
  const pmap = piecesById();
  let html = '';
  const pieceHits = DB.pieces.filter(p=>p.repere.toLowerCase().includes(q) || p.profil.toLowerCase().includes(q));
  if(pieceHits.length){
    html += `<div class="hint">Pièces</div><table><thead><tr><th>Repéré</th><th>Nécessaire</th><th>Produit</th><th>Stock</th><th>Envoyé galva</th></tr></thead><tbody>
    ${pieceHits.slice(0,8).map(p=>{
      const proj = DB.projects[0];
      const need = proj? neededQty(p.id, proj.id):0;
      return `<tr><td>${p.repere}</td><td>${num(need)}</td><td>${num(producedQty(p.id))}</td><td>${num(stockActuel(p.id))}</td><td>${num(shippedQty(p.id))}</td></tr>`;
    }).join('')}</tbody></table>`;
  }
  const pyloneHits = DB.pylones.filter(p=>p.numero.toLowerCase().includes(q));
  if(pyloneHits.length){
    html += `<div class="hint" style="margin-top:12px;">Pylônes</div><table><thead><tr><th>N°</th><th>Statut</th><th>Progression</th></tr></thead><tbody>
    ${pyloneHits.slice(0,8).map(p=>`<tr><td>${p.numero}</td><td><span class="badge ${statusBadgeClass(p.status)}">${p.status}</span></td><td>${p.progress}%</td></tr>`).join('')}</tbody></table>`;
  }
  const expHits = DB.expeditions.filter(e=>e.numero.toLowerCase().includes(q));
  if(expHits.length){
    html += `<div class="hint" style="margin-top:12px;">Expéditions</div><table><thead><tr><th>N°</th><th>Statut</th><th>Poids</th></tr></thead><tbody>
    ${expHits.slice(0,8).map(e=>`<tr><td>${e.numero}</td><td><span class="badge ${statusBadgeClass(e.statut)}">${e.statut}</span></td><td>${kg(e.lines.reduce((s,l)=>s+Number(l.poids||0),0))}</td></tr>`).join('')}</tbody></table>`;
  }
  const machineHits = DB.machines.filter(m=>m.name.toLowerCase().includes(q));
  if(machineHits.length){ html += `<div class="hint" style="margin-top:12px;">Machines</div><div>${machineHits.map(m=>m.name).join(', ')}</div>`; }
  res.innerHTML = html || `<div class="empty">Aucun résultat.</div>`;
}

/* ============================================================ BACKUP */
function openBackup(){
  openModal('Sauvegarde des données', `
    <div class="hint">Toutes les données sont stockées localement sur cet appareil (hors ligne). Exportez régulièrement une sauvegarde JSON.</div>
    <div class="form-actions" style="justify-content:flex-start;margin-top:14px;">
      <button class="btn btn-primary" onclick="exportBackup()">Exporter (JSON)</button>
      <label class="btn" style="cursor:pointer;">Importer<input type="file" accept="application/json" style="display:none;" onchange="importBackup(this.files[0])"></label>
    </div>
  `);
}
function exportBackup(){
  const blob = new Blob([JSON.stringify(DB,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`pylone-backup-${isoDate(0)}.json`; a.click();
  URL.revokeObjectURL(url);
}
function importBackup(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{ const data = JSON.parse(e.target.result); DB = data; save(); closeModal(); toast('Sauvegarde importée'); renderShell(); }
    catch(err){ toast('Fichier invalide'); }
  };
  reader.readAsText(file);
}

/* ============================================================ IMPORT PIÈCES (Excel + Photo/OCR) */
function getOrCreateImportMachine(){
  let m = DB.machines.find(x=>x.name==='Import / Saisie initiale');
  if(!m){ m={id:uid('m_'), name:'Import / Saisie initiale'}; DB.machines.push(m); }
  return m.id;
}
// Crée ou met à jour une pièce à partir d'une ligne importée {repere,designation,profil,longueur,acier,poids,qty}
// et ajoute une entrée de production si une quantité est fournie (alimente le stock initial).
function findOrCreatePieceFromRow(row){
  const repere = String(row.repere||'').trim();
  if(!repere) return null;
  let p = DB.pieces.find(x=>x.repere.toLowerCase()===repere.toLowerCase());
  if(!p){
    p = {id:uid('pc_'), repere, designation:row.designation||'', profil:row.profil||DB.profils[0], longueur:Number(row.longueur)||0, type_acier:row.acier||DB.aciers[0], poids_unitaire:Number(row.poids)||0};
    DB.pieces.push(p);
  } else {
    if(row.designation) p.designation = row.designation;
    if(row.profil) p.profil = row.profil;
    if(row.longueur) p.longueur = Number(row.longueur);
    if(row.acier) p.type_acier = row.acier;
    if(row.poids) p.poids_unitaire = Number(row.poids);
  }
  const qty = Number(row.qty)||0;
  if(qty>0){
    DB.production.push({id:uid('pd_'), date:isoDate(0), machine:getOrCreateImportMachine(), piece_id:p.id, project_id:'', quantite:qty, barres:0, commentaire:'Import'});
  }
  return p;
}
function normalizeHeader(h){ return String(h||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }
function findColIndex(headers, keywords){
  for(let i=0;i<headers.length;i++){ const h=normalizeHeader(headers[i]); if(keywords.some(k=>h.includes(k))) return i; }
  return -1;
}

/* ---- Import Excel / CSV ---- */
let excelDraftRows = [];
function downloadExcelTemplate(){
  const rows = [
    ['Repéré','Désignation','Profil','Longueur','Acier','Poids unitaire','Quantité'],
    ['101R-P60B','Montant principal','L60x5',6000,'S275',14.2,120],
    ['2000-P60B','Diagonale','L50x4',4500,'S235',6.8,480],
  ];
  downloadCSV('modele_import_pieces.csv', rows);
}
function openExcelImportModal(){
  excelDraftRows = [];
  openModal('Importer des repérés depuis Excel', `
    <div class="hint">Formats acceptés : .xlsx, .xls, .csv — colonnes reconnues automatiquement : Repéré, Désignation, Profil, Longueur, Acier, Poids unitaire, Quantité (la quantité alimente le stock initial).</div>
    <div class="form-actions" style="justify-content:flex-start;margin-top:10px;">
      <button class="btn btn-sm" onclick="downloadExcelTemplate()">Télécharger un modèle</button>
    </div>
    <div style="margin-top:14px;"><input type="file" id="excelFile" accept=".xlsx,.xls,.csv" onchange="handleExcelFile(this.files[0])"></div>
    <div id="excelPreviewWrap" style="margin-top:16px;"></div>
  `);
}
function handleExcelFile(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const wb = XLSX.read(e.target.result, {type:'binary'});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {header:1, raw:true, defval:''});
      if(rows.length<2){ toast('Fichier vide ou sans données'); return; }
      const headers = rows[0];
      const iRep = findColIndex(headers, ['repere','code','ref']);
      const iDes = findColIndex(headers, ['designation','nom','description']);
      const iPro = findColIndex(headers, ['profil','profile']);
      const iLon = findColIndex(headers, ['longueur','length']);
      const iAci = findColIndex(headers, ['acier','nuance','steel']);
      const iPds = findColIndex(headers, ['poids','weight']);
      const iQte = findColIndex(headers, ['quantite','qte','qty','nombre','nb']);
      excelDraftRows = rows.slice(1).filter(r=>r.some(c=>String(c).trim()!=='')).map(r=>({
        repere: iRep>=0? String(r[iRep]||'').trim() : '',
        designation: iDes>=0? String(r[iDes]||'').trim() : '',
        profil: iPro>=0? String(r[iPro]||'').trim() : '',
        longueur: iLon>=0? r[iLon] : '',
        acier: iAci>=0? String(r[iAci]||'').trim() : '',
        poids: iPds>=0? r[iPds] : '',
        qty: iQte>=0? r[iQte] : '',
      })).filter(r=>r.repere);
      renderExcelPreview();
    }catch(err){ toast('Impossible de lire ce fichier'); }
  };
  reader.readAsBinaryString(file);
}
function renderExcelPreview(){
  const wrap = document.getElementById('excelPreviewWrap');
  if(!excelDraftRows.length){ wrap.innerHTML = `<div class="empty">Aucune ligne détectée. Vérifiez le fichier ou le modèle.</div>`; return; }
  wrap.innerHTML = `
    <div class="hint">${excelDraftRows.length} ligne(s) détectée(s) — vérifiez et corrigez avant import.</div>
    <div class="table-wrap" style="margin-top:8px;"><table><thead><tr><th>Repéré</th><th>Désignation</th><th>Profil</th><th>Longueur</th><th>Acier</th><th>Poids u.</th><th>Qté</th><th></th></tr></thead>
    <tbody id="excelPreviewBody"></tbody></table></div>
    <div class="form-actions"><button class="btn" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="confirmExcelImport()">Confirmer l’import (${excelDraftRows.length})</button></div>
  `;
  renderExcelPreviewRows();
}
function renderExcelPreviewRows(){
  document.getElementById('excelPreviewBody').innerHTML = excelDraftRows.map((r,i)=>`<tr>
    <td><input value="${r.repere}" style="width:110px;" onchange="updateExcelDraft(${i},'repere',this.value)"></td>
    <td><input value="${r.designation}" style="width:110px;" onchange="updateExcelDraft(${i},'designation',this.value)"></td>
    <td><input value="${r.profil}" style="width:80px;" onchange="updateExcelDraft(${i},'profil',this.value)"></td>
    <td><input value="${r.longueur}" style="width:70px;" onchange="updateExcelDraft(${i},'longueur',this.value)"></td>
    <td><input value="${r.acier}" style="width:60px;" onchange="updateExcelDraft(${i},'acier',this.value)"></td>
    <td><input value="${r.poids}" style="width:60px;" onchange="updateExcelDraft(${i},'poids',this.value)"></td>
    <td><input value="${r.qty}" style="width:60px;" onchange="updateExcelDraft(${i},'qty',this.value)"></td>
    <td><button class="rm" onclick="removeExcelDraft(${i})">✕</button></td>
  </tr>`).join('');
}
function updateExcelDraft(i, field, val){ excelDraftRows[i][field]=val; }
function removeExcelDraft(i){ excelDraftRows.splice(i,1); renderExcelPreview(); }
function confirmExcelImport(){
  if(!excelDraftRows.length){ toast('Rien à importer'); return; }
  let count=0;
  excelDraftRows.forEach(r=>{ if(findOrCreatePieceFromRow(r)) count++; });
  save(); closeModal(); toast(`${count} pièce(s) importée(s)`); currentTab='pieces'; renderShell();
}

/* ---- Import photo / OCR ---- */
let ocrDraftRows = [];
function openOcrImportModal(){
  ocrDraftRows = [];
  openModal('Scanner une feuille de repérés', `
    <div class="hint">Prenez une photo (ou importez une image) d’une feuille listant plusieurs repérés — la reconnaissance de texte extrait les lignes, à vérifier avant import.</div>
    <input type="file" id="ocrFile" accept="image/*" capture="environment" style="margin-top:10px;" onchange="handleOcrFile(this.files[0])">
    <div id="ocrImgPreview"></div>
    <div id="ocrProgress" class="hint" style="margin-top:8px;"></div>
    <div id="ocrPreviewWrap" style="margin-top:14px;"></div>
  `);
}
function handleOcrFile(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{ document.getElementById('ocrImgPreview').innerHTML = `<img src="${e.target.result}" style="max-width:100%;margin-top:10px;border:1px solid var(--border);border-radius:2px;">`; };
  reader.readAsDataURL(file);
  runOcr(file);
}
function runOcr(file){
  const prog = document.getElementById('ocrProgress');
  if(typeof Tesseract === 'undefined'){ prog.textContent = 'Module de reconnaissance indisponible hors ligne — connectez-vous à internet une première fois, ou saisissez manuellement.'; return; }
  prog.textContent = 'Analyse en cours...';
  Tesseract.recognize(file, 'fra', {
    logger: (m)=>{ if(m.status==='recognizing text') prog.textContent = 'Analyse... ' + Math.round(m.progress*100) + '%'; }
  }).then(({data:{text}})=>{
    prog.textContent = 'Analyse terminée — vérifiez et corrigez les lignes avant import.';
    ocrDraftRows = text.split('\n').map(parseOcrLine).filter(r=>r.repere);
    if(!ocrDraftRows.length) ocrDraftRows = [{repere:'',profil:'',longueur:'',acier:'',qty:''}];
    renderOcrPreview();
  }).catch(()=>{ prog.textContent = 'Échec de la reconnaissance — reprenez la photo (plus nette, bien à plat) ou saisissez les lignes manuellement ci-dessous.'; ocrDraftRows=[{repere:'',profil:'',longueur:'',acier:'',qty:''}]; renderOcrPreview(); });
}
// Heuristique : identifie profil (LxxXx), acier (Sxxx), longueur (nombre >=200) et quantité (petit nombre) dans chaque ligne ; le reste forme le repéré.
function parseOcrLine(line){
  const raw = line.trim();
  if(!raw) return {repere:'',profil:'',longueur:'',acier:'',qty:''};
  const tokens = raw.split(/[\s,;|\t]+/).filter(Boolean);
  let profil='', acier='', longueur='', qty=''; const repereTokens=[];
  tokens.forEach(tok=>{
    const up = tok.toUpperCase().replace(/MM$/,'');
    if(/^S\d{3}$/.test(up) && !acier){ acier = up; }
    else if(/^L\d{2,3}X\d{1,2}$/.test(up) && !profil){ profil = up; }
    else if(/^\d{3,5}$/.test(up) && Number(up)>=200 && !longueur){ longueur = up; }
    else if(/^\d{1,4}$/.test(up) && !qty){ qty = up; }
    else { repereTokens.push(tok); }
  });
  return {repere: repereTokens.join(' ').trim(), profil, longueur, acier, qty};
}
function renderOcrPreview(){
  const wrap = document.getElementById('ocrPreviewWrap');
  wrap.innerHTML = `
    <div class="table-wrap"><table><thead><tr><th>Repéré</th><th>Profil</th><th>Longueur</th><th>Acier</th><th>Qté</th><th></th></tr></thead>
    <tbody id="ocrPreviewBody"></tbody></table></div>
    <button class="btn btn-sm" style="margin-top:8px;" onclick="addOcrDraftRow()">+ Ajouter une ligne</button>
    <div class="form-actions"><button class="btn" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="confirmOcrImport()">Confirmer l’import</button></div>
  `;
  renderOcrPreviewRows();
}
function renderOcrPreviewRows(){
  document.getElementById('ocrPreviewBody').innerHTML = ocrDraftRows.map((r,i)=>`<tr>
    <td><input value="${r.repere}" style="width:120px;" onchange="updateOcrDraft(${i},'repere',this.value)"></td>
    <td><input value="${r.profil}" style="width:80px;" onchange="updateOcrDraft(${i},'profil',this.value)"></td>
    <td><input value="${r.longueur}" style="width:70px;" onchange="updateOcrDraft(${i},'longueur',this.value)"></td>
    <td><input value="${r.acier}" style="width:60px;" onchange="updateOcrDraft(${i},'acier',this.value)"></td>
    <td><input value="${r.qty}" style="width:60px;" onchange="updateOcrDraft(${i},'qty',this.value)"></td>
    <td><button class="rm" onclick="removeOcrDraft(${i})">✕</button></td>
  </tr>`).join('');
}
function updateOcrDraft(i, field, val){ ocrDraftRows[i][field]=val; }
function addOcrDraftRow(){ ocrDraftRows.push({repere:'',profil:'',longueur:'',acier:'',qty:''}); renderOcrPreviewRows(); }
function removeOcrDraft(i){ ocrDraftRows.splice(i,1); renderOcrPreviewRows(); }
function confirmOcrImport(){
  const valid = ocrDraftRows.filter(r=>r.repere && r.repere.trim());
  if(!valid.length){ toast('Aucune ligne valide à importer'); return; }
  let count=0;
  valid.forEach(r=>{ if(findOrCreatePieceFromRow(r)) count++; });
  save(); closeModal(); toast(`${count} pièce(s) importée(s) depuis la photo`); currentTab='pieces'; renderShell();
}

/* ============================================================ INIT */
document.addEventListener('DOMContentLoaded', ()=>{
  renderShell();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
});
