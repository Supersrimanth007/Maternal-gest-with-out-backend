import React, { useState, useEffect } from "react";
import { loadCSV } from "../utils/csvLoader";
import { 
  Search, 
  User, 
  Baby, 
  ClipboardCheck, 
  Calendar,
  Clock,
  Activity,
  ChevronRight,
  LineChart
} from "lucide-react";

import MaternityCharts from "../components/SharedComponents/MaternityCharts";
import "../styles/DeliveredPatients.css";

const DeliveredPatients = () => {
  const [deliveredRecords, setDeliveredRecords] = useState([]);
  const [allVisits, setAllVisits] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [patientVisits, setPatientVisits] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [patients, deliveries, babies, visits] = await Promise.all([
          loadCSV("/unified_patients_table.csv"),
          loadCSV("/unified_delivery_table.csv"),
          loadCSV("/unified_baby_table.csv"),
          loadCSV("/unified_visits_table.csv"),
        ]);

        const joinedData = deliveries.map(dev => {
          const patient = patients.find(p => String(p.PATIENT_ID).trim() === String(dev.PATIENT_ID).trim()) || {};
          const deliveryBabies = babies.filter(b => 
            (b.DELIVERY_ID && dev.DELIVERY_ID && String(b.DELIVERY_ID).trim() === String(dev.DELIVERY_ID).trim()) ||
            (b.PATIENT_ID && dev.PATIENT_ID && String(b.PATIENT_ID).trim() === String(dev.PATIENT_ID).trim())
          );
          return { ...patient, ...dev, babies: deliveryBabies };
        });

        // Sort alphabetically by full name
        const sortedData = joinedData.sort((a, b) => {
          const nameA = `${a.FIRST_NAME || ''} ${a.LAST_NAME || ''}`.toLowerCase();
          const nameB = `${b.FIRST_NAME || ''} ${b.LAST_NAME || ''}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setAllVisits(visits || []);
        setDeliveredRecords(sortedData);
        
        if (sortedData.length > 0) handleSelectRecord(sortedData[0], visits);
        setLoading(false);
      } catch (err) {
        console.error("Archive Load Error:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSelectRecord = (record, visits = allVisits) => {
    setSelectedRecord(record);
    const history = visits
      .filter((v) => String(v.PATIENT_ID).trim() === String(record.PATIENT_ID).trim())
      .map((v) => ({
        VISIT_DATE: v.VISIT_DATE || v.visit_date,
        gestational_age_weeks: Number(v.GESTATIONAL_AGE_WEEKS),
        weight: Number(v.MATERNAL_WEIGHT),
        fundal_height: Number(v.FUNDAL_HEIGHT),
        hemoglobin: Number(v.HEMOGLOBIN_LEVEL),
        blood_pressure_systolic: Number(v.BLOOD_PRESSURE?.split("/")[0]),
        blood_pressure_diastolic: Number(v.BLOOD_PRESSURE?.split("/")[1]),
        fetal_heart_rate: Number(v.FETAL_HEART_RATE),
      }))
      .filter((v) => v.gestational_age_weeks > 0)
      .sort((a, b) => a.gestational_age_weeks - b.gestational_age_weeks);
    setPatientVisits(history);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return dateString.length > 10 ? dateString.substring(0, 10) : dateString;
  };

  // Filter by name or ID, then sort alphabetically
  const filtered = deliveredRecords
    .filter(r => 
      `${r.FIRST_NAME || ''} ${r.LAST_NAME || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.PATIENT_ID || '').includes(searchTerm)
    )
    .sort((a, b) => {
      const nameA = `${a.FIRST_NAME || ''} ${a.LAST_NAME || ''}`.toLowerCase();
      const nameB = `${b.FIRST_NAME || ''} ${b.LAST_NAME || ''}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

  if (loading) return <div className="dp-loading-container"><div className="dp-loading-spinner"></div></div>;

  return (
    <div className="dp-container">
      
      {/* ================= SIDEBAR ================= */}
      <aside className="dp-sidebar">
        <div className="dp-sidebar-header">
          <h2 className="dp-sidebar-title"><ClipboardCheck size={20} /> Delivered Patients</h2>
          <p className="dp-sidebar-subtitle">{deliveredRecords.length} records</p>
        </div>

        <div className="dp-search-container">
          <Search className="dp-search-icon" size={16} />
          <input
            type="text"
            placeholder="Search archive..."
            className="dp-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="dp-patient-list">
          {filtered.map((record) => (
            <div
              key={record.DELIVERY_ID || record.PATIENT_ID}
              onClick={() => handleSelectRecord(record)}
              className={`dp-patient-card ${selectedRecord?.PATIENT_ID === record.PATIENT_ID ? "selected" : ""}`}
            >
              <div className="dp-patient-info">
                <p className="dp-patient-name">{record.FIRST_NAME || "Unknown"} {record.LAST_NAME || ""}</p>
                <div className="dp-patient-meta">
                   <span className="dp-delivery-date"><Calendar size={12} /> {formatDate(record.DELIVERY_DATE)}</span>
                </div>
              </div>
              <ChevronRight className="dp-chevron" size={16} />
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="dp-empty-list">No matching records found.</p>
          )}
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="dp-main">
        {selectedRecord ? (
          <div className="dp-content-wrapper">
            
            {/* HEADER CARD */}
            <section className="dp-header-card">
              <div className="dp-header-left">
                <div className="dp-avatar"><User /></div>
                <div className="dp-header-info">
                  <h1>{selectedRecord.FIRST_NAME || "Unknown"} {selectedRecord.LAST_NAME || ""}</h1>
                  <div className="dp-header-tags">
                    <span className="dp-tag dp-tag-delivered">✓ Delivered</span>
                    <span className="dp-tag-text">ID: {selectedRecord.PATIENT_ID || "N/A"}</span>
                    <span className="dp-tag-text">•</span>
                    <span className="dp-tag-text">Blood: {selectedRecord.BLOOD_TYPE || "N/A"}</span>
                  </div>
                </div>
              </div>
              <div className="dp-header-right">
                <p className="dp-label">DELIVERY MODE</p>
                <p className="dp-delivery-mode">{selectedRecord.DELIVERY_MODE || "N/A"}</p>
              </div>
            </section>

            {/* STATS GRID */}
            <section className="dp-stats-grid">
              <div className="dp-stat-card">
                <div className="dp-stat-icon purple"><Calendar size={20} /></div>
                <div>
                  <p className="dp-stat-label">DELIVERY DATE</p>
                  <p className="dp-stat-value">{formatDate(selectedRecord.DELIVERY_DATE)}</p>
                </div>
              </div>
              <div className="dp-stat-card">
                <div className="dp-stat-icon amber"><Clock size={20} /></div>
                <div>
                  <p className="dp-stat-label">GESTATION</p>
                  <p className="dp-stat-value">{selectedRecord.GESTATIONAL_AGE_AT_DELIVERY || "N/A"} weeks</p>
                </div>
              </div>
              <div className="dp-stat-card">
                <div className="dp-stat-icon emerald"><Activity size={20} /></div>
                <div>
                  <p className="dp-stat-label">MOTHER CONDITION</p>
                  <p className="dp-stat-value">{selectedRecord.MOTHER_CONDITION_POST_DELIVERY || "N/A"}</p>
                </div>
              </div>
            </section>

            {/* BABY INFORMATION CARD */}
            <section className="dp-babies-card">
              <div className="dp-babies-header">
                <h3 className="dp-babies-title">
                  <Baby size={18} /> Baby Information ({selectedRecord.babies?.length || 0} baby)
                </h3>
              </div>
              
              {selectedRecord.babies && selectedRecord.babies.length > 0 ? (
                selectedRecord.babies.map((b, idx) => (
                  <div className="dp-baby-row" key={idx}>
                    <div className="dp-baby-field"><p className="dp-field-label">GENDER</p><p className="dp-field-value">{b.BABY_SEX || "N/A"}</p></div>
                    <div className="dp-baby-field"><p className="dp-field-label">BIRTH WEIGHT</p><p className="dp-field-value">{b.BIRTH_WEIGHT ? `${b.BIRTH_WEIGHT} g` : "N/A"}</p></div>
                    <div className="dp-baby-field"><p className="dp-field-label">LENGTH</p><p className="dp-field-value">{b.BIRTH_LENGTH ? `${b.BIRTH_LENGTH} cm` : "N/A"}</p></div>
                    <div className="dp-baby-field"><p className="dp-field-label">APGAR 1MIN</p><p className="dp-field-value">{b.APGAR_SCORE_1MIN || "N/A"}</p></div>
                    <div className="dp-baby-field"><p className="dp-field-label">APGAR 5MIN</p><p className="dp-field-value">{b.APGAR_SCORE_5MIN || "N/A"}</p></div>
                  </div>
                ))
              ) : (
                <p className="dp-empty-baby-text">No linked baby records found in database.</p>
              )}
            </section>

            {/* CHARTS SECTION */}
            <section className="dp-charts-section">
              <h3 className="dp-charts-title"><LineChart size={20}/> Historical Clinical Data</h3>
              {patientVisits.length > 0 ? (
                <MaternityCharts visits={patientVisits} prediction={null} />
              ) : (
                <p className="dp-empty-baby-text" style={{paddingTop: '2rem'}}>No historical vitals recorded for this patient.</p>
              )}
            </section>

          </div>
        ) : (
          <div className="dp-empty-state">
            <ClipboardCheck className="dp-empty-icon" size={64} />
            <h3>Select a patient</h3>
            <p>View historical delivery outcomes and baby stats</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DeliveredPatients;