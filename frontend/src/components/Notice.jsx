import React from 'react';
export function ErrorNotice({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="notice error">
      <b>No se pudo completar la solicitud</b>
      <span>{message}</span>
      <button onClick={onRetry}>Reintentar</button>
    </div>
  );
}

export function SuccessNotice({ message }) {
  if (!message) return null;
  return <div className="notice success">✓ &nbsp;{message}</div>;
}
