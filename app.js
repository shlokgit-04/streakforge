// StreakForge app logic. Storage keys (all localStorage):
//   sf_done    { "YYYY-MM-DD": [slug,...] }
//   sf_review  { slug: { level: 0..3, due: "YYYY-MM-DD" } }
//   sf_topic   dayIndex -> topic rotation offset override
const $ = (id)=>document.getElementById(id);
const todayISO = ()=> new Date().toISOString().slice(0,10);
const done = JSON.parse(localStorage.getItem("sf_done")||"{}");
const review = JSON.parse(localStorage.getItem("sf_review")||"{}");
const save = ()=>{localStorage.setItem("sf_done",JSON.stringify(done));localStorage.setItem("sf_review",JSON.stringify(review));};

const epochDay = (iso)=>Math.floor(new Date(iso+"T00:00:00Z").getTime()/86400000);
const isoOf = (d)=>new Date(d*86400000).toISOString().slice(0,10);
const dayIndex = ()=> epochDay(todayISO());

function solvedOn(iso){return done[iso]||[];}
function isSolved(slug){return Object.values(done).some(a=>a.includes(slug));}
function streak(){
  let s=0,d=epochDay(todayISO());
  // today counts only if something done; otherwise start from yesterday
  if(!solvedOn(isoOf(d)).length) d-=1;
  while(solvedOn(isoOf(d)).length){s++;d--;}
  return s;
}
function heatLevels(){
  const out={};const start=dayIndex()-104;
  for(let d=start;d<=dayIndex();d++){const iso=isoOf(d);const n=solvedOn(iso).length;
    out[iso]= n===0?0 : n===1?1 : n===2?2 : 3;}
  return out;
}
function renderStats(){
  const total=new Set(Object.values(done).flat()).size;
  $("streak").textContent=streak();
  $("total-solved").textContent=total;
  $("today-count").textContent=solvedOn(todayISO()).length;
  const heat=$("heatmap");heat.innerHTML="";
  const lv=heatLevels();const start=dayIndex()-104;
  for(let d=start;d<=dayIndex();d++){const i=document.createElement("i");
    const l=lv[isoOf(d)];if(l)i.classList.add("l"+l);i.title=isoOf(d)+(l?` · ${l>2?"3+":l} solved`:" · no solves");heat.appendChild(i);}
}
// topic rotation with optional shuffle offset
function todayTopic(){
  const off=parseInt(localStorage.getItem("sf_topic")||"0",10);
  const t=TOPICS[(dayIndex()+off)%TOPICS.length];
  $("plan-topic").textContent=`Today's focus topic: ${t}`;
  return t;
}
function planList(){
  const t=todayTopic();
  const pool=BANK.filter(p=>p.topic===t && !isSolved(p.slug));
  const picks=(pool.length?pool:BANK.filter(p=>p.topic===t)).slice(0,3);
  const ul=$("plan-list");ul.innerHTML="";
  const today=solvedOn(todayISO());
  picks.forEach(p=>ul.appendChild(planRow(p,today)));
  if(!picks.length){const li=document.createElement("li");li.textContent="Every problem in this topic is solved. Shuffle for a new topic!";ul.appendChild(li);}
}
function planRow(p,today){
  const li=document.createElement("li");
  const a=document.createElement("a");a.href=`https://leetcode.com/problems/${p.slug}/`;a.target="_blank";a.textContent=p.title;li.appendChild(a);
  const tag=document.createElement("span");tag.className=`tag ${p.difficulty}`;tag.textContent=p.difficulty;li.appendChild(tag);
  const b=document.createElement("button");b.className="done-btn";
  if(today.includes(p.slug)){b.textContent="solved today";b.classList.add("on");}
  else{b.textContent="mark solved";b.onclick=()=>markSolved(p.slug);}
  li.appendChild(b);return li;
}
function markSolved(slug){
  const iso=todayISO();
  done[iso]=done[iso]||[];
  if(!done[iso].includes(slug))done[iso].push(slug);
  const r=review[slug]||{level:0};r.due=isoOf(dayIndex()+[3,7,14,30][r.level||0]);r.level=(r.level||0)+1;
  review[slug]=r;save();renderStats();planList();renderRevision();renderBank();
}
// revision queue
function renderRevision(){
  const ul=$("rev-list");ul.innerHTML="";const t=dayIndex();
  const due=Object.entries(review).filter(([s,r])=>r.due<=isoOf(t))
    .sort((a,b)=>a[1].due<b[1].due?-1:1).slice(0,6);
  $("rev-empty").style.display=due.length?"none":"block";
  due.forEach(([slug,r])=>{
    const meta=BANK.find(p=>p.slug===slug);const li=document.createElement("li");
    const a=document.createElement("a");a.href=`https://leetcode.com/problems/${slug}/`;a.target="_blank";
    a.textContent=meta?meta.title:slug;li.appendChild(a);
    const tag=document.createElement("span");tag.className="tag";tag.textContent=`round ${r.level} · due ${r.due}`;li.appendChild(tag);
    const b=document.createElement("button");b.className="done-btn";b.textContent="reviewed";
    b.onclick=()=>{const rr=review[slug];rr.due=isoOf(dayIndex()+[0,7,14,30,60][Math.min(rr.level,4)]);rr.level++;save();renderRevision();};
    li.appendChild(b);ul.appendChild(li);
  });
}
// bank browser
function renderBank(){
  const ft=$("f-topic").value,fd=$("f-diff").value,q=$("f-q").value.toLowerCase();
  const ul=$("bank-list");ul.innerHTML="";
  BANK.filter(p=>(ft==="all"||p.topic===ft)&&(fd==="all"||p.difficulty===fd)&&p.title.toLowerCase().includes(q))
    .forEach(p=>ul.appendChild(planRow(p,solvedOn(todayISO()))));
}
$("f-topic").innerHTML=`<option value="all">all topics</option>`+TOPICS.map(t=>`<option>${t}</option>`).join("");
$("f-diff").innerHTML=`<option value="all">any difficulty</option><option>easy</option><option>medium</option>`;
$("f-topic").onchange=renderBank;$("f-diff").onchange=renderBank;$("f-q").oninput=renderBank;
$("shuffle").onclick=()=>{localStorage.setItem("sf_topic",(dayIndex()+1+Math.floor(Math.random()*(TOPICS.length-1)))-dayIndex());planList();};
renderStats();planList();renderRevision();renderBank();
