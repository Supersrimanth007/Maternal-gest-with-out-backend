import React, { useEffect, useState } from 'react';
import { Users, Baby, Activity, HeartPulse, Stethoscope, TrendingUp, MapPin } from 'lucide-react';
import { loadCSV } from '../utils/csvLoader';
import { HomeKpiCard, KpiCardSkeleton, ProgressBar, Gauge, StatsCard } from '../components/SharedComponents/homekpi';
import "../styles/home.css";
import "../components/SharedComponents/homekpi.css";

const HomePage = () => {
  const [rawData, setRawData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [availableLocations, setAvailableLocations] = useState(["All Locations"]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [patients, deliveries, babies, visits] = await Promise.all([
          loadCSV('/unified_patients_table.csv'),
          loadCSV('/unified_delivery_table.csv'),
          loadCSV('/unified_baby_table.csv'),
          loadCSV('/unified_visits_table.csv')
        ]);

        const locations = new Set(patients.map(p => p.ADDRESS).filter(Boolean));
        setAvailableLocations(["All Locations", ...Array.from(locations).sort()]);
        setRawData({ patients, deliveries, babies, visits });
      } catch (err) {
        console.error("Data Load Error", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!rawData) return;

    const { patients, deliveries, babies, visits } = rawData;

    const filteredPatients = selectedLocation === "All Locations" 
      ? patients 
      : patients.filter(p => p.ADDRESS === selectedLocation);
    
    const validPatientIds = new Set(filteredPatients.map(p => String(p.PATIENT_ID)));
    
    const filteredDeliveries = deliveries.filter(d => validPatientIds.has(String(d.PATIENT_ID)));
    const filteredBabies = babies.filter(b => validPatientIds.has(String(b.PATIENT_ID))); 
    const filteredVisits = visits.filter(v => validPatientIds.has(String(v.PATIENT_ID)));

    const deliveredIds = new Set(filteredDeliveries.map(d => String(d.PATIENT_ID)));
    const totalDeliveries = filteredDeliveries.length;

    setMetrics({
      totalPatients: filteredPatients.length,
      activePregnancies: filteredPatients.filter(p => !deliveredIds.has(String(p.PATIENT_ID))).length,
      totalDeliveries,
      totalBabies: filteredBabies.length,
      visitCount: filteredVisits.length,
      normalCount: filteredDeliveries.filter(d => /vaginal|normal/i.test(d.DELIVERY_MODE)).length,
      cSectionCount: filteredDeliveries.filter(d => /c-section|cesarean/i.test(d.DELIVERY_MODE)).length,
      matured: filteredDeliveries.filter(d => d.SOURCE_SCHEMA === 'MATURED').length,
      premature: filteredDeliveries.filter(d => d.SOURCE_SCHEMA === 'PREMATURE').length,
      mortality: filteredDeliveries.filter(d => d.SOURCE_SCHEMA === 'MORTALITY').length
    });

  }, [rawData, selectedLocation]);

  if (loading || !metrics) return (
    <div className="home-container">
      <KpiCardSkeleton />
    </div>
  );

  return (
    <div className="home-container">
      <header className="home-header">
        <div>
          <h1 className="home-title">Maternal Health Analytics</h1>
          <p className="text-slate-500">Real-time enterprise data monitoring</p>
        </div>
        
        <div className="location-dropdown">
          <MapPin size={18} className="text-blue-500" />
          <select 
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            {availableLocations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <HomeKpiCard data={{ title: "Total Patients", value: metrics.totalPatients, icon: <Users /> }} />
        <HomeKpiCard data={{ title: "Active Pregnancies", value: metrics.activePregnancies, icon: <Activity /> }} />
        <HomeKpiCard data={{ title: "Total Deliveries", value: metrics.totalDeliveries, icon: <HeartPulse /> }} />
        <HomeKpiCard data={{ title: "Babies Born", value: metrics.totalBabies, icon: <Baby /> }} />
      </div>

      <div className="dashboard-content">
        {/* Left column: Delivery Performance */}
        <div className="section-card">
          <div className="section-title">
            <TrendingUp size={20} className="text-blue-500" /> Delivery Performance
          </div>
          <div className="gauge-grid">
            <Gauge 
              title="NORMAL RATE" 
              value={metrics.normalCount} 
              max={metrics.totalDeliveries} 
              color="#0ea5e9" 
            />
            <Gauge 
              title="C-SECTION RATE" 
              value={metrics.cSectionCount} 
              max={metrics.totalDeliveries} 
              color="#8b5cf6" 
            />
          </div>
        </div>

        {/* Right column: Stats + Clinical Outcomes */}
        <div className="flex flex-col gap-6">
          <StatsCard 
            title="CLINICAL VISITS" 
            value={metrics.visitCount} 
            subtitle="Total interactions recorded" 
          />
          
          <div className="section-card">
            <div className="section-title">
              <Stethoscope size={20} className="text-indigo-600" /> Clinical Outcomes
            </div>
            <div className="space-y-4">
              <ProgressBar 
                label="Matured" 
                value={metrics.matured} 
                max={metrics.totalDeliveries} 
                colorClass="bg-emerald-500" 
              />
              <ProgressBar 
                label="Premature" 
                value={metrics.premature} 
                max={metrics.totalDeliveries} 
                colorClass="bg-amber-500" 
              />
              <ProgressBar 
                label="Mortality" 
                value={metrics.mortality} 
                max={metrics.totalDeliveries} 
                colorClass="bg-rose-500" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;