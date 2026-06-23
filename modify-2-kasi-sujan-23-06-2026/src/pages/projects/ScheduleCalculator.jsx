import { useState, useMemo } from "react";
import { FiCalendar, FiClock, FiAlertTriangle, FiCheckCircle, FiArrowRight, FiDownload } from "react-icons/fi";
import { getOrSeedSchedule, computeChain, resolveAnchor, deriveStatus, getRoomHealth, getProjectEnd, getProjectSlack, getPossessionDate, getBreachDays, addWorkingDaysISO } from "../../data/scheduleStorage";
import { getScheduleConfig } from "../../data/scheduleConfig";

const fmt = (d) => d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtShort = (d) => d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";

const BAR_COLORS = [
  "bg-blue-400", "bg-emerald-400", "bg-violet-400", "bg-amber-400", "bg-rose-400",
  "bg-teal-400", "bg-indigo-400", "bg-pink-400", "bg-cyan-400", "bg-orange-400",
];

const ScheduleCalculator = ({ lead }) => {
  const schedule = useMemo(() => getOrSeedSchedule(lead), [lead]);
  const anchor = useMemo(() => resolveAnchor(lead, schedule), [lead, schedule]);
  const config = useMemo(() => getScheduleConfig(), []);
  const started = anchor.source === "booking";
  const possession = useMemo(() => getPossessionDate(lead), [lead]);

  // What-if state
  const [whatIfStart, setWhatIfStart] = useState("");
  const [whatIfDays, setWhatIfDays] = useState({});

  // Effective rooms with what-if overrides
  const effectiveRooms = useMemo(() =>
    schedule.rooms.map((r) => ({ ...r, days: whatIfDays[r.id] ?? r.days })),
    [schedule.rooms, whatIfDays]
  );

  // Chain from actual or what-if start
  const effectiveAnchorDate = useMemo(() => {
    if (whatIfStart) return new Date(`${whatIfStart}T00:00:00`);
    return anchor.date;
  }, [whatIfStart, anchor.date]);

  const chain = useMemo(() => computeChain(effectiveRooms, effectiveAnchorDate), [effectiveRooms, effectiveAnchorDate]);
  const projectEnd = useMemo(() => getProjectEnd(chain), [chain]);
  const slack = useMemo(() => {
    if (!possession || !projectEnd) return null;
    return Math.round((possession - projectEnd) / 86400000);
  }, [possession, projectEnd]);

  // Gantt chart range
  const ganttRange = useMemo(() => {
    const dates = chain.flatMap((r) => [r.start, r.end]).filter(Boolean);
    if (possession) dates.push(possession);
    if (dates.length === 0) return { start: null, end: null, days: 0 };
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    min.setDate(min.getDate() - 2);
    max.setDate(max.getDate() + 5);
    const days = Math.round((max - min) / 86400000) + 1;
    return { start: min, end: max, days };
  }, [chain, possession]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOffset = ganttRange.start ? Math.round((today - ganttRange.start) / 86400000) : -1;
  const possessionOffset = ganttRange.start && possession ? Math.round((possession - ganttRange.start) / 86400000) : -1;

  const criticalRoom = useMemo(() => {
    let max = null;
    for (const r of chain) {
      if (r.end && (!max || r.end > max.end)) max = r;
    }
    return max;
  }, [chain]);

  const overdueCount = chain.filter((r) => {
    const status = deriveStatus(r, started);
    return started && getRoomHealth(r.end, status, config).state === "overdue";
  }).length;

  const handleExport = async () => {
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const el = document.getElementById("gantt-chart-area");
      if (!el) return;
      const canvas = await html2canvas(el, { backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `schedule_${lead.proposalId}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch { alert("Export failed. Please try again."); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><FiCalendar size={20} /></div>
            <div><h3 className="text-[16px] font-bold text-darkgray">Schedule Calculator</h3><p className="text-[12px] text-text-muted">Interactive Gantt chart with what-if analysis</p></div>
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-bordergray text-[12px] font-semibold text-text-muted hover:text-select-blue hover:border-select-blue/40 transition-colors"><FiDownload size={14} /> Export as Image</button>
        </div>
      </div>

      {/* Summary Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Project Start" value={effectiveAnchorDate ? fmt(effectiveAnchorDate) : "Not set"} icon={<FiCalendar size={16} />} color="bg-blue-50 text-blue-600" />
        <SummaryCard label="Planned End" value={projectEnd ? fmt(projectEnd) : "—"} icon={<FiClock size={16} />} color="bg-violet-50 text-violet-600" />
        <SummaryCard label="Possession Date" value={possession ? fmt(possession) : "—"} icon={<FiCheckCircle size={16} />} color="bg-emerald-50 text-emerald-600" />
        <SummaryCard label="Slack" value={slack != null ? `${slack} day${Math.abs(slack) !== 1 ? "s" : ""}` : "—"} icon={slack != null && slack < 0 ? <FiAlertTriangle size={16} /> : <FiCheckCircle size={16} />} color={slack != null && slack < 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"} />
      </div>

      {/* Gantt Chart */}
      <div id="gantt-chart-area" className="bg-white rounded-[20px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] overflow-hidden">
        <div className="px-6 py-4 border-b border-bordergray flex items-center justify-between">
          <h4 className="text-[14px] font-bold text-darkgray">Project Timeline</h4>
          {criticalRoom && <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1"><FiAlertTriangle size={11} /> Critical: {criticalRoom.room} ({criticalRoom.days}d)</span>}
        </div>

        {ganttRange.start && chain.length > 0 ? (
          <div className="px-6 py-4 overflow-x-auto">
            {/* Date header */}
            <div className="flex mb-1 ml-[140px]" style={{ width: `${ganttRange.days * 8}px`, minWidth: "100%" }}>
              {Array.from({ length: ganttRange.days }, (_, i) => {
                const d = new Date(ganttRange.start); d.setDate(d.getDate() + i);
                const isSun = d.getDay() === 0;
                const show = i === 0 || d.getDate() === 1 || d.getDate() === 15;
                return (
                  <div key={i} className="flex-1 min-w-[8px] text-center" style={{ minWidth: 8 }}>
                    {show && <span className={`text-[8px] ${isSun ? "text-red-400" : "text-text-subtle"}`}>{d.getDate()}/{d.getMonth() + 1}</span>}
                  </div>
                );
              })}
            </div>

            {/* Bars */}
            <div className="relative">
              {/* Today line */}
              {todayOffset >= 0 && todayOffset < ganttRange.days && (
                <div className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-10" style={{ left: `calc(140px + ${(todayOffset / ganttRange.days) * 100}% * (1 - 140px / 100%))`, left: `calc(140px + ${todayOffset * 8}px)` }}>
                  <span className="absolute -top-4 -left-3 text-[8px] font-bold text-red-500 bg-red-50 px-1 rounded">Today</span>
                </div>
              )}
              {/* Possession line */}
              {possessionOffset >= 0 && possessionOffset < ganttRange.days && (
                <div className="absolute top-0 bottom-0 w-[2px] bg-blue-500 z-10 border-dashed" style={{ left: `calc(140px + ${possessionOffset * 8}px)`, borderLeft: "2px dashed #3b82f6", width: 0 }}>
                  <span className="absolute -top-4 -left-6 text-[8px] font-bold text-blue-500 bg-blue-50 px-1 rounded">Possession</span>
                </div>
              )}

              {chain.map((r, idx) => {
                if (!r.start || !r.end) return (
                  <div key={r.id} className="flex items-center h-8 mb-1">
                    <div className="w-[140px] shrink-0 pr-2 text-[11px] font-semibold text-darkgray truncate">{r.room || "—"}</div>
                    <span className="text-[10px] text-text-subtle">No duration set</span>
                  </div>
                );
                const startOff = Math.round((r.start - ganttRange.start) / 86400000);
                const dur = Math.round((r.end - r.start) / 86400000) + 1;
                const status = deriveStatus(r, started);
                const h = started ? getRoomHealth(r.end, status, config) : { rag: "none" };
                const barColor = h.rag === "red" ? "bg-red-400" : h.rag === "amber" ? "bg-amber-400" : BAR_COLORS[idx % BAR_COLORS.length];
                return (
                  <div key={r.id} className="flex items-center h-8 mb-1 group">
                    <div className="w-[140px] shrink-0 pr-2 text-[11px] font-semibold text-darkgray truncate">{r.room || "—"}</div>
                    <div className="relative flex-1" style={{ width: `${ganttRange.days * 8}px` }}>
                      <div className={`absolute h-6 rounded-md ${barColor} opacity-90 hover:opacity-100 transition-opacity flex items-center px-1.5`} style={{ left: `${startOff * 8}px`, width: `${Math.max(dur * 8, 16)}px` }}>
                        <span className="text-[9px] font-bold text-white truncate">{r.days}d</span>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute hidden group-hover:block z-20 bg-darkgray text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap" style={{ left: `${startOff * 8}px`, top: "-28px" }}>
                        {fmtShort(r.start)} → {fmtShort(r.end)} · {r.days}d
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3"><FiCalendar size={24} /></div>
            <p className="text-[14px] text-gray-500 font-medium">No schedule data</p>
            <p className="text-[12px] text-text-muted mt-1">Set a work start date and room durations to see the timeline.</p>
          </div>
        )}
      </div>

      {/* What-If Analysis */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
        <h4 className="text-[14px] font-bold text-darkgray mb-4">What-If Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start date change */}
          <div className="bg-bg-soft rounded-xl p-4 border border-bordergray">
            <p className="text-[12px] font-semibold text-darkgray mb-2">Change start date</p>
            <div className="flex items-center gap-2">
              <input type="date" value={whatIfStart || (effectiveAnchorDate ? effectiveAnchorDate.toISOString().slice(0, 10) : "")} onChange={(e) => setWhatIfStart(e.target.value)} className="rounded-lg border border-bordergray px-3 py-2 text-[12px] text-textcolor focus:outline-none focus:border-select-blue flex-1" />
              {whatIfStart && <button onClick={() => setWhatIfStart("")} className="px-3 py-2 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors">Reset</button>}
            </div>
            {whatIfStart && projectEnd && (
              <p className="text-[11px] text-text-muted mt-2">New end: <span className="font-semibold text-darkgray">{fmt(projectEnd)}</span>{slack != null && <span className={slack < 0 ? " text-red-600 font-semibold" : " text-emerald-600"}> · {slack}d {slack < 0 ? "over" : "slack"}</span>}</p>
            )}
          </div>

          {/* Duration changes */}
          <div className="bg-bg-soft rounded-xl p-4 border border-bordergray">
            <p className="text-[12px] font-semibold text-darkgray mb-2">Adjust room durations</p>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
              {schedule.rooms.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <span className="text-[11px] text-text-muted flex-1 truncate">{r.room || "—"}</span>
                  <input type="number" min="0" value={whatIfDays[r.id] ?? r.days ?? ""} onChange={(e) => setWhatIfDays((p) => ({ ...p, [r.id]: parseInt(e.target.value) || 0 }))} className="w-[60px] rounded-lg border border-bordergray px-2 py-1 text-[11px] text-center text-textcolor focus:outline-none focus:border-select-blue" />
                  <span className="text-[10px] text-text-subtle">days</span>
                </div>
              ))}
            </div>
            {Object.keys(whatIfDays).length > 0 && (
              <button onClick={() => setWhatIfDays({})} className="mt-2 px-3 py-1 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors">Reset All</button>
            )}
          </div>
        </div>
      </div>

      {/* Resource Calendar */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
        <h4 className="text-[14px] font-bold text-darkgray mb-3">Working Days Calendar</h4>
        <p className="text-[11px] text-text-muted mb-3">Sundays are non-working days (shown in red). All other days are working days.</p>
        <div className="grid grid-cols-7 gap-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (<div key={d} className={`text-[10px] font-bold text-center py-1 ${d === "Sun" ? "text-red-400" : "text-text-subtle"}`}>{d}</div>))}
          {(() => {
            const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
            const first = new Date(y, m, 1); const last = new Date(y, m + 1, 0);
            const startDay = (first.getDay() + 6) % 7;
            const cells = [];
            for (let i = 0; i < startDay; i++) cells.push(<div key={`e${i}`} />);
            for (let d = 1; d <= last.getDate(); d++) {
              const date = new Date(y, m, d); const isSun = date.getDay() === 0;
              const isT = d === now.getDate();
              cells.push(
                <div key={d} className={`text-[10px] text-center py-1.5 rounded-lg ${isSun ? "bg-red-50 text-red-400 line-through" : "bg-bg-soft text-textcolor"} ${isT ? "ring-2 ring-select-blue font-bold" : ""}`}>{d}</div>
              );
            }
            return cells;
          })()}
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, icon, color }) => (
  <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>{icon}</div>
    <p className="text-[10px] text-text-subtle font-bold uppercase tracking-wider">{label}</p>
    <p className="text-[16px] font-bold text-darkgray mt-1">{value}</p>
  </div>
);

export default ScheduleCalculator;
