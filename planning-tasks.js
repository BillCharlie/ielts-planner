(function (root) {
  const VERSION = 1;
  const tracks = ["research", "ielts", "external", "application"];
  const monthOf = (date) => date.slice(0, 7).replace("-", "/");
  const validDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  const unique = (values) => [...new Set(values)].sort();

  function lanesOf(task) {
    if (!task) return [];
    const source = Array.isArray(task.lanes) ? task.lanes : [task.lane];
    return unique(source.map((lane) => String(lane || "")).filter(Boolean));
  }

  function normalize(task) {
    const lanes = lanesOf(task);
    return {
      id: String(task.id), module: tracks.includes(task.module) ? task.module : "research",
      lane: lanes[0] || "", lanes, text: String(task.text || ""), done: Boolean(task.done),
      months: unique((task.months || []).filter((month) => /^\d{4}\/\d{2}$/.test(month))),
      dates: unique((task.dates || []).filter(validDate)),
    };
  }

  function migrate(candidate, seeds) {
    if (candidate.planningTasksVersion === VERSION) {
      candidate.planningTasks = (candidate.planningTasks || []).map(normalize);
      return candidate;
    }
    const tasks = [];
    const add = (task) => {
      const normalized = normalize(task);
      const existing = tasks.find((item) => item.id === normalized.id);
      if (existing) {
        existing.dates = unique([...existing.dates, ...normalized.dates]);
        existing.months = unique([...existing.months, ...normalized.months]);
        setLanes(existing, [...lanesOf(existing), ...normalized.lanes]);
        return existing;
      }
      tasks.push(normalized);
      return normalized;
    };
    // Only the main lane contents become editable tasks; the old fixed checklist is retired.
    for (const row of seeds) {
      tracks.forEach((track, index) => {
        const content = row[index + 2];
        for (const [lane, text] of typeof content === "string" ? [["", content]] : Object.entries(content || {})) {
          if (text) add({ id: `monthly:${row[0]}:${track}:${lane}`, module: track, lane, text, months: [row[0]] });
        }
      });
    }
    for (const node of candidate.planNodes || []) {
      add({ ...node, months: node.date ? [] : [node.month], dates: node.date ? [node.date] : [] });
    }
    const catalog = Object.values(candidate.moduleCatalog || {}).flat();
    const legacyTask = (item) => ({
      id: `catalog:${item.id}`, module: ["课程", "书报课程", "组会", "研讨会"].includes(item.module) ? "external" : "research",
      lane: ["制程", "TCAD", "Cadence", "课程", "书报课程", "组会", "研讨会"].includes(item.module) ? item.module : "制程",
      text: item.name,
    });
    for (const item of catalog) {
      if (!item.locked && !String(item.id).startsWith("default")) add(legacyTask(item));
    }
    for (const row of candidate.planRows || []) {
      if (!validDate(row.date) || /休息|旅行/.test(row.dayType || "") || !row.projectType || row.projectType === "休息") continue;
      const itemId = candidate.modulePlans?.[row.date]?.itemId || row.projectItemId;
      const item = catalog.find((entry) => entry.id === itemId);
      if (item && !item.locked) {
        add({ ...legacyTask(item), dates: [row.date] });
      } else if (row.projectPlan) {
        const module = row.projectType === "学务" ? "external" : "research";
        const lane = module === "external" ? row.projectModule || "学务" : row.projectModule === "TCAD" ? "TCAD" : "制程";
        const existing = tasks.find((task) => task.module === module && task.lane === lane && task.text === row.projectPlan);
        add({ id: existing?.id || `legacy-day:${row.date}`, module, lane, text: row.projectPlan, dates: [row.date] });
      }
    }
    candidate.planningTasks = tasks;
    candidate.planningTasksVersion = VERSION;
    return candidate;
  }

  function forMonth(tasks, month, module) {
    return tasks.filter((task) => task.module === module && (task.months.includes(month) || task.dates.some((date) => monthOf(date) === month)));
  }

  function forDate(tasks, date, module) {
    return tasks.filter((task) => task.dates.includes(date) && (!module || task.module === module));
  }

  function assign(task, date) {
    if (!task || !validDate(date)) return false;
    task.dates = unique([...task.dates, date]);
    return true;
  }

  function setDates(task, dates) {
    if (!task) return [];
    task.dates = unique((dates || []).filter(validDate));
    return task.dates;
  }

  function setLanes(task, lanes) {
    if (!task) return [];
    task.lanes = unique((lanes || []).map((lane) => String(lane || "")).filter(Boolean));
    task.lane = task.lanes[0] || "";
    return task.lanes;
  }

  function inLane(task, lane) {
    const lanes = lanesOf(task);
    return lanes.length ? lanes.includes(lane) : !lane;
  }

  function moveDate(tasks, from, to, copy = false) {
    if (!validDate(to)) return;
    for (const task of forDate(tasks, from)) {
      if (!copy) task.dates = task.dates.filter((date) => date !== from);
      assign(task, to);
    }
  }

  root.PlanningTasks = { VERSION, normalize, migrate, forMonth, forDate, assign, setDates, lanesOf, setLanes, inLane, moveDate, monthOf, validDate };
})(globalThis);
