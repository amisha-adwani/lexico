import './SkeletonBlock.css';

function SkeletonBlock({ height = 'h-48' }) {
  return (
    <article className={`rounded-2xl border border-gray-200 bg-gray-100 p-5 shadow-soft ${height}`}>
      <div className="skeleton-pulse mb-2 h-4 w-20 rounded bg-gray-300"></div>
      <div className="skeleton-pulse mb-4 h-5 w-3/4 rounded bg-gray-300"></div>
      <div className="skeleton-pulse h-32 rounded bg-gray-300"></div>
    </article>
  );
}

export default SkeletonBlock;