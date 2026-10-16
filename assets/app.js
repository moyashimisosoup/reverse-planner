import {clockPlan,daysPlan,dateKey,datetimeLocal} from "./core.mjs";
import {STORE_KEY,loadState,screenFromHash,hasAnyTasks,activeCount,validateSetup,PRESETS,applyPreset,task,sheet,scope} from "./state.mjs";

const $=id=>document.getElementById(id);
const esc=text=>String(text??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const two=n=>String(n).padStart(2,"0");
const hm=d=>two(d.getHours())+":"+two(d.getMinutes());
const stamp=d=>((dateKey(d)===dateKey(new Date()))?"":(d.getMonth()+1)+"/"+d.getDate()+" ")+hm(d);
const fmtMinutes=n=>n>=60?Math.floor(n/60)+"時間"+(n%60?n%60+"分":""):n+"分";
const niceDay=key=>{const d=new Date(key+"T12:00:00");return (d.getMonth()+1)+"/"+d.getDate()+"（"+"日月火水木金土"[d.getDay()]+"）";};
const millis=()=>Date.now();

let raw=null;
try {raw=localStorage.getItem(STORE_KEY);} catch(_){}
const restored=loadState(raw);
let data=restored.state;
let storageIssue=restored.status==="invalid";
let savedState=restored.status==="existing";
let screen=screenFromHash(window.location.hash);
let savedMessageTimer=0;
let completedVisual=false;

function persist() {
  if(storageIssue) {
    $("save-status").textContent="保存保留中";
    return false;
  }
  try {
    localStorage.setItem(STORE_KEY,JSON.stringify(data));
    savedState=true;
    $("save-status").textContent="● この端末に保存済み";
    return true;
  } catch(e) {
    $("save-status").textContent="保存できません。JSON保存を使ってください";
    return false;
  }
}
function go(name) {
  if(screen===name){render();return;}
  window.location.hash=name;
  // hashchange is asynchronous; centralize transition handling there.
}
function syncRoute(){
  screen=screenFromHash(window.location.hash);
  if(screen!=="home"&&!["setup","plan","run"].includes(screen))screen="home";
  render();
  window.scrollTo({top:0,behavior:"instant"});
  const title=$("screen-"+screen).querySelector("h1");
  if(title) title.focus({preventScroll:true});
}
function render(){
  const issue=$("storage-warning");
  issue.hidden=!storageIssue;
  const stepIndex={home:0,setup:1,plan:2,run:3}[screen];
  $("step-bar").hidden=screen==="home";
  $("step-label").textContent="STEP "+stepIndex+" / 3";
  $("step-bar").querySelectorAll(".step-dots i").forEach((dot,i)=>dot.classList.toggle("active",i<stepIndex));
  ["home","setup","plan","run"].forEach(name=>{$("screen-"+name).hidden=name!==screen;});
  if(screen==="home")renderHome();
  if(screen==="setup")renderSetup();
  if(screen==="plan")renderPlan();
  if(screen==="run")renderRun();
  if(storageIssue)$("save-status").textContent="元データは未変更";
}
function renderHome(){
  const resume=savedState&&hasAnyTasks(data);
  $("resume-card").hidden=!resume;
  if(resume) {
    const category=data.mode==="study"?"学習":"くらし";
    $("resume-description").textContent=category+"・"+(data.scale==="clock"?"時刻から逆算":"日付から逆算")+
      "　残り"+activeCount(data)+"件";
  }
}
function readForm(){
  const s=sheet(data);
  if(data.scale==="clock"){s.deadline=$("clock-deadline").value;s.buffer=Number($("clock-buffer").value);}
  else {
    s.dueDate=$("days-deadline").value;s.dailyLimit=Number($("daily-limit").value);
    s.reserveDays=Number($("reserve-days").value);
    s.offDays=Array.from(document.querySelectorAll("[data-off-day]:checked"),x=>Number(x.value));
  }
  persist();
  $("setup-error").hidden=true;
}
function renderSetup(){
  const s=sheet(data);
  $("clock-fields").hidden=data.scale!=="clock";
  $("days-fields").hidden=data.scale!=="days";
  $("clock-settings").hidden=data.scale!=="clock";
  $("days-settings").hidden=data.scale!=="days";
  $("clock-deadline").value=data.sheets[data.mode].clock.deadline||"";
  $("clock-buffer").value=data.sheets[data.mode].clock.buffer??10;
  $("days-deadline").value=data.sheets[data.mode].days.dueDate||"";
  $("daily-limit").value=data.sheets[data.mode].days.dailyLimit??60;
  $("reserve-days").value=data.sheets[data.mode].days.reserveDays??1;
  document.querySelectorAll("[data-off-day]").forEach(input=>input.checked=(data.sheets[data.mode].days.offDays||[]).includes(Number(input.value)));
  $("preset-list").innerHTML=PRESETS.map(p=>'<button type="button" data-preset="'+p.id+'">'+esc(p.icon)+" "+esc(p.label)+"</button>").join("");
  $("task-count").textContent=s.tasks.filter(t=>!t.done).length+"こ";
  $("setup-error").hidden=true;
  renderTasks();
}
function renderTasks(){
  const ts=sheet(data).tasks;
  $("task-count").textContent=ts.filter(t=>!t.done).length+"こ";
  if(!ts.length){$("task-list").innerHTML='<li class="empty-state">まだ何も登録されていません。<br>まずは下から追加してみよう。</li>';return;}
  $("task-list").innerHTML=ts.map((t,i)=>{
    const name=esc(t.name),minutes=Number(t.minutes);
    return '<li class="task-row '+(t.done?"is-done":"")+'">'+
      '<label class="checkbox"><span class="sr-only">完了</span><input type="checkbox" data-task-field="done" data-index="'+i+'" '+(t.done?"checked":"")+' aria-label="'+name+'を完了"></label>'+
      '<label class="task-name"><span class="sr-only">やることの名前</span><input type="text" data-task-field="name" data-index="'+i+'" value="'+name+'" maxlength="80"></label>'+
      '<label class="task-minutes"><span class="sr-only">所要時間（分）</span><input type="number" data-task-field="minutes" data-index="'+i+'" value="'+minutes+'" min="1" max="1440">分</label>'+
      '<span class="row-buttons"><button type="button" data-task-action="up" data-index="'+i+'" aria-label="'+name+'を上へ" '+(i===0?"disabled":"")+'>↑</button>'+
      '<button type="button" data-task-action="down" data-index="'+i+'" aria-label="'+name+'を下へ" '+(i===ts.length-1?"disabled":"")+'>↓</button>'+
      '<button type="button" data-task-action="remove" data-index="'+i+'" aria-label="'+name+'を削除">×</button></span></li>';
  }).join("");
}
function errorSetup(message){
  $("setup-error").textContent=message;$("setup-error").hidden=false;
  $("setup-error").scrollIntoView({block:"nearest",behavior:"smooth"});
}
function getPlan(){return data.scale==="clock"?clockPlan(sheet(data)):daysPlan(sheet(data));}
function renderPlan(){
  const valid=validateSetup(data);
  if(valid){errorSetupOnPlan(valid);return;}
  const plan=getPlan();
  if(plan.error){errorSetupOnPlan(plan.error);return;}
  const clock=data.scale==="clock",done=plan.remainingCount===0;
  $("result-label").textContent=done?"ALL CLEAR ✳":clock?"START TIME":"TODAY'S MISSION";
  $("result-main").textContent=done?"おつかれさま！":clock?hm(plan.start):plan.target?fmtMinutes(plan.target):"おやすみ";
  $("result-sub").textContent=done?"すべてのタスクが完了しました！":clock?
    "開始 "+stamp(plan.start)+" → ゴール "+stamp(plan.due):
    niceDay(sheet(data).dueDate)+" まで、"+plan.workingDays+"日で計画";
  const metas=clock?["やること "+plan.remainingCount+"件","作業 "+fmtMinutes(plan.work),"余裕 "+plan.buffer+"分"]:
    ["残り "+fmtMinutes(plan.total),"作業日 "+plan.workingDays+"日","予備日 "+plan.reserveDays+"日"];
  $("metrics").innerHTML=metas.map(x=>'<span class="metric">'+esc(x)+"</span>").join("");
  const n=$("notice");
  if(clock&&plan.deficit>0&&!done){
    n.hidden=false;n.innerHTML="<strong>今から始めると約"+plan.deficit+"分足りません。</strong>"+
      '<p>作業時間は自動で短縮しません。時間を見直すか、ゴールを延ばせます。</p>'+
      '<button type="button" class="button button-secondary" id="extend-deadline">終了を '+esc(stamp(plan.suggestedDue))+" に変更する</button>";
  } else if(!clock&&plan.missing>0&&!done){
    n.hidden=false;n.innerHTML="<strong>"+esc(fmtMinutes(plan.missing))+"を割り当てられません。</strong>"+
      "<p>1日の時間、予備日、休む曜日、締切日を調整しましょう。作業は削除されません。</p>";
  }else{n.hidden=true;n.innerHTML="";}
  $("timeline-title").textContent=clock?"時間ごとの予定":"日ごとの予定";
  $("timeline-hint").textContent=clock?"上から順に進もう":"今日から締切まで";
  $("timeline").innerHTML=clock?plan.items.map(item=>
    '<div class="timeline-item"><div class="timeline-time">'+esc(stamp(item.start))+"<br>〜 "+esc(stamp(item.end))+"</div>"+
    '<div class="timeline-card '+(item.buffer?"is-buffer":"")+'"><div><strong>'+esc(item.name)+"</strong><small>"+
    item.minutes+'分</small></div><span class="tag">'+(item.buffer?"余裕時間":"QUEST")+"</span></div></div>").join(""):
    plan.days.map(day=>{
      const label=day.rest?"おやすみ":day.reserve?"予備日":day.used?"合計 "+fmtMinutes(day.used):"空いている日";
      const tasks=day.items.map(x=>'<div><strong>'+esc(x.name)+'</strong><small>'+x.minutes+"分</small></div>").join("");
      return '<div class="timeline-item"><div class="timeline-time">'+esc(niceDay(day.key))+'</div>'+
        '<div class="timeline-card '+(day.items.length?"":"is-rest")+'"><div>'+(tasks||"<strong>"+label+"</strong>")+
        '</div><span class="tag">'+(day.items.length?esc(label):"")+"</span></div></div>";
    }).join("");
  if(!plan.items?.length&&!plan.days?.length)$("timeline").innerHTML='<div class="empty-state">予定はありません。</div>';
  $("study-disclaimer").hidden=data.mode!=="study";
  $("start-plan").textContent=clock?"▶ この計画ではじめる":"▶ 今日の分を見る";
  $("start-plan").disabled=Boolean(!clock&&plan.missing>0&&!done);
}
function errorSetupOnPlan(message) {
  $("result-label").textContent="入力を確認しよう";$("result-main").textContent="？";
  $("result-sub").textContent=message;$("metrics").innerHTML="";
  $("notice").hidden=true;$("timeline").innerHTML='<div class="empty-state">設定を直して予定をつくろう。</div>';
  $("start-plan").disabled=true;
}
function timerLeft(t){return Math.max(0,t.running?Math.ceil((t.endMs-millis())/1000):t.remainingSeconds||0);}
function timerHtml(t){
  const remain=timerLeft(t);
  return '<span class="timer-clock" id="timer-clock">'+two(Math.floor(remain/60))+":"+two(remain%60)+'</span>'+
    '<div class="timer-buttons"><button type="button" class="button button-secondary" data-timer="'+(t.running?"pause":"resume")+'">'+
    (t.running?"Ⅱ 一時停止":remain?"▶ 再開":"＋5分")+'</button></div>';
}
function renderRun() {
  const s=sheet(data),plan=getPlan();
  if(plan.error){$("focus-task").textContent=plan.error;$("focus-controls").innerHTML='<button type="button" class="button button-secondary" data-run="edit">入力に戻る</button>';return;}
  if(data.scale==="clock") {
    const pending=s.tasks.filter(t=>!t.done),next=pending[0],t=data.timer;
    if(!next){renderAllDone();return;}
    $("focus-task").textContent=next.name;
    $("focus-sub").textContent=fmtMinutes(next.minutes)+"　/　先頭の作業から進めよう";
    const active=t&&t.key===scope(data)&&t.taskId===next.id;
    $("timer-area").hidden=!active;
    $("timer-area").innerHTML=active?timerHtml(t):"";
    $("focus-controls").innerHTML=(active?"":'<button type="button" class="button button-primary pixel-press button-large" data-run="start">▶ タイマーを始める</button>')+
      '<button type="button" class="button button-secondary" data-run="done">✓ できた！</button>';
    $("run-list").innerHTML=pending.slice(1).map(t=>'<div class="run-row"><span>'+esc(t.name)+'</span><small>'+t.minutes+"分</small></div>").join("")||
      '<p class="empty-state">次の作業はありません。あとひとつ！</p>';
  } else {
    const today=plan.days.find(d=>d.key===dateKey(new Date())),entry=today?.items[0];
    const remaining=s.tasks.filter(t=>!t.done);
    $("timer-area").hidden=true;$("timer-area").innerHTML="";
    if(!remaining.length){renderAllDone();return;}
    $("focus-task").textContent=entry?entry.name:today?.rest?"今日はおやすみ":today?.reserve?"今日は予備日":"今日の予定はありません";
    $("focus-sub").textContent=entry?("今日の割当 "+entry.minutes+"分。全体の完了は確認してから記録します。"):"ほかの日の予定は「予定の全体を見る」から確認できます。";
    $("focus-controls").innerHTML=entry?
      '<button type="button" class="button button-secondary" data-run="done-days">✓ このタスク全体が終わった</button>':"";
    $("run-list").innerHTML=(today?.items||[]).slice(1).map(x=>
      '<div class="run-row"><span>'+esc(x.name)+'</span><small>今日 '+x.minutes+"分</small></div>").join("")||
      '<p class="empty-state">今日の追加の作業はありません。</p>';
  }
}
function renderAllDone(){
  $("focus-task").textContent="全部できた！ ★";
  $("focus-sub").textContent="おつかれさま。また次の計画でね。";
  $("focus-controls").innerHTML='<button type="button" class="button button-primary pixel-press button-large" data-run="home">別の計画をつくる</button>';
  $("timer-area").hidden=true;$("timer-area").innerHTML="";
  $("run-list").innerHTML='<div class="empty-state">残りの作業はありません。</div>';
}
function beginTimer(){
  const next=sheet(data).tasks.find(t=>!t.done);
  if(!next)return;
  const secs=Number(next.minutes)*60;
  data.timer={key:scope(data),taskId:next.id,running:true,endMs:millis()+secs*1000,remainingSeconds:secs};
  persist();renderRun();
}
function timerAction(action){
  const t=data.timer;if(!t||t.key!==scope(data))return;
  if(action==="pause"){t.remainingSeconds=timerLeft(t);t.running=false;}
  if(action==="resume"){t.remainingSeconds=t.remainingSeconds===0?300:t.remainingSeconds;t.endMs=millis()+t.remainingSeconds*1000;t.running=true;}
  persist();renderRun();
}
function markDone(daysMode=false){
  const first=sheet(data).tasks.find(t=>!t.done);
  if(!first)return;
  if(daysMode && !confirm("「"+first.name+"」の作業全体が終わりましたか？\n今日割り当てられた分だけではなく、タスク全体を完了にします。"))return;
  first.done=true;
  if(data.timer?.key===scope(data)&&data.timer.taskId===first.id)data.timer=null;
  persist();completedVisual=true;renderRun();
  $("focus-task").classList.add("completed-burst");
  setTimeout(()=>$("focus-task").classList.remove("completed-burst"),300);
}
function download(text,filename,type="application/json;charset=utf-8"){
  const u=URL.createObjectURL(new Blob([text],{type}));
  const a=document.createElement("a");a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),2000);
}
function exportPlan(){
  download(JSON.stringify({application:"reverse-planner",exportedAt:new Date().toISOString(),state:data},null,2),
    "reverse-planner-"+dateKey(new Date())+".json");
}
function onTick(){
  const t=data.timer;if(!t)return;
  if(t.running&&timerLeft(t)===0){t.running=false;t.remainingSeconds=0;persist();if(screen==="run")renderRun();return;}
  if(screen==="run"&&t.key===scope(data)&&$("timer-clock")){
    const left=timerLeft(t);$("timer-clock").textContent=two(Math.floor(left/60))+":"+two(left%60);
  }
}
// Screen navigation and high-level controls.
document.querySelectorAll("[data-choose-scale]").forEach(b=>b.addEventListener("click",()=>{
  data.scale=b.dataset.chooseScale;
  // Navigating alone does not overwrite any saved task or issue a save.
  go("setup");
}));
$("resume-button").addEventListener("click",()=>go(validateSetup(data)?"setup":"plan"));
$("back-button").addEventListener("click",()=>go(({setup:"home",plan:"setup",run:"plan"})[screen]||"home"));
$("edit-plan").addEventListener("click",()=>go("setup"));
$("back-plan").addEventListener("click",()=>go("plan"));
$("start-plan").addEventListener("click",()=>{if(!validateSetup(data)&&!$("start-plan").disabled)go("run");});
$("make-plan").addEventListener("click",()=>{
  readForm();
  const issue=validateSetup(data);
  if(issue){errorSetup(issue);return;}
  const plan=getPlan();
  if(plan.error){errorSetup(plan.error);return;}
  go("plan");
});
["clock-deadline","clock-buffer","days-deadline","daily-limit","reserve-days"].forEach(id=>
  $(id).addEventListener("change",readForm));
