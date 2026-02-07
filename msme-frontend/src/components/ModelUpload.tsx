import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { plantData } from "@/lib/plantData";

export const ModelUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelType, setModelType] = useState<string>("");
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setModelFile(file);
  };

  const handleUpload = async () => {
    if (!modelFile || !modelName || !modelType || selectedPlants.length === 0) {
      toast({ title: "Missing information", description: "Please fill in all fields and select at least one plant type", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to upload models");

      const filePath = `${user.id}/${Date.now()}_${modelFile.name}`;
      const { error: uploadError } = await supabase.storage.from("plant-models").upload(filePath, modelFile);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("plant_models").insert({
        user_id: user.id,
        name: modelName,
        model_path: filePath,
        model_type: modelType,
        plant_types: selectedPlants,
      });

      if (dbError) throw dbError;

      toast({ title: "Model uploaded", description: "Your ML model has been uploaded successfully" });

      setModelFile(null);
      setModelName("");
      setModelType("");
      setSelectedPlants([]);
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload Failed", description: error instanceof Error ? error.message : "Failed to upload model", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload custom model</CardTitle>
        <CardDescription>Upload your trained model file (.h5, .onnx, .pb, .pkl) for plant disease detection</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="model-name">Model name</Label>
          <Input id="model-name" placeholder="Model v1" value={modelName} onChange={(e) => setModelName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model-type">Model type</Label>
          <Select value={modelType} onValueChange={setModelType}>
            <SelectTrigger id="model-type">
              <SelectValue placeholder="Select framework" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tensorflow">TensorFlow / Keras (.h5)</SelectItem>
              <SelectItem value="onnx">ONNX (.onnx)</SelectItem>
              <SelectItem value="pytorch">PyTorch (.pt, .pth)</SelectItem>
              <SelectItem value="scikit">Scikit-learn (.pkl)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plant-types">Supported plant types</Label>
          <Select value={selectedPlants[0] || ""} onValueChange={(value) => setSelectedPlants([value])}>
            <SelectTrigger id="plant-types">
              <SelectValue placeholder="Select plant type" />
            </SelectTrigger>
            <SelectContent>
              {plantData.map((plant) => (
                <SelectItem key={plant.name} value={plant.name}>
                  {plant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model-file">Model file</Label>
          <Input id="model-file" type="file" accept=".h5,.onnx,.pb,.pkl,.pt,.pth" onChange={handleFileSelect} />
          {modelFile && <p className="text-sm text-muted-foreground">Selected: {modelFile.name} ({(modelFile.size / 1024 / 1024).toFixed(2)} MB)</p>}
        </div>

        <Button onClick={handleUpload} disabled={uploading || !modelFile} className="w-full">
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload model
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
