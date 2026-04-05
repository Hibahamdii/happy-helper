import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";

L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Parcel {
  id: string;
  name: string;
  location_lat: number;
  location_lng: number;
  crop_type: string;
  area_hectares: number;
}

interface ParcelMapProps {
  parcels: Parcel[];
  height?: string;
  onParcelClick?: (parcelId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  selectedPosition?: { lat: number; lng: number } | null;
}

export default function ParcelMap({
  parcels,
  height = "400px",
  onParcelClick,
  onMapClick,
  selectedPosition,
}: ParcelMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const center: L.LatLngExpression = parcels.length > 0
      ? [parcels[0].location_lat, parcels[0].location_lng]
      : [36.75, 3.06]; // Default: Algiers

    mapInstance.current = L.map(mapRef.current).setView(center, 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(mapInstance.current);

    if (onMapClick) {
      mapInstance.current.on("click", (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers when parcels change
  useEffect(() => {
    if (!mapInstance.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    parcels.forEach((p) => {
      const marker = L.marker([p.location_lat, p.location_lng])
        .addTo(mapInstance.current!)
        .bindPopup(
          `<strong>${p.name}</strong><br/>Culture: ${p.crop_type}<br/>Surface: ${p.area_hectares} ha`
        );

      if (onParcelClick) {
        marker.on("click", () => onParcelClick(p.id));
      }

      markersRef.current.push(marker);
    });

    if (parcels.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInstance.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [parcels, onParcelClick]);

  // Show selected position marker
  useEffect(() => {
    if (!mapInstance.current || !selectedPosition) return;
    
    const selectedMarker = L.marker([selectedPosition.lat, selectedPosition.lng], {
      icon: L.icon({
        iconUrl: icon,
        iconRetinaUrl: iconRetina,
        shadowUrl: iconShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        className: "hue-rotate-90",
      }),
    }).addTo(mapInstance.current);

    return () => {
      selectedMarker.remove();
    };
  }, [selectedPosition]);

  return <div ref={mapRef} style={{ height, width: "100%" }} className="rounded-lg border" />;
}
