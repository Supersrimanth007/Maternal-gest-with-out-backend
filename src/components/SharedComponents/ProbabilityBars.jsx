import React from "react";
import "./probability.css"; // separate CSS file

const ProbabilityBars = ({ data }) => {
  if (!data) return null;

  const bars = [
    { label: "Normal Delivery", value: data.probability_normal_delivery },
    { label: "C-Section", value: data.probability_c_section },
    { label: "Premature Birth", value: data.probability_premature_birth },
    { label: "Complications", value: data.probability_complications },
  ];

  // Determine color class based on value (example thresholds)
  const getColorClass = (value) => {
    if (value <= 30) return "safe";
    if (value <= 60) return "warning";
    return "danger";
  };

  return (
    <div className="prob-bars-container">
      {bars.map((b) => (
        <div key={b.label} className="prob-item">
          <div className="prob-header">
            <span className="prob-label">{b.label}</span>
            <span className="prob-value">{b.value}%</span>
          </div>
          <div className="prob-track">
            <div
              className={`prob-fill ${getColorClass(b.value)}`}
              style={{ width: `${b.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProbabilityBars;