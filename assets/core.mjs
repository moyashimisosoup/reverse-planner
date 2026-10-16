// Reverse Planner: deterministic, dependency-free planning engine.
// Dates are interpreted in the browser's local time zone.
export function dateKey(date) {
  const d = new Date(date);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
export function datetimeLocal(date) {
  const d = new Date(date);
  return dateKey(d) + "T" + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
export function dateAtNoon(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key))) return null;
  const [y, m, d] = key.split("-").map(Number);
  const result = new Date(y, m - 1, d, 12, 0);
  return dateKey(result) === key ? result : null;
}
export function addCalendarDays(date, offset) {
  const d = new Date(date);
  d.setDate(d.getDate() + offset);
  return d;
}
export function activeTasks(tasks) {
  return (Array.isArray(tasks) ? tasks : []).filter(t => !t.done && Number.isFinite(Number(t.minutes)) && Number(t.minutes) > 0);
}
export function totalMinutes(tasks) {
  return activeTasks(tasks).reduce((sum, task) => sum + Number(task.minutes), 0);
}
export function clockPlan({deadline, tasks = [], buffer = 0}, now = new Date()) {
  const due = new Date(deadline);
  if (!Number.isFinite(due.getTime())) return {error: "終了日時を入力してください。"};
  const slack = Number(buffer);
  if (!Number.isInteger(slack) || slack < 0 || slack > 240) return {error: "予備時間は0〜240分で指定してください。"};
  const remaining = activeTasks(tasks);
  const work = totalMinutes(tasks);
  const effectiveSlack = remaining.length ? slack : 0;
  const required = work + effectiveSlack;
  let pointer = due.getTime() - required * 60000;
  const items = remaining.map(task => {
    const start = new Date(pointer);
    pointer += Number(task.minutes) * 60000;
    return {taskId: task.id, name: task.name, minutes: Number(task.minutes), start, end: new Date(pointer)};
  });
  if (effectiveSlack) items.push({taskId: "__buffer__", name: "予備・調整時間", minutes: effectiveSlack, start: new Date(pointer), end: due, buffer: true});
  const start = new Date(due.getTime() - required * 60000);
  const deficit = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / 60000));
  const suggestedDue = new Date(now.getTime() + required * 60000);
  if (suggestedDue.getSeconds() || suggestedDue.getMilliseconds()) {
    suggestedDue.setMinutes(suggestedDue.getMinutes() + 1);
    suggestedDue.setSeconds(0, 0);
  }
  return {due, start, work, buffer: effectiveSlack, required, items, remainingCount: remaining.length, deficit,
    suggestedDue};
}
export function daysPlan({dueDate, tasks = [], dailyLimit = 60, reserveDays = 0, offDays = [0]}, today = new Date()) {
  const due = dateAtNoon(dueDate);
  if (!due) return {error: "締切日を入力してください。"};
  const first = dateAtNoon(dateKey(today));
  if (due < first) return {error: "締切日は今日以降にしてください。"};
  const count = Math.round((Date.UTC(due.getFullYear(), due.getMonth(), due.getDate()) -
    Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())) / 86400000) + 1;
  if (count > 120) return {error: "試作版では120日以内の計画に対応しています。"};
  const limit = Number(dailyLimit);
  const reserve = Number(reserveDays);
  if (!Number.isInteger(limit) || limit < 5 || limit > 720) return {error: "1日の作業可能時間は5〜720分にしてください。"};
  if (!Number.isInteger(reserve) || reserve < 0 || reserve > 30) return {error: "予備日は0〜30日にしてください。"};
  const holidays = Array.isArray(offDays) ? offDays.map(Number) : [];
  const days = Array.from({length: count}, (_, i) => {
    const current = addCalendarDays(first, i);
    return {key: dateKey(current), weekday: current.getDay(), rest: holidays.includes(current.getDay()), reserve: false, items: [], used: 0};
  });
  const usable = days.filter(d => !d.rest);
  if (reserve > 0) usable.slice(-reserve).forEach(d => {d.reserve = true;});
  const working = usable.filter(d => !d.reserve);
  const remaining = activeTasks(tasks);
  const required = totalMinutes(tasks);
  const capacity = working.length * limit;
  const target = working.length ? Math.min(limit, Math.ceil(required / working.length / 5) * 5) : 0;
  let index = 0;
  let taskRemaining = remaining[0] ? Number(remaining[0].minutes) : 0;
  let allocated = 0;
  for (const day of working) {
    let allowance = target;
    while (allowance > 0 && index < remaining.length) {
      const task = remaining[index];
      const take = Math.min(allowance, taskRemaining);
      if (take <= 0) break;
      day.items.push({taskId: task.id, name: task.name, minutes: take});
      day.used += take;
      allocated += take;
      allowance -= take;
      taskRemaining -= take;
      if (taskRemaining === 0) {
        index++;
        taskRemaining = remaining[index] ? Number(remaining[index].minutes) : 0;
      }
    }
  }
  return {days, total: required, allocated, missing: Math.max(0, required - allocated), capacity,
    workingDays: working.length, restDays: days.filter(d => d.rest).length, reserveDays: usable.filter(d => d.reserve).length,
    target, remainingCount: remaining.length};
}
