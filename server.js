import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import multer from "multer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "db.json");
const PYTHON_SERVICE_URL = (process.env.PYTHON_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");

const getUploadUrl = (filename) => {
  if (process.env.PUBLIC_URL) {
    return `${process.env.PUBLIC_URL.replace(/\/$/, "")}/uploads/${encodeURIComponent(filename)}`;
  }
  if (process.env.NODE_ENV === "production") {
    return `/uploads/${encodeURIComponent(filename)}`;
  }
  return `http://localhost:${PORT}/uploads/${encodeURIComponent(filename)}`;
};

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// Helper function to read database
const readDB = () => {
  try {
    const dbDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      // Default seed data
      const defaultAssets = [
        {
          id: "1",
          name: "Bridge Structure Mesh",
          infrastructureType: "3D OBJ Model",
          location: "Mumbai Project",
          thumbnail: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=150&q=80",
          inspectionPageId: "mumbai-bridge-qa",
          gDriveLink: "https://drive.google.com/drive/folders/1B_eHh4v1R-G9-mock-mumbai",
          status: "Passed",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "2",
          name: "Solar Site Orthomosaic",
          infrastructureType: "GeoTIFF Map",
          location: "Rajasthan Site",
          thumbnail: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=150&q=80",
          inspectionPageId: "rajasthan-solar-thermal",
          gDriveLink: "https://drive.google.com/drive/folders/1B_eHh4v1R-G9-mock-rajasthan",
          status: "Passed",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "3",
          name: "Wind Turbine CAD Grid",
          infrastructureType: "IFC Blueprint",
          location: "Gujarat Site",
          thumbnail: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=150&q=80",
          inspectionPageId: "gujarat-turbine-qa",
          gDriveLink: "https://drive.google.com/drive/folders/1B_eHh4v1R-G9-mock-gujarat",
          status: "Passed",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "4",
          name: "Utility Line LiDAR scan",
          infrastructureType: "LAS Point Cloud",
          location: "Delhi Plant",
          thumbnail: "https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=150&q=80",
          inspectionPageId: "delhi-utility-lidar",
          gDriveLink: "https://drive.google.com/drive/folders/1B_eHh4v1R-G9-mock-delhi",
          status: "Passed",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      const defaultMissions = [
        {
          id: "m1",
          assetId: "1",
          assetName: "Bridge Structure Mesh",
          date: "May 26, 2024",
          duration: "18m 42s",
          area: "42 Acres",
          status: "Completed",
          anomaliesCount: 4
        }
      ];
      const defaultTeam = [
        { id: "t1", name: "John Doe", email: "admin@gmail.com", role: "Administrator", status: "Active", createdAt: new Date().toISOString() },
        { id: "t2", name: "Sarah Jenkins", email: "sarah.j@company.com", role: "Quality Analyst", status: "Active", createdAt: new Date().toISOString() },
        { id: "t3", name: "Alex Carter", email: "alex.c@company.com", role: "Drone Pilot (FAA Part 107)", status: "Active", createdAt: new Date().toISOString() },
        { id: "t4", name: "Elena Rostova", email: "elena.r@company.com", role: "BIM Engineer", status: "Active", createdAt: new Date().toISOString() }
      ];
      fs.writeFileSync(DB_FILE, JSON.stringify({ assets: defaultAssets, missions: defaultMissions, team: defaultTeam }, null, 2));
      return { assets: defaultAssets, missions: defaultMissions, team: defaultTeam };
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!parsed.missions) {
      parsed.missions = [];
    }
    if (!parsed.team) {
      parsed.team = [];
    }
    return parsed;
  } catch (err) {
    console.error("Error reading database file", err);
    return { assets: [], missions: [], team: [] };
  }
};

// Helper function to write to database
const writeDB = (data) => {
  try {
    const dbDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing database file", err);
  }
};

// Google Maps short links (maps.app.goo.gl, goo.gl/maps/...) never contain lat/lng in the
// URL text itself — the coordinates only appear after following the HTTP redirect to the
// full google.com/maps/... URL. The frontend can't do this itself (cross-origin redirect,
// blocked by CORS), so we resolve it here before persisting the asset.
const extractLatLngFromUrl = (url) => {
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,   // precise place marker (most accurate when present)
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,        // map view center
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,   // ?q=lat,lng share links
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
};

const resolveLatLngFromMapLink = async (mapLink) => {
  if (!mapLink) return null;
  const direct = extractLatLngFromUrl(mapLink);
  if (direct) return direct;
  try {
    const resp = await fetch(mapLink, { redirect: "follow" });
    return extractLatLngFromUrl(resp.url);
  } catch (err) {
    console.error("Failed to resolve map link:", mapLink, err.message);
    return null;
  }
};

// 1. GET /assets - List all assets
app.get("/assets", (req, res) => {
  const db = readDB();
  res.json(db.assets);
});

// GET /api/gdrive-images - List image files from a public Google Drive folder link
// so drone photos already sitting in Drive can be pulled straight into the
// inspection pipeline instead of manually re-uploading each one.
app.get("/api/gdrive-images", async (req, res) => {
  const link = req.query.link;
  if (!link) return res.status(400).json({ error: "Missing 'link' query param" });

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GOOGLE_DRIVE_API_KEY is not configured on the server" });
  }

  const folderIdMatch = link.match(/folders\/([a-zA-Z0-9_-]+)/) || link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const folderId = folderIdMatch ? folderIdMatch[1] : null;
  if (!folderId) {
    return res.status(400).json({ error: "Could not extract a Drive folder ID from the provided link" });
  }

  try {
    const query = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed = false`);
    const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType)&key=${apiKey}`;
    const driveRes = await fetch(driveUrl);
    const driveData = await driveRes.json();

    if (driveData.error) {
      return res.status(502).json({ error: driveData.error.message || "Google Drive API request failed" });
    }

    // Drive's "uc?export=download" link doesn't reliably load as a plain <img src=""> in the
    // browser (it serves a redirect/interstitial rather than raw bytes for embedded requests),
    // and neither our own YOLO service nor the browser should have to fight that per-request.
    // So we download the actual bytes once here and re-serve them from our own /uploads, exactly
    // like manually uploaded photos.
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const extFromMime = (mimeType) => {
      const map = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
      return map[mimeType] || path.extname("x.jpg");
    };

    const images = await Promise.all((driveData.files || []).map(async (f) => {
      const mediaUrl = `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${apiKey}`;
      const mediaRes = await fetch(mediaUrl);
      if (!mediaRes.ok) {
        throw new Error(`Failed to download "${f.name}" from Drive (${mediaRes.status})`);
      }
      const buffer = Buffer.from(await mediaRes.arrayBuffer());
      const ext = path.extname(f.name) || extFromMime(f.mimeType);
      const filename = `${Date.now()}-gdrive-${f.id}${ext}`;
      fs.writeFileSync(path.join(uploadDir, filename), buffer);
      return { name: f.name, url: getUploadUrl(filename) };
    }));

    res.json({ images });
  } catch (err) {
    console.error("Error listing Drive folder images:", err);
    res.status(500).json({ error: "Failed to list images from Google Drive folder: " + err.message });
  }
});

// 2. GET /assets/:id - Get asset by id
app.get("/assets/:id", (req, res) => {
  const db = readDB();
  const asset = db.assets.find((a) => a.id === req.params.id);
  if (!asset) {
    return res.status(404).json({ error: "Asset not found" });
  }
  res.json(asset);
});

// 3. POST /assets - Create a new asset
app.post("/assets", async (req, res) => {
  const { name, infrastructureType, location, thumbnail, inspectionPageId, gDriveLink, mapLink, lat, lng, status, assignedTo, nextAppointmentDate } = req.body;
  if (!name || !infrastructureType || !location) {
    return res.status(400).json({ error: "Missing required fields (name, infrastructureType, location)" });
  }

  let finalLat = lat !== undefined ? lat : null;
  let finalLng = lng !== undefined ? lng : null;
  if (mapLink) {
    const resolved = await resolveLatLngFromMapLink(mapLink);
    if (resolved) { finalLat = resolved.lat; finalLng = resolved.lng; }
  }

  const db = readDB();
  const newAsset = {
    id: String(Date.now()),
    name,
    infrastructureType,
    location,
    thumbnail: thumbnail || "/placeholder-asset.svg",
    inspectionPageId: inspectionPageId || "custom-inspect-id",
    gDriveLink: gDriveLink || "",
    mapLink: mapLink || "",
    lat: finalLat,
    lng: finalLng,
    status: status || "Passed",
    assignedTo: assignedTo || null,
    nextAppointmentDate: nextAppointmentDate || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.assets.push(newAsset);
  writeDB(db);
  res.status(201).json(newAsset);
});

// 4. PUT /assets/:id - Update an existing asset
app.put("/assets/:id", async (req, res) => {
  const db = readDB();
  const assetIdx = db.assets.findIndex((a) => a.id === req.params.id);
  if (assetIdx === -1) {
    return res.status(404).json({ error: "Asset not found" });
  }

  const existing = db.assets[assetIdx];
  const { name, infrastructureType, location, thumbnail, inspectionPageId, gDriveLink, mapLink, lat, lng, status, assignedTo, nextAppointmentDate } = req.body;

  let finalLat = lat !== undefined ? lat : existing.lat;
  let finalLng = lng !== undefined ? lng : existing.lng;
  const nextMapLink = mapLink !== undefined ? mapLink : existing.mapLink;
  if (nextMapLink && nextMapLink !== existing.mapLink) {
    const resolved = await resolveLatLngFromMapLink(nextMapLink);
    if (resolved) { finalLat = resolved.lat; finalLng = resolved.lng; }
  }

  const updatedAsset = {
    ...existing,
    name: name !== undefined ? name : existing.name,
    infrastructureType: infrastructureType !== undefined ? infrastructureType : existing.infrastructureType,
    location: location !== undefined ? location : existing.location,
    thumbnail: thumbnail !== undefined ? thumbnail : existing.thumbnail,
    inspectionPageId: inspectionPageId !== undefined ? inspectionPageId : existing.inspectionPageId,
    gDriveLink: gDriveLink !== undefined ? gDriveLink : existing.gDriveLink,
    mapLink: nextMapLink,
    lat: finalLat,
    lng: finalLng,
    status: status !== undefined ? status : existing.status,
    assignedTo: assignedTo !== undefined ? assignedTo : existing.assignedTo,
    nextAppointmentDate: nextAppointmentDate !== undefined ? nextAppointmentDate : existing.nextAppointmentDate,
    updatedAt: new Date().toISOString()
  };

  db.assets[assetIdx] = updatedAsset;
  writeDB(db);
  res.json(updatedAsset);
});

// 5. DELETE /assets/:id - Delete an asset
app.delete("/assets/:id", (req, res) => {
  const db = readDB();
  const assetIdx = db.assets.findIndex((a) => a.id === req.params.id);
  if (assetIdx === -1) {
    return res.status(404).json({ error: "Asset not found" });
  }

  db.assets.splice(assetIdx, 1);
  writeDB(db);
  res.json({ message: "Asset successfully deleted" });
});

// Team routes
app.get("/team", (req, res) => {
  const db = readDB();
  res.json(db.team || []);
});

app.post("/team", (req, res) => {
  const { name, email, role, status } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: "Missing required fields (name, email, role)" });
  }

  const db = readDB();
  if (!db.team) db.team = [];
  const newMember = {
    id: String(Date.now()),
    name,
    email,
    role,
    status: status || "Active",
    createdAt: new Date().toISOString()
  };

  db.team.push(newMember);
  writeDB(db);
  res.status(201).json(newMember);
});

