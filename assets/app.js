import {clockPlan,daysPlan,datetimeLocal,dateKey,addCalendarDays} from "./core.mjs";

const STORE="reverse-planner:prototype:v1";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const newTask=(name,minutes)=>({id:id(),name,minutes,done:false});
const two=n=>String(n).padStart(2,"0");
const hhmm=d=>two(d.getHours())+":"+two(d.getMinutes());
const stamp=d=>(dateKey(d)===dateKey(new Date())?"":(d.getMonth()+1)+"/"+d.getDate()+" ")+hhmm(d);
const minutesText=n=>n>=60?Math.floor(n/60)+"時間"+(n%60?n%60+"分":""):n+"分";
const prettyDate=key=>{const d=new Date(key+"T12:00:00");return (d.getMonth()+1)+"/"+d.getDate()+"（"+"日月火水木金土"[d.getDay()]+"）";};

function newSheet(mode,scale) {
  const now=new Date(),end=new Date(now);
  end.setSeconds(0,0);end.setMinutes(Math.ceil(end.getMinutes()/15)*15);end.setHours(end.getHours()+2);
  if(scale==="clock") return {deadline:datetimeLocal(end),buffer:10,tasks:mode==="study"
    ?[newTask("数学：ワークを進める",25),newTask("英語：単語を確認する",20),newTask("理科：確認問題に取り組む",15)]
    :[newTask("買い物をすませる",20),newTask("夕食をつくる",35),newTask("片付けをする",15)]};
  return {dueDate:dateKey(addCalendarDays(now,7)),dailyLimit:mode==="study"?90:60,reserveDays:1,offDays:[0],
    tasks:mode==="study"?
    [newTask("数学：試験範囲の演習",180),newTask("英語：単語・文法",150),newTask("理科：単元の確認",120),newTask("社会：一問一答",90)]:
    [newTask("持ち物リストをつくる",30),newTask("必要なものを買う",90),newTask("荷造りをする",120),newTask("出発前の確認",30)]};
}
function initial(){return {schema:1,mode:"life",scale:"clock",sheets:{life:{clock:newSheet("life","clock"),days:newSheet("life","days")},study:{clock:newSheet("study","clock"),days:newSheet("study","days")}},timer:null};}
function load(){
  try {const value=JSON.parse(localStorage.getItem(STORE));
    if(value&&value.schema===1&&["life","study"].includes(value.mode)&&["clock","days"].includes(value.scale)&&
      ["life","study"].every(mode=>["clock","days"].every(scale=>Array.isArray(value.sheets?.[mode]?.[scale]?.tasks))))return value;
  }catch(e){}
  return initial();
}
let state=load();
const sheet=()=>state.sheets[state.mode][state.scale];
const scope=()=>state.mode+":"+state.scale;
function save(){
  try{localStorage.setItem(STORE,JSON.stringify(state));$("save-status").textContent="保存済み";}
  catch(e){$("save-status").textContent="端末に保存できません。JSON保存をご利用ください。";}
}
function readInputs(){
  const s=sheet();
  if(state.scale==="clock"){s.deadline=$("clock-deadline").value;s.buffer=Number($("clock-buffer").value);}
  else{s.dueDate=$("days-deadline").value;s.dailyLimit=Number($("daily-limit").value);s.reserveDays=Number($("reserve-days").value);
    s.offDays=Array.from(document.querySelectorAll("[data-off-day]:checked"),x=>Number(x.value));}
  save();renderPlan();
}
function renderEditor(){
  document.querySelectorAll("[data-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===state.mode)));
  document.querySelectorAll("[data-scale]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.scale===state.scale)));
  $("clock-fields").hidden=state.scale!=="clock";$("days-fields").hidden=state.scale!=="days";
  const s=sheet();
  if(state.scale==="clock"){$("clock-deadline").value=s.deadline;$("clock-buffer").value=s.buffer;}
  else{$("days-deadline").value=s.dueDate;$("daily-limit").value=s.dailyLimit;$("reserve-days").value=s.reserveDays;
    document.querySelectorAll("[data-off-day]").forEach(e=>e.checked=(s.offDays||[]).includes(Number(e.value)));}
  $("new-task-name").placeholder=state.mode==="study"?"教科・学習内容を追加":"やることを追加";
  $("study-disclaimer").hidden=state.mode!=="study";
  renderTasks();renderPlan();
}
function renderTasks(){
  const tasks=sheet().tasks;
  $("task-count").textContent=tasks.filter(x=>!x.done).length+"件 残り";
  if(!tasks.length){$("task-list").innerHTML='<li class="empty-state">まだ作業がありません。下の欄から追加できます。</li>';return;}
  $("task-list").innerHTML=tasks.map((t,i)=>{
    const name=esc(t.name);
    return '<li class="task-row '+(t.done?"is-done":"")+'">'+
      '<label class="task-checkbox" title="完了を記録"><input type="checkbox" data-task-field="done" data-index="'+i+'" '+(t.done?"checked":"")+' aria-label="'+name+'を完了"></label>'+
      '<label class="task-edit"><span class="visually-hidden">作業名</span><input type="text" maxlength="80" data-task-field="name" data-index="'+i+'" value="'+name+'"></label>'+
      '<label class="task-duration"><span class="visually-hidden">所要時間（分）</span><input type="number" min="1" max="1440" data-task-field="minutes" data-index="'+i+'" value="'+Number(t.minutes)+'"> 分</label>'+
      '<span class="task-controls">'+
      '<button type="button" class="icon-button" data-task-action="up" data-index="'+i+'" aria-label="'+name+'を上へ" '+(i===0?"disabled":"")+'>↑</button>'+
      '<button type="button" class="icon-button" data-task-action="down" data-index="'+i+'" aria-label="'+name+'を下へ" '+(i===tasks.length-1?"disabled":"")+'>↓</button>'+
      '<button type="button" class="icon-button" data-task-action="remove" data-index="'+i+'" aria-label="'+name+'を削除">×</button>'+
      '</span></li>';
  }).join("");
}
function notice(html){$("notice").hidden=!html;$("notice").innerHTML=html||"";}
function renderPlan(){
  const data=state.scale==="clock"?clockPlan(sheet()):daysPlan(sheet());
  if(data.error){
    $("result-label").textContent="入力を確認してください";$("result-main").textContent="—";
    $("result-sub").textContent=data.error;$("metrics").innerHTML="";
    $("timeline").innerHTML='<div class="empty-state">日付や時間を見直してください。</div>';
    notice("");$("timer-area").hidden=true;return;
  }
  if(state.scale==="clock")clockView(data);else daysView(data);
  timerView();
}
function metrics(items){$("metrics").innerHTML=items.map(x=>'<span class="metric">'+x+'</span>').join("");}
function clockView(plan){
  const done=!plan.remainingCount;
  $("result-label").textContent=done?"すべての作業が完了":"ここから始めれば間に合う";
  $("result-main").textContent=done?"完了！":hhmm(plan.start);
  $("result-sub").textContent=done?"必要な作業はすべて完了しています。":"終了 "+stamp(plan.due)+" ／ 開始 "+stamp(plan.start);
  metrics(["残り <strong>"+plan.remainingCount+"件</strong>","作業 <strong>"+minutesText(plan.work)+"</strong>","予備 <strong>"+plan.buffer+"分</strong>"]);
  if(!done&&plan.deficit>0)notice("<strong>今から始めると約"+plan.deficit+"分足りません。</strong>"+
    "所要時間を勝手に短縮しません。終了時刻の変更も選べます。<br>"+
    '<button type="button" data-action="extend">終了を '+esc(stamp(plan.suggestedDue))+" に変更する</button>");
  else notice("");
  $("timeline-title").textContent="時間ごとの予定";$("timeline-hint").textContent="完了にすると残りを再計算";
  $("timeline").innerHTML=plan.items.length?plan.items.map(item=>
    '<div class="timeline-item"><div class="timeline-time">'+esc(stamp(item.start))+'<br>〜 '+esc(stamp(item.end))+'</div>'+
    '<div class="timeline-card '+(item.buffer?"is-buffer":"")+'"><div><strong>'+esc(item.name)+'</strong><small>'+item.minutes+'分</small></div>'+
    (item.buffer?'<span class="tag">余裕時間</span>':'<button type="button" class="go-button" data-start-task="'+esc(item.taskId)+'">開始 ▶</button>')+
    "</div></div>").join(""):'<div class="empty-state">すべて完了しました。おつかれさまでした。</div>';
}
function daysView(plan){
  const done=!plan.remainingCount;
  $("result-label").textContent=done?"すべての作業が完了":"一日の作業目安";
  $("result-main").textContent=done?"完了！":plan.target?minutesText(plan.target):"予定なし";
  $("result-sub").textContent="締切 "+prettyDate(sheet().dueDate)+" ／ "+plan.workingDays+"日で計画";
  metrics(["残り <strong>"+minutesText(plan.total)+"</strong>","作業日 <strong>"+plan.workingDays+"日</strong>","予備日 <strong>"+plan.reserveDays+"日</strong>"]);
  if(plan.missing>0)notice("<strong>"+minutesText(plan.missing)+"が割り当てられません。</strong>1日あたりの時間、予備日、休む曜日、締切のいずれかを見直してください。作業は自動的には削除されません。");
  else notice("");
  $("timeline-title").textContent="日ごとの予定";$("timeline-hint").textContent="今日から締切日まで";
  $("timeline").innerHTML=plan.days.map(d=>{
    const label=d.rest?"お休み":d.reserve?"予備日":d.used===0?"空きの日":minutesText(d.used);
    const entries=d.items.map(item=>'<div><strong>'+esc(item.name)+'</strong><small>'+item.minutes+'分</small></div>').join("");
    const empty='<strong>'+label+'</strong><small>'+(d.reserve?"遅れたときのために確保":d.rest?"計画を入れない曜日":"作業を割り当てていません")+'</small>';
    return '<div class="timeline-item"><div class="timeline-time">'+esc(prettyDate(d.key))+'</div>'+
      '<div class="timeline-card '+(!d.items.length?"is-rest":"")+'"><div>'+(entries||empty)+'</div>'+
      '<span class="tag">'+(d.items.length?label:"")+"</span></div></div>";
  }).join("")||'<div class="empty-state">割り当てられる日がありません。</div>';
}
const left=t=>Math.max(0,t.running?Math.ceil((t.endMs-Date.now())/1000):t.remainingSeconds);
function timerView(){
  const root=$("timer-area"),t=state.timer;
  if(!t||t.key!==scope()||state.scale!=="clock"){root.hidden=true;root.innerHTML="";return;}
  const item=sheet().tasks.find(x=>x.id===t.taskId&&!x.done);
  if(!item){state.timer=null;save();root.hidden=true;root.innerHTML="";return;}
  const secs=left(t);root.hidden=false;
  root.innerHTML='<div class="timer-top">取り組み中：'+esc(item.name)+'</div>'+
    '<div class="timer-face"><strong id="timer-clock">'+two(Math.floor(secs/60))+":"+two(secs%60)+'</strong><div class="timer-done">'+
    '<button type="button" data-action="'+(t.running?"pause":"resume")+'">'+(t.running?"一時停止":secs===0?"5分追加":"再開")+'</button>'+
    '<button type="button" data-action="complete">完了 ✓</button></div></div>'+
    (secs===0?'<div class="timer-top">時間になりました。完了にするか時間を追加できます。</div>':"");
}
function onTick(){
  const t=state.timer;if(!t)return;
  if(t.running&&left(t)===0){t.running=false;t.remainingSeconds=0;save();timerView();return;}
  if(t.key===scope()&&$("timer-clock")){const s=left(t);$("timer-clock").textContent=two(Math.floor(s/60))+":"+two(s%60);}
}
function beginTimer(taskId){
  const item=sheet().tasks.find(t=>t.id===taskId&&!t.done);if(!item)return;
  if(state.timer&&state.timer.key===scope()&&state.timer.taskId!==taskId&&!confirm("今のタイマーを終了して別の作業を始めますか？"))return;
  const seconds=Number(item.minutes)*60;
  state.timer={key:scope(),taskId,running:true,endMs:Date.now()+seconds*1000,remainingSeconds:seconds};
  save();timerView();$("timer-area").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function timerAction(action){
  const t=state.timer;if(!t)return;
  if(action==="pause"){t.remainingSeconds=left(t);t.running=false;}
  if(action==="resume"){t.remainingSeconds=t.remainingSeconds===0?300:t.remainingSeconds;t.endMs=Date.now()+t.remainingSeconds*1000;t.running=true;}
  if(action==="complete"){
    const mode=t.key.split(":")[0],item=state.sheets[mode]?.clock?.tasks.find(x=>x.id===t.taskId);
    if(item)item.done=true;state.timer=null;save();renderTasks();renderPlan();return;
  }
  save();timerView();
}
document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{state.mode=b.dataset.mode;save();renderEditor();}));
document.querySelectorAll("[data-scale]").forEach(b=>b.addEventListener("click",()=>{state.scale=b.dataset.scale;save();renderEditor();}));
["clock-deadline","clock-buffer","days-deadline","daily-limit","reserve-days"].forEach(x=>$(x).addEventListener("change",readInputs));
document.querySelectorAll("[data-off-day]").forEach(x=>x.addEventListener("change",readInputs));
$("add-task-form").addEventListener("submit",ev=>{
  ev.preventDefault();const name=$("new-task-name").value.trim(),minutes=Number($("new-task-minutes").value);
  if(!name||!Number.isInteger(minutes)||minutes<1||minutes>1440){alert("作業名と1〜1440分の時間を入力してください。");return;}
  sheet().tasks.push(newTask(name,minutes));$("new-task-name").value="";save();renderTasks();renderPlan();$("new-task-name").focus();
});
$("task-list").addEventListener("change",ev=>{
  const f=ev.target.dataset.taskField;if(!f)return;const item=sheet().tasks[Number(ev.target.dataset.index)];if(!item)return;
  if(f==="done"){item.done=ev.target.checked;if(state.timer?.key===scope()&&state.timer.taskId===item.id&&item.done)state.timer=null;}
  if(f==="name")item.name=ev.target.value.trim()||item.name;
  if(f==="minutes"){const n=Number(ev.target.value);if(Number.isInteger(n)&&n>=1&&n<=1440)item.minutes=n;}
  save();renderTasks();renderPlan();
});
$("task-list").addEventListener("click",ev=>{
  const b=ev.target.closest("[data-task-action]");if(!b)return;
  const ts=sheet().tasks,i=Number(b.dataset.index),action=b.dataset.taskAction;
  if(!Number.isInteger(i)||i<0||i>=ts.length)return;
  if(action==="remove"){if(!confirm("「"+ts[i].name+"」を削除しますか？"))return;
    if(state.timer?.key===scope()&&state.timer.taskId===ts[i].id)state.timer=null;ts.splice(i,1);}
  else if(action==="up"&&i>0)[ts[i-1],ts[i]]=[ts[i],ts[i-1]];
  else if(action==="down"&&i<ts.length-1)[ts[i],ts[i+1]]=[ts[i+1],ts[i]];
  else return;
  save();renderTasks();renderPlan();
});
$("timeline").addEventListener("click",ev=>{const b=ev.target.closest("[data-start-task]");if(b)beginTimer(b.dataset.startTask);});
$("timer-area").addEventListener("click",ev=>{const b=ev.target.closest("[data-action]");if(b)timerAction(b.dataset.action);});
$("notice").addEventListener("click",ev=>{
  const b=ev.target.closest("[data-action]");if(b?.dataset.action!=="extend")return;
  const plan=clockPlan(sheet());if(plan.error)return;
  sheet().deadline=datetimeLocal(plan.suggestedDue);save();renderEditor();
});
$("example-button").addEventListener("click",()=>{
  if(!confirm("この計画をサンプルに戻しますか？"))return;
  state.sheets[state.mode][state.scale]=newSheet(state.mode,state.scale);
  if(state.timer?.key===scope())state.timer=null;
  save();renderEditor();
});
$("export-button").addEventListener("click",()=>{
  const json=JSON.stringify({application:"reverse-planner",exportedAt:new Date().toISOString(),state},null,2);
  const url=URL.createObjectURL(new Blob([json],{type:"application/json;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="reverse-planner-"+dateKey(new Date())+".json";
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
renderEditor();
setInterval(onTick,1000);
setInterval(()=>{if(document.activeElement?.tagName!=="INPUT")renderPlan();},60000);
