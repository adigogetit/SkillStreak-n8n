import { Link } from 'react-router-dom'

export default function Home() {
  return <main>
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-12 -z-10 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:py-28">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-blue-700 shadow-sm"><span className="h-2 w-2 rounded-full bg-blue-500" /> AI-powered career growth</p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-6xl">Build your next chapter, <span className="text-blue-600">one day at a time.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Turn your career goals into momentum with short, personalized practice challenges that fit into your day.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link to="/signup" className="btn-primary !px-6 !py-3">Start your streak <span className="ml-2">→</span></Link><Link to="/login" className="btn-secondary !px-6 !py-3">Log in</Link></div>
          <div className="mt-8 flex items-center gap-3 text-sm text-slate-500"><div className="flex -space-x-2"><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#f7f9fc] bg-blue-100 text-xs font-bold text-blue-700">S</span><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#f7f9fc] bg-indigo-100 text-xs font-bold text-indigo-700">+</span></div><span>Small steps. Real career progress.</span></div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-blue-100 via-white to-indigo-100 blur-xl" />
          <div className="relative rotate-1 rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_30px_80px_-35px_rgba(37,99,235,.38)] sm:p-7">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Today’s focus</p><p className="mt-1 text-sm text-slate-500">A little practice goes a long way</p></div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">10 min</span>
            </div>
            <div className="mt-7 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">Personalized challenge</p>
              <h2 className="mt-3 text-xl font-bold">Grow your skills with one focused task.</h2>
              <p className="mt-2 text-sm leading-6 text-blue-100">Matched to your goals, experience, and the next role you’re working toward.</p>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full w-2/3 rounded-full bg-white" /></div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">Your streak</span>
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="text-amber-500">✦</span> One day at a time</span>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-5 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-lg shadow-slate-200/60">
            <p className="text-xs font-medium text-slate-500">Built around you</p><p className="mt-0.5 text-sm font-bold text-slate-900">Your goals. Your pace.</p>
          </div>
        </div>
      </div>
    </section>
    <section className="border-y border-slate-200/70 bg-white/65 py-16 sm:py-20"><div className="mx-auto max-w-6xl px-4 sm:px-6"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.14em] text-blue-700">A simple practice loop</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">Make progress feel effortless.</h2><p className="mt-3 leading-7 text-slate-600">A clear next step, made just for you, every time you show up.</p></div><div className="mt-9 grid gap-5 md:grid-cols-3">
      {[['01', 'Share your profile', 'Upload your LinkedIn PDF and tell us where you want to grow.'], ['02', 'Get a focused challenge', 'Receive a practical micro-challenge designed for your current skills.'], ['03', 'Learn from each attempt', 'Mark it solved and rate the difficulty to improve tomorrow’s suggestion.']].map(([number, title, text]) => <article className="card group transition duration-200 hover:-translate-y-1 hover:shadow-lg" key={number}><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-sm font-extrabold text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">{number}</span><h3 className="mt-5 font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}
    </div></div></section>
  </main>
}