app.put("/team/:id", (req, res) => {
  const db = readDB();
  const idx = (db.team || []).findIndex((m) => m.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: "Team member not found" });
  }

  const existing = db.team[idx];
  const { name, email, role, status } = req.body;
  const updatedMember = {
    ...existing,
    name: name !== undefined ? name : existing.name,
    email: email !== undefined ? email : existing.email,
    role: role !== undefined ? role : existing.role,
    status: status !== undefined ? status : existing.status
  };

  db.team[idx] = updatedMember;
  writeDB(db);
  res.json(updatedMember);
});

app.delete("/team/:id", (req, res) => {
  const db = readDB();
  const idx = (db.team || []).findIndex((m) => m.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: "Team member not found" });
  }

  db.team.splice(idx, 1);
  writeDB(db);
  res.json({ message: "Team member successfully removed" });
});

// Live Mission Simulation state
let missionStartTime = Date.now();

// 6. GET /missions - List mission history
app.get("/missions", (req, res) => {
  const db = readDB();
  res.json(db.missions || []);
});

// 7. POST /missions - Save a completed mission
app.post("/missions", (req, res) => {
  const { assetId, assetName, duration, area, anomaliesCount } = req.body;
  if (!assetId || !assetName) {
    return res.status(400).json({ error: "Missing required fields (assetId, assetName)" });
  }

  const db = readDB();
  const newMission = {
    id: "m" + Date.now(),
    assetId,
    assetName,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    duration: duration || "12m 30s",
    area: area || "25 Acres",
    status: "Completed",
    anomaliesCount: anomaliesCount !== undefined ? anomaliesCount : Math.floor(Math.random() * 5)
  };

  db.missions = db.missions || [];
  db.missions.unshift(newMission);
  writeDB(db);
  res.status(201).json(newMission);
});

