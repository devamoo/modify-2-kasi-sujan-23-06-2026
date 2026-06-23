import { useState, useMemo, useCallback } from "react";
import {
  FiCalendar, FiClock, FiPlus, FiTrash2, FiChevronLeft,
  FiChevronRight, FiCheckCircle, FiSave,
} from "react-icons/fi";
import {
  getDailyWorkflow, saveDailyWorkflow, makeDailyEntry, makeTask,
  computeDailySummary, toISO, STATUS_LABELS, STATUS_COLORS, WEATHER_OPTIONS,
} from "../../data/projectTrackingStorage";
import { getOrSeedSchedule } from "../../data/scheduleStorage";

const SummaryPill = ({ label, value, icon, color }) => (
  <div className="flex items-center gap-3 bg-white border border-bordergray rounded-xl px-3.5 py-2.5">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
    <div>
      <p className="text-[10px] text-text-subtle font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-[16px] font-bold text-darkgray">{value}</p>
    </div>
  </div>
);

const TaskRow = ({ task, index, onUpdate, onRemove }) => {
  const sc = STATUS_COLORS[task.status] || STATUS_COLORS["not-started"];
  return (
    <div className="flex items-center gap-2 group">
      <span className="text-[11px] font-mono text-text-subtle w-5 shrink-0">{String(index + 1).padStart(2, "0")}</span>
      <input value={task.description} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="Task description" className="flex-1 min-w-0 rounded-lg border border-bordergray px-2.5 py-2 text-[12px] text-textcolor focus:outline-none focus:border-select-blue" />
      <input value={task.assignee} onChange={(e) => onUpdate({ assignee: e.target.value })} placeholder="Assignee" className="w-[100px] shrink-0 rounded-lg border border-bordergray px-2.5 py-2 text-[12px] text-textcolor focus:outline-none focus:border-select-blue" />
      <div className="flex items-center gap-1 shrink-0">
        <input type="number" min="0" max="24" step="0.5" value={task.hours || ""} onChange={(e) => onUpdate({ hours: parseFloat(e.target.value) || 0 })} placeholder="0" className="w-[50px] rounded-lg border border-bordergray px-2 py-2 text-[12px] text-textcolor text-center focus:outline-none focus:border-select-blue" />
        <span className="text-[10px] text-text-subtle">hrs</span>
      </div>
      <select value={task.status} onChange={(e) => onUpdate({ status: e.target.value })} className={`shrink-0 rounded-lg border px-2 py-2 text-[11px] font-semibold focus:outline-none ${sc.bg} ${sc.text} border-transparent`}>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
      </select>
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all shrink-0" title="Remove task"><FiTrash2 size={14} /></button>
    </div>
  );
};

const RoomCard = ({ entry, onUpdate, onAddTask, onUpdateTask, onRemoveTask }) => {
  const tasks = entry.tasks || [];
  const roomDone = tasks.length > 0 && tasks.every((t) => t.status === "done");
  const hasBlocked = tasks.some((t) => t.status === "blocked");
  return (
    <div className={`bg-white rounded-[20px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] overflow-hidden ${hasBlocked ? "ring-2 ring-red-200" : ""}`}>
      <div className={`px-6 py-4 flex items-center justify-between border-b ${roomDone ? "bg-emerald-50 border-emerald-100" : hasBlocked ? "bg-red-50 border-red-100" : "bg-bg-soft border-bordergray"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${roomDone ? "bg-emerald-500" : hasBlocked ? "bg-red-500" : "bg-gray-300"}`} />
          <h4 className="text-[14px] font-bold text-darkgray">{entry.roomName}</h4>
          <span className="text-[11px] text-text-muted">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
        </div>
        <select value={entry.weatherCondition || "clear"} onChange={(e) => onUpdate({ weatherCondition: e.target.value })} className="text-[11px] rounded-lg border border-bordergray px-2 py-1 bg-white focus:outline-none focus:border-select-blue">
          {WEATHER_OPTIONS.map((w) => (<option key={w.value} value={w.value}>{w.label}</option>))}
        </select>
      </div>
      <div className="px-6 py-3 space-y-2">
        {tasks.map((task, idx) => (<TaskRow key={task.id} task={task} index={idx} onUpdate={(c) => onUpdateTask(task.id, c)} onRemove={() => onRemoveTask(task.id)} />))}
        <button onClick={onAddTask} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border-2 border-dashed border-bordergray text-[12px] font-semibold text-text-muted hover:text-select-blue hover:border-select-blue/40 transition-colors"><FiPlus size={14} /> Add Task</button>
      </div>
      <div className="px-6 pb-4">
        <textarea value={entry.notes || ""} onChange={(e) => onUpdate({ notes: e.target.value })} placeholder="Blockers, observations, site notes…" rows={2} className="w-full rounded-xl border border-bordergray px-3 py-2.5 text-[12px] text-textcolor resize-none focus:outline-none focus:border-select-blue bg-bg-soft/50" />
      </div>
    </div>
  );
};

