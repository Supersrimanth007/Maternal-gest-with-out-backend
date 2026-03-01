import React from 'react';
import './homekpi.css';

export const HomeKpiCard = ({ data }) => {
  return (
    <div className="home-kpi-card">
      <div className="icon-wrapper">
        {data.icon}
      </div>
      <div>
        <div className="kpi-value">{data.value.toLocaleString()}</div>
        <div className="kpi-title">{data.title}</div>
      </div>
    </div>
  );
};

export const KpiCardSkeleton = () => (
  <div className="kpi-skeleton">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="skeleton-card"></div>
    ))}
  </div>
);

export const ProgressBar = ({ value, max, colorClass = "bg-blue", label }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="progress-container">
      <div className="progress-header">
        <span>{label}</span>
        <span>{value.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <div className="progress-track">
        <div 
          className={`progress-fill ${colorClass}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export const Gauge = ({ value, max, title, color = "#0ea5e9" }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="gauge-card">
      <div className="gauge-title">{title}</div>
      <div className="gauge-circle" style={{ background: `conic-gradient(${color} 0% ${percentage}%, #e2e8f0 ${percentage}% 100%)` }}>
        <div className="gauge-inner">
          <span className="gauge-percent">{Math.round(percentage)}%</span>
        </div>
      </div>
      <div className="gauge-footer">Volume: {value} / {max}</div>
    </div>
  );
};

export const StatsCard = ({ title, value, subtitle }) => (
  <div className="stats-card">
    <div className="kpi-title">{title}</div>
    <div className="kpi-value">{value.toLocaleString()}</div>
    <div className="stats-subtitle">{subtitle}</div>
  </div>
);