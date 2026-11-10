export default function ActionButton({ action, onClick }) {
  if (!action) return null;
  return <button className="primary" onClick={() => onClick(action[1])}>{action[0]}</button>;
}
