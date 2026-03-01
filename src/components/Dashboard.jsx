import React, { useState, useEffect } from 'react';
import { loadCSV } from '../utils/csvLoader';
import { 
  CheckCircle, 
  User, 
  Calendar, 
  Activity,
  Baby,
  Clock,
  MapPin,
  Home,
  Users,
  Archive
} from 'lucide-react';
import '../styles/DeliveredPatients.css';

const DeliveredPatients = () => {
  const [data, setData] = useState({ 
    patients: [], 
    deliveries: [], 
    babies: [] 
  });
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [allPatients, allDeliveries, allBabies] = await Promise.all([
          loadCSV('/unified_patients_table.csv'),
          loadCSV('/unified_delivery_table.csv'),
          loadCSV('/unified_baby_table.csv')
        ]);

        const deliveredIds = new Set(allDeliveries.map(d => String(d.PATIENT_ID)));
        const delivered = allPatients.filter(p => deliveredIds.has(String(p.PATIENT_ID)));

        setData({ 
          patients: delivered, 
          deliveries: allDeliveries, 
          babies: allBabies 
        });
        
        if (delivered.length > 0) setSelectedId(delivered[0].PATIENT_ID);
      } catch (e) { 
        console.error("Error loading data:", e); 
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  if (loading) return (
    <div className="dp-loading-container">
      <div className="dp-loading-spinner"></div>
      <p className="dp-loading-text">Loading historical records...</p>
    </div>
  );

  const currentPatient = data.patients.find(p => String(p.PATIENT_ID) === String(selectedId));
  const currentDelivery = data.deliveries.find(d => String(d.PATIENT_ID) === String(selectedId));
  const currentBabies = data.babies.filter(b => String(b.PATIENT_ID) === String(selectedId));

  return (
    <div className="dp-container">
      {/* Header with title and navigation */}
      <header className="dp-main-header">
        <div className="dp-header-content">
          <h1 className="dp-analytix-title">ANALYTIX-HUB.AI</h1>
          <nav className="dp-nav">
            <a href="/" className="dp-nav-link"><Home size={16} /> Home</a>
            <a href="/active" className="dp-nav-link"><Users size={16} /> Active Care</a>
            <a href="/delivered" className="dp-nav-link active"><Archive size={16} /> Delivery Records</a>
          </nav>
        </div>
      </header>

      <div className="dp-layout">
        {/* Sidebar */}
        <div className="dp-sidebar">
          <div className="dp-sidebar-header">
            <h2 className="dp-sidebar-title">
              <CheckCircle size={20} />
              Delivered Patients
            </h2>
            <p className="dp-sidebar-subtitle">{data.patients.length} records</p>
          </div>
          
          <div className="dp-patient-list">
            {data.patients.length === 0 ? (
              <div className="dp-empty-list">No delivered patients found</div>
            ) : (
              data.patients.map(p => {
                const delivery = data.deliveries.find(d => String(d.PATIENT_ID) === String(p.PATIENT_ID));
                const isSelected = String(selectedId) === String(p.PATIENT_ID);
                return (
                  <div
                    key={p.PATIENT_ID}
                    onClick={() => setSelectedId(p.PATIENT_ID)}
                    className={`dp-patient-card ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="dp-patient-info">
                      <p className="dp-patient-name">
                        {p.FIRST_NAME} {p.LAST_NAME}
                      </p>
                      <p className="dp-patient-meta">
                        <MapPin size={12} /> {p.ADDRESS || 'Unknown location'}
                      </p>
                      {delivery?.DELIVERY_DATE && (
                        <p className="dp-patient-meta">
                          <Calendar size={12} /> {formatDate(delivery.DELIVERY_DATE)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="dp-main">
          {currentPatient && currentDelivery ? (
            <div className="dp-content-wrapper">
              {/* Patient Header */}
              <div className="dp-header-card">
                <div className="dp-header-left">
                  <div className="dp-avatar">
                    <User size={28} />
                  </div>
                  <div className="dp-header-info">
                    <h1 className="dp-patient-name-large">
                      {currentPatient.FIRST_NAME} {currentPatient.LAST_NAME}
                    </h1>
                    <div className="dp-header-tags">
                      <span className="dp-tag dp-tag-delivered">
                        <CheckCircle size={14} /> Delivered
                      </span>
                      <span className="dp-tag-text">ID: {currentPatient.PATIENT_ID}</span>
                      {currentPatient.BLOOD_TYPE && (
                        <span className="dp-tag-text">Blood: {currentPatient.BLOOD_TYPE}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="dp-stats-grid">
                <div className="dp-stat-card">
                  <div className="dp-stat-icon purple">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="dp-stat-label">Gestational Age</p>
                    <p className="dp-stat-value">{currentDelivery.GESTATIONAL_AGE_AT_DELIVERY || 'N/A'} weeks</p>
                  </div>
                </div>
                <div className="dp-stat-card">
                  <div className="dp-stat-icon emerald">
                    <Activity size={20} />
                  </div>
                  <div>
                    <p className="dp-stat-label">Outcome</p>
                    <p className="dp-stat-value">{currentDelivery.MOTHER_CONDITION_POST_DELIVERY || 'Stable'}</p>
                  </div>
                </div>
              </div>

              {/* Baby Information Table */}
              {currentBabies.length > 0 && (
                <div className="dp-babies-card">
                  <div className="dp-babies-header">
                    <h3 className="dp-babies-title">
                      <Baby size={18} />
                      Baby Information ({currentBabies.length} {currentBabies.length === 1 ? 'baby' : 'babies'})
                    </h3>
                  </div>
                  <table className="dp-babies-table">
                    <thead>
                      <tr>
                        <th>Gender</th>
                        <th>Birth Weight</th>
                        <th>Length</th>
                        <th>APGAR 1min</th>
                        <th>APGAR 5min</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBabies.map((baby, index) => (
                        <tr key={index}>
                          <td>{baby.BABY_GENDER || 'N/A'}</td>
                          <td>{baby.BIRTH_WEIGHT ? `${baby.BIRTH_WEIGHT} g` : 'N/A'}</td>
                          <td>{baby.BIRTH_LENGTH ? `${baby.BIRTH_LENGTH} cm` : 'N/A'}</td>
                          <td>{baby.APGAR_SCORE_1MIN || 'N/A'}</td>
                          <td>{baby.APGAR_SCORE_5MIN || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Historical Data Placeholder */}
              <div className="dp-historical-placeholder">
                <Activity size={40} className="dp-placeholder-icon" />
                <h4 className="dp-placeholder-title">Historical Clinical Data</h4>
                <p className="dp-placeholder-text">
                  Antenatal visit trends, weight progression, and other historical metrics would appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="dp-empty-state">
              <CheckCircle size={48} className="dp-empty-icon" />
              <h3 className="dp-empty-title">Select a patient</h3>
              <p className="dp-empty-subtitle">Choose a delivered patient from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveredPatients;