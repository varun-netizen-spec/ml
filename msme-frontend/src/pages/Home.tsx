import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

// ---------- types ----------
interface Sensor {
  id: string;
  name?: string;
  location?: any;
  parameters?: {
    temperature?: number;
    moisture?: number;
    ph?: number;
    nitrogen?: number;
    phosphorus?: number;
    potassium?: number;
    soilType?: string;
  };
  lat?: number;
  lng?: number;
}

interface Field {
  id: string;
  name: string;
  bounds: [number, number][];
  color: string;
}

// ---------- helpers ----------
function parsePolygon(boundary: any): [number, number][] {
  if (!boundary) return [];
  if (typeof boundary === "object" && boundary.type === "Polygon") {
    return boundary.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]);
  }
  if (typeof boundary === "string") {
    const match = boundary.match(/\(\((.*?)\)\)/);
    if (!match) return [];
    return match[1].split(",").map((pair: string) => {
      const [lng, lat] = pair.trim().split(" ").map(Number);
      return [lat, lng];
    });
  }
  return [];
}

function randomColorForField(id: string) {
  const colors = ["#4caf50", "#ff9800", "#2196f3", "#9c27b0", "#f44336"];
  return colors[Math.abs(id.charCodeAt(0)) % colors.length];
}

function pointInPolygon(point: [number, number], polygon: [number, number][]) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const getRecommendation = (avg: any) => {
  const recs: string[] = [];
  if (avg.moisture < 40) recs.push("💧 Low soil moisture — increase irrigation.");
  else if (avg.moisture > 65) recs.push("⚠️ High moisture — improve drainage.");
  if (avg.ph < 6.0) recs.push("🧪 Acidic soil — add lime.");
  else if (avg.ph > 7.5) recs.push("🧪 Alkaline soil — add compost or sulfur.");
  if (avg.nitrogen < 30) recs.push("🌿 Low nitrogen — apply urea or compost.");
  if (avg.phosphorus < 20) recs.push("🌾 Low phosphorus — apply DAP or phosphate.");
  if (avg.potassium < 25) recs.push("🍌 Low potassium — add potash or compost.");
  if (recs.length === 0) recs.push(`✅ ${avg.soilType ?? "Soil"} looks healthy!`);
  return recs;
};

// ---------- component ----------
export default function Home() {
  const mapRef = useRef<L.Map | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedField, setSelectedField] = useState<string>("All Fields");
  const [chartData, setChartData] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // --- fetch data ---
  async function fetchFieldsFromDB() {
    const { data, error } = await supabase.from("fields").select("id, name, boundary");
    if (error) console.error(error);
    if (!data) return;
    const parsed = data.map((f) => ({
      id: f.id,
      name: f.name,
      bounds: parsePolygon(f.boundary),
      color: randomColorForField(f.id),
    }));
    setFields(parsed);
  }

  async function fetchSensorsFromDB() {
    const { data, error } = await supabase.from("sensors").select("*");
    if (error) console.error(error);
    if (!data) return;
    const parsed = data.map((s) => {
      if (typeof s.location === "string" && s.location.includes("POINT")) {
        const match = s.location.match(/\((.*?)\)/);
        if (match) {
          const [lng, lat] = match[1].split(" ").map(Number);
          return { ...s, lat, lng };
        }
      }
      if (s.location?.type === "Point" && Array.isArray(s.location.coordinates)) {
        const [lng, lat] = s.location.coordinates;
        return { ...s, lat, lng };
      }
      return s;
    });
    setSensors(parsed);
  }

  useEffect(() => {
    fetchFieldsFromDB();
    fetchSensorsFromDB();

    const ch = supabase
      .channel("home-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "fields" }, fetchFieldsFromDB)
      .on("postgres_changes", { event: "*", schema: "public", table: "sensors" }, fetchSensorsFromDB)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // --- map init ---
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map("map", {
      center: [11.1271, 78.6569],
      zoom: 7,
    });

    const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const satellite = L.tileLayer("https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      maxZoom: 20,
    });

    const baseLayers = { "🗺️ Street Map": street, "🌍 Satellite View": satellite };
    const overlayLayers: Record<string, L.LayerGroup> = {};

    const control = L.control.layers(baseLayers, overlayLayers, { collapsed: true }).addTo(map);
    (map as any)._mainControl = control;
    mapRef.current = map;
  }, []);

