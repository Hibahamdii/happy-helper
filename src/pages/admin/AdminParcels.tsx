import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ParcelMap from "@/components/map/ParcelMap";

export default function AdminParcels() {
  const [parcels, setParcels] = useState<any[]>([]);

  useEffect(() => {
    loadParcels();
  }, []);

  const loadParcels = async () => {
    const { data } = await supabase.from("parcels").select("*, profiles!parcels_owner_id_fkey(full_name)");
    setParcels(data || []);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Toutes les Parcelles</h1>

      <Card>
        <CardHeader><CardTitle>Carte</CardTitle></CardHeader>
        <CardContent>
          <ParcelMap parcels={parcels} height="350px" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Parcelles ({parcels.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Culture</TableHead>
                <TableHead>Surface</TableHead>
                <TableHead>Sol</TableHead>
                <TableHead>Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Aucune parcelle enregistrée
                  </TableCell>
                </TableRow>
              ) : (
                parcels.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.profiles?.full_name || "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{p.crop_type}</Badge></TableCell>
                    <TableCell>{p.area_hectares} ha</TableCell>
                    <TableCell className="capitalize">{p.soil_type}</TableCell>
                    <TableCell className="text-xs">{p.location_lat.toFixed(4)}, {p.location_lng.toFixed(4)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
