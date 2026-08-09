import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Asset {
  id: string;
  name: string;
  infrastructureType: string;
  location: string;
  status: string;
  mapLink?: string;
  lat?: number | null;
  lng?: number | null;
}

interface MapOverviewModalProps {
  onClose: () => void;
}

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#6D28D9;border:2px solid #fff;box-shadow:0 0 0 4px rgba(109,40,217,0.3)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

export default function MapOverviewModal({ onClose }: MapOverviewModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5001/assets")
      .then((res) => res.json())
      .then((data) => setAssets(data))
      .catch((err) => console.error("Error fetching assets:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !mapContainerRef.current || mapRef.current) return;

    const located = assets.filter(
      (a): a is Asset & { lat: number; lng: number } =>
        typeof a.lat === "number" && typeof a.lng === "number"
    );

    const map = L.map(mapContainerRef.current, {
      center: located.length > 0 ? [located[0].lat, located[0].lng] : [19.076, 72.8777],
      zoom: located.length > 0 ? 5 : 3
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    if (located.length > 0) {
      const markers: L.Marker[] = [];
      located.forEach((asset) => {
        const marker = L.marker([asset.lat, asset.lng], { icon: markerIcon }).addTo(map);
        marker.bindPopup(
          `<div style="font-family:sans-serif;padding:2px"><strong>${asset.name}</strong><br/>${asset.infrastructureType}<br/>${asset.location}<br/>Status: ${asset.status}${
            asset.mapLink ? `<br/><a href="${asset.mapLink}" target="_blank" rel="noopener noreferrer" style="color:#6D28D9;font-weight:bold">Open in Google Maps</a>` : ""
          }</div>`
        );
        markers.push(marker);
      });
      if (markers.length > 1) {
        map.fitBounds(L.featureGroup(markers).getBounds().pad(0.3));
      }
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [loading, assets]);

  const unlocatedCount = assets.filter((a) => !(typeof a.lat === "number" && typeof a.lng === "number")).length;

  return (
    <div className="fixed -top-20 -bottom-20 -left-20 -right-20 bg-[#1E1235]/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white/90 border border-white rounded-3xl p-6 shadow-2xl relative backdrop-blur-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5B4B7C] hover:text-[#1E1235] z-[1000]"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-extrabold text-[#1E1235] mb-1">Map Overview</h3>
        <p className="text-xs text-[#5B4B7C] mb-4 font-medium">
          Assets pinned by their Google Maps location.
          {unlocatedCount > 0 && ` ${unlocatedCount} asset(s) have no map link yet.`}
        </p>
        <div
          ref={mapContainerRef}
          className="w-full h-96 rounded-2xl overflow-hidden border border-white/80 shadow-inner z-10"
        />
      </div>
    </div>
  );
}
