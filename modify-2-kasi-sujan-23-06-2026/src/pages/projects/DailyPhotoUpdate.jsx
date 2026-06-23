import { useState, useMemo, useRef } from "react";
import { FiCamera, FiCalendar, FiTrash2, FiChevronLeft, FiChevronRight, FiX, FiImage, FiMaximize2 } from "react-icons/fi";
import { getPhotos, addPhoto, deletePhoto, toISO } from "../../data/projectTrackingStorage";
import { getOrSeedSchedule } from "../../data/scheduleStorage";

const DailyPhotoUpdate = ({ lead }) => {
  const schedule = useMemo(() => getOrSeedSchedule(lead), [lead]);
  const rooms = schedule.rooms || [];
  const [photos, setPhotos] = useState(() => getPhotos(lead.proposalId));
  const [selectedDate, setSelectedDate] = useState(toISO(new Date()));
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef(null);
  const [uploadRoom, setUploadRoom] = useState(rooms[0]?.id || "");

  const filteredPhotos = useMemo(() => {
    let filtered = photos;
    if (selectedDate) filtered = filtered.filter((p) => p.date === selectedDate);
    if (selectedRoom !== "all") filtered = filtered.filter((p) => p.roomId === selectedRoom);
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [photos, selectedDate, selectedRoom]);

  const handleUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const room = rooms.find((r) => r.id === uploadRoom);
        const updated = addPhoto(lead.proposalId, {
          roomId: uploadRoom,
          roomName: room?.room || "General",
          date: selectedDate,
          caption: "",
          dataUrl: ev.target.result,
        });
        setPhotos(updated);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleDelete = (photoId) => {
    if (!window.confirm("Delete this photo?")) return;
    const updated = deletePhoto(lead.proposalId, photoId);
    setPhotos(updated);
    if (lightbox?.id === photoId) setLightbox(null);
  };

  const handleCaption = (photoId, caption) => {
    const updated = photos.map((p) => p.id === photoId ? { ...p, caption } : p);
    setPhotos(updated);
    // Save all
    localStorage.setItem(`photoUpdates_${lead.proposalId}`, JSON.stringify({ photos: updated }));
  };

  const changeDate = (offset) => {
    const d = new Date(selectedDate); d.setDate(d.getDate() + offset);
    setSelectedDate(toISO(d));
  };

  const dateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  const allDates = [...new Set(photos.map((p) => p.date))].sort().reverse();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><FiCamera size={20} /></div>
            <div><h3 className="text-[16px] font-bold text-darkgray">Photo Updates</h3><p className="text-[12px] text-text-muted">{dateLabel} · {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? "s" : ""}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => changeDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-bordergray hover:bg-bg-soft text-text-muted hover:text-select-blue transition-colors"><FiChevronLeft size={16} /></button>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-lg border border-bordergray px-3 py-1.5 text-[12px] text-textcolor focus:outline-none focus:border-select-blue" />
            <button onClick={() => changeDate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-bordergray hover:bg-bg-soft text-text-muted hover:text-select-blue transition-colors"><FiChevronRight size={16} /></button>
          </div>
        </div>

        {/* Filters + Upload */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} className="rounded-lg border border-bordergray px-3 py-2 text-[12px] text-textcolor focus:outline-none focus:border-select-blue">
            <option value="all">All Rooms</option>
            {rooms.map((r) => (<option key={r.id} value={r.id}>{r.room || "Untitled"}</option>))}
          </select>
          <select value={uploadRoom} onChange={(e) => setUploadRoom(e.target.value)} className="rounded-lg border border-bordergray px-3 py-2 text-[12px] text-textcolor focus:outline-none focus:border-select-blue">
            {rooms.map((r) => (<option key={r.id} value={r.id}>{r.room || "Untitled"}</option>))}
          </select>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-select-blue text-white text-[12px] font-semibold hover:bg-blue-950 transition-colors shadow-sm">
            <FiCamera size={14} /> Upload Photos
          </button>
        </div>
      </div>

      {/* Photo Grid */}
      {filteredPhotos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="group relative bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => setLightbox(photo)}>
                <img src={photo.dataUrl} alt={photo.caption || photo.roomName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              {/* Room label overlay */}
              <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold">{photo.roomName}</div>
              {/* Actions overlay */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setLightbox(photo)} className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70"><FiMaximize2 size={12} /></button>
                <button onClick={() => handleDelete(photo.id)} className="w-7 h-7 rounded-lg bg-red-500/80 backdrop-blur-sm text-white flex items-center justify-center hover:bg-red-600"><FiTrash2 size={12} /></button>
              </div>
              {/* Caption */}
              <div className="p-3">
                <input value={photo.caption || ""} onChange={(e) => handleCaption(photo.id, e.target.value)} placeholder="Add caption…" className="w-full text-[11px] text-textcolor border-none bg-transparent focus:outline-none placeholder:text-text-subtle" />
                <p className="text-[10px] text-text-subtle mt-1">{new Date(photo.timestamp).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[20px] p-12 text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
          <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3"><FiImage size={24} /></div>
          <p className="text-[14px] text-gray-500 font-medium">No photos for this date</p>
          <p className="text-[12px] text-text-muted mt-1">Upload site photos to track visual progress.</p>
        </div>
      )}

      {/* Date History */}
      {allDates.length > 1 && (
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
          <h4 className="text-[13px] font-bold text-darkgray mb-3">Photo History</h4>
          <div className="flex flex-wrap gap-2">
            {allDates.map((d) => {
              const count = photos.filter((p) => p.date === d).length;
              return (
                <button key={d} onClick={() => setSelectedDate(d)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${d === selectedDate ? "bg-select-blue text-white" : "bg-bg-soft text-text-muted hover:bg-active-bg hover:text-select-blue"}`}>
                  {new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={() => setLightbox(null)}><FiX size={20} /></button>
          <div className="max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.dataUrl} alt={lightbox.caption || "Photo"} className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            <div className="mt-3 text-center">
              <p className="text-white text-[14px] font-semibold">{lightbox.roomName}</p>
              {lightbox.caption && <p className="text-white/70 text-[12px] mt-1">{lightbox.caption}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyPhotoUpdate;
