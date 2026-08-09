import { useState } from "react";
import { AlertTriangle, Video, ImageOff } from "lucide-react";

export interface DetectionBox {
  id: string | number;
  label: string;
  type: "CRACK" | "CORROSION" | "SPALLING" | "ANOMALY";
  confidence: number;
  severity: "High" | "Moderate" | "Low" | "Action Required";
  x: string;
  y: string;
  width: string;
  height: string;
  details?: string;
}

interface InteractiveViewerProps {
  inspectedAsset?: {
    name: string;
    location: string;
    infrastructureType?: string;
    gDriveLink?: string;
    thumbnail?: string;
  } | null;
  imageUrl?: string;
  customDetections?: DetectionBox[];
}

function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.endsWith(".mp4") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".avi") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mkv") ||
    lower.includes("video") ||
    lower.includes(".mp4?") ||
    (lower.includes("drive.google.com") && lower.includes("video"))
  );
}

export default function InteractiveViewer({ inspectedAsset, imageUrl, customDetections }: InteractiveViewerProps) {
  const [activeDetection, setActiveDetection] = useState<DetectionBox | null>(null);

  const rawUrl = imageUrl || (inspectedAsset?.thumbnail && !inspectedAsset.thumbnail.includes("unsplash")
    ? inspectedAsset.thumbnail
    : undefined);

  const isVideo = isVideoUrl(rawUrl);
  const displayImageUrl = isVideo ? undefined : rawUrl;

  // Only show real YOLO detections. Never show hash/fake boxes.
  const detections: DetectionBox[] = customDetections && customDetections.length > 0 ? customDetections : [];

  return (
    <div id="demo-viewer" className="relative bg-[#070410] rounded-2xl overflow-hidden">
      <div className="relative flex items-center justify-center bg-[#070410] p-2 min-h-[380px] select-none">
        {isVideo ? (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-lg space-y-4">
            <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-amber-400">
              <Video className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white">Video Resource Detected</h4>
              <p className="text-xs text-purple-200/70 mt-1 leading-relaxed font-medium">
                Automated 2D defect bounding box overlays are disabled for video uploads.
              </p>
            </div>
            {rawUrl && rawUrl.startsWith("http") && (
              <video src={rawUrl} controls className="max-h-[320px] max-w-full rounded-2xl border border-purple-500/30 shadow-2xl object-contain" />
            )}
          </div>
        ) : !displayImageUrl ? (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm space-y-4">
            <div className="p-4 bg-purple-500/15 border border-purple-500/30 rounded-2xl text-purple-300">
              <ImageOff className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">No Drone Image Selected</h4>
              <p className="text-xs text-purple-200/60 mt-1 leading-relaxed">
                Upload a raw drone photo to trigger defect detection and spatial mapping.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative w-full max-h-[440px] flex items-center justify-center rounded-2xl bg-black" style={{ minHeight: 280 }}>
            <img
              src={displayImageUrl}
              alt="Uploaded Infrastructure Frame"
              className="max-h-[440px] max-w-full object-contain block"
            />

            {detections.map((box) => {
              const isCrack = box.type === "CRACK";
              const isCorrosion = box.type === "CORROSION";
              const borderColor  = isCrack ? "border-red-500" : isCorrosion ? "border-amber-400" : "border-orange-500";
              const shadowColor  = isCrack ? "shadow-[0_0_20px_rgba(239,68,68,0.4)]" : isCorrosion ? "shadow-[0_0_20px_rgba(251,191,36,0.4)]" : "shadow-[0_0_20px_rgba(249,115,22,0.4)]";
              const bgColor      = isCrack ? "bg-red-500/10" : isCorrosion ? "bg-amber-400/10" : "bg-orange-500/10";
              const tagBg        = isCrack ? "bg-red-600" : isCorrosion ? "bg-amber-500" : "bg-orange-600";
              const cornerColor  = isCrack ? "border-red-400" : isCorrosion ? "border-amber-300" : "border-orange-400";

              return (
                <div
                  key={box.id}
                  onClick={() => setActiveDetection(activeDetection?.id === box.id ? null : box)}
                  className={`absolute rounded-xl border-2 ${borderColor} ${bgColor} ${shadowColor} transition-all duration-300 cursor-pointer z-20`}
                  style={{ left: box.x, top: box.y, width: box.width, height: box.height, minWidth: 100 }}
                >
                  <span className={`absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 ${cornerColor}`} />
                  <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 ${cornerColor}`} />
                  <span className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 ${cornerColor}`} />
                  <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 ${cornerColor}`} />

                  <div className="absolute top-2 left-2 flex items-center space-x-2 pointer-events-none">
                    <div className={`${tagBg} text-white text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-md`}>
                      {isCrack && <AlertTriangle className="w-3 h-3 text-white mr-0.5" />}
                      <span>{box.type}</span>
                    </div>
                    <div className="bg-[#1A132B]/90 backdrop-blur-md border border-white/20 text-purple-200 text-[10px] font-mono font-bold px-2 py-1 rounded-lg shadow-md">
                      {box.confidence}%
                    </div>
                  </div>

                  <div className="absolute bottom-2 right-2 bg-[#1A132B]/90 backdrop-blur-md border border-white/20 text-purple-200 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg shadow-md pointer-events-none">
                    Severity: <span className={box.severity === "High" ? "text-red-400" : "text-amber-300"}>{box.severity.toUpperCase()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeDetection && displayImageUrl && !isVideo && (
        <div className="absolute bottom-4 left-4 right-4 bg-[#18112C]/95 border border-purple-500/30 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl z-30 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple-400">
                Detected Defect #{activeDetection.id}
              </span>
              <h5 className="text-white text-sm font-extrabold flex items-center gap-2 mt-0.5">
                <span>{activeDetection.label}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  activeDetection.severity === "High" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}>
                  {activeDetection.severity} Risk
                </span>
              </h5>
              {activeDetection.details && (
                <p className="text-xs text-purple-200/80 mt-1 font-medium">{activeDetection.details}</p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-[9px] font-mono text-purple-300/60 uppercase">Confidence</div>
                <div className="text-sm font-mono font-bold text-emerald-400">{activeDetection.confidence}%</div>
              </div>
              <button
                onClick={() => setActiveDetection(null)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