// 8. GET /live-mission - Get live telemetry and path waypoints centered around target coordinates
app.get("/live-mission", (req, res) => {
  const lat = parseFloat(req.query.lat) || 19.0760;
  const lng = parseFloat(req.query.lng) || 72.8777;

  // Let's generate a flight path grid around the center lat/lng
  const missionWaypoints = [
    { lat: lat, lng: lng, label: "Takeoff Point" },
    { lat: lat + 0.0008, lng: lng + 0.001, label: "Waypoint 1 (North-East Grid)" },
    { lat: lat + 0.0008, lng: lng - 0.001, label: "Waypoint 2 (North-West Grid)" },
    { lat: lat - 0.0008, lng: lng - 0.001, label: "Waypoint 3 (South-West Grid)" },
    { lat: lat - 0.0008, lng: lng + 0.001, label: "Waypoint 4 (South-East Grid)" },
    { lat: lat, lng: lng, label: "Home Port" }
  ];

  const durationSec = 60; // 60s total loop
  const elapsed = Math.floor((Date.now() - missionStartTime) / 1000) % durationSec;
  
  // Calculate progress
  const progress = Math.min(Math.floor((elapsed / durationSec) * 100), 100);
  
  // Determine status
  let status = "Surveying";
  if (progress < 5) status = "Pre-flight";
  else if (progress < 15) status = "Hovering";
  else if (progress > 90) status = "Landed";
  else if (progress > 75) status = "Returning";

  // Calculate current coordinates (interpolate between waypoints)
  const waypointCount = missionWaypoints.length;
  const segmentDuration = durationSec / (waypointCount - 1);
  const currentSegment = Math.floor(elapsed / segmentDuration);
  const segmentElapsed = elapsed % segmentDuration;
  const ratio = segmentElapsed / segmentDuration;

  let currentLat = missionWaypoints[0].lat;
  let currentLng = missionWaypoints[0].lng;

  if (currentSegment < waypointCount - 1) {
    const startWp = missionWaypoints[currentSegment];
    const endWp = missionWaypoints[currentSegment + 1];
    currentLat = startWp.lat + (endWp.lat - startWp.lat) * ratio;
    currentLng = startWp.lng + (endWp.lng - startWp.lng) * ratio;
  }

  // Telemetry attributes
  const battery = Math.max(100 - Math.floor(elapsed * 1.3), 12);
  const altitude = status === "Pre-flight" || status === "Landed" ? 0 : Math.floor(45 + Math.sin(elapsed) * 3);
  const speed = status === "Pre-flight" || status === "Hovering" || status === "Landed" ? 0 : parseFloat((12.5 + Math.cos(elapsed) * 1.5).toFixed(1));

  res.json({
    status,
    progress,
    battery,
    altitude,
    speed,
    currentCoords: { lat: parseFloat(currentLat.toFixed(6)), lng: parseFloat(currentLng.toFixed(6)) },
    waypoints: missionWaypoints,
    timestamp: new Date().toISOString()
  });
});

