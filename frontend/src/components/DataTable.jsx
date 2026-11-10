import EmptyState from './EmptyState.jsx';

export default function DataTable({ headers, rows, empty, actions }) {
  if (!rows.length) return <EmptyState text={empty} />;
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => <th key={header}>{header}</th>)}
            {actions && <th>ACCIONES</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
              {actions && <td>{actions[index]}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
