export default function TimelineRenderer({ viewModel = {} }) {
  const { label, summary, points = [] } = viewModel;

  if (!points.length) {
    return (
      <div className="text-gray-500">
        No timeline data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {label && (
        <h2 className="text-2xl font-bold">
          {label}
        </h2>
      )}

      {summary && (
        <p className="text-gray-600">
          {summary}
        </p>
      )}

      <div className="space-y-6">
        {points.map((point, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-blue-500" />

              {index < points.length - 1 && (
                <div className="w-0.5 flex-1 bg-gray-300 min-h-12" />
              )}
            </div>

            <div className="pb-4">
              {point.date && (
                <p className="text-sm text-gray-500">
                  {point.date}
                </p>
              )}

              <h3 className="font-semibold">
                {point.label}
              </h3>

              {point.description && (
                <p className="text-gray-600 mt-1">
                  {point.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}