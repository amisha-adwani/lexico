import BlockRenderer, { getBlockKind } from './BlockRenderer';
import SkeletonBlock from '../blocks/SkeletonBlock';

function OutputRenderer({ blocks, title, onExport, isExporting, isLoading, inputText, selectedFile }) {
  if (isLoading) {
    return (
      <section className="flex h-full min-h-[480px] items-center justify-center">
        <div className="w-full max-w-2xl">
          <SkeletonBlock height="h-[400px]" />
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
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Output</h2>
          <p className="text-sm text-slate-500">{title}</p>
        </div>
        <button
          type="button"
          onClick={() => onExport({ blocks, inputText, selectedFile })}
          disabled={isExporting}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {blocks.map((block, index) => {
          const kind = getBlockKind(block.type);
          const isHeavy =
            kind === 'key_point' ||
            kind === 'warning' ||
            kind === 'visual';
          const spanClass = isHeavy ? 'lg:col-span-2' : 'lg:col-span-1';

          return (
            <div
              key={`${block.type || 'block'}-${index}`}
              className={spanClass}
            >
              <BlockRenderer block={block} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default OutputRenderer;
