import React from 'react';
export default function StatCard({ icon, label, value, foot, alert = false }) {
  return (
    <div className="stat">
      <div className={'staticon ' + (alert ? 'warn' : '')}>{icon}</div>
      <div className="statlabel">{label}</div>
      <strong>{value}</strong>
      <small>{foot}</small>
    </div>
  );
}
