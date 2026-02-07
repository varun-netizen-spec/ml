import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { log } from "console";

const PLANT_DISEASES = {
  Apple: {
    diseases: ["Apple scab", "Black rot", "Cedar apple rust"],
    defaultRecommendations: [
      "Maintain proper tree spacing for good air circulation",
      "Prune regularly to remove dead or diseased branches",
      "Apply fungicides during the growing season",
      "Clean up fallen leaves and fruit",
      "Monitor for early signs of disease",
    ],
  },
  Corn: {
    diseases: ["Cercospora leaf spot", "Common rust", "Northern Leaf Blight"],
    defaultRecommendations: [
      "Rotate crops every season",
      "Plant disease-resistant varieties",
      "Maintain proper plant spacing",
      "Monitor soil moisture levels",
      "Apply fungicides when necessary",
    ],
  },
  Grape: {
    diseases: ["Black rot", "Esca (Black Measles)", "Leaf blight"],
    defaultRecommendations: [
      "Prune vines to improve air circulation",
      "Remove infected fruit and leaves",
      "Apply fungicides preventively",
      "Maintain proper trellising",
      "Monitor humidity levels",
    ],
  },
  Potato: {
    diseases: ["Early blight", "Late blight"],
    defaultRecommendations: [
      "Practice crop rotation",
      "Plant certified disease-free seed potatoes",
      "Hill soil around plants",
      "Maintain proper soil drainage",
      "Monitor for disease symptoms",
    ],
  },
  Tomato: {
    diseases: [
      "Bacterial spot",
      "Early blight",
      "Late blight",
      "Leaf Mold",
      "Septoria leaf spot",
    ],
    defaultRecommendations: [
      "Space plants for good air circulation",
      "Water at the base of plants",
      "Remove infected leaves promptly",
      "Apply appropriate fungicides",
      "Use mulch to prevent soil splash",
    ],
  },
};

type PredictionType = {
  plant_name: string;
  disease_type: string;
  is_healthy: boolean;
  confidence: number;
  severity: "low" | "medium" | "high";
  recommendations: string[];
};

export default function Predict() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [prediction, setPrediction] = useState<PredictionType | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string>("");
  const [defaultRecs, setDefaultRecs] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedPlant && PLANT_DISEASES[selectedPlant]) {
      setDefaultRecs(PLANT_DISEASES[selectedPlant].defaultRecommendations);
    } else {
      setDefaultRecs([]);
    }
  }, [selectedPlant]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedImage(file);
  };

  const handlePredict = async () => {
    if (!selectedImage || !selectedPlant) {
      toast({
        title: "Missing information",
        description: "Please select both an image and a plant type",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPrediction(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      formData.append("plant_type", selectedPlant.toLowerCase());

      // ✅ Correct backend URL (your current working IP)
      const apiUrl = "https://goldfish-app-kro58.ondigitalocean.app";
      console.log("Using API URL:", apiUrl);

      const response = await fetch(`${apiUrl}/api/predict`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Prediction failed. Please check your backend connection.");
      }

      const result = await response.json();

      if (result.success && result.prediction) {
        const predictionWithRecs = {
          ...result.prediction,
          recommendations: [
            ...(result.prediction.recommendations || []),
            ...defaultRecs,
          ],
        };
        setPrediction(predictionWithRecs);
      } else {
        throw new Error(result.error || "Prediction failed.");
      }
    } catch (error) {
      toast({
        title: "Prediction failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to analyze the image.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Plant Disease Detection</CardTitle>
          <CardDescription>
            Upload a plant image for AI-based disease analysis
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Plant Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="plant-type">Plant Type</Label>
            <Select value={selectedPlant} onValueChange={setSelectedPlant}>
              <SelectTrigger id="plant-type">
                <SelectValue placeholder="Select plant type" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(PLANT_DISEASES).map((plantName) => (
                  <SelectItem key={plantName} value={plantName}>
                    {plantName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlant && defaultRecs.length > 0 && !prediction && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">
                General Care Tips for {selectedPlant}:
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                {defaultRecs.map((rec, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="image-upload">Plant Image</Label>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
            />
            {selectedImage && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedImage.name}
              </p>
            )}
          </div>

          <Button
            onClick={handlePredict}
            disabled={loading || !selectedImage || !selectedPlant}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Analyze Plant
              </>
            )}
          </Button>

          {prediction && (
            <div className="mt-4 p-4 border rounded-lg space-y-2">
              <h3 className="font-semibold">Results:</h3>
              <p>🌿 Plant: {prediction.plant_name}</p>
              <p>
                🌡️ Status:{" "}
                {prediction.is_healthy ? "Healthy ✅" : "Disease Detected ⚠️"}
              </p>
              <p>🦠 Disease: {prediction.disease_type}</p>
              <p>🎯 Confidence: {prediction.confidence}%</p>
              <p>🔥 Severity: {prediction.severity}</p>
              <div>
                <h4 className="font-medium">🧾 Recommendations:</h4>
                <ul className="list-disc pl-5">
                  {prediction.recommendations.map((rec: string, i: number) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
