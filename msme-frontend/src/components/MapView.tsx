import React from "react";

interface Drone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  videoUrl: string;
}

interface MapViewProps {
  onDroneSelect: (drone: Drone) => void;
}

const mockDrones: Drone[] = [
  {
    id: "drone-1",
    name: "Drone Alpha",
    lat: 19.076,
    lng: 72.8777,
    status: "Active",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    id: "drone-2",
    name: "Drone Beta",
    lat: 19.080,
    lng: 72.880,
    status: "Idle",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
  },
];

const MapView: React.FC<MapViewProps> = ({ onDroneSelect }) => {
  return (
    <div className="border rounded-2xl shadow-sm p-4 bg-white h-[400px] relative">
      <h2 className="font-semibold text-lg mb-3">Drone Map</h2>

      {/* Fake map background */}
      <div className="bg-green-100 h-full flex items-center justify-center text-gray-500 italic">
        (Map Placeholder)
      </div>

      {/* Drone markers */}
      <div className="absolute bottom-4 left-4 space-y-2">
        {mockDrones.map((drone) => (
          <button
            key={drone.id}
            onClick={() => onDroneSelect(drone)}
            className="bg-blue-600 text-white px-3 py-1 rounded-xl text-sm hover:bg-blue-700"
          >
            {drone.name} ({drone.status})
          </button>
        ))}
      </div>
    </div>
  );
};

export default MapView;
