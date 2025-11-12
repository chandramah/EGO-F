// src/components/Pagination.jsx
import React from "react";
import "./../styles.css";

/**
 * Props:
 *  - page (0-based)
 *  - totalPages (number)
 *  - onChange(newPage0Based)
 */
export default function Pagination({ page = 0, totalPages = 0, onChange = () => {} }) {
  if (!totalPages || totalPages <= 1) return null;

  const maxButtons = 9; // show up to 9 numbered buttons (flexible)
  const current = page;

  let start = Math.max(0, current - 3);
  let end = Math.min(totalPages - 1, current + 3);

  // expand window to reach maxButtons when possible
  while (end - start + 1 < Math.min(maxButtons, totalPages)) {
    if (start > 0) start--;
    else if (end < totalPages - 1) end++;
    else break;
  }

  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  const goto = (p) => {
    if (p < 0 || p >= totalPages) return;
    onChange(p);
  };

  return (
    <div className="pagination" role="navigation" aria-label="Pagination">
      <button onClick={() => goto(0)} disabled={page === 0} title="First">«</button>
      <button onClick={() => goto(page - 1)} disabled={page === 0} aria-label="Previous">‹</button>

      {start > 0 && (
        <>
          <button onClick={() => goto(0)} className={page === 0 ? "active" : ""}>1</button>
          {start > 1 && <span className="dots">…</span>}
        </>
      )}

      {pages.map((p) => (
        <button key={p} onClick={() => goto(p)} className={p === page ? "active" : ""}>
          {p + 1}
        </button>
      ))}

      {end < totalPages - 1 && (
        <>
          {end < totalPages - 2 && <span className="dots">…</span>}
          <button onClick={() => goto(totalPages - 1)} className={page === totalPages - 1 ? "active" : ""}>
            {totalPages}
          </button>
        </>
      )}

      <button onClick={() => goto(page + 1)} disabled={page >= totalPages - 1} aria-label="Next">›</button>
      <button onClick={() => goto(totalPages - 1)} disabled={page >= totalPages - 1} title="Last">»</button>
    </div>
  );
}