document.querySelectorAll("[data-off-day]").forEach(x=>x.addEventListener("change",readForm));
$("preset-list").addEventListener("click",ev=>{
  const b=ev.target.closest("[data-preset]");if(!b)return;
  const p=PRESETS.find(x=>x.id===b.dataset.preset);if(!p)return;
  if(sheet(data).tasks.length&&!confirm("この計画の作業一覧をサンプルに置き換えますか？\nほかの種類の計画には影響しません。"))return;
  applyPreset(data,p);
  persist();renderSetup();
});
$("add-task-form").addEventListener("submit",ev=>{
  ev.preventDefault();
  const name=$("new-task-name").value.trim(),minutes=Number($("new-task-minutes").value);
  if(!name||!Number.isInteger(minutes)||minutes<1||minutes>1440){errorSetup("やることの名前と1〜1440分の時間を入力してください。");return;}
  sheet(data).tasks.push(task(name,minutes));$("new-task-name").value="";
  persist();renderTasks();$("new-task-name").focus();
});
document.querySelectorAll("[data-minutes]").forEach(b=>b.addEventListener("click",()=>{
  $("new-task-minutes").value=b.dataset.minutes;
  document.querySelectorAll("[data-minutes]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
  $("new-task-name").focus();
}));
$("task-list").addEventListener("change",ev=>{
  const input=ev.target,field=input.dataset.taskField;
  if(!field)return;
  const t=sheet(data).tasks[Number(input.dataset.index)];if(!t)return;
  if(field==="done"){
    t.done=input.checked;
    if(t.done&&data.timer?.key===scope(data)&&data.timer.taskId===t.id)data.timer=null;
  }
  if(field==="name"){const name=input.value.trim();if(name)t.name=name;}
  if(field==="minutes"){const value=Number(input.value);if(Number.isInteger(value)&&value>=1&&value<=1440)t.minutes=value;}
  persist();renderTasks();
});
$("task-list").addEventListener("click",ev=>{
  const button=ev.target.closest("[data-task-action]");if(!button)return;
  const ts=sheet(data).tasks,i=Number(button.dataset.index),action=button.dataset.taskAction;
  if(!Number.isInteger(i)||i<0||i>=ts.length)return;
  if(action==="remove"){
    if(!confirm("「"+ts[i].name+"」を削除しますか？"))return;
    if(data.timer?.key===scope(data)&&data.timer.taskId===ts[i].id)data.timer=null;
    ts.splice(i,1);
  }else if(action==="up"&&i>0)[ts[i-1],ts[i]]=[ts[i],ts[i-1]];
  else if(action==="down"&&i<ts.length-1)[ts[i],ts[i+1]]=[ts[i+1],ts[i]];
  else return;
  persist();renderTasks();
});
$("notice").addEventListener("click",ev=>{
  if(!ev.target.closest("#extend-deadline"))return;
  const plan=clockPlan(sheet(data));if(plan.error)return;
  sheet(data).deadline=datetimeLocal(plan.suggestedDue);
  persist();renderPlan();
});
$("focus-controls").addEventListener("click",ev=>{
  const b=ev.target.closest("[data-run]");if(!b)return;
  if(b.dataset.run==="start")beginTimer();
  if(b.dataset.run==="done")markDone();
  if(b.dataset.run==="done-days")markDone(true);
  if(b.dataset.run==="home")go("home");
  if(b.dataset.run==="edit")go("setup");
});
$("timer-area").addEventListener("click",ev=>{
  const b=ev.target.closest("[data-timer]");if(b)timerAction(b.dataset.timer);
});
$("export-button").addEventListener("click",exportPlan);
$("backup-raw").addEventListener("click",()=>{
  if(raw!=null)download(raw,"reverse-planner-original-backup-"+dateKey(new Date())+".txt","text/plain;charset=utf-8");
});
$("reset-corrupt").addEventListener("click",()=>{
  if(!confirm("読み取れない保存データを初期化します。\n元データを保存してから実行してください。続けますか？"))return;
  try {localStorage.removeItem(STORE_KEY);}catch(_){}
  storageIssue=false;
  persist();go("home");render();
});
window.addEventListener("hashchange",syncRoute);
if(storageIssue)$("save-status").textContent="保存データを保護中";
render();
setInterval(onTick,1000);
setInterval(()=>{if(screen==="plan"&&document.activeElement?.tagName!=="INPUT")renderPlan();},60000);
