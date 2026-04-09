function TableBlock({ data }) {
  const headers = Array.isArray(data?.headers) ? data.headers : [];
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Table</p>
      <h3 className="mb-4 text-base font-semibold text-slate-900">{data?.title || 'Structured Data'}</h3>

      <div className="overflow-x-auto">
        <table className="min-w-full overflow-hidden rounded-xl border border-slate-200 text-left text-sm">
          {headers.length > 0 && (
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                {headers.map((header, index) => (
                  <th key={`${header}-${index}`} className="border-b border-slate-200 px-3 py-2 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className="odd:bg-white even:bg-slate-50/60">
                {row.map((cell, cellIndex) => (
                  <td key={`cell-${rowIndex}-${cellIndex}`} className="border-b border-slate-100 px-3 py-2 text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default TableBlock;
