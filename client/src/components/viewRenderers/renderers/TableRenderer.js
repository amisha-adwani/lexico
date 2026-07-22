import React, { useMemo, useState } from 'react';

export default function TableRenderer({ viewModel = {} }) {
  const { title, summary, columns = [], rows = [] } = viewModel;

  const [sortColumn, setSortColumn] = useState('importance');
  const [sortDirection, setSortDirection] = useState('desc');

  const sortedRows = useMemo(() => {
    const copy = [...rows];

    copy.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (!isNaN(aVal) && !isNaN(bVal)) {
        return sortDirection === 'asc'
          ? Number(aVal) - Number(bVal)
          : Number(bVal) - Number(aVal);
      }

      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return copy;
  }, [rows, sortColumn, sortDirection]);

  const handleSort = (columnId) => {
    if (sortColumn === columnId) {
      setSortDirection((prev) =>
        prev === 'asc' ? 'desc' : 'asc'
      );
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-xl font-semibold">
          {title}
        </h2>
      )}

      {summary && (
        <p className="text-gray-600">
          {summary}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  onClick={() => handleSort(column.id)}
                  className="cursor-pointer px-4 py-3 text-left text-sm font-medium text-gray-700"
                >
                  {column.label}

                  {sortColumn === column.id && (
                    <span className="ml-2">
                      {sortDirection === 'asc'
                        ? '↑'
                        : '↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedRows.map((row) => (
              <tr key={row.nodeId}>
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className="px-4 py-3 text-sm text-gray-700"
                  >
                    {row[column.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}