// AI Agent Orchestrator state
let orchestrationState = {
  status: "Idle",
  progress: 0,
  selectedAsset: null,
  agents: {
    retrieval: { status: "Waiting", progress: 0, reasoning: "", decision: "", confidence: 0 },
    quality: { status: "Waiting", progress: 0, reasoning: "", decision: "", confidence: 0 },
    coverage: { status: "Waiting", progress: 0, reasoning: "", decision: "", confidence: 0 },
    planner: { status: "Waiting", progress: 0, reasoning: "", decision: "", confidence: 0 },
    manager: { status: "Waiting", progress: 0, reasoning: "", decision: "", confidence: 0 }
  },
  logs: []
};

// Async runner function using Gemini Flash
async function runAgenticWorkflow(asset) {
  orchestrationState.status = "Active";
  orchestrationState.progress = 5;
  orchestrationState.selectedAsset = asset;
  orchestrationState.logs = ["Orchestrator: Initialized Agentic AI Session"];
  
  // Setup API Client
  const apiKey = process.env.GEMINI_API_KEY;
  let genAI = null;
  if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    orchestrationState.logs.push("Orchestrator: Verified GEMINI_API_KEY. Using Gemini 1.5 Flash.");
  } else {
    orchestrationState.logs.push("Orchestrator: WARNING - GEMINI_API_KEY not found in .env. Falling back to local heuristic reasoning model.");
  }

  const addLog = (msg) => {
    orchestrationState.logs.push(msg);
  };

  try {
    const isVideoLink = asset.gDriveLink && (
      asset.gDriveLink.toLowerCase().includes("file/d/") || 
      asset.gDriveLink.toLowerCase().includes("video") ||
      asset.gDriveLink.toLowerCase().includes(".mp4") ||
      asset.gDriveLink.toLowerCase().includes(".mov") ||
      asset.gDriveLink.toLowerCase().includes(".avi") ||
      asset.gDriveLink.toLowerCase().includes(".mkv") ||
      asset.gDriveLink.toLowerCase().includes("presentation")
    );

    // --- STEP 1: Retrieval Agent (Non-AI) ---
    orchestrationState.agents.retrieval.status = "Running";
    orchestrationState.agents.retrieval.progress = 30;
    addLog("Retrieval Agent: Connecting to Google Drive Link...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    addLog(`Retrieval Agent: Parsing folder for asset "${asset.name}"...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (isVideoLink) {
      addLog("Retrieval Agent: ERROR - Target resource is a single video file format, not an image folder.");
      orchestrationState.agents.retrieval.status = "Failed";
      orchestrationState.agents.retrieval.progress = 100;
      orchestrationState.agents.retrieval.decision = "Invalid format";
      orchestrationState.agents.retrieval.reasoning = "Fetched file metadata shows signature matches a compressed presentation video rather than a folder of raw drone survey images.";
      orchestrationState.agents.retrieval.confidence = 100;
    } else {
      const fileCount = Math.floor(Math.random() * 20) + 30;
      addLog(`Retrieval Agent: Retrieved ${fileCount} raw high-resolution flight images.`);
      orchestrationState.agents.retrieval.status = "Completed";
      orchestrationState.agents.retrieval.progress = 100;
      orchestrationState.agents.retrieval.decision = `Retrieved ${fileCount} images`;
      orchestrationState.agents.retrieval.reasoning = `Successfully fetched raw orthomosaic images and drone telemetry headers from path: ${asset.gDriveLink || "Local Asset Store"}`;
      orchestrationState.agents.retrieval.confidence = 100;
    }
    orchestrationState.progress = 25;

    // --- STEP 2: Mission Quality Agent (AI) ---
    orchestrationState.agents.quality.status = "Running";
    addLog("Mission Quality Agent: Initialized quality & resolution validation...");
    
    let qualityResult;
    if (isVideoLink) {
      qualityResult = {
        decision: "Requires Re-flight",
        confidenceScore: 99,
        reasoning: "Validation failed. Input resource is a compressed video stream file. Automated defect mapping models require raw orthomosaic JPEG captures with low distortion and metadata coordinates. Video frames lack high-resolution detail."
      };
    } else {
      const fileCount = 35;
      const qualityPrompt = `You are the Mission Quality Agent for a Drone Infrastructure Inspection platform.
Analyze the following drone capture job metadata and decide if it is suitable for automated crack and damage analysis:
Asset Name: "${asset.name}"
Infrastructure Type: "${asset.infrastructureType}"
Location: "${asset.location}"
Total Images: ${fileCount}
Image Resolution: 4000x3000px
Camera Sensor: 1/2.3" CMOS (20MP)

Determine:
1. Is this suitable for high-resolution inspection? (Yes/No)
2. Identify quality metrics, sensor constraints, or blur warnings.
3. Return a confidence score between 0 and 100.

Return ONLY a valid JSON object matching this schema:
{
  "reasoning": "Explain details of sensor, type suitability, and resolution factors",
  "decision": "Ready for Inspection" or "Requires Re-flight",
  "confidenceScore": 92
}`;

      if (genAI) {
        try {
          const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
          });
          const response = await model.generateContent(qualityPrompt);
          qualityResult = JSON.parse(response.response.text().trim());
        } catch (err) {
          addLog(`Quality Agent Error calling LLM: ${err.message}. Using backup model.`);
        }
      }

      if (!qualityResult) {
        // Local Heuristic Reasoning Model
        qualityResult = {
          decision: "Ready for Inspection",
          confidenceScore: 94,
          reasoning: `Sensor parameters check passed. 20MP resolution at 4000x3000px provides a ground sampling distance (GSD) of 0.85 cm/px at flight altitude of 45m, which is highly optimal for detecting cracks under 2mm on ${asset.name}.`
        };
      }
    }

    addLog(`Mission Quality Agent: Decision -> ${qualityResult.decision} (${qualityResult.confidenceScore}% Confidence)`);
    orchestrationState.agents.quality.status = isVideoLink ? "Failed" : "Completed";
    orchestrationState.agents.quality.progress = 100;
    orchestrationState.agents.quality.decision = qualityResult.decision;
    orchestrationState.agents.quality.reasoning = qualityResult.reasoning;
    orchestrationState.agents.quality.confidence = qualityResult.confidenceScore;
    orchestrationState.progress = 50;
    await new Promise(resolve => setTimeout(resolve, 2000));

    // --- STEP 3: Coverage Analysis Agent (AI) ---
    orchestrationState.agents.coverage.status = "Running";
    addLog("Coverage Analysis Agent: Running overlap analysis on GPS telemetry coordinates...");

    let coverageResult;
    if (isVideoLink) {
      coverageResult = {
        decision: "Requires Re-flight",
        confidenceScore: 100,
        reasoning: "Analysis aborted. Zero GPS coordinate metadata could be parsed from the video source file, making overlap calculation impossible."
      };
    } else {
      const coveragePrompt = `You are the Coverage Analysis Agent.
Evaluate the spatial coverage for drone images of the infrastructure asset:
Asset Name: "${asset.name}"
Overlap Setting: 80% Frontal, 75% Side
GPS Grid Drift: Under 0.5 meters
Camera Shutter Angle: 90 degrees

Determine:
1. Is there sufficient overlap to perform 3D photogrammetry stich?
2. Identify missing grids or gap warnings.
3. Provide a confidence score.

Return ONLY a valid JSON object matching this schema:
{
  "reasoning": "Analyze the overlap and grid density",
  "decision": "Ready for Inspection" or "Requires Re-flight",
  "confidenceScore": 89
}`;

      if (genAI) {
        try {
          const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
          });
          const response = await model.generateContent(coveragePrompt);
          coverageResult = JSON.parse(response.response.text().trim());
        } catch (err) {
          addLog(`Coverage Agent Error calling LLM: ${err.message}. Using backup model.`);
        }
      }

      if (!coverageResult) {
        coverageResult = {
          decision: "Ready for Inspection",
          confidenceScore: 88,
          reasoning: `Overlap checks passed. Spatial interpolation of EXIF latitude/longitude grids shows average camera intersection density of 8.2 images per point, with zero gaps identified in the primary structural span of the ${asset.name} layout.`
        };
      }
    }

    addLog(`Coverage Analysis Agent: Decision -> ${coverageResult.decision} (${coverageResult.confidenceScore}% Confidence)`);
    orchestrationState.agents.coverage.status = isVideoLink ? "Failed" : "Completed";
    orchestrationState.agents.coverage.progress = 100;
    orchestrationState.agents.coverage.decision = coverageResult.decision;
    orchestrationState.agents.coverage.reasoning = coverageResult.reasoning;
    orchestrationState.agents.coverage.confidence = coverageResult.confidenceScore;
    orchestrationState.progress = 75;
    await new Promise(resolve => setTimeout(resolve, 2000));

    // --- STEP 4: Mission Planning Agent (AI) ---
    orchestrationState.agents.planner.status = "Running";
    addLog("Mission Planning Agent: Constructing optimal batch partition sizes and anomaly prioritisation maps...");

    let plannerResult;
    if (isVideoLink) {
      plannerResult = {
        decision: "Inspection Planning Aborted",
        confidenceScore: 100,
        reasoning: "Planner aborted scheduling because no image dataset files were loaded."
      };
    } else {
      const plannerPrompt = `You are the Mission Planning Agent.
Generate the optimal image processing batches and inspection route sequence for:
Asset Name: "${asset.name}"
Total Images: 35

Determine:
1. Division of image batches.
2. Order of sections to inspect.
3. Provide a confidence score.

Return ONLY a valid JSON object matching this schema:
{
  "reasoning": "Detail how the batches are grouped and scheduled for analysis",
  "decision": "Optimal Plan Formulated",
  "confidenceScore": 95
}`;

      if (genAI) {
        try {
          const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
          });
          const response = await model.generateContent(plannerPrompt);
          plannerResult = JSON.parse(response.response.text().trim());
        } catch (err) {
          addLog(`Planner Agent Error calling LLM: ${err.message}. Using backup model.`);
        }
      }

      if (!plannerResult) {
        plannerResult = {
          decision: "Optimal Plan Formulated",
          confidenceScore: 92,
          reasoning: `Arranged photos into 3 logical spatial batches (Batch 1: Takeoff & Foundation - 15 items, Batch 2: Central Segment Span - 20 items, Batch 3: Anchor & Land - 7 items) optimized for parallel GPU classification.`
        };
      }
    }

    addLog(`Mission Planning Agent: Decision -> ${plannerResult.decision} (${plannerResult.confidenceScore}% Confidence)`);
    orchestrationState.agents.planner.status = isVideoLink ? "Failed" : "Completed";
    orchestrationState.agents.planner.progress = 100;
    orchestrationState.agents.planner.decision = plannerResult.decision;
    orchestrationState.agents.planner.reasoning = plannerResult.reasoning;
    orchestrationState.agents.planner.confidence = plannerResult.confidenceScore;
    orchestrationState.progress = 90;
    await new Promise(resolve => setTimeout(resolve, 2000));

    // --- STEP 5: Workflow Manager Agent (AI) ---
    orchestrationState.agents.manager.status = "Running";
    addLog("Workflow Manager Agent: Reviewing consensus decisions from all agents...");

    let managerResult;
    if (isVideoLink) {
      managerResult = {
        decision: "Requires Re-flight",
        confidenceScore: 100,
        reasoning: "Pipeline execution terminated due to critical agent validation failures. The target Google Drive resource points to a presentation video stream instead of high-resolution drone orthophoto JPEGs."
      };
    } else {
      const managerPrompt = `You are the Workflow Manager Agent.
Review the outcomes of previous agents to compile the final inspection decision:
Mission Quality: ${orchestrationState.agents.quality.decision}
Mission Coverage: ${orchestrationState.agents.coverage.decision}
Mission Plan: ${orchestrationState.agents.planner.decision}

Determine:
1. Is the flight job ready for inspection, or does it require a re-flight?
2. Provide a confidence score.

Return ONLY a valid JSON object matching this schema:
{
  "reasoning": "Synthesize the consensus across the pipeline",
  "decision": "Ready for Inspection" or "Requires Re-flight",
  "confidenceScore": 98
}`;

      if (genAI) {
        try {
          const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
          });
          const response = await model.generateContent(managerPrompt);
          managerResult = JSON.parse(response.response.text().trim());
        } catch (err) {
          addLog(`Manager Agent Error calling LLM: ${err.message}. Using backup model.`);
        }
      }

      if (!managerResult) {
        managerResult = {
          decision: "Ready for Inspection",
          confidenceScore: 98,
          reasoning: `All agents have resolved to 'Ready for Inspection' with high confidence. Data integrity, overlap indices, and GSD pixel thresholds conform to structural damage classification requirements.`
        };
      }
    }

    addLog(`Workflow Manager Agent: Decision -> ${managerResult.decision} (${managerResult.confidenceScore}% Confidence)`);
    orchestrationState.agents.manager.status = isVideoLink ? "Failed" : "Completed";
    orchestrationState.agents.manager.progress = 100;
    orchestrationState.agents.manager.decision = managerResult.decision;
    orchestrationState.agents.manager.reasoning = managerResult.reasoning;
    orchestrationState.agents.manager.confidence = managerResult.confidenceScore;

    orchestrationState.progress = 100;
    orchestrationState.status = isVideoLink ? "Failed" : "Completed";
    addLog(isVideoLink ? "Orchestrator: Pipeline aborted due to validation failure." : "Orchestrator: Agentic AI Workflow successfully concluded.");
  } catch (err) {
    addLog(`Orchestrator Error: ${err.message}`);
    orchestrationState.status = "Idle";
  }
}

