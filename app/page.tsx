import type { Metadata } from 'next';
import FlowerGarden from '@/components/FlowerGarden';
import { TravelTrail } from '@/components/TravelTrail';
import { TravelGallery } from '@/components/TravelGallery';
import { readTrips } from '@/lib/read-trips';
import { parseTravels } from '@/lib/travels';
import travels from '@/data/travels.json';
import projects from '@/data/projects.json';
import notes from '@/data/notes.json';
import links from '@/data/links.json';

export const metadata: Metadata = { alternates: { canonical: '/' } };
const summaries: Record<string, string> = {
  sigiro: 'OpenTelemetry, together.',
  'otelprofile-go': 'Continuous Go profiling.',
  'otelprofile-rs': 'Continuous Rust profiling.',
  linguabench: 'One question. Many languages.',
  anemoia: 'Old films, on a globe.',
  'openelections.in': 'Open-source election software.',
  'transfers.fyi': 'Tracking officer transfers.',
  'tv-setup': 'Consent-first Android TV setup.',
};
function ReadingLink({ link }: { link: typeof links[number] }) {
  return <li><a href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a></li>;
}
export default function Home() {
  const trips = readTrips();
  return <>
    <section className="intro" aria-labelledby="intro-title">
      <h1 id="intro-title">hey, I'm akshat</h1>
      <p className="intro-description">I use this website as a dumping ground for some of my side projects.</p>
      <a className="contact" href="mailto:hey@akshat.dev">say hello</a>
      <FlowerGarden />
    </section>
    <section id="projects" className="content-section" aria-labelledby="projects-title">
      <h2 id="projects-title">projects</h2>
      <ul className="entry-list">{projects.map(project => <li key={project.url}><a className="entry" href={project.url} target="_blank" rel="noopener noreferrer"><span className="entry-title">{project.title}</span><span className="description">{summaries[project.title] || project.description}</span></a></li>)}</ul>
    </section>
    {trips.length ? <TravelGallery trips={trips} /> : <TravelTrail stops={parseTravels(travels)} />}
    <section id="notes" className="content-section" aria-labelledby="notes-title">
      <h2 id="notes-title">agent notes</h2>
      <p className="section-description">agent notes — not for human eyes</p>
      <ul className="entry-list note-list">{notes.map(note => <li key={note.slug}><a href={`/${note.slug}`}>{note.title}</a></li>)}</ul>
    </section>
    <section id="links" className="content-section" aria-labelledby="links-title">
      <h2 id="links-title">links</h2>
      <ul className="reading-list">{links.slice(0, 6).map(link => <ReadingLink key={link.url} link={link} />)}</ul>
      <details className="more-links"><summary>{links.length - 6} more</summary><ul className="reading-list">{links.slice(6).map(link => <ReadingLink key={link.url} link={link} />)}</ul></details>
    </section>
  </>;
}
