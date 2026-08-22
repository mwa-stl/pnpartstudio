import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import Reveal, { RevealLines } from '../components/motion/Reveal';
import ParallaxLayer from '../components/motion/ParallaxLayer';
import { getPost, posts, formatDate } from '../data/blogPosts';

const BlogPostPage = () => {
  const { id } = useParams();
  const post = getPost(id);

  if (!post) {
    return (
      <div className="min-h-[70vh] flex items-center bg-paper px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto w-full">
          <div className="max-w-xl">
            <div className="section-index mb-8">Not Found</div>
            <h1 className="t-display mb-6">That post doesn&apos;t exist</h1>
            <p className="text-graphite mb-10">It may have been renamed or removed.</p>
            <Link to="/blog" className="btn-k">Back to the journal <ArrowUpRight size={13} /></Link>
          </div>
        </div>
      </div>
    );
  }

  const related = posts
    .filter(p => p.id !== post.id && (p.category === post.category || p.tags.some(t => post.tags.includes(t))))
    .slice(0, 3);

  return (
    <article className="bg-paper min-h-screen">
      {/* Hero plate */}
      <div className="relative h-[48vh] min-h-[320px] overflow-hidden border-b border-ink">
        <ParallaxLayer speed={0.16} className="absolute inset-0 h-full">
          <img src={post.image} alt="" className="w-full h-full object-cover" aria-hidden="true" />
        </ParallaxLayer>
        <div className="absolute inset-0 bg-ink/62" />
        <div className="relative z-10 h-full flex items-end on-ink">
          <div className="max-w-[1000px] mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12">
            <div className="section-index mb-6">{post.category}</div>
            <RevealLines
              as="h1"
              className="t-display text-paper"
              lines={[post.title]}
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Link to="/blog" className="group inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate hover:text-vermillion transition-colors mb-10">
          <ArrowLeft size={13} className="transition-transform duration-300 group-hover:-translate-x-1" />
          All posts
        </Link>

        {/* Meta strip */}
        <dl className="grid grid-cols-2 sm:grid-cols-3 border-t border-l border-rule mb-12">
          {[
            ['Author', post.author],
            ['Published', formatDate(post.date)],
            ['Reading time', `${post.readTime} min`],
          ].map(([k, v]) => (
            <div key={k} className="border-r border-b border-rule p-4">
              <dt className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-slate mb-1.5">{k}</dt>
              <dd className="text-[0.88rem] text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        {/* Body */}
        <Reveal>
          <p
            className="text-ink text-[1.25rem] leading-[1.55] mb-12 pb-12 border-b border-ink"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
          >
            {post.excerpt}
          </p>
          <div className="text-graphite leading-[1.85] text-[1rem] space-y-7 max-w-[68ch]">
            {post.body.map((para, i) => (
              <p key={i} className={i === 0 ? "first-letter:float-left first-letter:mr-3 first-letter:text-[3.4rem] first-letter:leading-[0.82] first-letter:text-ink first-letter:font-normal first-letter:[font-family:var(--font-display)]" : ""}>
                {para}
              </p>
            ))}
          </div>
        </Reveal>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-14 pt-8 border-t border-ink">
          {post.tags.map(t => <span key={t} className="tag-k">{t}</span>)}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-paper-dim border-t border-rule py-16 sm:py-24">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="section-index mb-7">Keep Reading</div>
            <h2 className="t-display mb-12">Related posts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {related.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.07}>
                  <Link to={`/blog/${p.id}`} className="card-k flex flex-col h-full overflow-hidden group bg-paper">
                    <span className="block aspect-video bg-paper-deep overflow-hidden">
                      <img src={p.image} alt="" className="w-full h-full object-cover transition-transform duration-[1100ms] group-hover:scale-[1.05]" loading="lazy" />
                    </span>
                    <span className="block p-5 flex-1 border-t border-rule">
                      <span className="section-index !gap-2.5 mb-3">{p.category}</span>
                      <span className="t-title block line-clamp-2 mb-3 group-hover:text-vermillion transition-colors">
                        {p.title}
                      </span>
                      <span className="block font-mono text-[0.56rem] uppercase tracking-[0.12em] text-slate mt-auto pt-3">
                        {p.readTime} min read
                      </span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
};

export default BlogPostPage;
