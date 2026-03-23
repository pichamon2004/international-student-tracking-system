'use client';

import { useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface CountryStat {
  country: string;
  count: number;
  percent: number;
  coordinates: [number, number];
  flag: string;
}

interface StudentWorldMapProps {
  data: CountryStat[];
}

export default function StudentWorldMap({ data }: StudentWorldMapProps) {
  const [tooltip, setTooltip] = useState<{ country: string; count: number; flag: string } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  return (
    <div className="relative w-full overflow-hidden" style={{ marginTop: '-18%', marginBottom: '-14%' }}>
      <ComposableMap
        projectionConfig={{ scale: 120 }}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#D6E4F0"
                stroke="#fff"
                strokeWidth={0.5}
                style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
              />
            ))
          }
        </Geographies>

        {data.map(({ country, count, coordinates, flag }) => (
          <Marker
            key={country}
            coordinates={coordinates}
            onMouseEnter={(e) => {
              const rect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect();
              setTooltip({ country, count, flag });
              setTooltipPos({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            <circle r={6} fill="#0776BC" stroke="#fff" strokeWidth={2} className="cursor-pointer" />
            <circle r={10} fill="#0776BC" fillOpacity={0.25} />
          </Marker>
        ))}
      </ComposableMap>

      {tooltip && (
        <div
          className="absolute z-20 bg-white shadow-lg rounded-xl px-3 py-2 text-xs pointer-events-none border border-gray-100"
          style={{ left: tooltipPos.x + 10, top: tooltipPos.y - 40 }}
        >
          <p className="font-semibold text-gray-800"> {tooltip.country}</p>
          <p className="text-primary font-medium">{tooltip.count} Students</p>
        </div>
      )}
    </div>
  );
}
