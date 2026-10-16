import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  STORE_KEY,initialState,loadState,isV1State,screenFromHash,
  validateSetup,hasAnyTasks,activeCount,sheet,applyPreset,PRESETS,task
} from "../assets/state.mjs";

const now = new Date("2026-10-17T12:00:00");
const oldFixture = () => {
  const state=initialState(now);
  state.mode="study";
  state.scale="days";
  state.sheets.study.days.tasks=[{id:"legacy-1",name:"数学ワーク",minutes:135,done:false}];
  state.sheets.life.clock.tasks=[{id:"legacy-2",name:"荷物の用意",minutes:20,done:true}];
  state.sheets.life.clock.buffer=25;
  state.timer={key:"life:clock",taskId:"legacy-2",running:false,remainingSeconds:95};
  state.extraFutureField={important:"do-not-drop"};
  return state;
};

test("v0.1 key and four sheets are preserved verbatim",()=>{
  assert.equal(STORE_KEY,"reverse-planner:prototype:v1");
  const original=oldFixture();
  const restored=loadState(JSON.stringify(original),now);
  assert.equal(restored.status,"existing");
  assert.deepEqual(restored.state,original);
  assert.equal(restored.state.sheets.life.clock.buffer,25);
  assert.equal(restored.state.sheets.study.days.tasks[0].minutes,135);
  assert.equal(restored.state.timer.remainingSeconds,95);
});
test("first-time users start with an empty plan",()=>{
  const result=loadState(null,now);
  assert.equal(result.status,"new");
  assert.equal(hasAnyTasks(result.state),false);
  assert.equal(activeCount(result.state),0);
});
test("unreadable previous state is not silently discarded",()=>{
  const corrupted='{"schema":1,"sheets":';
  const result=loadState(corrupted,now);
  assert.equal(result.status,"invalid");
  assert.equal(result.original,corrupted);
  assert.equal(hasAnyTasks(result.state),false);
});
test("all screen names are validated and unknown hash returns home",()=>{
  for(const screen of ["home","setup","plan","run"]) assert.equal(screenFromHash("#"+screen),screen);
  assert.equal(screenFromHash("#../../something"),"home");
});
test("v0.1 names, minutes and done fields validated",()=>{
  const state=oldFixture();
  assert.ok(isV1State(state));
  state.sheets.study.days.tasks[0].minutes=-2;
  assert.equal(isV1State(state),false);
});
test("template only replaces its destination sheet",()=>{
  const state=oldFixture();
  state.scale="clock";
  const previous=structuredClone(state.sheets.study.days);
  let n=0;
  applyPreset(state,PRESETS.find(p=>p.id==="daily"),()=>String(++n));
  assert.equal(state.mode,"life");
  assert.equal(state.sheets.life.clock.tasks.length,3);
  assert.deepEqual(state.sheets.study.days,previous);
  assert.equal(state.extraFutureField.important,"do-not-drop");
});
test("empty plan and date validation show actionable error",()=>{
  const state=initialState(now);
  assert.match(validateSetup(state,now),/1つ以上/);
  state.sheets.life.clock.tasks.push(task("お風呂",15,"task-one"));
  assert.equal(validateSetup(state,now),"");
  state.sheets.life.clock.buffer=999;
  assert.match(validateSetup(state,now),/0〜240/);
});
test("preserved study plan stays valid without changing another mode",()=>{
  const state=oldFixture();
  state.sheets.study.days.dueDate="2026-10-20";
  assert.equal(validateSetup(state,now),"");
  assert.equal(state.sheets.life.clock.tasks[0].done,true);
});

test("four screens and actionable labels exist in the HTML",()=>{
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  for(const key of ["home","setup","plan","run"]){
    assert.ok(html.includes('id="screen-'+key+'"'),"missing screen "+key);
  }
  for(const id of ["clock-deadline","days-deadline","task-list","make-plan",
    "start-plan","timer-area","export-button","backup-raw","reset-corrupt"]){
    assert.ok(html.includes('id="'+id+'"'),"missing control "+id);
  }
});
test("pixel button and reduced motion CSS are present",()=>{
  const css=readFileSync(new URL("../assets/app.css",import.meta.url),"utf8");
  assert.match(css,/\:active/);
  assert.match(css,/translateY\(3px\)/);
  assert.match(css,/prefers-reduced-motion\s*:\s*reduce/);
});