// --- draw overlays ---
useEffect(() => {
  const map = mapRef.current;
  if (!map) return;

  const control = (map as any)._mainControl as L.Control.Layers;
  if (!control) return;

  // STEP 1: Remove all previous overlays (only those we added)
  Object.values((control as any)._layers ?? {}).forEach((layerObj: any) => {
    if (layerObj.overlay && map.hasLayer(layerObj.layer)) {
      map.removeLayer(layerObj.layer);
    }
  });

  // Clear overlays from control UI too
  const existingLayers = Object.values((control as any)._layers ?? {});
  existingLayers.forEach((obj: any) => {
    if (obj.overlay) control.removeLayer(obj.layer);
  });

  // STEP 2: Rebuild overlays cleanly
  fields.forEach((f) => {
    if (!f.bounds?.length) return;

    // Field Polygon
    const fieldLayer = L.layerGroup();
    const polygon = L.polygon(f.bounds, {
      color: f.color || "green",
      weight: 2,
      dashArray: "6,6",
      fillOpacity: 0.25,
    }).bindPopup(`<b>${f.name}</b>`);
    polygon.addTo(fieldLayer);

    // Sensors belonging to that field
    const sensorLayer = L.layerGroup();
    sensors
      .filter((s) => s.lat && s.lng && pointInPolygon([s.lat, s.lng], f.bounds))
      .forEach((s) => {
        const marker = L.circleMarker([s.lat, s.lng], {
          radius: 7,
          fillColor: f.color || "#666",
          color: "#333",
          weight: 1,
          fillOpacity: 0.9,
        }).bindTooltip(
          `<b>${s.name ?? s.id}</b><br>
           🌡️ Temp: ${s.parameters?.temperature ?? "—"} °C<br>
           💧 Moisture: ${s.parameters?.moisture ?? "—"}%<br>
           pH: ${s.parameters?.ph ?? "—"}`
        );
        marker.addTo(sensorLayer);
      });

    // STEP 3: Add to control + map
    control.addOverlay(fieldLayer, `🟩 ${f.name} (Field)`);
    control.addOverlay(sensorLayer, `🔘 ${f.name} (Sensors)`);

    // Auto-add visible layers (optional)
    fieldLayer.addTo(map);
    sensorLayer.addTo(map);
  });
}, [fields, sensors]);


  // --- zoom handling ---
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (selectedField === "All Fields") {
      const allPoints = fields.flatMap((f) => f.bounds);
      if (allPoints.length) {
        const bounds = L.latLngBounds(allPoints as [number, number][]);
        map.flyToBounds(bounds, { duration: 1.2, maxZoom: 10, padding: [40, 40] });
      }
    } else {
      const field = fields.find((f) => f.name === selectedField);
      if (field) {
        const poly = L.polygon(field.bounds);
        map.flyToBounds(poly.getBounds(), { duration: 1.2, maxZoom: 15, padding: [30, 30] });
      }
    }
  }, [selectedField, fields]);

  // --- chart + recs ---
  useEffect(() => {
    if (!sensors.length) return;
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString("en-IN", { hour12: false });
      const avg = (key: string) =>
        sensors.reduce((a, s) => a + (s.parameters?.[key] ?? 0), 0) / sensors.length;

      setChartData((p) => [
        ...p.slice(-15),
        { time: now, temperature: avg("temperature"), moisture: avg("moisture"), ph: avg("ph") },
      ]);
    }, 2500);
    return () => clearInterval(interval);
  }, [sensors]);

  useEffect(() => {
    let activeSensors = sensors;
    if (selectedField !== "All Fields") {
      const field = fields.find((f) => f.name === selectedField);
      if (field) {
        activeSensors = sensors.filter((s) =>
          s.lat && s.lng ? pointInPolygon([s.lat, s.lng], field.bounds) : false
        );
      }
    }

    if (activeSensors.length > 0) {
      const avg = {
        moisture: activeSensors.reduce((a, s) => a + (s.parameters?.moisture ?? 0), 0) / activeSensors.length,
        ph: activeSensors.reduce((a, s) => a + (s.parameters?.ph ?? 0), 0) / activeSensors.length,
        nitrogen: activeSensors.reduce((a, s) => a + (s.parameters?.nitrogen ?? 0), 0) / activeSensors.length,
        phosphorus: activeSensors.reduce((a, s) => a + (s.parameters?.phosphorus ?? 0), 0) / activeSensors.length,
        potassium: activeSensors.reduce((a, s) => a + (s.parameters?.potassium ?? 0), 0) / activeSensors.length,
        soilType: activeSensors[0].parameters?.soilType ?? "Generic",
      };
      setRecommendations(getRecommendation(avg));
    } else {
      setRecommendations(["⚠️ No sensors in this field."]);
    }
  }, [sensors, selectedField, fields]);

  // --- render ---
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 min-h-screen bg-background">
      {/* Map */}
      <div className="flex flex-col gap-3">
        <Select onValueChange={setSelectedField} defaultValue="All Fields">
          <SelectTrigger className="w-60 mb-2 z-[1000]">
            <SelectValue placeholder="Select Field" />
          </SelectTrigger>
          <SelectContent className="z-[2000]">
            <SelectItem value="All Fields">🌎 All Fields</SelectItem>
            {fields.map((f) => (
              <SelectItem key={f.id} value={f.name}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div id="map" className="h-[70vh] lg:h-[80vh] w-full rounded-lg border border-border shadow-sm z-0" />
      </div>

      {/* Chart + Recommendations */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>📈 Live Sensor Averages</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="temperature" stroke="#ff7300" dot={false} name="Temp (°C)" />
                <Line type="monotone" dataKey="moisture" stroke="#00bcd4" dot={false} name="Moisture (%)" />
                <Line type="monotone" dataKey="ph" stroke="#4caf50" dot={false} name="pH" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🌱 Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
