import React from 'react';

export default function FlowRenderer({ viewModel = {} }) {
const { label, summary, steps = [] } = viewModel;

if (!steps.length) {
return ( <div className="text-gray-500">
No flow data available </div>
);
}

return ( <div className="space-y-6">
{(label || summary) && ( <div>
{label && ( <h2 className="text-2xl font-bold text-gray-900">
{label} </h2>
)}

```
      {summary && (
        <p className="mt-2 text-gray-600">
          {summary}
        </p>
      )}
    </div>
  )}

  <div className="flex flex-col gap-4">
    {steps.map((step, index) => {
      const label =
        typeof step === 'string'
          ? step
          : step.label || `Step ${index + 1}`;

      const description =
        typeof step === 'object'
          ? step.description
          : '';

      return (
        <div key={index}>
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white font-semibold">
                {index + 1}
              </div>

              {index < steps.length - 1 && (
                <div className="mt-2 h-10 w-0.5 bg-gray-300" />
              )}
            </div>

            <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900">
                {label}
              </h3>

              {description && (
                <p className="mt-2 text-gray-600">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    })}
  </div>
</div>
);
}
