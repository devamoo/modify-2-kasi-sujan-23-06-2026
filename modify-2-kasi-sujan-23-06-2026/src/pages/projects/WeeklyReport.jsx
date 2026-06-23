import { useState, useMemo } from "react";
import { FiChevronLeft, FiChevronRight, FiFileText, FiClock, FiCheckCircle, FiAlertTriangle, FiPrinter } from "react-icons/fi";
import { aggregateWeekly, getWeekStart, getWeekEnd, getPhotos, toISO } from "../../data/projectTrackingStorage";

const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtFull = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

const WeeklyReport = ({ lead }) => {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);

  const navigate = (dir) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + dir * 7);
    setWeekStart(getWeekStart(d));
  };

  const report = useMemo(() => aggregateWeekly(lead.proposalId, weekStart), [lead.proposalId, weekStart]);
  const photos = useMemo(() => {
    const all = getPhotos(lead.proposalId);
    const start = toISO(weekStart); const end = toISO(weekEnd);
    return all.filter((p) => p.date >= start && p.date <= end);
  }, [lead.proposalId, weekStart, weekEnd]);

  // Unique photos per room (latest per room)
  const photoHighlights = useMemo(() => {
    const roomMap = {};
    for (const p of photos) { if (!roomMap[p.roomId] || p.timestamp > roomMap[p.roomId].timestamp) roomMap[p.roomId] = p; }
    return Object.values(roomMap).slice(0, 6);
  }, [photos]);

  const completionPct = report.totalTasks > 0 ? Math.round((report.completedTasks / report.totalTasks) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center"><FiFileText size={20} /></div>
            <div>
              <h3 className="text-[16px] font-bold text-darkgray">Weekly Report</h3>
              <p className="text-[12px] text-text-muted">{fmt(toISO(weekStart))} — {fmt(toISO(weekEnd))}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-bordergray hover:bg-bg-soft text-text-muted hover:text-select-blue transition-colors"><FiChevronLeft size={16} /></button>
            <span className="text-[12px] font-semibold text-darkgray px-2">Week of {fmt(toISO(weekStart))}</span>
            <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-bordergray hover:bg-bg-soft text-text-muted hover:text-select-blue transition-colors"><FiChevronRight size={16} /></button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-bordergray text-[11px] font-semibold text-text-muted hover:text-select-blue hover:border-select-blue/40 transition-colors"><FiPrinter size={12} /> Print</button>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Days Logged" value={report.daysLogged} sub="out of 7" color="bg-blue-50 text-blue-600" />
        <KPICard label="Total Hours" value={`${report.totalHours}h`} sub="work logged" color="bg-emerald-50 text-emerald-600" />
        <KPICard label="Tasks Done" value={`${report.completedTasks}/${report.totalTasks}`} sub={`${completionPct}% complete`} color="bg-violet-50 text-violet-600" />
        <KPICard label="Rooms Active" value={report.rooms.length} sub="rooms worked" color="bg-amber-50 text-amber-600" />
      </div>

      {/* Completion Bar */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[13px] font-bold text-darkgray">Weekly Completion</h4>
          <span className="text-[12px] font-bold text-select-blue">{completionPct}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-select-blue to-blue-400 rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      {/* Room Breakdown Table */}
      {report.rooms.length > 0 && (
        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] overflow-hidden">
          <div className="px-6 py-4 border-b border-bordergray">
            <h4 className="text-[14px] font-bold text-darkgray">Room-by-Room Breakdown</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-soft text-[11px] text-text-subtle font-bold uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Room</th>
                  <th className="text-center px-4 py-3">Planned</th>
                  <th className="text-center px-4 py-3">Done</th>
                  <th className="text-center px-4 py-3">Pending</th>
                  <th className="text-center px-4 py-3">Hours</th>
                  <th className="text-center px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-soft">
                {report.rooms.map((r) => {
                  const pct = r.plannedTasks > 0 ? Math.round((r.completedTasks / r.plannedTasks) * 100) : 0;
                  const rag = pct === 100 ? "green" : pct >= 50 ? "amber" : "red";
                  return (
                    <tr key={r.roomId} className="hover:bg-bg-soft/50 transition-colors">
                      <td className="px-6 py-3 text-[13px] font-semibold text-darkgray">{r.roomName}</td>
                      <td className="text-center px-4 py-3 text-[12px] text-text-muted">{r.plannedTasks}</td>
                      <td className="text-center px-4 py-3 text-[12px] font-semibold text-emerald-600">{r.completedTasks}</td>
                      <td className="text-center px-4 py-3 text-[12px] text-text-muted">{r.pendingTasks}</td>
                      <td className="text-center px-4 py-3 text-[12px] text-text-muted">{r.hours}h</td>
                      <td className="text-center px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${rag === "green" ? "bg-emerald-100 text-emerald-700" : rag === "amber" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rag === "green" ? "bg-emerald-500" : rag === "amber" ? "bg-amber-500" : "bg-red-500"}`} />
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Photo Highlights */}
      {photoHighlights.length > 0 && (
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
          <h4 className="text-[14px] font-bold text-darkgray mb-3">Photo Highlights</h4>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {photoHighlights.map((p) => (
              <div key={p.id} className="aspect-square rounded-xl overflow-hidden relative group">
                <img src={p.dataUrl} alt={p.roomName} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-[10px] font-semibold truncate">{p.roomName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues & Blockers */}
      {report.issues.length > 0 && (
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
          <h4 className="text-[14px] font-bold text-red-600 flex items-center gap-2 mb-3"><FiAlertTriangle size={16} /> Issues & Blockers</h4>
          <div className="space-y-2">
            {report.issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <span className="text-[11px] text-red-600 font-semibold shrink-0 mt-0.5">{fmt(issue.date)}</span>
                <div>
                  <p className="text-[12px] font-semibold text-red-800">{issue.room}</p>
                  <p className="text-[11px] text-red-700 mt-0.5">{issue.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {report.daysLogged === 0 && (
        <div className="bg-white rounded-[20px] p-12 text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
          <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3"><FiFileText size={24} /></div>
          <p className="text-[14px] text-gray-500 font-medium">No workflow data for this week</p>
          <p className="text-[12px] text-text-muted mt-1">Log daily workflows to auto-generate weekly reports.</p>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ label, value, sub, color }) => (
  <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
    <p className="text-[10px] text-text-subtle font-bold uppercase tracking-wider mb-2">{label}</p>
    <p className={`text-[24px] font-bold text-darkgray`}>{value}</p>
    <p className="text-[11px] text-text-muted mt-0.5">{sub}</p>
  </div>
);

export default WeeklyReport;