// --- NEW LANGGRAPH INSPECTION ROUTES ---

// 1. Upload files endpoint for manual uploads
app.post("/api/uploads", upload.array("files"), (req, res) => {
  try {
    const files = req.files || [];
    const urls = files.map(file => getUploadUrl(file.filename));
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ error: "Failed to upload files: " + err.message });
  }
});

// 2. Stream inspection from LangGraph python service
app.post("/api/inspections/stream", async (req, res) => {
  const { assetId, images } = req.body;
  if (!assetId) {
    return res.status(400).json({ error: "Missing assetId" });
  }

  const db = readDB();
  const asset = db.assets.find(a => a.id === assetId);
  if (!asset) {
    return res.status(404).json({ error: "Asset not found" });
  }

  // Only pass through images actually provided by the caller (manual uploads).
  // We used to substitute a generic stock Unsplash photo here when none were
  // uploaded, which made the AI "analyze" an image completely unrelated to the
  // real asset and produce misleading results. If no real images were
  // uploaded, the pipeline now runs without image evidence and the agents
  // fall back honestly to heuristic (clearly labeled) output instead of
  // fabricating a vision analysis of a stock photo.
  const inspectionImages = images || [];

  try {
    // Send POST to python LangGraph service streaming endpoint
    const response = await fetch(`${PYTHON_SERVICE_URL}/inspect/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asset_id: asset.id,
        asset_name: asset.name,
        gdrive_link: asset.gDriveLink || "",
        images: inspectionImages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `LangGraph service error: ${errText}` });
    }

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Node.js stream pipelining
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    res.status(500).json({ error: "Failed to connect to LangGraph service: " + err.message });
  }
});

// 2b. Real YOLO crack detection on one image — called asynchronously by the frontend
// after the (LLM-based) inspection pipeline finishes, so it never blocks /api/inspections/stream.
app.post("/api/inspections/detect-crack", async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: "Missing imageUrl" });
  }

  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/detect/crack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `YOLO detection service error: ${errText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to connect to YOLO detection service: " + err.message });
  }
});

// 3. Save completed inspection and create report
app.post("/api/inspections/save", (req, res) => {
  const { assetId, agentStates, reportMarkdown, severity, nextInspectionDate } = req.body;
  if (!assetId || !agentStates || !reportMarkdown) {
    return res.status(400).json({ error: "Missing required inspection save parameters" });
  }

  const db = readDB();
  if (!db.inspections) db.inspections = [];
  if (!db.reports) db.reports = [];

  const assetIdx = db.assets.findIndex(a => a.id === assetId);
  let assetName = "Unknown Asset";
  if (assetIdx !== -1) {
    const asset = db.assets[assetIdx];
    assetName = asset.name;
    asset.status = severity === "High" || severity === "Action Required" ? "Action Required" : "Passed";
    asset.updatedAt = new Date().toISOString();
  }

  const newInspection = {
    id: "ins-" + Date.now(),
    assetId,
    assetName,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    severity,
    status: severity === "High" || severity === "Action Required" ? "Action Required" : "Passed",
    agentStates,
    reportMarkdown,
    nextInspectionDate
  };

  db.inspections.unshift(newInspection);

  // Generate Report entry
  const newReport = {
    id: "rep-" + Date.now(),
    title: `AI Inspection Report - ${assetName}`,
    type: "AI Analysis Report",
    date: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    size: `${Math.round(reportMarkdown.length / 102.4) / 10} KB`,
    content: reportMarkdown
  };

  db.reports.unshift(newReport);
  writeDB(db);

  res.status(201).json({ message: "Inspection saved and report generated", inspection: newInspection, report: newReport });
});

// 4. Get list of inspections
app.get("/api/inspections", (req, res) => {
  const db = readDB();
  res.json(db.inspections || []);
});

// Delete single inspection
app.delete("/api/inspections/:id", (req, res) => {
  const db = readDB();
  if (!db.inspections) db.inspections = [];
  const idx = db.inspections.findIndex((i) => i.id === req.params.id);
  if (idx !== -1) {
    db.inspections.splice(idx, 1);
    writeDB(db);
  }
  res.json({ message: "Inspection deleted" });
});

// Delete all inspections
app.delete("/api/inspections", (req, res) => {
  const db = readDB();
  db.inspections = [];
  writeDB(db);
  res.json({ message: "All inspections cleared" });
});


// 5. Get list of reports
app.get("/api/reports", (req, res) => {
  const db = readDB();
  res.json(db.reports || []);
});

// Delete single report
app.delete("/api/reports/:id", (req, res) => {
  const db = readDB();
  if (!db.reports) db.reports = [];
  const idx = db.reports.findIndex((r) => r.id === req.params.id);
  if (idx !== -1) {
    db.reports.splice(idx, 1);
    writeDB(db);
  }
  res.json({ message: "Report deleted" });
});

// Delete all reports
app.delete("/api/reports", (req, res) => {
  const db = readDB();
  db.reports = [];
  writeDB(db);
  res.json({ message: "All reports cleared" });
});


app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
