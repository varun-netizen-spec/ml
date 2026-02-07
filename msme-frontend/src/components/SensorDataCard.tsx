import React from "react";
import { SensorData } from "@/types";

interface Props {
  data: SensorData;
}

const SensorDataCard: React.FC<Props> = ({ data }) => {
  return (
    <div className="border rounded-2xl shadow-sm p-4 bg-white">
      <h2 className="font-semibold text-lg mb-3">Sensor #{data.id}</h2>
      <p>🌡️ Temperature: {data.temperature}°C</p>
      <p>💧 Moisture: {data.moisture}%</p>
      <p>🪴 Soil Type: {data.soilType}</p>
      <p className="mt-3 text-green-700 font-medium">
        ✅ Recommendation: {data.recommendation}
      </p>
    </div>
  );
};

export default SensorDataCard;
