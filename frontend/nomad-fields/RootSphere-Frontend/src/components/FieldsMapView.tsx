import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L, { type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { useNavigate } from "react-router-dom";
import type { Field } from "@/types/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStageColors } from "@/constants/crops";

// Fix Leaflet default icon path
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
  fields: Field[];
  className?: string;
}

export function FieldsMapView({ fields, className = "" }: Props) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const mapRef = useRef<LeafletMap | null>(null);

  // Compute the geographic bounds that contain every field marker.
  const bounds = useMemo<[[number, number], [number, number]] | null>(() => {
    const valid = fields.filter((f) => Number.isFinite(f.lat) && Number.isFinite(f.lon));
    if (valid.length === 0) return null;
    if (valid.length === 1) {
      const f = valid[0];
      return [
        [f.lat - 0.01, f.lon - 0.01],
        [f.lat + 0.01, f.lon + 0.01],
      ];
    }
    const lats = valid.map((f) => f.lat);
    const lons = valid.map((f) => f.lon);
    return [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ];
  }, [fields]);

  // Recenter when fields change (e.g., user toggles back to map view after editing)
  useEffect(() => {
    if (mapRef.current && bounds) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [bounds]);

  if (!bounds) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">
          map
        </span>
        <p className="text-slate-500 dark:text-slate-400">
          {t("No fields with valid coordinates")}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}
    >
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [40, 40], maxZoom: 14 }}
        scrollWheelZoom={true}
        style={{ height: "560px", width: "100%" }}
        ref={(m) => {
          mapRef.current = m;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fields.map((field) => {
          if (!Number.isFinite(field.lat) || !Number.isFinite(field.lon)) return null;
          const stageColors = getStageColors(field.growth_stage);
          return (
            <Marker key={field.id} position={[field.lat, field.lon]}>
              <Popup>
                <div className="min-w-[180px]">
                  <h4 className="font-bold text-slate-900 mb-1">{field.name}</h4>
                  <div className="text-xs text-slate-500 mb-2 capitalize">
                    {t(field.crop)}
                    {" · "}
                    <span className={`inline-block px-1.5 py-0.5 rounded ${stageColors.bg} ${stageColors.text}`}>
                      {t(field.growth_stage)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2 font-mono">
                    {field.lat.toFixed(4)}, {field.lon.toFixed(4)}
                  </p>
                  <button
                    onClick={() => navigate(`/field/${field.id}`)}
                    className="w-full text-center text-xs font-bold text-primary hover:underline"
                  >
                    {t("View field")} →
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
