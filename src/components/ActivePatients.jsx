import React, { useState, useEffect } from "react";
import { loadCSV } from "../utils/csvLoader";
import PredictionEngine from "../utils/PredictionEngine";
import Groq from "groq-sdk"; // Import Groq SDK

import {
  Search,
  User,
  Activity,
  AlertCircle,
  Stethoscope,
  Info,
  Sparkles,
  Loader2
} from "lucide-react";

import MaternityCharts from "../components/SharedComponents/MaternityCharts";
import ProbabilityBars from "../components/SharedComponents/ProbabilityBars";
import KpiCard from "../components/SharedComponents/KpiCard";

import "../styles/ActiveMonitor.css";

// Initialize Groq Client
const groq = new Groq({ 
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true // Required for client-side Vite apps
});

const ActivePatients = () => {
  const [activePatients, setActivePatients] = useState([]);
  const [allVisits, setAllVisits] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientVisits, setPatientVisits] = useState([]);
  const [predictionData, setPredictionData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // AI Insights State
  const [aiInsight, setAiInsight] = useState(null); 
  const [insightLoading, setInsightLoading] = useState(false); 

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [patientsData, deliveriesData, visitsData] = await Promise.all([
          loadCSV("/unified_patients_table.csv"),
          loadCSV("/unified_delivery_table.csv"),
          loadCSV("/unified_visits_table.csv"),
        ]);

        if (!patientsData?.length) throw new Error("No patient data found");
        const deliveredIds = new Set(deliveriesData.map((d) => String(d.PATIENT_ID)));
        const active = patientsData.filter((p) => !deliveredIds.has(String(p.PATIENT_ID)));

        setActivePatients(active);
        setAllVisits(visitsData || []);
        if (active.length > 0) handleSelectPatient(active[0], visitsData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  /* ================= PATIENT SELECTION ================= */
  const handleSelectPatient = (patient, visits = allVisits) => {
    setSelectedPatient(patient);
    setAiInsight(null); // Clear old AI plan when switching patients

    const currentVisits = visits
      .filter((v) => String(v.PATIENT_ID) === String(patient.PATIENT_ID))
      .map((v) => ({
        VISIT_DATE: v.VISIT_DATE || v.visit_date || v.Date,
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

    setPatientVisits(currentVisits);

    if (currentVisits.length > 0) {
      try {
        const engine = new PredictionEngine(currentVisits, patient);
        setPredictionData(engine.generatePrediction());
      } catch (err) {
        setPredictionData(null);
      }
    }
  };

  /* ================= GROQ API CALL ================= */
  const generateClinicalPlan = async () => {
    if (!selectedPatient || !patientVisits.length) return;
    setInsightLoading(true);
    setAiInsight(null);

    try {
      const latest = patientVisits.at(-1) || {};
      const prompt = `
        Act as an expert Obstetrician. Generate a clinical care plan based on these real-time vitals:
        
        PATIENT: ${selectedPatient.FIRST_NAME} ${selectedPatient.LAST_NAME}
        AGE: ${selectedPatient.AGE} | GESTATION: Week ${latest.gestational_age_weeks}
        VITALS: Weight: ${latest.weight}kg, HB: ${latest.hemoglobin}g/dL, BP: ${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic}, FHR: ${latest.fetal_heart_rate}bpm
        
        LOCAL RISK ASSESSMENT: ${predictionData?.summary}

        Format strictly into 3 sections with bullet points:
        1. CLINICAL SUMMARY
        2. DIET PLAN
        3. EXERCISE & LIFESTYLE
      `;

      // Using Llama 3.3 70B for high-quality medical reasoning
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You are a professional maternal health AI assistant." },
          { role: "user", content: prompt }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.3, // Lower temperature for more factual clinical output
      });

      setAiInsight(chatCompletion.choices[0]?.message?.content || "");
    } catch (err) {
      console.error("Groq Error:", err);
      setAiInsight(`🚨 Error: ${err.message || "Failed to contact Groq Cloud."}`);
    } finally {
      setInsightLoading(false);
    }
  };

  const filteredPatients = activePatients.filter((p) =>
    `${p.FIRST_NAME} ${p.LAST_NAME}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loader">Initializing Monitor...</div>;

  return (
    <div className="monitor-container">
      <div className="monitor-wrapper">
        <div className="monitor-grid">
          {/* Sidebar */}
          <div className="monitor-sidebar">
            <div className="sidebar-search">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search patient..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="patient-list">
              {filteredPatients.map((p) => (
                <div
                  key={p.PATIENT_ID}
                  onClick={() => handleSelectPatient(p)}
                  className={`patient-card ${selectedPatient?.PATIENT_ID === p.PATIENT_ID ? "selected" : ""}`}
                >
                  <p className="patient-name">{p.FIRST_NAME} {p.LAST_NAME}</p>
                  <p className="patient-id">ID: {p.PATIENT_ID}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Main Panel */}
          <div className="monitor-main">
            {selectedPatient ? (
              <>
                <div className="sticky-header-section">
                  <div className="top-section">
                    <div className="patient-header-card">
                      <div className="patient-profile">
                        <div className="avatar-box"><User size={28} /></div>
                        <div className="patient-info">
                          <h2>{selectedPatient.FIRST_NAME} {selectedPatient.LAST_NAME}</h2>
                          <div className="tags">
                            <span className="tag">ID: {selectedPatient.PATIENT_ID}</span>
                            <span className="tag blood-tag">BLOOD TYPE: {selectedPatient.BLOOD_TYPE}</span>
                            <span className="tag history-tag">MEDICAL HISTORY: {selectedPatient.MEDICAL_HISTORY || "Normal"}</span>
                            <span className="tag">DOB: {selectedPatient.DATE_OF_BIRTH || "N/A"}</span>
                            <span className="tag history-tag">GRAVIDA: {selectedPatient.GRAVIDA || "N/A"}</span>
                            <span className="tag history-tag">BMI STATUS: {selectedPatient.BMI_STATUS || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="metrics-row">
                    <KpiCard data={{ title: "Hemoglobin", value: patientVisits.at(-1)?.hemoglobin || 0, unit: "g/dL" }} />
                    <KpiCard data={{ title: "Weight", value: patientVisits.at(-1)?.weight || 0, unit: "kg" }} />
                    <KpiCard data={{ title: "Fetal HR", value: patientVisits.at(-1)?.fetal_heart_rate || 0, unit: "bpm" }} />
                  </div>

                  <div className="probability-section">
                    <div className="prob-widget-card">
                      <h4>Calculated Risk Levels</h4>
                      <ProbabilityBars data={predictionData} />
                    </div>
                  </div>
                </div>

                {/* --- SCROLLABLE CHARTS & AI BOX --- */}
                  <div className="scrollable-charts-section">
                    <MaternityCharts visits={patientVisits} prediction={predictionData} />

                    {/* IMPROVED AI INSIGHT BOX */}
                    <div className="gemini-insight-box">
                      <div className="gemini-insight-box-header">
                        <h3 className="gemini-insight-header">
                          <Sparkles size={20} /> AI Clinical Care Plan
                        </h3>
                        <button
                          onClick={generateClinicalPlan}
                          className="gemini-btn inline-btn"
                          disabled={insightLoading}
                        >
                          {insightLoading ? <Loader2 size={16} className="spin-icon" /> : <Sparkles size={16} />}
                          {insightLoading ? "Analyzing..." : (aiInsight ? "Update Plan" : "Generate Plan")}
                        </button>
                        </div>
                        
                        {insightLoading ? (
                          <div className="gemini-loading">
                            <Loader2 size={24} className="spin-icon" />
                            <p>Synthesizing clinical data via Groq LPU...</p>
                          </div>
                        ) : aiInsight ? (
                          <div className="clinical-report-content">
                            {aiInsight.split('\n').map((line, index) => {
                              if (line.startsWith('##') || line.includes('Step')) {
                                return <h4 key={index} className="report-section-title">{line.replace(/#/g, '').trim()}</h4>;
                              }
                              if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
                                return <li key={index} className="report-list-item">{line.replace(/[*|-]/, '').trim()}</li>;
                              }
                              return <p key={index} className="report-text">{line}</p>;
                            })}
                          </div>
                        ) : (
                          <div className="gemini-empty-state">
                            <p>No plan generated. Click "Generate Plan" to receive AI-driven dietary and lifestyle guidance.</p>
                          </div>
                        )}
                      </div>
                    </div>
              </>
            ) : (
              <div className="empty-state">
                <Stethoscope size={64} />
                <h3>Select a patient to begin monitoring</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivePatients;