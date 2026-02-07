import React, { useState } from "react";
import { SensorData } from "@/types";

interface SensorInputProps {
  onFetch: (data: SensorData) => void;
}

const SensorInput: React.FC<SensorInputProps> = ({ onFetch }) => {
  const [sensorId, setSensorId] = useState("");

  const handleFetch = () => {
    // Simulate sensor data
    const mockData: SensorData = {
      id: sensorId || "sensor-001",
      moisture: 45,
      temperature: 28,
      soilType: "Black Soil",
      recommendation: "Suitable for cotton and soybean crops.",
    };
    onFetch(mockData);
  };

  return (
    <div className="border rounded-2xl shadow-sm p-4 bg-white">
      <h2 className="font-semibold text-lg mb-3">Sensor Data</h2>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={sensorId}
          onChange={(e) => setSensorId(e.target.value)}
          placeholder="Enter Sensor ID"
          className="border px-3 py-2 rounded-xl w-full"
        />
        <button
          onClick={handleFetch}
          className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700"
        >
          Fetch
        </button>
      </div>
    </div>
  );
};

export default SensorInput;
