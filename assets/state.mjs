// v0.2 preserves the complete v0.1 schema, including all four sheets and timer.
import {dateKey, datetimeLocal, addCalendarDays} from "./core.mjs";
export const STORE_KEY = "reverse-planner:prototype:v1";
export const SCREENS = ["home","setup","plan","run"];
export const MODES = ["life","study"];
export const SCALES = ["clock","days"];
export const task = (name,minutes,id) => ({id:id || ("t-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)),name,minutes,done:false});
export const scope = state => state.mode+":"+state.scale;
export const sheet = state => state.sheets[state.mode][state.scale];

export function freshSheet(scale,now=new Date()) {
  const d = new Date(now);
  d.setSeconds(0,0);
  d.setMinutes(Math.ceil(d.getMinutes()/15)*15);
  d.setHours(d.getHours()+2);
  return scale==="clock"
    ? {deadline:datetimeLocal(d),buffer:10,tasks:[]}
    : {dueDate:dateKey(addCalendarDays(now,7)),dailyLimit:60,reserveDays:1,offDays:[0],tasks:[]};
}
export function initialState(now=new Date()) {
  return {schema:1,mode:"life",scale:"clock",
    sheets:{life:{clock:freshSheet("clock",now),days:freshSheet("days",now)},
            study:{clock:freshSheet("clock",now),days:freshSheet("days",now)}},timer:null};
}
export function isV1State(value) {
  return Boolean(value && value.schema===1 && MODES.includes(value.mode) && SCALES.includes(value.scale) &&
    MODES.every(mode=>SCALES.every(scale=>{
      const s=value.sheets?.[mode]?.[scale];
      return s && Array.isArray(s.tasks) &&
        s.tasks.every(t=>t && typeof t.id==="string" && typeof t.name==="string" && Number.isInteger(Number(t.minutes)) && Number(t.minutes)>=1 && Number(t.minutes)<=1440 && typeof t.done==="boolean");
    })));
}
export function loadState(raw,now=new Date()) {
  if(raw==null) return {state:initialState(now),status:"new"};
  try {
    const parsed=JSON.parse(raw);
    if(isV1State(parsed)) return {state:parsed,status:"existing"};
  } catch (_) { /* Do not overwrite unreadable existing data. */ }
  return {state:initialState(now),status:"invalid",original:raw};
}
export function screenFromHash(hash) {
  const name=String(hash||"").replace(/^#/,"");
  return SCREENS.includes(name)?name:"home";
}
export function hasAnyTasks(state) {
  return MODES.some(m=>SCALES.some(s=>state.sheets[m][s].tasks.length>0));
}
export function activeCount(state) {
  return sheet(state).tasks.filter(x=>!x.done).length;
}
export function validateSetup(state,now=new Date()) {
  const s=sheet(state);
  if(!s.tasks.length) return "やることを1つ以上追加してください。";
  if(s.tasks.some(t=>!t.name?.trim()||!Number.isInteger(Number(t.minutes))||Number(t.minutes)<1||Number(t.minutes)>1440))
    return "作業名と所要時間（1〜1440分）を確認してください。";
  if(state.scale==="clock") {
    const deadline=new Date(s.deadline);
    if(!Number.isFinite(deadline.getTime())) return "終わる日時を入力してください。";
    if(!Number.isInteger(Number(s.buffer)) || Number(s.buffer)<0 || Number(s.buffer)>240)
      return "余裕時間は0〜240分にしてください。";
  } else {
    const due = new Date((s.dueDate||"")+"T12:00:00");
    const today = new Date(dateKey(now)+"T12:00:00");
    if(!Number.isFinite(due.getTime()) || dateKey(due)!==s.dueDate || due < today)
      return "締切日は今日以降の日付にしてください。";
    const n=Math.round((Date.UTC(due.getFullYear(),due.getMonth(),due.getDate())-
      Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/86400000)+1;
    if(n>120) return "試作版は120日以内の計画に対応しています。";
    if(!Number.isInteger(Number(s.dailyLimit))||Number(s.dailyLimit)<5||Number(s.dailyLimit)>720)
      return "1日の作業時間は5〜720分にしてください。";
    if(!Number.isInteger(Number(s.reserveDays))||Number(s.reserveDays)<0||Number(s.reserveDays)>30)
      return "予備日は0〜30日にしてください。";
  }
  return "";
}
export const PRESETS = [
  {id:"daily",mode:"life",label:"家事・支度",icon:"☕",clock:[["買い物",20],["夕食づくり",35],["片付け",15]],days:[["持ち物を決める",30],["必要なものを買う",90],["準備する",120]]},
  {id:"trip",mode:"life",label:"おでかけ",icon:"✿",clock:[["着替える",15],["荷物を確認",10],["移動の準備",15]],days:[["調べる",45],["予約・確認",30],["荷造り",90]]},
  {id:"homework",mode:"study",label:"宿題",icon:"✎",clock:[["国語",20],["算数・数学",25],["確認",10]],days:[["課題を整理",30],["ワーク",120],["見直し",30]]},
  {id:"exam",mode:"study",label:"テスト勉強",icon:"▦",clock:[["数学",25],["英語",25],["ふりかえり",10]],days:[["数学ワーク",180],["英語",150],["理科",120],["社会",90]]}
];
export function applyPreset(state,preset,ids) {
  if(!preset) return state;
  // The selected mode is explicit. Do not erase other modes/scales.
  state.mode=preset.mode;
  const entries=preset[state.scale];
  state.sheets[state.mode][state.scale].tasks=entries.map(([name,minutes])=>task(name,minutes,ids?.()));
  return state;
}
