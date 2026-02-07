import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type Field = { id: string; name: string; boundary?: any };
type Sensor = {
  id: string;
  name?: string;
  parameters?: Record<string, any>;
  location?: any;
};

export default function Devices() {
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<string>("");
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [newSensor, setNewSensor] = useState({ name: "", lat: "", lng: "" });
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState({ name: "", coords: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFields();

    const ch = supabase
      .channel("devices-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "fields" }, () => loadFields())
      .on("postgres_changes", { event: "*", schema: "public", table: "sensors" }, () => {
        if (selectedField) loadSensors(selectedField);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [selectedField]);

  async function loadFields() {
    const { data, error } = await supabase.from("fields").select("id, name, boundary");
    if (error) {
      console.error("loadFields error:", error);
      return;
    }
    setFields((data || []) as Field[]);
  }

  async function loadSensors(fieldId: string) {
    if (!fieldId) {
      setSensors([]);
      return;
    }
    const { data, error } = await supabase.from("sensors").select("*").eq("field_id", fieldId);
    if (error) {
      console.error("loadSensors error:", error);
      return;
    }
    setSensors((data || []) as Sensor[]);
  }

  function buildPolygonWkt(coordsText: string) {
    const pairs = coordsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((p) => {
        const [latStr, lngStr] = p.split(/\s+/);
        const lat = Number(latStr);
        const lng = Number(lngStr);
        return `${lng} ${lat}`;
      });
    if (pairs.length > 0 && pairs[0] !== pairs[pairs.length - 1]) pairs.push(pairs[0]);
    return `POLYGON((${pairs.join(", ")}))`;
  }

  async function addField() {
    if (!newField.name || !newField.coords) return alert("Please enter field name and coordinates.");
    setLoading(true);

    const polygonWkt = buildPolygonWkt(newField.coords);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      alert("You must be logged in to add a field.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("fields").insert({
      user_id: user.id,
      name: newField.name,
      boundary: polygonWkt,
    });

    if (error) {
      console.error("addField error:", error);
      alert("Failed to add field. Check console.");
    } else {
      setShowAddField(false);
      setNewField({ name: "", coords: "" });
      await loadFields();
    }
    setLoading(false);
  }

  async function addSensor() {
  if (!selectedField) return alert("Select a field first.");
  if (!newSensor.name || !newSensor.lat || !newSensor.lng)
    return alert("Fill sensor name and coordinates.");

  setLoading(true);

  const pointWKT = `POINT(${newSensor.lng} ${newSensor.lat})`;

  const { error } = await supabase.rpc("insert_sensor", {
    p_field_id: selectedField,
    p_name: newSensor.name,
    p_location: pointWKT,
    p_parameters: { temperature: null, moisture: null, ph: null },
  });

  if (error) {
    console.error("❌ addSensor error:", error);
    alert(`Failed to add sensor.\n${error.message}`);
  } else {
    setNewSensor({ name: "", lat: "", lng: "" });
    await loadSensors(selectedField);
  }

  setLoading(false);
}

  async function deleteSensor(id: string) {
    if (!confirm("Delete this sensor?")) return;
    await supabase.from("sensors").delete().eq("id", id);
    await loadSensors(selectedField);
  }

  return (
    <div className="p-6 space-y-8 min-h-screen bg-background">
      <div className="w-60">
        <Select
          onValueChange={(val) => {
            if (val === "add") {
              setShowAddField(true);
              setSelectedField("");
            } else {
              setSelectedField(val);
              loadSensors(val);
            }
          }}
          value={selectedField}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Field" />
          </SelectTrigger>
          <SelectContent>
            {fields.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
            <SelectItem value="add">➕ Add Field</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showAddField && (
        <div className="border rounded p-4 space-y-3">
          <h3 className="font-semibold text-lg">Add New Field</h3>
          <Input
            placeholder="Field Name"
            value={newField.name}
            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
          />
          <label className="text-sm text-muted-foreground">
            Enter coordinates as: <code>lat lng, lat lng, lat lng</code>
          </label>
          <textarea
            placeholder="12.97 77.59, 12.97 77.60, 12.98 77.60..."
            value={newField.coords}
            onChange={(e) => setNewField({ ...newField, coords: e.target.value })}
            className="border p-2 w-full rounded h-24"
          />
          <div className="flex gap-2">
            <Button onClick={addField} className="bg-blue-600" disabled={loading}>
              {loading ? "Saving..." : "Save Field"}
            </Button>
            <Button onClick={() => setShowAddField(false)} variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {selectedField && selectedField !== "add" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manage Sensors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input
                placeholder="Sensor Name"
                value={newSensor.name}
                onChange={(e) => setNewSensor({ ...newSensor, name: e.target.value })}
              />
              <Input
                placeholder="Latitude"
                value={newSensor.lat}
                onChange={(e) => setNewSensor({ ...newSensor, lat: e.target.value })}
                type="number"
              />
              <Input
                placeholder="Longitude"
                value={newSensor.lng}
                onChange={(e) => setNewSensor({ ...newSensor, lng: e.target.value })}
                type="number"
              />
              <div className="flex items-center">
                <Button className="w-full bg-green-600" onClick={addSensor} disabled={loading}>
                  Add Sensor
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Sensors in this field</h4>
              {sensors.length === 0 ? (
                <p className="text-muted-foreground">No sensors in this field yet.</p>
              ) : (
                <ul className="space-y-2">
                  {sensors.map((s: any) => (
                    <li key={s.id} className="py-3 space-y-1 border-b last:border-none">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">🆔 {s.name ?? s.id}</span>
                          <div className="text-sm text-muted-foreground">
                            {s.parameters ? JSON.stringify(s.parameters) : "No params"}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => deleteSensor(s.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
