import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocationSearch } from './LocationSearch';
import { useLanguage } from '@/contexts/LanguageContext';

// Fix Leaflet's default icon path issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Location {
  lat: number;
  lon: number;
}

interface LocationPickerProps {
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
}

function LocationMarker({ position, setPosition, onSelect }: { 
  position: Location | null, 
  setPosition: (pos: Location) => void,
  onSelect: (pos: Location) => void 
}) {
  const map = useMapEvents({
    click(e) {
      const newPos = { lat: e.latlng.lat, lon: e.latlng.lng };
      setPosition(newPos);
      onSelect(newPos);
      
      // Only fly if distance is significant to avoid jitter
      if (position) {
          const dist = map.distance(e.latlng, [position.lat, position.lon]);
          if (dist > 100) map.flyTo(e.latlng, map.getZoom());
      } else {
          map.flyTo(e.latlng, map.getZoom());
      }
    },
  });

  return position === null ? null : (
    <Marker position={[position.lat, position.lon]}></Marker>
  );
}

function FlyToLocation({ target }: { target: Location | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lon], 13, {
        duration: 1.5
      });
    }
  }, [target, map]);
  return null;
}

function LocateControl({ onFound }: { onFound: (loc: Location) => void }) {
  const { t } = useLanguage();
  const map = useMap();
  const [loading, setLoading] = useState(false);

  const handleLocate = () => {
    setLoading(true);
    map.locate().on("locationfound", function (e) {
      setLoading(false);
      onFound({ lat: e.latlng.lat, lon: e.latlng.lng });
      map.flyTo(e.latlng, 16);
    }).on("locationerror", function (e) {
        setLoading(false);
        console.error(e.message);
        alert(t("Could not access your location. Please check browser permissions."));
    });
  };

  return (
    <div className="leaflet-bottom leaflet-right">
      <div className="leaflet-control leaflet-bar">
        <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 bg-background shadow-md border-input rounded-md hover:bg-accent"
            onClick={handleLocate}
            type="button"
            title={t("Locate Me")}
        >
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Crosshair className="h-5 w-5 text-primary" />}
        </Button>
      </div>
    </div>
  );
}

export function LocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
  const { t } = useLanguage();
  const [position, setPosition] = useState<Location | null>(initialLocation || null);
  const [flyToTarget, setFlyToTarget] = useState<Location | null>(null);
  
  const center = useMemo(() => {
    if (initialLocation) return [initialLocation.lat, initialLocation.lon] as [number, number];
    return [10.7870, 79.1378] as [number, number];
  }, []);

  const handleLocateFound = (loc: Location) => {
      setPosition(loc);
      onLocationSelect(loc);
  };

  const handleSearchSelect = (lat: number, lon: number) => {
    const newLoc = { lat, lon };
    setPosition(newLoc);
    setFlyToTarget(newLoc); // Trigger map flyTo
    onLocationSelect(newLoc);
  };

  return (
    <div className="space-y-2">
        <LocationSearch onLocationSelect={handleSearchSelect} />
        
        <div className="h-[300px] w-full rounded-md overflow-hidden border border-input z-0 relative">
            {!position && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-background/90 px-3 py-1 rounded-full shadow-sm text-xs font-medium flex items-center gap-1 pointer-events-none">
                    <MapPin className="h-3 w-3 text-primary" />
                    {t("Tap map to pin location")}
                </div>
            )}
        <MapContainer 
            center={center} 
            zoom={13} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%' }}
        >
            <LayersControl position="topright">
                <LayersControl.BaseLayer checked name={t("Street (OSM)")}>
                    <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name={t("Satellite (Esri)")}>
                    <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                </LayersControl.BaseLayer>
            </LayersControl>

            <FlyToLocation target={flyToTarget} />
            
            <LocationMarker 
                position={position} 
                setPosition={setPosition} 
                onSelect={onLocationSelect} 
            />
            <LocateControl onFound={handleLocateFound} />
        </MapContainer>
        </div>
    </div>
  );
}
