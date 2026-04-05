import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Droplets, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import type { IrrigationDecision } from "@/lib/irrigation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  decision: IrrigationDecision;
  parcelId: string;
  onIrrigated?: () => void;
}

const urgencyColors: Record<string, string> = {
  none: "bg-muted text-muted-foreground",
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const urgencyLabels: Record<string, string> = {
  none: "Aucun besoin",
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
  critical: "Critique",
};

export default function IrrigationDecisionCard({ decision, parcelId, onIrrigated }: Props) {
  const handleIrrigate = async () => {
    try {
      const { error } = await supabase.from("irrigation_logs").insert({
        parcel_id: parcelId,
        duration_minutes: decision.irrigationDuration_minutes,
        water_volume_liters: decision.waterNeeded_liters,
        decision_type: "manual",
        notes: decision.reason,
      });
      if (error) throw error;
      toast.success("Irrigation enregistrée !");
      onIrrigated?.();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          {decision.needsIrrigation ? (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          ) : (
            <CheckCircle className="h-5 w-5 text-primary" />
          )}
          Décision d'Irrigation
        </CardTitle>
        <Badge className={urgencyColors[decision.urgency]}>
          {urgencyLabels[decision.urgency]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{decision.reason}</p>

        {decision.needsIrrigation && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Droplets className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-lg font-bold">{decision.waterNeeded_mm} mm</p>
                <p className="text-xs text-muted-foreground">Besoin en eau</p>
              </div>
              <div className="text-center">
                <Droplets className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-lg font-bold">{decision.waterNeeded_liters.toLocaleString()} L</p>
                <p className="text-xs text-muted-foreground">Volume total</p>
              </div>
              <div className="text-center">
                <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-lg font-bold">{decision.irrigationDuration_minutes} min</p>
                <p className="text-xs text-muted-foreground">Durée estimée</p>
              </div>
            </div>
            <Button onClick={handleIrrigate} className="w-full">
              <Droplets className="h-4 w-4 mr-2" />
              Lancer l'irrigation
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
