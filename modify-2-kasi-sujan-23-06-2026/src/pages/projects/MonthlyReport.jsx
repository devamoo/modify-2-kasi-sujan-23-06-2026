import { useState, useMemo } from "react";
import { FiChevronLeft, FiChevronRight, FiBarChart2, FiClock, FiCheckCircle, FiAlertTriangle, FiPrinter } from "react-icons/fi";
import { aggregateMonthly, getMonthlyNotes, saveMonthlyNotes, getPhotos, toISO } from "../../data/projectTrackingStorage";
import { getOrSeedSchedule, computeChain, resolveAnchor, deriveStatus, getRoomHealth, getProjectEnd } from "../../data/scheduleStorage";
import { getScheduleConfig } from "../../data/scheduleConfig";
import { getMilestonesForLead } from "../../data/LeadStatusConfig";
import { PAYMENT_MILESTONES } from "../../data/MilestoneConfig";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const MonthlyReport = ({ lead }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [notes, setNotes] = useState(() => getMonthlyNotes(lead.proposalId, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`));

  const navigate = (dir) => {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setYear(y); setMonth(m);
    setNotes(getMonthlyNotes(lead.proposalId, `${y}-${String(m + 1).padStart(2, "0")}`));
  };

  const report = useMemo(() => aggregateMonthly(lead.proposalId, year, month), [lead.proposalId, year, month]);
  const milestones = useMemo(() => getMilestonesForLead(lead), [lead]);

  // Schedule health from existing storage
  const schedule = useMemo(() => getOrSeedSchedule(lead), [lead]);
  const anchor = useMemo(() => resolveAnchor(lead, schedule), [lead, schedule]);
  const chain = useMemo(() => computeChain(schedule.rooms, anchor.date), [schedule.rooms, anchor.date]);
  const config = useMemo(() => getScheduleConfig(), []);
  const projectEnd = useMemo(() => getProjectEnd(chain), [chain]);
  const started = anchor.source === "booking";

  const roomHealth = useMemo(() => chain.map((r) => {
    const status = deriveStatus(r, started);
    const h = started || status === "Done" ? getRoomHealth(r.end, status, config) : { rag: "none", label: "—" };
    return { ...r, derivedStatus: status, health: h };
  }), [chain, started, config]);

  const overdueCount = roomHealth.filter((r) => r.health.state === "overdue").length;
  const doneCount = roomHealth.filter((r) => r.health.state === "done").length;
  const completionPct = report.totalTasks > 0 ? Math.round((report.completedTasks / report.totalTasks) * 100) : 0;

  // Monthly photos
  const photos = useMemo(() => {
    const all = getPhotos(lead.proposalId);
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return all.filter((p) => p.date?.startsWith(prefix));
  }, [lead.proposalId, year, month]);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const handleSaveNotes = (val) => { setNotes(val); saveMonthlyNotes(lead.proposalId, monthKey, val); };

  // Chart data — daily hours
  const maxHours = Math.max(...report.dailyHours.map((d) => d.hours), 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><FiBarChart2 size={20} /></div>
            <div><h3 className="text-[16px] font-bold text-darkgray">Monthly Report</h3><p className="text-[12px] text-text-muted">{MONTHS[month]} {year}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-bordergray hover:bg-bg-soft text-text-muted hover:text-select-blue transition-colors"><FiChevronLeft size={16} /></button>
            <span className="text-[12px] font-semibold text-darkgray px-2">{MONTHS[month]} {year}</span>
            <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-bordergray hover:bg-bg-soft text-text-muted hover:text-select-blue transition-colors"><FiChevronRight size={16} /></button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-bordergray text-[11px] font-semibold text-text-muted hover:text-select-blue hover:border-select-blue/40 transition-colors"><FiPrinter size={12} /> Print</button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Work Hours" value={`${report.totalHours}h`} sub={`${report.daysLogged} days logged`} accent="border-blue-400" />
        <KPI label="Rooms Done" value={doneCount} sub={`of ${chain.length} rooms`} accent="border-emerald-400" />
        <KPI label="Tasks Complete" value={`${completionPct}%`} sub={`${report.completedTasks}/${report.totalTasks}`} accent="border-violet-400" />
        <KPI label="Schedule Health" value={overdueCount > 0 ? `${overdueCount} overdue` : "On Track"} sub={projectEnd ? `Ends ${projectEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "—"} accent={overdueCount > 0 ? "border-red-400" : "border-emerald-400"} />
      </div>

      {/* Hours Chart */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
        <h4 className="text-[14px] font-bold text-darkgray mb-4">Daily Work Hours</h4>
        <div className="flex items-end gap-[2px] h-[120px]">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
            const entry = report.dailyHours.find((e) => e.date === d);
            const h = entry?.hours || 0;
            const pct = (h / maxHours) * 100;
            const isToday = d === toISO(new Date());
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div className={`w-full rounded-t-sm transition-all ${h > 0 ? "bg-select-blue/80 hover:bg-select-blue" : "bg-gray-100"} ${isToday ? "ring-2 ring-select-blue ring-offset-1" : ""}`} style={{ height: `${Math.max(pct, 2)}%` }} />
                {(i + 1) % 5 === 0 && <span className="text-[8px] text-text-subtle mt-1">{i + 1}</span>}
                {h > 0 && <div className="absolute -top-6 bg-darkgray text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{h}h</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Room Progress Table */}
      {roomHealth.length > 0 && (
        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] overflow-hidden">
          <div className="px-6 py-4 border-b border-bordergray"><h4 className="text-[14px] font-bold text-darkgray">Room Progress</h4></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-soft text-[11px] text-text-subtle font-bold uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Room</th><th className="text-center px-4 py-3">Duration</th><th className="text-center px-4 py-3">Start</th><th className="text-center px-4 py-3">End</th><th className="text-center px-4 py-3">Status</th><th className="text-center px-4 py-3">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-soft">
                {roomHealth.map((r) => (
                  <tr key={r.id} className="hover:bg-bg-soft/50 transition-colors">
                    <td className="px-6 py-3 text-[13px] font-semibold text-darkgray">{r.room || "—"}</td>
                    <td className="text-center px-4 py-3 text-[12px] text-text-muted">{r.days || "—"}d</td>
                    <td className="text-center px-4 py-3 text-[12px] text-text-muted">{r.start ? r.start.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</td>
                    <td className="text-center px-4 py-3 text-[12px] text-text-muted">{r.end ? r.end.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</td>
                    <td className="text-center px-4 py-3 text-[11px] font-semibold text-text-muted">{r.derivedStatus}</td>
                    <td className="text-center px-4 py-3"><span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${r.health.rag === "green" ? "bg-emerald-100 text-emerald-700" : r.health.rag === "amber" ? "bg-amber-100 text-amber-700" : r.health.rag === "red" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>{r.health.label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Milestones */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
        <h4 className="text-[14px] font-bold text-darkgray mb-3">Payment Milestones</h4>
        <div className="space-y-2">
          {(milestones.length > 0 ? milestones : PAYMENT_MILESTONES).map((m) => {
            const paid = m.status === "paid";
            return (
              <div key={m.id} className={`flex items-center justify-between p-3 rounded-xl border ${paid ? "bg-emerald-50 border-emerald-100" : "bg-bg-soft border-bordergray"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${paid ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-400"}`}><FiCheckCircle size={12} /></div>
                  <div><p className="text-[12px] font-bold text-darkgray">{m.name}</p><p className="text-[10px] text-text-muted">{m.pct}%{m.paidDate ? ` · Paid ${m.paidDate}` : ""}</p></div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${paid ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>{paid ? "Paid" : "Pending"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Photo Collage */}
      {photos.length > 0 && (
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
          <h4 className="text-[14px] font-bold text-darkgray mb-3">Monthly Photos ({photos.length})</h4>
          <div className="grid grid-cols-3 gap-3">
            {photos.slice(0, 6).map((p) => (
              <div key={p.id} className="aspect-[4/3] rounded-xl overflow-hidden relative">
                <img src={p.dataUrl} alt={p.roomName} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-[10px] font-semibold">{p.roomName} · {new Date(`${p.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manager Notes */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
        <h4 className="text-[14px] font-bold text-darkgray mb-3">Manager Notes</h4>
        <textarea value={notes} onChange={(e) => handleSaveNotes(e.target.value)} placeholder="Add observations, key decisions, or action items for this month…" rows={4} className="w-full rounded-xl border border-bordergray px-4 py-3 text-[13px] text-textcolor resize-none focus:outline-none focus:border-select-blue" />
      </div>

      {/* Empty */}
      {report.daysLogged === 0 && photos.length === 0 && (
        <div className="bg-white rounded-[20px] p-12 text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
          <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3"><FiBarChart2 size={24} /></div>
          <p className="text-[14px] text-gray-500 font-medium">No data for {MONTHS[month]} {year}</p>
          <p className="text-[12px] text-text-muted mt-1">Log daily workflows and photos to generate monthly reports.</p>
        </div>
      )}
    </div>
  );
};

const KPI = ({ label, value, sub, accent }) => (
  <div className={`bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border-t-4 ${accent}`}>
    <p className="text-[10px] text-text-subtle font-bold uppercase tracking-wider mb-2">{label}</p>
    <p className="text-[22px] font-bold text-darkgray">{value}</p>
    <p className="text-[11px] text-text-muted mt-0.5">{sub}</p>
  </div>
);

export default MonthlyReport;
