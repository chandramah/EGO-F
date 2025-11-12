// src/components/KPI.jsx
import React from "react";
export default function KPI({ title, value }) {
  return (
    <div className="kpi">
      <div className="label">{title}</div>
      <div className="value">{value}</div>
    </div>
  );
}
