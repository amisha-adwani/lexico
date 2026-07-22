import React from 'react';

export default function ComparisonRenderer({ viewModel = {} }) {
  const { title, summary, items = [] } = viewModel;

  const criteria = [
    ...new Set(
      items.flatMap((item) =>
        (item.points || []).map((point) => point.criterion)
      )
    ),
  ];

  const getValue = (item, criterion) => {
    const point = (item.points || []).find(
      (p) => p.criterion === criterion
    );

    return point?.value ?? null;
  };

  return (
    <div className="space-y-6">
      {(title || summary) && (
        <div>
          {title && (
            <h2 className="text-2xl font-bold text-gray-900">
              {title}
            </h2>
          )}

          {summary && (
            <p className="mt-2 text-gray-600">
              {summary}
            </p>
          )}
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border border-gray-200 bg-white">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                Criteria
              </th>

              {items.map((item, index) => (
                <th
                  key={index}
                  className="border border-gray-200 px-4 py-3 text-left font-semibold"
                >
                  {item.label || `Item ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {criteria.length === 0 ? (
              <tr>
                <td className="border border-gray-200 px-4 py-3">
                  No criteria
                </td>

                <td
                  colSpan={Math.max(1, items.length)}
                  className="border border-gray-200 px-4 py-3 text-gray-500 italic"
                >
                  No comparison data available
                </td>
              </tr>
            ) : (
              criteria.map((criterion) => (
                <tr key={criterion}>
                  <td className="border border-gray-200 px-4 py-3 font-medium">
                    {criterion}
                  </td>

                  {items.map((item, index) => {
                    const value = getValue(item, criterion);

                    return (
                      <td
                        key={index}
                        className="border border-gray-200 px-4 py-3"
                      >
                        {value ? (
                          value
                        ) : (
                          <span className="italic text-gray-400">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-4 md:hidden">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <h3 className="mb-3 font-semibold">
              {item.label || `Item ${index + 1}`}
            </h3>

            {criteria.length === 0 ? (
              <p className="italic text-gray-500">
                No comparison data
              </p>
            ) : (
              <div className="space-y-2">
                {criteria.map((criterion) => {
                  const value = getValue(item, criterion);

                  return (
                    <div
                      key={criterion}
                      className="flex justify-between gap-4 border-t border-gray-100 pt-2"
                    >
                      <span className="text-gray-600">
                        {criterion}
                      </span>

                      <span>
                        {value ?? (
                          <span className="italic text-gray-400">
                            —
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}