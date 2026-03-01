import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "./Charts.css";

const COLORS = {
  weight: "#0ea5e9",
  fundal: "#10b981",
  hb: "#8b5cf6",
  systolic: "#ef4444",
  diastolic: "#f59e0b",
  fhr: "#ec4899",
};

const MaternityCharts = ({ visits = [], prediction = null }) => {
  if (!visits.length) {
    return <div className="empty-chart">No visit data available.</div>;
  }

  // Actual visit data
  const actualData = visits
    .filter(v => v.gestational_age_weeks != null)
    .map(v => ({
      week: Number(v.gestational_age_weeks),
      date: v.VISIT_DATE,
      weight_actual: Number(v.weight) || null,
      fundal_actual: Number(v.fundal_height) || null,
      hb_actual: Number(v.hemoglobin) || null,
      systolic: Number(v.blood_pressure_systolic) || null,
      diastolic: Number(v.blood_pressure_diastolic) || null,
      fetalHR: Number(v.fetal_heart_rate) || null,
    }));

  const lastActualWeek =
    actualData.length > 0 ? actualData[actualData.length - 1].week : 0;

  // Prediction data (including FHR)
  const predictionData = useMemo(() => {
    if (!prediction?.progression) return [];

    const mapMetric = (arr, key) =>
      arr
        .filter(p => p.week > lastActualWeek && p.week <= 40)
        .map(p => ({
          week: p.week,
          [key]: p.value,
        }));

    return [
      ...mapMetric(prediction.progression.weight || [], "weight_pred"),
      ...mapMetric(prediction.progression.fundal || [], "fundal_pred"),
      ...mapMetric(prediction.progression.hemoglobin || [], "hb_pred"),
      ...mapMetric(prediction.progression.fhr || [], "fhr_pred")
    ];
  }, [prediction, lastActualWeek]);

  // Merge data
  const chartData = useMemo(() => {
    const map = new Map();
    [...actualData, ...predictionData].forEach(row => {
      if (!map.has(row.week)) map.set(row.week, { week: row.week });
      Object.assign(map.get(row.week), row);
    });
    return Array.from(map.values()).sort((a, b) => a.week - b.week);
  }, [actualData, predictionData]);

  // Weeks that have data (for ticks)
  const allWeeks = useMemo(() => chartData.map(d => d.week), [chartData]);

  // Custom tooltip with week and date
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const actualPoint = actualData.find(d => d.week === label);
      const dateStr = actualPoint?.date ? ` (${actualPoint.date})` : "";
      return (
        <div className="custom-tooltip">
          <p className="tooltip-week">Week {label}{dateStr}</p>
          {payload.map((entry, idx) => (
            <p key={idx} style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toFixed(1) ?? "N/A"}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Check if we actually have prediction data to show
  const hasPrediction = !!prediction && predictionData.length > 0;

  return (
    <div className="charts-grid">
      {/* Weight */}
      <ChartCard title="Maternal Weight (kg)">
        <MetricChart
          data={chartData}
          weeks={allWeeks}
          lines={[
            { key: "weight_actual", label: "Actual", color: COLORS.weight },
            hasPrediction && { key: "weight_pred", label: "Predicted", color: COLORS.weight, dashed: true },
          ].filter(Boolean)} // .filter(Boolean) removes the prediction line if it evaluates to false
          tooltip={<CustomTooltip />}
        />
      </ChartCard>

      {/* Fundal Height */}
      <ChartCard title="Fundal Height (cm)">
        <MetricChart
          data={chartData}
          weeks={allWeeks}
          lines={[
            { key: "fundal_actual", label: "Actual", color: COLORS.fundal },
            hasPrediction && { key: "fundal_pred", label: "Predicted", color: COLORS.fundal, dashed: true },
          ].filter(Boolean)}
          tooltip={<CustomTooltip />}
        />
      </ChartCard>

      {/* Hemoglobin */}
      <ChartCard title="Hemoglobin (g/dL)">
        <MetricChart
          data={chartData}
          weeks={allWeeks}
          lines={[
            { key: "hb_actual", label: "Actual", color: COLORS.hb },
            hasPrediction && { key: "hb_pred", label: "Predicted", color: COLORS.hb, dashed: true },
          ].filter(Boolean)}
          tooltip={<CustomTooltip />}
        />
      </ChartCard>

      {/* Blood Pressure (No predictions generated for BP currently) */}
      <ChartCard title="Blood Pressure (mmHg)">
        <MetricChart
          data={chartData}
          weeks={allWeeks}
          lines={[
            { key: "systolic", label: "Systolic", color: COLORS.systolic },
            { key: "diastolic", label: "Diastolic", color: COLORS.diastolic },
          ].filter(Boolean)}
          tooltip={<CustomTooltip />}
        />
      </ChartCard>

      {/* Fetal Heart Rate */}
      <ChartCard title="Fetal Heart Rate (bpm)">
        <MetricChart
          data={chartData}
          weeks={allWeeks}
          lines={[
            { key: "fetalHR", label: "Actual", color: COLORS.fhr },
            hasPrediction && { key: "fhr_pred", label: "Predicted", color: COLORS.fhr, dashed: true },
          ].filter(Boolean)}
          tooltip={<CustomTooltip />}
        />
      </ChartCard>
    </div>
  );
};

const ChartCard = ({ title, children }) => (
  <div className="chart-card">
    <div className="chart-card-header">
      <h4 className="chart-card-title">{title}</h4>
    </div>
    <div className="chart-responsive-wrapper">{children}</div>
  </div>
);

// Custom Legend Renderer to draw Dash symbols perfectly
const renderCustomLegend = (props) => {
  const { payload } = props;
  
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "12px", fontSize: "11px", fontWeight: 600, color: "#64748b" }}>
      {payload.map((entry, index) => {
        // Detect if the line is dashed based on the prop we passed down
        const isDashed = entry.payload.strokeDasharray && entry.payload.strokeDasharray !== "0";
        
        return (
          <div key={`item-${index}`} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="24" height="10" viewBox="0 0 24 10">
              {/* Draw the line (solid or dashed) */}
              <line 
                x1="0" y1="5" x2="24" y2="5" 
                stroke={entry.color} 
                strokeWidth={isDashed ? "2" : "3"} 
                strokeDasharray={isDashed ? "5 3" : "none"} 
              />
              {/* Draw a solid dot only if it is the "Actual" data */}
              {!isDashed && <circle cx="12" cy="5" r="3.5" fill={entry.color} />}
            </svg>
            <span style={{ color: "#334155" }}>{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
};

const MetricChart = ({ data, weeks, lines, tooltip }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
      <XAxis
        dataKey="week"
        type="number"
        domain={[4, 40]}
        ticks={weeks}
        tickFormatter={w => `W${w}`}
        tick={{ fontSize: 11, fill: "#64748b" }}
        axisLine={{ stroke: "#cbd5e1" }}
        tickLine={{ stroke: "#cbd5e1" }}
        interval="preserveStartEnd"
      />
      <YAxis
        tick={{ fontSize: 11, fill: "#64748b" }}
        axisLine={{ stroke: "#cbd5e1" }}
        tickLine={{ stroke: "#cbd5e1" }}
      />
      <Tooltip content={tooltip} />
      
      {/* Use the Custom Legend */}
      <Legend content={renderCustomLegend} />
      
      {lines.map(l => (
        <Line
          key={l.key}
          dataKey={l.key}
          type="monotone"
          name={l.label}
          stroke={l.color}
          strokeWidth={l.dashed ? 2 : 3}
          strokeDasharray={l.dashed ? "5 3" : "0"}
          dot={!l.dashed ? { r: 3, fill: l.color } : false}
          activeDot={{ r: 5 }}
          opacity={l.dashed ? 0.8 : 1}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
);

const AiStat = ({ label, value, color }) => (
  <div className="ai-stat">
    <span className="ai-stat-label">{label}</span>
    <div className="ai-progress-bar">
      <div
        className="ai-progress-fill"
        style={{ width: `${value || 0}%`, backgroundColor: color }}
      />
    </div>
    <span className="ai-stat-value">{value || 0}%</span>
  </div>
);

export default MaternityCharts;