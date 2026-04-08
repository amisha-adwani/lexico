import Navbar from './Navbar';

function AppLayout({ inputPanel, outputPanel }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
            {inputPanel}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
            {outputPanel}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AppLayout;
