import { useEffect, useState } from "react";
import { FileText, Download, BarChart3, Eye, X, Trash2, Sparkles, FolderArchive, Layers } from "lucide-react";
import { API_BASE_URL } from "../config";

interface Report {
  id: string;
  title: string;
  type: string;
  date: string;
  size: string;
  content?: string;
}

export default function ReportsView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [downloadedCount, setDownloadedCount] = useState<number>(14);

  const defaultReports: Report[] = [
    { id: "def-1", title: "Monthly Construction Progress Summary", type: "PDF Document", date: "May 2026", size: "14.2 MB" },
    { id: "def-2", title: "Solar Array Cell Heat Anomalies Log", type: "Excel Sheet", date: "May 2026", size: "2.1 MB" },
    { id: "def-3", title: "Stockpile Inventory Volumetric Audit", type: "CSV Spreadsheet", date: "April 2026", size: "450 KB" },
    { id: "def-4", title: "QA Blueprint Drift Compare Map", type: "High-Res PDF", date: "April 2026", size: "38.5 MB" }
  ];

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/reports`);
      if (res.ok) {
        const data = await res.json();
        setReports([...data, ...defaultReports]);
      } else {
        setReports(defaultReports);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      setReports(defaultReports);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownload = (report: Report) => {
    setDownloadedCount((prev) => prev + 1);

    if (report.content) {
      const element = document.createElement("a");
      const file = new Blob([report.content], { type: 'text/markdown' });
      element.href = URL.createObjectURL(file);
      element.download = `${report.title.replace(/\s+/g, "_")}.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else {
      alert(`Exporting document: ${report.title}`);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report from the archive?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/reports/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Error deleting report:", err);
    }
    setReports((prev) => prev.filter((r) => r.id !== id));
    if (selectedReport?.id === id) {
      setSelectedReport(null);
    }
  };

  const handleClearAllReports = async () => {
    if (!confirm("Are you sure you want to clear ALL reports in this section? This action cannot be undone.")) return;
    try {
      await fetch(`${API_BASE_URL}/api/reports`, { method: "DELETE" });
    } catch (err) {
      console.error("Error clearing reports:", err);
    }
    setReports([]);
    setSelectedReport(null);
  };

  return (
    <div className="space-y-8 text-left relative">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#6D28D9] text-xs font-bold mb-2 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Analytical Document Hub</span>
          </div>
          <h2 className="text-3xl font-black text-[#1E1235] tracking-tight">Reports & Audits</h2>
          <p className="text-xs text-[#5B4B7C] mt-1 font-medium max-w-xl">
            Export AI flight summaries, anomaly defect logs, thermal maps, and volumetric infrastructure audits.
          </p>
        </div>

        {reports.length > 0 && (
          <button
            onClick={handleClearAllReports}
            className="flex items-center space-x-2 px-4 py-2.5 bg-red-500/15 hover:bg-red-600 border border-red-500/30 text-red-600 hover:text-white text-xs font-extrabold rounded-2xl transition-all shadow-sm backdrop-blur-md"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All Reports</span>
          </button>
        )}
      </div>

      {/* Top Glass Metric Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Metric 1: AI Detection Accuracy */}
        <div className="glass-card-reports rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-[#8B5CF6]/15 text-[#6D28D9] border border-[#8B5CF6]/30 rounded-2xl shadow-sm backdrop-blur-md">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-extrabold text-[#1E1235] uppercase tracking-wider">
                AI Detection Accuracy
              </h3>
            </div>
            <p className="text-xs text-[#5B4B7C] leading-relaxed mb-5 font-medium">
              Neural classification engines averaged 98.4% accuracy across concrete cracks, solar hot spots, and topographic surveys.
            </p>
          </div>
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-[#1E1235] mb-1.5">
              <span>Model Precision</span>
              <span>98.4%</span>
            </div>
            <div className="h-2.5 w-full bg-white/50 border border-white/80 rounded-full overflow-hidden p-0.5 backdrop-blur-md">
              <div
                className="h-full bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#A78BFA] rounded-full shadow-sm"
                style={{ width: "98.4%" }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Dynamic Total Exports Downloaded */}
        <div className="glass-card-reports rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-[#8B5CF6]/15 text-[#6D28D9] border border-[#8B5CF6]/30 rounded-2xl shadow-sm backdrop-blur-md">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-extrabold text-[#1E1235] uppercase tracking-wider">
                Total Reports Exported
              </h3>
            </div>
            <p className="text-xs text-[#5B4B7C] leading-relaxed mb-4 font-medium">
              Dynamic record of analytical inspection documents downloaded by team members.
            </p>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-[#1E1235] tracking-tight">{downloadedCount}</span>
            <span className="text-xs font-bold text-[#6D28D9] uppercase tracking-wider">Total Downloads</span>
          </div>
        </div>

        {/* Metric 3: Active Document Library Count */}
        <div className="glass-card-reports rounded-3xl p-6 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-[#8B5CF6]/15 text-[#6D28D9] border border-[#8B5CF6]/30 rounded-2xl shadow-sm backdrop-blur-md">
                <FolderArchive className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-extrabold text-[#1E1235] uppercase tracking-wider">
                Compiled Library
              </h3>
            </div>
            <p className="text-xs text-[#5B4B7C] leading-relaxed mb-4 font-medium">
              Active structural and volumetric report files currently stored in workspace archive.
            </p>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-[#1E1235] tracking-tight">{reports.length}</span>
            <span className="text-xs font-bold text-[#6D28D9] uppercase tracking-wider">Reports Ready</span>
          </div>
        </div>
      </div>

      {/* Document Library Glass Container */}
      <div className="glass-card-reports rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-white/60 flex justify-between items-center bg-white/30 backdrop-blur-md">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#6D28D9]" />
            <h3 className="text-xs font-extrabold text-[#1E1235] uppercase tracking-wider">Document Library</h3>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#6D28D9] border border-[#8B5CF6]/25">
              {reports.length} files
            </span>
          </div>
          {loading && <span className="text-[10px] text-[#6D28D9] font-bold animate-pulse">Syncing library...</span>}
        </div>

        {reports.length === 0 ? (
          <div className="p-12 text-center text-[#5B4B7C] font-semibold">
            <FileText className="w-10 h-10 text-[#8B5CF6]/40 mx-auto mb-3" />
            <p className="text-sm font-bold text-[#1E1235]">No reports available</p>
            <p className="text-xs text-[#5B4B7C] mt-1">All reports have been cleared. Run new inspection missions to generate reports.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/50">
            {reports.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/40 transition-all"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 bg-[#8B5CF6]/15 rounded-2xl border border-[#8B5CF6]/25 text-[#6D28D9] shadow-sm backdrop-blur-md shrink-0">
                    <FileText className="w-5 h-5 text-[#6D28D9]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#1E1235]">{item.title}</h4>
                    <p className="text-[11px] text-[#5B4B7C] mt-0.5 font-medium">
                      {item.type} • <span className="font-semibold">{item.date}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-auto">
                  <span className="text-xs font-mono font-extrabold text-[#5B4B7C] px-2.5 py-1 rounded-xl bg-white/50 border border-white/70">
                    {item.size}
                  </span>
                  {item.content && (
                    <button
                      onClick={() => setSelectedReport(item)}
                      className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/70 hover:bg-white border border-white/90 text-[#1E1235] hover:text-[#6D28D9] rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(item)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#A78BFA] text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-[#8B5CF6]/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                  <button
                    onClick={() => handleDeleteReport(item.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                    title="Delete Report"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Report Modal */}
      {selectedReport && (
        <div className="fixed -top-20 -bottom-20 -left-20 -right-20 bg-[#1E1235]/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl glass-modal rounded-3xl p-7 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-white/50 border border-white/80 text-[#5B4B7C] hover:text-[#1E1235] hover:bg-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] text-white rounded-2xl shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1E1235]">{selectedReport.title}</h3>
                <p className="text-xs text-[#5B4B7C] font-semibold">{selectedReport.type} • {selectedReport.date}</p>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto glass-inner-panel p-5 rounded-2xl text-xs font-mono text-[#1E1235] whitespace-pre-wrap leading-relaxed shadow-inner">
              {selectedReport.content}
            </div>
            <div className="pt-4 flex justify-between items-center">
              <button
                onClick={() => handleDeleteReport(selectedReport.id)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-red-500/15 hover:bg-red-600 border border-red-500/30 text-red-600 hover:text-white text-xs font-bold rounded-xl transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Report</span>
              </button>
              <button
                onClick={() => handleDownload(selectedReport)}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white text-xs font-extrabold rounded-xl shadow-lg shadow-[#8B5CF6]/30 hover:from-[#5B21B6] hover:to-[#7C3AED] transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report Markdown</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
