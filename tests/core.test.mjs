import test from "node:test";
import assert from "node:assert/strict";
import {clockPlan, daysPlan, datetimeLocal, dateKey, addCalendarDays} from "../assets/core.mjs";

const tasks = [
  {id: "a", name: "A", minutes: 20, done: false},
  {id: "b", name: "B", minutes: 15, done: false}
];

test("clock plan reverses time, preserves sequence and buffer", () => {
  const p = clockPlan({deadline: "2026-10-17T20:00", tasks, buffer: 10}, new Date("2026-10-17T18:00"));
  assert.equal(datetimeLocal(p.start), "2026-10-17T19:15");
  assert.deepEqual(p.items.map(x => x.name), ["A", "B", "予備・調整時間"]);
  assert.equal(p.required, 45);
});

test("clock plan displays shortage rather than shortening tasks", () => {
  const p = clockPlan({deadline: "2026-10-17T19:00", tasks, buffer: 10}, new Date("2026-10-17T19:03"));
  assert.equal(p.deficit, 48);
  assert.equal(p.required, 45);
});

test("clock plan rounds suggested deadline up to a full minute", () => {
  const p = clockPlan({deadline: "2026-10-17T18:30", tasks, buffer: 10}, new Date("2026-10-17T19:00:30"));
  assert.equal(datetimeLocal(p.suggestedDue), "2026-10-17T19:46");
});

test("completed tasks are excluded from planning", () => {
  const p = clockPlan({deadline: "2026-10-17T20:00", tasks: tasks.map(t => ({...t, done: true})), buffer: 10});
  assert.equal(p.remainingCount, 0);
  assert.equal(p.required, 0);
  assert.equal(p.items.length, 0);
});

test("zero reserve days leaves work days available", () => {
  const p = daysPlan({dueDate: "2026-10-17", tasks, dailyLimit: 20, reserveDays: 0, offDays: []}, new Date("2026-10-17T11:00"));
  assert.equal(p.workingDays, 1);
  assert.equal(p.missing, 15);
});

test("daily distribution respects reserved days and daily capacity", () => {
  const p = daysPlan({dueDate: "2026-10-20", tasks, dailyLimit: 20, reserveDays: 1, offDays: []}, new Date("2026-10-17T11:00"));
  assert.equal(p.allocated, 35);
  assert.equal(p.missing, 0);
  assert.equal(p.reserveDays, 1);
  assert.ok(p.days.every(d => d.used <= 20));
});

test("days off reduce available time", () => {
  const p = daysPlan({dueDate: "2026-10-17", tasks, dailyLimit: 20, reserveDays: 0, offDays: [6]}, new Date("2026-10-17T11:00"));
  assert.equal(p.workingDays, 0);
  assert.equal(p.missing, 35);
});

test("date-only arithmetic survives year boundary", () => {
  assert.equal(dateKey(addCalendarDays(new Date("2026-12-31T12:00:00"), 1)), "2027-01-01");
});

test("past deadline and invalid input report errors", () => {
  assert.ok(daysPlan({dueDate: "2026-10-16", tasks}, new Date("2026-10-17T12:00")).error);
  assert.ok(clockPlan({deadline: "not-a-date", tasks}).error);
});
