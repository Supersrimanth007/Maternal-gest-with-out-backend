import React from "react";
import "./kpi.css";

const KpiCard = ({ data, isHighlighted = false, status = "stable" }) => {
  const { title, value, unit, change, changeType, icon } = data;

  const changeClass =
    changeType === "increase"
      ? "kpi-change-increase"
      : changeType === "decrease"
      ? "kpi-change-decrease"
      : "kpi-change-stable";

  const statusClass =
    status === "positive"
      ? "kpi-positive"
      : status === "negative"
      ? "kpi-negative"
      : status === "critical"
      ? "kpi-critical"
      : "kpi-stable";

  return (
    <div
      className={`kpi-card ${statusClass} ${
        isHighlighted ? "kpi-highlighted" : ""
      }`}
    >
      <div className="kpi-header">
        <h3 className="kpi-title">{title}</h3>
        <div className="kpi-icon">{icon}</div>
      </div>

      <div className="kpi-value-row">
        <span className="kpi-value">{value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>

      {change && (
        <div className={`kpi-change ${changeClass}`}>
          {change} in last week
        </div>
      )}
    </div>
  );
};

export default KpiCard;
