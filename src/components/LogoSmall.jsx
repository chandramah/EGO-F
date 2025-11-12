// src/components/LogoSmall.jsx
import React from "react";

export default function LogoSmall({ text = "SM" }) {
  return <div className="logo-sm" aria-hidden>{text}</div>;
}