const DailyWorkflow = ({ lead }) => {
  const [selectedDate, setSelectedDate] = useState(toISO(new Date()));
  const schedule = useMemo(() => getOrSeedSchedule(lead), [lead]);

  const loadEntries = useCallback((date) => {
    const saved = getDailyWorkflow(lead.proposalId, date);
    if (saved) return saved.entries || [];
    return (schedule.rooms || []).map((r) => makeDailyEntry(r.id, r.room || "Untitled Room"));
  }, [lead.proposalId, schedule.rooms]);

  const [entries, setEntries] = useState(() => loadEntries(selectedDate));
  const [dirty, setDirty] = useState(false);

  const changeDate = (offset) => {
    const d = new Date(selectedDate); d.setDate(d.getDate() + offset);
    const next = toISO(d);
    if (dirty) handleSave();
    setSelectedDate(next); setEntries(loadEntries(next)); setDirty(false);
  };
  const pickDate = (e) => {
    const next = e.target.value;
    if (dirty) handleSave();
    setSelectedDate(next); setEntries(loadEntries(next)); setDirty(false);
  };
  const updateEntry = (id, changes) => { setEntries((p) => p.map((e) => e.id === id ? { ...e, ...changes } : e)); setDirty(true); };
  const addTask = (id) => { setEntries((p) => p.map((e) => e.id === id ? { ...e, tasks: [...(e.tasks || []), makeTask()] } : e)); setDirty(true); };
  const updateTask = (entryId, taskId, changes) => { setEntries((p) => p.map((e) => e.id === entryId ? { ...e, tasks: e.tasks.map((t) => t.id === taskId ? { ...t, ...changes } : t) } : e)); setDirty(true); };
  const removeTask = (entryId, taskId) => { setEntries((p) => p.map((e) => e.id === entryId ? { ...e, tasks: e.tasks.filter((t) => t.id !== taskId) } : e)); setDirty(true); };
  const handleSave = () => { saveDailyWorkflow(lead.proposalId, selectedDate, { entries, summary: computeDailySummary(entries) }); setDirty(false); };

  const summary = useMemo(() => computeDailySummary(entries), [entries]);
  const isToday = selectedDate === toISO(new Date());
  const dateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><FiCalendar size={20} /></div>
            <div><h3 className="text-[16px] font-bold text-darkgray">Daily Workflow</h3><p className="text-[12px] text-text-muted">{dateLabel}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => changeDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-bordergray hover:bg-bg-soft text-text-muted hover:text-select-blue transition-colors"><FiChevronLeft size={16} /></button>
            <input type="date" value={selectedDate} onChange={pickDate} className="rounded-lg border border-bordergray px-3 py-1.5 text-[12px] text-textcolor focus:outline-none focus:border-select-blue" />
            <button onClick={() => changeDate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-bordergray hover:bg-bg-soft text-text-muted hover:text-select-blue transition-colors"><FiChevronRight size={16} /></button>
            {!isToday && (<button onClick={() => { const today = toISO(new Date()); if (dirty) handleSave(); setSelectedDate(today); setEntries(loadEntries(today)); setDirty(false); }} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-select-blue border border-select-blue/30 hover:bg-blue-50 transition-colors">Today</button>)}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryPill label="Hours Logged" value={`${summary.totalHours}h`} icon={<FiClock size={14} />} color="text-blue-600 bg-blue-50" />
          <SummaryPill label="Rooms Active" value={summary.roomsWorked} icon={<FiCheckCircle size={14} />} color="text-emerald-600 bg-emerald-50" />
          <SummaryPill label="Tasks Done" value={`${summary.tasksCompleted}/${summary.totalTasks}`} icon={<FiCheckCircle size={14} />} color="text-violet-600 bg-violet-50" />
          <SummaryPill label="Completion" value={summary.totalTasks > 0 ? `${Math.round((summary.tasksCompleted / summary.totalTasks) * 100)}%` : "—"} icon={<FiCheckCircle size={14} />} color="text-amber-600 bg-amber-50" />
        </div>
      </div>
      {entries.map((entry) => (<RoomCard key={entry.id} entry={entry} onUpdate={(c) => updateEntry(entry.id, c)} onAddTask={() => addTask(entry.id)} onUpdateTask={(tid, c) => updateTask(entry.id, tid, c)} onRemoveTask={(tid) => removeTask(entry.id, tid)} />))}
      {entries.length === 0 && (
        <div className="bg-white rounded-[20px] p-12 text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
          <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3"><FiCalendar size={24} /></div>
          <p className="text-[14px] text-gray-500 font-medium">No rooms in the schedule yet.</p>
          <p className="text-[12px] text-text-muted mt-1">Send a proposal so rooms seed automatically.</p>
        </div>
      )}
      {entries.length > 0 && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={!dirty} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-bold shadow-sm transition-all ${dirty ? "bg-select-blue text-white hover:bg-blue-950 cursor-pointer" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}><FiSave size={16} />{dirty ? "Save Daily Log" : "Saved"}</button>
        </div>
      )}
    </div>
  );
};

export default DailyWorkflow;
