import React from "react";

export default function Table({ columns = [], data = [] }) {
  return (
    <table className="products-table">
      <thead>
        <tr>{columns.map(c => <th key={c.key}>{c.title}</th>)}</tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan={columns.length} style={{ textAlign: "center", padding: 24 }}>No products</td></tr>
        ) : (
          data.map(r => (
            <tr key={r.id || r.sku}>
              <td className="name-col">{r.name}</td>
              <td>{r.sku}</td>
              <td>{r.category}</td>
              <td>{r.unitPrice !== undefined ? `${Number(r.unitPrice).toFixed(2)}` : "-"}</td>
              <td>{r.taxRate !== undefined ? `${r.taxRate}%` : "-"}</td>
              <td><input type="checkbox" checked={!!r.isActive} readOnly /></td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
