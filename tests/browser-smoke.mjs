// Browser-level smoke tests; run with: node tests/browser-smoke.mjs
// Requires Playwright and a locally installed Chrome/Chromium.
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {resolve, extname} from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const base=resolve(fileURLToPath(new URL("..",import.meta.url)));
const contentTypes={".html":"text/html;charset=utf-8",".css":"text/css;charset=utf-8",".js":"text/javascript;charset=utf-8",".mjs":"text/javascript;charset=utf-8"};
const server=createServer(async (req,res)=>{
  const url=new URL(req.url,"http://127.0.0.1");
  const relative=url.pathname==="/"?"/index.html":url.pathname;
  const filepath=resolve(base,"."+relative);
  if(!filepath.startsWith(base+"/")){res.writeHead(403);res.end();return;}
  try{
    const bytes=await readFile(filepath);
    res.writeHead(200,{"content-type":contentTypes[extname(filepath)]||"application/octet-stream","cache-control":"no-store"});
    res.end(bytes);
  }catch(_){res.writeHead(404);res.end("Not found");}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const host="http://127.0.0.1:"+server.address().port;
await mkdir("test-screenshots",{recursive:true});
const cases=[];
const checks=(condition,title)=>{assert.ok(condition,title);cases.push(title);};
const yyyyDate=d=>{
  const p=n=>String(n).padStart(2,"0");
  return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate());
};
const yyyyTime=d=>yyyyDate(d)+"T"+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
let browser;
try {
  browser=await chromium.launch({channel:"chrome",headless:true,args:["--no-sandbox"]});
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(host+"/");
  checks(await page.locator("#screen-home").isVisible(),"Initial home visible");
  checks(await page.locator(".choice-card").count()===2,"Home presents two choices");
  await page.screenshot({path:"test-screenshots/home-390.png",fullPage:true});
  const widths=[320,390,1280];
  for(const width of widths) {
    await page.setViewportSize({width,height:860});
    const sizes=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));
    checks(sizes.doc<=sizes.view+2,"Home has no horizontal overflow at "+width+"px: "+JSON.stringify(sizes));
    if(width===320||width===1280)await page.screenshot({path:"test-screenshots/home-"+width+".png",fullPage:true});
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-choose-scale="clock"]').click();
  await page.waitForURL("**/#setup");
  await page.locator("#screen-setup").waitFor({state:"visible"});
  checks(await page.locator("#screen-setup").isVisible(),"Clock setup appears");
  await page.screenshot({path:"test-screenshots/setup-mobile.png",fullPage:true});
  const deadline=new Date(Date.now()+5*3600000);
  await page.locator("#clock-deadline").fill(yyyyTime(deadline));
  await page.locator("#new-task-name").fill("ためしに勉強");
  await page.locator('[data-minutes="30"]').click();
  checks(await page.locator("#new-task-minutes").inputValue()==="30","Duration chips set minutes");
  await page.locator(".add-submit").click();
  checks(await page.locator("#task-list .task-row").count()===1,"Adding task shows one card");
  await page.screenshot({path:"test-screenshots/task-added-mobile.png",fullPage:true});
  await page.locator("#make-plan").click();
  await page.waitForURL("**/#plan");
  await page.locator("#screen-plan").waitFor({state:"visible"});
  checks(await page.locator("#screen-plan").isVisible(),"Clock plan appears");
  await page.screenshot({path:"test-screenshots/clock-plan-mobile.png",fullPage:true});
  checks((await page.locator("#result-main").textContent()).includes(":"),"Start time displayed");
  await page.locator("#start-plan").click();
  await page.waitForURL("**/#run");
  await page.locator("#screen-run").waitFor({state:"visible"});
  checks(await page.locator("#focus-task").textContent()==="ためしに勉強","Run focuses on current task");
  await page.locator('[data-run="start"]').click();
  checks(await page.locator("#timer-clock").isVisible(),"Timer starts");
  await page.screenshot({path:"test-screenshots/timer-mobile.png",fullPage:true});
  await page.locator('[data-run="done"]').click();
  checks((await page.locator("#focus-task").textContent()).includes("全部できた"),"Task marked done by explicit click");
  await page.reload();
  checks((await page.locator("#focus-task").textContent()).includes("全部できた"),"Done state survives reload");
  const afterClock=await page.evaluate(()=>JSON.parse(localStorage.getItem("reverse-planner:prototype:v1")));
  checks(afterClock.sheets.life.clock.tasks[0].done===true,"v0.1 storage key preserves completion");
  await page.goto(host+"/#home");
  await page.locator('[data-choose-scale="days"]').click();
  await page.waitForURL("**/#setup");
  await page.locator("#screen-setup").waitFor({state:"visible"});
  await page.locator('[data-preset="exam"]').click();
  checks(await page.locator("#task-list .task-row").count()===4,"Study template populates tasks");
  await page.locator("#advanced-settings summary").click();
  await page.locator("#daily-limit").fill("180");
  await page.locator("#make-plan").click();
  await page.waitForURL("**/#plan");
  await page.locator("#screen-plan").waitFor({state:"visible"});
  checks(await page.locator("#timeline .timeline-item").count()>0,"Daily plan renders calendar items");
  await page.screenshot({path:"test-screenshots/days-plan-mobile.png",fullPage:true});
  checks(await page.locator("#start-plan").isEnabled(),"Feasible daily plan can start");
  await page.locator("#start-plan").click();
  await page.waitForURL("**/#run");
  await page.locator("#screen-run").waitFor({state:"visible"});
  checks(await page.locator("#screen-run").isVisible(),"Daily run screen accessible");
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("reverse-planner:prototype:v1")));
  checks(stored.sheets.life.clock.tasks[0].done,"Clock data survives switching to study");
  checks(errors.length===0,"Browser JavaScript errors: "+errors.join(" / "));
  await ctx.close();

  const legacyCtx=await browser.newContext({viewport:{width:375,height:812}});
  const legacyPage=await legacyCtx.newPage();
  await legacyPage.addInitScript(()=>{
    const d=new Date(Date.now()+4*3600000),p=n=>String(n).padStart(2,"0");
    const time=d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes());
    const date=time.slice(0,10);
    const emptyClock={deadline:time,buffer:10,tasks:[]};
    const emptyDays={dueDate:date,dailyLimit:80,reserveDays:0,offDays:[],tasks:[]};
    const state={schema:1,mode:"life",scale:"clock",sheets:{
      life:{clock:{deadline:time,buffer:15,tasks:[{id:"legacy-one",name:"古いデータ",minutes:20,done:false}]},days:emptyDays},
      study:{clock:emptyClock,days:emptyDays}},timer:null,extraFutureField:{keep:"yes"}};
    localStorage.setItem("reverse-planner:prototype:v1",JSON.stringify(state));
  });
  await legacyPage.goto(host+"/#home");
  checks(await legacyPage.locator("#resume-card").isVisible(),"Legacy v0.1 data enables resume");
  await legacyPage.locator("#resume-button").click();
  await legacyPage.waitForURL("**/#plan");
  await legacyPage.locator("#screen-plan").waitFor({state:"visible"});
  checks((await legacyPage.locator("#timeline").textContent()).includes("古いデータ"),"Existing task shown in plan");
  checks((await legacyPage.evaluate(()=>JSON.parse(localStorage.getItem("reverse-planner:prototype:v1")).extraFutureField.keep))==="yes","Unknown legacy fields preserved");
  await legacyCtx.close();

  const reduceCtx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
  const reducePage=await reduceCtx.newPage();
  await reducePage.goto(host+"/");
  const animation=await reducePage.locator("#screen-home").evaluate(el=>getComputedStyle(el).animationDuration);
  checks(animation==="1e-05s"||animation==="0.00001s"||animation==="0s","Reduced motion turns screen animations off ("+animation+")");
  await reduceCtx.close();
  console.log("BROWSER SMOKE: "+cases.length+" checks passed.");
  cases.forEach((label,i)=>console.log(String(i+1).padStart(2,"0")+" "+label));
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
