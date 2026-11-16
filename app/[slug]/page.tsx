import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import notes from '@/data/notes.json';
import content from '@/.generated/notes.json';

export const dynamicParams = false;
export function generateStaticParams() { return notes.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const note = notes.find(item => item.slug === slug);
  return note ? { title: `${note.title} — agent notes`, description: `${note.description} Working context for coding agents, not for human eyes.`, alternates: { canonical: `/${slug}` } } : {};
}
export default async function Note({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = notes.find(item => item.slug === slug);
  if (!note || !(slug in content)) notFound();
  return <div className="note-page">
    <a className="back-link" href="/#notes">← back to agent notes</a>
    <p className="eyebrow">{note.topic} / working context</p>
    <h1>{note.title}</h1>
    <aside className="agent-notice" aria-label="Agent notes"><strong>agent notes — not for human eyes</strong><p>Working context for my coding agents, not polished writing or a guide to follow.</p></aside>
    <article className="note-body" dangerouslySetInnerHTML={{ __html: content[slug as keyof typeof content] }} />
  </div>;
}
