import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, ChevronDown } from 'lucide-react';
import '../css/job-map.css';

export interface JobItem {
  id: number;
  title: string;
  slug?: string;
  company: {
    id: number;
    name: string;
    logoUrl?: string;
    verified?: boolean;
  };
  location: string;
  jobType: string;
  experienceLevel: string;
  remote: boolean;
  hybrid: boolean;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  description?: string;
  requiredSkills: { skillName: string; required?: boolean }[];
  postedAt: string;
  postedById?: number;
}

interface LocationCoord {
  lat: number;
  lng: number;
  city: string;
  state: string;
  country: string;
  flag: string;
}

// ── Master Geocoder Mapping (Accurate Coordinates) ──────────────────────────
const KNOWN_LOCATIONS: { [key: string]: LocationCoord } = {
  // India Tech Hubs & States
  'bangalore': { lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka', country: 'India', flag: '🇮🇳' },
  'bengaluru': { lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka', country: 'India', flag: '🇮🇳' },
  'whitefield': { lat: 12.9698, lng: 77.7499, city: 'Whitefield (Bengaluru)', state: 'Karnataka', country: 'India', flag: '🇮🇳' },
  'electronic city': { lat: 12.8452, lng: 77.6602, city: 'Electronic City (Bengaluru)', state: 'Karnataka', country: 'India', flag: '🇮🇳' },
  'koramangala': { lat: 12.9352, lng: 77.6245, city: 'Koramangala (Bengaluru)', state: 'Karnataka', country: 'India', flag: '🇮🇳' },
  'karnataka': { lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka', country: 'India', flag: '🇮🇳' },

  'mumbai': { lat: 19.0760, lng: 72.8777, city: 'Mumbai', state: 'Maharashtra', country: 'India', flag: '🇮🇳' },
  'navi mumbai': { lat: 19.0330, lng: 73.0297, city: 'Navi Mumbai', state: 'Maharashtra', country: 'India', flag: '🇮🇳' },
  'pune': { lat: 18.5204, lng: 73.8567, city: 'Pune', state: 'Maharashtra', country: 'India', flag: '🇮🇳' },
  'hinjawadi': { lat: 18.5913, lng: 73.7389, city: 'Hinjawadi (Pune)', state: 'Maharashtra', country: 'India', flag: '🇮🇳' },
  'maharashtra': { lat: 19.0760, lng: 72.8777, city: 'Mumbai', state: 'Maharashtra', country: 'India', flag: '🇮🇳' },

  'hyderabad': { lat: 17.3850, lng: 78.4867, city: 'Hyderabad', state: 'Telangana', country: 'India', flag: '🇮🇳' },
  'hitec city': { lat: 17.4474, lng: 78.3762, city: 'HITEC City (Hyderabad)', state: 'Telangana', country: 'India', flag: '🇮🇳' },
  'gachibowli': { lat: 17.4401, lng: 78.3489, city: 'Gachibowli (Hyderabad)', state: 'Telangana', country: 'India', flag: '🇮🇳' },
  'telangana': { lat: 17.3850, lng: 78.4867, city: 'Hyderabad', state: 'Telangana', country: 'India', flag: '🇮🇳' },

  'delhi': { lat: 28.6139, lng: 77.2090, city: 'New Delhi', state: 'Delhi NCR', country: 'India', flag: '🇮🇳' },
  'new delhi': { lat: 28.6139, lng: 77.2090, city: 'New Delhi', state: 'Delhi NCR', country: 'India', flag: '🇮🇳' },
  'noida': { lat: 28.5355, lng: 77.3910, city: 'Noida', state: 'Uttar Pradesh (NCR)', country: 'India', flag: '🇮🇳' },
  'gurgaon': { lat: 28.4595, lng: 77.0266, city: 'Gurugram', state: 'Haryana (NCR)', country: 'India', flag: '🇮🇳' },
  'gurugram': { lat: 28.4595, lng: 77.0266, city: 'Gurugram', state: 'Haryana (NCR)', country: 'India', flag: '🇮🇳' },

  'chennai': { lat: 13.0827, lng: 80.2707, city: 'Chennai', state: 'Tamil Nadu', country: 'India', flag: '🇮🇳' },
  'tamil nadu': { lat: 13.0827, lng: 80.2707, city: 'Chennai', state: 'Tamil Nadu', country: 'India', flag: '🇮🇳' },
  'kolkata': { lat: 22.5726, lng: 88.3639, city: 'Kolkata', state: 'West Bengal', country: 'India', flag: '🇮🇳' },
  'ahmedabad': { lat: 23.0225, lng: 72.5714, city: 'Ahmedabad', state: 'Gujarat', country: 'India', flag: '🇮🇳' },
  'kerala': { lat: 9.9312, lng: 76.2673, city: 'Kochi', state: 'Kerala', country: 'India', flag: '🇮🇳' },
  'kochi': { lat: 9.9312, lng: 76.2673, city: 'Kochi', state: 'Kerala', country: 'India', flag: '🇮🇳' },

  // Global Tech Hubs
  'san francisco': { lat: 37.7749, lng: -122.4194, city: 'San Francisco', state: 'California', country: 'USA', flag: '🇺🇸' },
  'california': { lat: 37.7749, lng: -122.4194, city: 'San Francisco', state: 'California', country: 'USA', flag: '🇺🇸' },
  'silicon valley': { lat: 37.3861, lng: -122.0839, city: 'Mountain View', state: 'California', country: 'USA', flag: '🇺🇸' },
  'new york': { lat: 40.7128, lng: -74.0060, city: 'New York', state: 'New York', country: 'USA', flag: '🇺🇸' },
  'austin': { lat: 30.2672, lng: -97.7431, city: 'Austin', state: 'Texas', country: 'USA', flag: '🇺🇸' },
  'seattle': { lat: 47.6062, lng: -122.3321, city: 'Seattle', state: 'Washington', country: 'USA', flag: '🇺🇸' },
  'london': { lat: 51.5074, lng: -0.1278, city: 'London', state: 'Greater London', country: 'UK', flag: '🇬🇧' },
  'berlin': { lat: 52.5200, lng: 13.4050, city: 'Berlin', state: 'Berlin', country: 'Germany', flag: '🇩🇪' },
  'singapore': { lat: 1.3521, lng: 103.8198, city: 'Singapore', state: 'Singapore', country: 'Singapore', flag: '🇸🇬' },
  'tokyo': { lat: 35.6762, lng: 139.6503, city: 'Tokyo', state: 'Tokyo', country: 'Japan', flag: '🇯🇵' },
  'sydney': { lat: -33.8688, lng: 151.2093, city: 'Sydney', state: 'NSW', country: 'Australia', flag: '🇦🇺' },
  'remote': { lat: 21.5937, lng: 78.9629, city: 'Remote (India / Global)', state: 'Pan-India', country: 'Cloud', flag: '🌐' },
};

function resolveCoordinates(locationStr: string): LocationCoord {
  if (!locationStr) return KNOWN_LOCATIONS['bangalore'];
  const lower = locationStr.toLowerCase();

  for (const [key, coord] of Object.entries(KNOWN_LOCATIONS)) {
    if (lower.includes(key)) {
      return coord;
    }
  }

  // Hash fallback for unmapped locations centered in India
  let hash = 0;
  for (let i = 0; i < locationStr.length; i++) {
    hash = locationStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = (hash % 80) / 1000;
  const lngOffset = ((hash >> 3) % 80) / 1000;
  return {
    lat: 12.9716 + latOffset,
    lng: 77.5946 + lngOffset,
    city: locationStr,
    state: 'Karnataka / Tech Hub',
    country: 'India',
    flag: '🇮🇳'
  };
}

// ── Map Tile Layers ──────────────────────────────────────────────────────────
const MAP_THEMES = {
  cosmic: {
    name: '🪐 Dark Cosmic',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap'
  },
  satellite: {
    name: '🛰️ Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  },
  streets: {
    name: '☀️ Light Streets',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap'
  }
};

type MapThemeKey = 'cosmic' | 'satellite' | 'streets';

interface JobMapProps {
  jobs: JobItem[];
  appliedJobIds?: number[];
  onApply?: (jobId: number) => void;
  onShowDetails?: (jobId: number) => void;
  onChatRecruiter?: (job: JobItem) => void;
  selectedSkillRole?: string;
  onSkillRoleChange?: (role: string) => void;
  height?: string;
  showControls?: boolean;
  title?: string;
  activeSearchQuery?: string;
}

export const JobMap: React.FC<JobMapProps> = ({
  jobs,
  appliedJobIds = [],
  onApply,
  onShowDetails,
  onChatRecruiter,
  selectedSkillRole,
  onSkillRoleChange,
  height = '460px',
  showControls = true,
  title = 'Live Career Radar & State-wise Opportunities',
  activeSearchQuery = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapTheme, setMapTheme] = useState<MapThemeKey>('cosmic');
  const [internalRole, setInternalRole] = useState<string>(selectedSkillRole || 'ALL');

  const currentRole = selectedSkillRole !== undefined ? selectedSkillRole : internalRole;

  const handleRoleChange = (role: string) => {
    setInternalRole(role);
    if (onSkillRoleChange) {
      onSkillRoleChange(role);
    }
  };

  // ── Role & Search Filtered Jobs ──────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // 1. Role / Skill Dropdown Filter
      let matchesRole = true;
      if (currentRole && currentRole !== 'ALL') {
        const rLower = currentRole.toLowerCase();
        const titleMatch = job.title.toLowerCase().includes(rLower);
        const descMatch = job.description?.toLowerCase().includes(rLower);
        const skillMatch = job.requiredSkills?.some(s => s.skillName.toLowerCase().includes(rLower));
        matchesRole = titleMatch || descMatch || skillMatch;
      }

      // 2. Search Query Filter (if active)
      let matchesQuery = true;
      if (activeSearchQuery && activeSearchQuery.trim() !== '') {
        const q = activeSearchQuery.toLowerCase();
        matchesQuery =
          job.title.toLowerCase().includes(q) ||
          job.company.name.toLowerCase().includes(q) ||
          job.location.toLowerCase().includes(q) ||
          job.requiredSkills?.some(s => s.skillName.toLowerCase().includes(q));
      }

      return matchesRole && matchesQuery;
    });
  }, [jobs, currentRole, activeSearchQuery]);

  // ── Group Jobs by State / Location ──────────────────────────────────────
  const locationGroups = useMemo(() => {
    const groups: { [key: string]: { coord: LocationCoord; jobs: JobItem[] } } = {};

    filteredJobs.forEach(job => {
      const coord = resolveCoordinates(job.location);
      const groupKey = `${coord.state}_${coord.city}`;

      if (!groups[groupKey]) {
        groups[groupKey] = { coord, jobs: [] };
      }
      groups[groupKey].jobs.push(job);
    });

    return Object.values(groups);
  }, [filteredJobs]);

  // ── Initialize Leaflet Map (Centered on India by Default) ────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Stable default center: India view with complete states visible
    const map = L.map(mapContainerRef.current, {
      center: [21.5937, 78.9629], // Center of India
      zoom: 5,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: false,
    });

    // Add Tile Layer
    const tileLayer = L.tileLayer(MAP_THEMES.cosmic.url, {
      attribution: MAP_THEMES.cosmic.attribution,
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ── Switch Map Tile Theme (Satellite, Light, Cosmic) ──────────────────────
  const handleThemeChange = (newTheme: MapThemeKey) => {
    setMapTheme(newTheme);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newLayer = L.tileLayer(MAP_THEMES[newTheme].url, {
      attribution: MAP_THEMES[newTheme].attribution,
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = newLayer;
  };

function escapeHtml(unsafe: any): string {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

  // ── Render State-wise Flags & Markers ───────────────────────────────────
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer) return;

    markersLayer.clearLayers();

    locationGroups.forEach(group => {
      const { coord, jobs: groupJobs } = group;
      const count = groupJobs.length;
      const primaryJob = groupJobs[0];

      // Custom glowing animated HTML flag marker icon
      const customIcon = L.divIcon({
        className: 'custom-map-flag-pin',
        html: `
          <div class="flag-pin-wrapper">
            <div class="flag-pin-pulse"></div>
            <div class="flag-pin-body">
              <span class="flag-pin-icon">${coord.flag}</span>
              <span style="font-size:11px;font-weight:700;">${escapeHtml(coord.state)}</span>
              <span class="flag-pin-count">${count}</span>
            </div>
            <div class="flag-pin-pointer"></div>
          </div>
        `,
        iconSize: [120, 44],
        iconAnchor: [60, 44],
      });

      const marker = L.marker([coord.lat, coord.lng], { icon: customIcon });

      const isApplied = appliedJobIds.includes(primaryJob.id);
      const salaryText = primaryJob.salaryMin
        ? `$${(primaryJob.salaryMin / 1000).toFixed(0)}k - $${(primaryJob.salaryMax! / 1000).toFixed(0)}k / yr`
        : 'Competitive Salary';

      const skillsHtml = primaryJob.requiredSkills
        ? primaryJob.requiredSkills.slice(0, 3).map(s => `<span class="map-popup-skill-chip">⚡ ${escapeHtml(s.skillName)}</span>`).join('')
        : '';

      const moreJobsNote = count > 1
        ? `<div style="font-size:11px;color:#A78BFA;font-weight:600;margin-top:2px;">+ ${count - 1} other active role${count > 2 ? 's' : ''} in ${escapeHtml(coord.state)}</div>`
        : '';

      const popupHtml = `
        <div class="map-popup-card">
          <div class="map-popup-header">
            <div>
              <div class="map-popup-location-tag">${coord.flag} ${escapeHtml(coord.city)}, ${escapeHtml(coord.state)}</div>
              <h4 class="map-popup-title">${escapeHtml(primaryJob.title)}</h4>
            </div>
          </div>
          <div class="map-popup-company">
            🏢 ${escapeHtml(primaryJob.company.name)} ${primaryJob.company.verified ? '✓' : ''}
          </div>
          <div class="map-popup-salary">
            💰 ${escapeHtml(salaryText)}
          </div>
          <div class="map-popup-skills">
            ${skillsHtml}
          </div>
          ${moreJobsNote}
          <div class="map-popup-actions">
            <button id="popup-details-btn-${primaryJob.id}" class="map-popup-btn-details" title="View Full Description">
              Details 👁️
            </button>
            <button id="popup-chat-btn-${primaryJob.id}" class="map-popup-btn-details" style="border-color:#A78BFA;color:#C4B5FD;" title="Chat with Job Poster">
              Chat 💬
            </button>
            <button id="popup-apply-btn-${primaryJob.id}" class="map-popup-btn-apply" ${isApplied ? 'disabled' : ''}>
              ${isApplied ? 'Applied ✓' : 'Apply 🚀'}
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 330, autoPan: true });

      marker.on('popupopen', () => {
        const detailsBtn = document.getElementById(`popup-details-btn-${primaryJob.id}`);
        if (detailsBtn && onShowDetails) {
          detailsBtn.onclick = () => {
            onShowDetails(primaryJob.id);
          };
        }

        const chatBtn = document.getElementById(`popup-chat-btn-${primaryJob.id}`);
        if (chatBtn && onChatRecruiter) {
          chatBtn.onclick = () => {
            onChatRecruiter(primaryJob);
          };
        }

        const applyBtn = document.getElementById(`popup-apply-btn-${primaryJob.id}`);
        if (applyBtn && onApply) {
          applyBtn.onclick = () => {
            onApply(primaryJob.id);
          };
        }
      });

      markersLayer.addLayer(marker);
    });
  }, [locationGroups, appliedJobIds, onApply, onShowDetails, onChatRecruiter]);

  // Zoom & Perspective Helpers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    mapInstanceRef.current?.setView([21.5937, 78.9629], 5, { animate: true });
  };

  return (
    <div className="job-map-wrapper">
      {/* ── Header Filter & Theme Bar ── */}
      {showControls && (
        <div className="job-map-header">
          <div className="job-map-title-box">
            <span className="job-map-icon">
              <MapPin size={18} />
            </span>
            <h3 className="job-map-title">
              {title}
            </h3>
            <span className="job-map-badge">
              {filteredJobs.length} roles in {locationGroups.length} states
            </span>
          </div>

          <div className="job-map-controls">
            {/* Map Theme Selector (Satellite / Streets / Cosmic Dark) */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.8)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(124, 58, 237, 0.3)' }}>
              {(['cosmic', 'satellite', 'streets'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleThemeChange(t)}
                  style={{
                    background: mapTheme === t ? '#7C3AED' : 'transparent',
                    color: mapTheme === t ? '#FFF' : '#94A3B8',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {MAP_THEMES[t].name}
                </button>
              ))}
            </div>

            {/* Role & Skill Dropdown Filter */}
            <div className="job-map-dropdown-wrapper">
              <select
                value={currentRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="job-map-dropdown"
              >
                <option value="ALL">✨ All Tech Roles</option>
                <option value="Java">☕ Java Developer & Microservices</option>
                <option value="Python">🐍 Python / Backend Engineer</option>
                <option value="AI">🤖 AI & Machine Learning</option>
                <option value="React">⚡ Frontend (React / TypeScript)</option>
                <option value="Cloud">☁️ Cloud & DevOps (AWS / K8s)</option>
                <option value="Data">📊 Data Analyst & Data Science</option>
                <option value="Full Stack">🌐 Full Stack Engineer</option>
                <option value="UI/UX">🎨 UI/UX Designer</option>
                <option value="Mobile">📱 Mobile Engineer (iOS / Android)</option>
              </select>
              <ChevronDown size={14} className="job-map-dropdown-icon" />
            </div>

            <button onClick={handleResetView} className="job-map-btn" title="Reset View to India Overview">
              <Navigation size={13} /> Center India
            </button>
          </div>
        </div>
      )}

      {/* ── Leaflet Canvas ── */}
      <div className="job-map-canvas-container" style={{ height }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Floating Zoom & Controls Overlay */}
        <div className="job-map-zoom-overlay">
          <button onClick={handleZoomIn} className="job-map-zoom-btn" title="Zoom In">
            +
          </button>
          <button onClick={handleZoomOut} className="job-map-zoom-btn" title="Zoom Out">
            -
          </button>
          <button onClick={handleResetView} className="job-map-zoom-btn" title="Center on India">
            <Navigation size={14} />
          </button>
        </div>
      </div>

      {/* ── State Legend Footer ── */}
      <div className="job-map-footer">
        <div className="job-map-legend-items">
          <div className="job-map-legend-item">
            <span className="job-map-legend-dot" />
            <span>Interactive State Pins:</span>
          </div>
          <div className="job-map-legend-item">
            <span>🇮🇳 Karnataka (Bengaluru / Whitefield)</span>
          </div>
          <div className="job-map-legend-item">
            <span>🇮🇳 Maharashtra (Mumbai / Pune)</span>
          </div>
          <div className="job-map-legend-item">
            <span>🇮🇳 Telangana (Hyderabad)</span>
          </div>
          <div className="job-map-legend-item">
            <span>🇮🇳 Delhi NCR</span>
          </div>
          <div className="job-map-legend-item">
            <span>🇺🇸 Silicon Valley / NYC</span>
          </div>
        </div>

        <div>
          <span>Click any flag pin to view job details, chat with HR, or 1-click apply.</span>
        </div>
      </div>
    </div>
  );
};
