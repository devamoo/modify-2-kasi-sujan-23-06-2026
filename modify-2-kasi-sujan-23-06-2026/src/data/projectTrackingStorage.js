// Project Tracking Storage — localStorage-backed CRUD for daily workflow,
// photo updates, and weekly/monthly report aggregation.
//
// Keys:
//   dailyWorkflow_<proposalId>_<YYYY-MM-DD>  → { date, entries[], summary }
//   photoUpdates_<proposalId>                 → { photos[] }
//   monthlyNotes_<proposalId>_<YYYY-MM>       → string

let _seq = 0;
const uid = () => `trk_${Date.now().toString(36)}_${_seq++}`;

// ── Daily Workflow ───────────────────────────────────────────────────────────

const dwKey = (proposalId, date) => `dailyWorkflow_${proposalId}_${date}`;

export function getDailyWorkflow(proposalId, date) {
  try {
    const raw = localStorage.getItem(dwKey(proposalId, date));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDailyWorkflow(proposalId, date, data) {
  localStorage.setItem(dwKey(proposalId, date), JSON.stringify({ ...data, date }));
  window.dispatchEvent(new Event("trackingChanged"));
}

export function makeDailyEntry(roomId, roomName) {
  return {
    id: uid(),
    roomId,
    roomName,
    tasks: [],
    notes: "",
    weatherCondition: "clear",
  };
}

export function makeTask() {
  return {
    id: uid(),
    description: "",
    assignee: "",
    hours: 0,
    status: "not-started", // not-started | in-progress | done | blocked
  };
}

export function computeDailySummary(entries) {
  let totalHours = 0;
  let roomsWorked = 0;
  let tasksCompleted = 0;
  let totalTasks = 0;
  for (const e of entries) {
    let roomActive = false;
    for (const t of e.tasks || []) {
      totalTasks++;
      totalHours += Number(t.hours) || 0;
      if (t.status === "done") tasksCompleted++;
      if (t.hours > 0 || t.status !== "not-started") roomActive = true;
    }
    if (roomActive) roomsWorked++;
  }
  return { totalHours, roomsWorked, tasksCompleted, totalTasks };
}

// Get all daily workflows for a proposal in a date range (inclusive).
export function getDailyWorkflowsInRange(proposalId, startDate, endDate) {
  const results = [];
  const d = new Date(startDate);
  const end = new Date(endDate);
  while (d <= end) {
    const iso = toISO(d);
    const wf = getDailyWorkflow(proposalId, iso);
    if (wf) results.push(wf);
    d.setDate(d.getDate() + 1);
  }
  return results;
}

// ── Photo Updates ────────────────────────────────────────────────────────────

const phKey = (proposalId) => `photoUpdates_${proposalId}`;

export function getPhotos(proposalId) {
  try {
    const raw = localStorage.getItem(phKey(proposalId));
    return raw ? JSON.parse(raw).photos || [] : [];
  } catch {
    return [];
  }
}

export function savePhotos(proposalId, photos) {
  localStorage.setItem(phKey(proposalId), JSON.stringify({ photos }));
  window.dispatchEvent(new Event("trackingChanged"));
}

export function addPhoto(proposalId, photo) {
  const photos = getPhotos(proposalId);
  photos.push({ id: uid(), timestamp: new Date().toISOString(), ...photo });
  savePhotos(proposalId, photos);
  return photos;
}

export function deletePhoto(proposalId, photoId) {
  const photos = getPhotos(proposalId).filter((p) => p.id !== photoId);
  savePhotos(proposalId, photos);
  return photos;
}

// ── Weekly Aggregation ───────────────────────────────────────────────────────

// Returns Monday of the week containing `date`.
export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekEnd(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d;
}

export function aggregateWeekly(proposalId, weekStart) {
  const end = getWeekEnd(weekStart);
  const workflows = getDailyWorkflowsInRange(proposalId, weekStart, end);

  const roomMap = {};
  let totalHours = 0;
  let totalTasks = 0;
  let completedTasks = 0;
  const issues = [];

  for (const wf of workflows) {
    for (const entry of wf.entries || []) {
      if (!roomMap[entry.roomId]) {
        roomMap[entry.roomId] = {
          roomId: entry.roomId,
          roomName: entry.roomName,
          plannedTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          hours: 0,
        };
      }
      const rm = roomMap[entry.roomId];
      for (const t of entry.tasks || []) {
        rm.plannedTasks++;
        totalTasks++;
        rm.hours += Number(t.hours) || 0;
        totalHours += Number(t.hours) || 0;
        if (t.status === "done") {
          rm.completedTasks++;
          completedTasks++;
        } else {
          rm.pendingTasks++;
        }
      }
      // Extract issues from notes
      if (entry.notes && /block|delay|issue|problem|stuck/i.test(entry.notes)) {
        issues.push({
          date: wf.date,
          room: entry.roomName,
          note: entry.notes,
        });
      }
    }
  }

  return {
    weekStart: toISO(weekStart),
    weekEnd: toISO(end),
    daysLogged: workflows.length,
    totalHours,
    totalTasks,
    completedTasks,
    rooms: Object.values(roomMap),
    issues,
  };
}

// ── Monthly Aggregation ──────────────────────────────────────────────────────

const mnKey = (proposalId, month) => `monthlyNotes_${proposalId}_${month}`;

export function getMonthlyNotes(proposalId, month) {
  try {
    return localStorage.getItem(mnKey(proposalId, month)) || "";
  } catch {
    return "";
  }
}

export function saveMonthlyNotes(proposalId, month, notes) {
  localStorage.setItem(mnKey(proposalId, month), notes);
}

export function aggregateMonthly(proposalId, year, month) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  const workflows = getDailyWorkflowsInRange(proposalId, startDate, endDate);

  const dailyHours = [];
  let totalHours = 0;
  let totalTasks = 0;
  let completedTasks = 0;
  const roomMap = {};

  for (const wf of workflows) {
    let dayHours = 0;
    for (const entry of wf.entries || []) {
      if (!roomMap[entry.roomId]) {
        roomMap[entry.roomId] = {
          roomId: entry.roomId,
          roomName: entry.roomName,
          totalTasks: 0,
          completedTasks: 0,
          totalHours: 0,
        };
      }
      const rm = roomMap[entry.roomId];
      for (const t of entry.tasks || []) {
        rm.totalTasks++;
        totalTasks++;
        const h = Number(t.hours) || 0;
        rm.totalHours += h;
        totalHours += h;
        dayHours += h;
        if (t.status === "done") {
          rm.completedTasks++;
          completedTasks++;
        }
      }
    }
    dailyHours.push({ date: wf.date, hours: dayHours });
  }

  return {
    year,
    month,
    daysLogged: workflows.length,
    totalHours,
    totalTasks,
    completedTasks,
    dailyHours,
    rooms: Object.values(roomMap),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export { toISO };

export const STATUS_LABELS = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  done: "Done",
  blocked: "Blocked",
};

export const STATUS_COLORS = {
  "not-started": { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  "in-progress": { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  done: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  blocked: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
};

export const WEATHER_OPTIONS = [
  { value: "clear", label: "☀️ Clear", icon: "☀️" },
  { value: "cloudy", label: "☁️ Cloudy", icon: "☁️" },
  { value: "rainy", label: "🌧️ Rainy", icon: "🌧️" },
  { value: "hot", label: "🔥 Extreme Heat", icon: "🔥" },
];
