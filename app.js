import { mcq, tf, written } from './questions.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { attemptId:'', token:'', answers:{}, flags:new Set(), current:1, deadline:null, saveTimer:null, adminKey:'', attempts:[] };
const letters = ['A','B','C','D'];

function setTheme(){
  let theme = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark':'light';
  document.documentElement.dataset.theme = theme;
  $('[data-theme-toggle]').onclick=()=>{theme=theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme};
}
function showView(id){['home-view','exam-view','success-view','admin-view'].forEach(v=>$('#'+v).hidden=v!==id);}
function message(target,text){$(target).textContent=text||'';}
async function api(url, options={}){
  const res=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=await res.json().catch(()=>({error:'Invalid server response.'}));
  if(!res.ok) throw new Error(data.error||'Request failed.');
  return data;
}
function setupTabs(){
  $$('[data-entry-tab]').forEach(btn=>btn.onclick=()=>{
    $$('[data-entry-tab]').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-selected',String(b===btn))});
    $('#start-form').hidden=btn.dataset.entryTab!=='start';$('#resume-form').hidden=btn.dataset.entryTab!=='resume';
  });
}
$('#start-form').addEventListener('submit',async e=>{
  e.preventDefault();message('#start-error','');const f=new FormData(e.currentTarget);const btn=e.submitter;btn.disabled=true;btn.textContent='Creating attempt…';
  try{const d=await api('/api/start',{method:'POST',body:JSON.stringify({fullName:f.get('fullName'),studentId:f.get('studentId'),section:f.get('section'),consent:f.get('consent')==='on'})});
    Object.assign(state,{attemptId:d.id,token:d.token,deadline:new Date(new Date(d.started_at).getTime()+d.durationMinutes*60000),answers:{}});
    $('#recovery-id').value=d.id;$('#recovery-token').value=d.token;$('#recovery-dialog').showModal();
    $('#recovery-dialog').addEventListener('close',()=>loadAttempt(),{once:true});
  }catch(err){message('#start-error',err.message)}finally{btn.disabled=false;btn.textContent='Begin examination'}
});
$('#copy-recovery').onclick=async()=>{const text=`Attempt ID: ${state.attemptId}\nRecovery token: ${state.token}`;await navigator.clipboard.writeText(text);$('#copy-recovery').textContent='Copied'};
$('#resume-form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);state.attemptId=String(f.get('attemptId')).trim();state.token=String(f.get('token')).trim();try{await loadAttempt()}catch(err){message('#resume-error',err.message)}});
async function loadAttempt(){
  const d=await api(`/api/attempt?id=${encodeURIComponent(state.attemptId)}`,{headers:{'x-attempt-token':state.token}});
  state.answers=d.answers||{};state.deadline=new Date(d.deadline);
  if(d.status!=='in_progress'){showSuccess(d);return}
  $('#student-name').textContent=d.fullName;$('#student-meta').textContent=`${d.studentId} · ${d.section}`;$('#student-initials').textContent=d.fullName.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  buildNav();showView('exam-view');$('#timer').hidden=false;renderQuestion();updateTimer();
}
function buildNav(){const nav=$('#question-nav');nav.innerHTML='';for(let i=1;i<=60;i++){const b=document.createElement('button');b.className='q-nav';b.textContent=i;b.type='button';b.setAttribute('aria-label',`Go to question ${i}`);b.onclick=()=>{state.current=i;renderQuestion()};nav.append(b)}}
function renderQuestion(){
  const n=state.current, content=$('#question-content');$('#question-number').textContent=n;$('#question-section').textContent=n<=10?'Lesson 1 · Fundamentals':n<=20?'Lesson 2 · Analysis':n<=30?'Lesson 3 · Lists & stacks':n<=40?'Lesson 4 · Queues & searching':n<=50?'Modified true or false':n<=55?'Tracing & problem solving':'Programming';
  if(n<=40){const [,q,opts]=mcq[n-1];content.innerHTML=`<p class="question-text">${q}</p><fieldset class="options"><legend class="sr-only">Select one answer</legend>${opts.map((o,i)=>`<label class="option"><input type="radio" name="q${n}" value="${letters[i]}" ${state.answers[n]===letters[i]?'checked':''}><span><span class="option-key">${letters[i]}.</span> ${o}</span></label>`).join('')}</fieldset>`}
  else if(n<=50){const [,q]=tf[n-41];content.innerHTML=`<p class="question-text">${q}</p><fieldset class="options tf-options"><legend class="sr-only">Select true or false</legend>${['TRUE','FALSE'].map(v=>`<label class="option"><input type="radio" name="q${n}" value="${v}" ${state.answers[n]===v?'checked':''}><span>${v[0]+v.slice(1).toLowerCase()}</span></label>`).join('')}</fieldset>`}
  else{const [,title,prompt]=written[n-51];content.innerHTML=`<h2>${title}</h2><p class="question-text">${prompt}</p><label>Your response<textarea class="written-answer" data-answer="${n}" rows="12" spellcheck="false" placeholder="Write your complete solution here…"></textarea></label>`;content.querySelector('textarea').value=state.answers[n]||''}
  content.querySelectorAll('input').forEach(x=>x.onchange=()=>capture(n,x.value));const ta=content.querySelector('textarea');if(ta)ta.oninput=()=>capture(n,ta.value);
  $('#prev-btn').disabled=n===1;$('#next-btn').hidden=n===60;$('#submit-btn').hidden=n!==60;$('#flag-btn').setAttribute('aria-pressed',String(state.flags.has(n)));$('#flag-btn').textContent=state.flags.has(n)?'Flagged':'Flag for review';updateProgress();
  document.querySelectorAll('.q-nav').forEach((b,i)=>{b.classList.toggle('current',i+1===n);b.classList.toggle('answered',Boolean(String(state.answers[i+1]||'').trim()));b.classList.toggle('flagged',state.flags.has(i+1))});
}
function capture(n,value){state.answers[n]=value;updateProgress();clearTimeout(state.saveTimer);message('#save-status','Unsaved changes');state.saveTimer=setTimeout(saveAnswers,900)}
function updateProgress(){const count=Object.values(state.answers).filter(v=>String(v).trim()).length;$('#progress-count').textContent=`${count} / 60`;$('#progress-bar').style.width=`${count/60*100}%`;const b=$$('.q-nav')[state.current-1];if(b)b.classList.toggle('answered',Boolean(String(state.answers[state.current]||'').trim()))}
async function saveAnswers(){try{await api('/api/attempt',{method:'PATCH',headers:{'x-attempt-token':state.token},body:JSON.stringify({id:state.attemptId,answers:state.answers})});message('#save-status','Saved')}catch{message('#save-status','Save failed — retrying');state.saveTimer=setTimeout(saveAnswers,5000)}}
$('#prev-btn').onclick=()=>{if(state.current>1){state.current--;renderQuestion();scrollTo(0,0)}};$('#next-btn').onclick=()=>{if(state.current<60){state.current++;renderQuestion();scrollTo(0,0)}};$('#flag-btn').onclick=()=>{state.flags.has(state.current)?state.flags.delete(state.current):state.flags.add(state.current);renderQuestion()};
$('#submit-btn').onclick=()=>{const answered=Object.values(state.answers).filter(v=>String(v).trim()).length;$('#submit-summary').textContent=`You answered ${answered} of 60 items. ${60-answered} item(s) are blank and ${state.flags.size} item(s) are flagged.`;$('#submit-dialog').showModal()};
$('#confirm-submit').onclick=async e=>{e.preventDefault();const b=e.currentTarget;b.disabled=true;b.textContent='Submitting…';try{const d=await api('/api/attempt',{method:'POST',headers:{'x-attempt-token':state.token},body:JSON.stringify({id:state.attemptId,answers:state.answers})});$('#submit-dialog').close();showSuccess({...d,submittedAt:new Date().toISOString()})}catch(err){alert(err.message);b.disabled=false;b.textContent='Submit now'}};
function updateTimer(){if($('#exam-view').hidden)return;const remaining=Math.max(0,state.deadline-Date.now()),seconds=Math.floor(remaining/1000),h=String(Math.floor(seconds/3600)).padStart(2,'0'),m=String(Math.floor(seconds%3600/60)).padStart(2,'0'),s=String(seconds%60).padStart(2,'0');$('#timer').textContent=`${h}:${m}:${s}`;$('#timer').classList.toggle('urgent',remaining<10*60000);if(!remaining){api('/api/attempt',{method:'POST',headers:{'x-attempt-token':state.token},body:JSON.stringify({id:state.attemptId,answers:state.answers})}).then(d=>showSuccess({...d,submittedAt:new Date().toISOString()}));return}setTimeout(updateTimer,1000)}
function showSuccess(d){showView('success-view');$('#timer').hidden=true;$('#receipt').textContent=`Attempt ${state.attemptId || d.id || ''} · Submitted ${new Date(d.submittedAt||Date.now()).toLocaleString()}`}

function adminRoute(){if(location.hash==='#admin'){showView('admin-view');$('#timer').hidden=true}else if(!state.attemptId)showView('home-view')}
window.addEventListener('hashchange',adminRoute);$('#admin-login').addEventListener('submit',async e=>{e.preventDefault();state.adminKey=new FormData(e.currentTarget).get('key');await loadAdmin()});$('#admin-refresh').onclick=loadAdmin;
async function loadAdmin(){try{const d=await api('/api/admin',{headers:{'x-admin-key':state.adminKey}});state.attempts=d.attempts;$('#admin-login').hidden=true;$('#admin-dashboard').hidden=false;renderAdmin()}catch(err){message('#admin-error',err.message)}}
function renderAdmin(){const a=state.attempts,submitted=a.filter(x=>x.status==='submitted').length,graded=a.filter(x=>x.status==='graded').length;$('#admin-metrics').innerHTML=[['Attempts',a.length],['In progress',a.filter(x=>x.status==='in_progress').length],['Awaiting grading',submitted],['Graded',graded]].map(([l,v])=>`<div class="metric"><small>${l}</small><strong>${v}</strong></div>`).join('');$('#attempt-rows').innerHTML=a.map(x=>`<tr><td><strong>${esc(x.full_name)}</strong><br><small>${esc(x.student_id)}</small></td><td>${esc(x.section)}</td><td><span class="status-badge">${esc(x.status.replace('_',' '))}</span></td><td>${x.objective_score??'—'} / 50</td><td>${x.manual_score??'—'} / 50</td><td>${x.status==='graded'?(x.objective_score+x.manual_score)+' / 100':'—'}</td><td>${x.status==='submitted'?`<button class="btn secondary grade-btn" data-id="${x.id}">Grade</button>`:'—'}</td></tr>`).join('');$$('.grade-btn').forEach(b=>b.onclick=()=>openGrade(b.dataset.id))}
function openGrade(id){const a=state.attempts.find(x=>x.id===id);$('#grade-student').textContent=`${a.full_name} · ${a.objective_score}/50 objective`;$('#grade-form [name=id]').value=id;$('#grade-answers').innerHTML=written.map(([n,title])=>`<section class="grade-answer"><strong>${n}. ${title}</strong><pre>${esc(a.answers?.[n]||'No response')}</pre></section>`).join('');$('#grade-dialog').showModal()}
$('#grade-form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api('/api/admin',{method:'PATCH',headers:{'x-admin-key':state.adminKey},body:JSON.stringify({id:f.get('id'),manualScore:Number(f.get('manualScore')),feedback:f.get('feedback')})});$('#grade-dialog').close();e.currentTarget.reset();await loadAdmin()}catch(err){alert(err.message)}});
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
setTheme();setupTabs();adminRoute();
