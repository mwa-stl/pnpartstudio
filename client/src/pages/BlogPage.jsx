import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search, X, ArrowUpRight } from 'lucide-react';
import Reveal, { RevealLines } from '../components/motion/Reveal';
import Select from '../components/ui/Select';
import PageHeroMedia from '../components/PageHeroMedia';
import usePageHero from '../hooks/usePageHero';
import { posts, allCategories, allTags, formatDate } from '../data/blogPosts';

const API_BASE = import.meta.env.VITE_API_URL || '';
const PAGE_SIZE = 6;

const BlogPage = () => {
  const hero = usePageHero('blog');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [tag, setTag] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  const [email, setEmail] = useState('');
  const [subState, setSubState] = useState({ loading: false, message: '', ok: false });

  const filtered = useMemo(() => {
    let list = [...posts];
    if (category !== 'All') list = list.filter(p => p.category === category);
    if (tag !== 'All') list = list.filter(p => p.tags.includes(tag));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    switch (sortBy) {
      case 'oldest': list.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
      case 'readtime': list.sort((a, b) => a.readTime - b.readTime); break;
      default: list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return list;
  }, [search, category, tag, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pagePosts = filtered.slice(start, start + PAGE_SIZE);
  const featured = filtered[0] ?? posts[0];

  const activeFilters = (category !== 'All' ? 1 : 0) + (tag !== 'All' ? 1 : 0) + (search ? 1 : 0);
  const resetFilters = () => { setCategory('All'); setTag('All'); setSearch(''); setPage(1); };

  const subscribe = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setSubState({ loading: false, ok: false, message: 'Enter a valid email address.' });
      return;
    }
    setSubState({ loading: true, ok: false, message: '' });
    try {
      await axios.post(`${API_BASE}/api/newsletters/subscribe`, { email });
      setSubState({ loading: false, ok: true, message: 'Thank you for subscribing.' });
      setEmail('');
    } catch (err) {
      const already = err?.response?.status === 409;
      setSubState({
        loading: false,
        ok: already,
        message: already ? 'You are already subscribed.' : (err?.response?.data?.message || 'Subscription failed. Please try again.'),
      });
    }
  };

  const pill = (active) =>
    `px-3.5 py-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] border transition-colors ${
      active
        ? 'bg-ink text-paper border-ink'
        : 'bg-transparent text-graphite border-rule-strong hover:border-ink hover:text-ink'
    }`;

  return (
    <div className="bg-paper min-h-screen">
      {/* Masthead */}
      <div className="border-b border-ink">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-10 lg:gap-20 items-end">
            <div>
              <div className="section-index mb-8">{hero.sectionLabel}</div>
              <RevealLines as="h1" className="t-hero" lines={hero.headingLines} />
            </div>
            {hero.intro && (
              <p className="text-graphite leading-relaxed max-w-md">{hero.intro}</p>
            )}
          </div>
          {hero.image && (
            <PageHeroMedia
              src={hero.image}
              alt=""
              className="w-full h-[220px] sm:h-[300px] object-cover border border-ink mt-10"
            />
          )}
        </div>
      </div>

      {/* Featured */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <Reveal>
          <article className="grid grid-cols-1 lg:grid-cols-2 border border-ink overflow-hidden group">
            <Link to={`/blog/${featured.id}`} className="block overflow-hidden bg-paper-deep aspect-[16/10] lg:aspect-auto lg:min-h-[420px]">
              <img
                src={featured.image}
                alt=""
                className="w-full h-full object-cover transition-transform duration-[1100ms] group-hover:scale-[1.045]"
                loading="eager"
              />
            </Link>
            <div className="p-8 sm:p-12 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-ink">
              <div className="section-index mb-7">{featured.category}</div>
              <h2 className="t-display !text-[clamp(1.6rem,3.2vw,2.6rem)] mb-6">
                <Link to={`/blog/${featured.id}`} className="hover:text-vermillion transition-colors">{featured.title}</Link>
              </h2>
              <p className="text-graphite mb-8 leading-relaxed">{featured.excerpt}</p>
              <div className="flex gap-6 flex-wrap font-mono text-[0.58rem] uppercase tracking-[0.12em] text-slate mb-9">
                <span>{featured.author}</span>
                <span>{formatDate(featured.date)}</span>
                <span>{featured.readTime} min read</span>
              </div>
              <Link to={`/blog/${featured.id}`} className="btn-k self-start">
                Read article <ArrowUpRight size={13} />
              </Link>
            </div>
          </article>
        </Reveal>
      </section>

      {/* Main */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-24 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12 lg:gap-16">
        <div className="min-w-0">
          {/* Toolbar */}
          <div className="flex flex-wrap items-end gap-4 pb-4 border-b border-ink mb-8">
            <div className="flex items-end flex-1 min-w-[180px] gap-2 border-b border-rule-strong focus-within:border-vermillion transition-colors">
              <Search size={15} className="text-slate mb-2.5 shrink-0" aria-hidden="true" />
              <label htmlFor="blog-search" className="sr-only">Search posts</label>
              <input
                id="blog-search"
                type="text"
                className="flex-1 bg-transparent border-0 py-2 text-[0.9rem] text-ink focus:outline-none placeholder:text-slate min-w-0"
                placeholder="Search posts and tags…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); }} aria-label="Clear search" className="text-slate hover:text-vermillion transition-colors mb-2.5">
                  <X size={14} />
                </button>
              )}
            </div>
            <label htmlFor="blog-sort" className="sr-only">Sort posts</label>
            <Select
              id="blog-sort"
              aria-label="Sort posts"
              variant="box"
              className="w-[180px] shrink-0"
              buttonClassName="font-mono text-[0.66rem] uppercase tracking-[0.1em]"
              value={sortBy}
              onChange={(v) => { setSortBy(v); setPage(1); }}
              options={[
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
                { value: 'readtime', label: 'Shortest read' },
              ]}
            />
          </div>

          {activeFilters > 0 && (
            <button onClick={resetFilters} className="mb-8 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-vermillion hover:text-ink transition-colors border-b border-vermillion pb-1">
              Clear filters ({activeFilters})
            </button>
          )}

          {/* Index */}
          {pagePosts.length === 0 ? (
            <div className="py-24 text-center border-t border-rule">
              <p className="t-section mb-3">No posts found</p>
              <p className="text-graphite text-[0.92rem]">Nothing matches those filters try clearing them.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {pagePosts.map((post, idx) => (
                <Reveal key={post.id} delay={Math.min(idx, 4) * 0.06}>
                  <article className="card-k overflow-hidden flex flex-col h-full group">
                    <Link to={`/blog/${post.id}`} className="flex flex-col h-full">
                      <span className="block aspect-video w-full bg-paper-deep overflow-hidden">
                        <img
                          src={post.image} alt=""
                          className="w-full h-full object-cover transition-transform duration-[1100ms] group-hover:scale-[1.05]"
                          loading="lazy"
                        />
                      </span>
                      <span className="block p-5 flex-1 border-t border-rule">
                        <span className="section-index !gap-2.5 mb-3.5">{post.category}</span>
                        <span className="t-title block mb-2.5 line-clamp-2 group-hover:text-vermillion transition-colors">
                          {post.title}
                        </span>
                        <span className="block text-graphite mb-5 text-[0.85rem] line-clamp-3 leading-relaxed">{post.excerpt}</span>
                        <span className="flex justify-between items-center pt-4 border-t border-rule font-mono text-[0.56rem] uppercase tracking-[0.12em] text-slate">
                          <span>{formatDate(post.date)}</span>
                          <span>{post.readTime} min</span>
                        </span>
                      </span>
                    </Link>
                  </article>
                </Reveal>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-12 flex justify-center items-center gap-2" aria-label="Pagination">
              <button
                className="px-4 py-2.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] border border-rule-strong text-graphite disabled:opacity-30 enabled:hover:bg-ink enabled:hover:text-paper enabled:hover:border-ink transition-colors"
                disabled={currentPage === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  aria-current={currentPage === n ? 'page' : undefined}
                  className={`w-10 h-10 font-mono text-[0.68rem] tabular-nums border transition-colors ${
                    currentPage === n
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-transparent text-graphite border-rule-strong hover:border-ink hover:text-ink'
                  }`}
                  onClick={() => setPage(n)}
                >
                  {String(n).padStart(2, '0')}
                </button>
              ))}
              <button
                className="px-4 py-2.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] border border-rule-strong text-graphite disabled:opacity-30 enabled:hover:bg-ink enabled:hover:text-paper enabled:hover:border-ink transition-colors"
                disabled={currentPage === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </nav>
          )}
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-10">
          <div>
            <h2 className="label-mono mb-4">Categories</h2>
            <div className="flex flex-col gap-1.5">
              {allCategories.map(c => (
                <button key={c} className={`${pill(category === c)} text-left`} onClick={() => { setCategory(c); setPage(1); }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="label-mono mb-4">Tags</h2>
            <div className="flex flex-wrap gap-1.5">
              <button className={pill(tag === 'All')} onClick={() => { setTag('All'); setPage(1); }}>All</button>
              {allTags.map(t => (
                <button key={t} className={pill(tag === t)} onClick={() => { setTag(t); setPage(1); }}>{t}</button>
              ))}
            </div>
          </div>

          <div className="border-t border-ink pt-6">
            <h2 className="label-mono mb-3">Subscribe</h2>
            <p className="text-graphite text-[0.85rem] mb-5 leading-relaxed">
              New posts, studio news, and workshop dates no more than once a month.
            </p>
            <form className="flex flex-col gap-4" onSubmit={subscribe} noValidate>
              <div>
                <label htmlFor="blog-email" className="sr-only">Email address</label>
                <input
                  id="blog-email"
                  className="field-k text-[0.88rem]"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setSubState({ loading: false, ok: false, message: '' }); }}
                  required
                />
              </div>
              <button type="submit" disabled={subState.loading} className="btn-k btn-k-sm w-full">
                {subState.loading ? 'Joining…' : <>Subscribe <ArrowUpRight size={12} /></>}
              </button>
              {subState.message && (
                <p role="status" className={`font-mono text-[0.6rem] uppercase tracking-[0.1em] ${subState.ok ? 'text-vermillion' : 'text-graphite'}`}>
                  {subState.message}
                </p>
              )}
            </form>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default BlogPage;
