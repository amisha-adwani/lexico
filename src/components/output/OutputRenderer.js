import BlockRenderer, { getBlockKind } from './BlockRenderer';

function OutputRenderer({ blocks, title }) {
  if (!blocks || blocks.length === 0) {
    return (
      <section className="flex h-full min-h-[480px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <div>
          <h2 className="text-base font-semibold text-slate-800">No output yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            AI-generated simplification blocks will appear here.
          </p>
        </div>
      </section>
    );
  }

  if (blocks.length === 1) {
    return (
      <section className="flex h-full min-h-[480px] items-center justify-center">
        <div className="w-full max-w-xl">
          <BlockRenderer block={blocks[0]} />
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Output</h2>
        <p className="text-sm text-slate-500">{title}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {blocks.map((block, index) => {
          const kind = getBlockKind(block.type);
          const isHeavy = kind === 'hero' || kind === 'warning';
          const isFlow = kind === 'flow';
          const spanClass = isHeavy || isFlow ? 'lg:col-span-2' : 'lg:col-span-1';

          return (
            <div key={`${block.type || 'block'}-${index}`} className={spanClass}>
              <BlockRenderer block={block} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default OutputRenderer;
