import React, { useState } from "react";
import MapView from "@/components/MapView";
import SensorInput from "@/components/SensorInput";
import SensorDataCard from "@/components/SensorDataCard";
import DroneFeedModal from "@/components/DroneFeedModal";
import { SensorData, Drone } from "@/types";

const Dashboard: React.FC = () => {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);

  const handleSensorFetch = (data: SensorData) => {
    setSensorData(data);
  };

  return (
    <div className="p-6 grid gap-6 md:grid-cols-2">
      <div>
        <MapView onDroneSelect={setSelectedDrone} />
      </div>
      <div className="space-y-4">
        <SensorInput onFetch={handleSensorFetch} />
        {sensorData && <SensorDataCard data={sensorData} />}
      </div>

      {selectedDrone && (
        <DroneFeedModal drone={selectedDrone} onClose={() => setSelectedDrone(null)} />
      )}
    </div>
  );
};

export default Dashboard;
