import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Droplet, ThermometerSun, Sprout, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PlantInfo } from "@/lib/plantData";

interface PlantCardProps {
  plant: PlantInfo;
  isExpanded: boolean;
  onToggle: () => void;
}

const PlantCard = ({ plant, isExpanded, onToggle }: PlantCardProps) => {
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <Card className="cursor-pointer overflow-hidden card-hover" onClick={onToggle}>
        <CardContent className="p-5">
          <motion.div layout className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div layout className="h-20 w-20 shrink-0 overflow-hidden rounded-lg" whileHover={{ scale: 1.03 }}>
                <img src={plant.image} alt={plant.name} className="h-full w-full object-cover" />
              </motion.div>
              <div>
                <motion.h3 layout className="text-lg font-semibold">{plant.name}</motion.h3>
                <motion.p layout className="text-sm text-muted-foreground italic">{plant.scientificName}</motion.p>
              </div>
            </div>
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.28 }}>
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </motion.div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }} className="mt-5 space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Growing regions</h4>
                      <p className="text-sm text-muted-foreground">{plant.region}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light">
                      <Sprout className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Optimal soil</h4>
                      <p className="text-sm text-muted-foreground">{plant.soil}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light">
                      <ThermometerSun className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Temperature</h4>
                      <p className="text-sm text-muted-foreground">{plant.optimalTemp}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light">
                      <Droplet className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Water requirements</h4>
                      <p className="text-sm text-muted-foreground">{plant.waterRequirements}</p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted p-3">
                    <h4 className="font-medium text-sm mb-1">Key nutrients</h4>
                    <p className="text-sm text-muted-foreground">{plant.nutrients}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PlantCard;
