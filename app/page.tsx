import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const projects = [
  {
    title: 'sigiro',
    url: 'https://github.com/akshatagarwl/sigiro',
    description:
      'OpenTelemetry traces, logs, metrics, and profiles in one place.',
  },
  {
    title: 'otelprofile-go',
    url: 'https://github.com/akshatagarwl/otelprofile-go',
    description: 'Continuous profiling for Go, exported as OTLP Profiles.',
  },
  {
    title: 'otelprofile-rs',
    url: 'https://github.com/akshatagarwl/otelprofile-rs',
    description: 'Experimental continuous profiling for Rust with OTLP export.',
  },
  {
    title: 'linguabench',
    url: 'https://linguabench.akshat.dev',
    description: 'Same question, different language, different answer.',
  },
  {
    title: 'anemoia',
    url: 'https://anemoia.akshat.dev',
    description: "Archival films of the world's cities, on a globe.",
  },
  {
    title: 'openelections.in',
    url: 'https://openelections.in',
    description: 'Make the source code of ECINet/ERONet public.',
  },
  {
    title: 'transfers.fyi',
    url: 'https://transfers.fyi',
    description:
      'The Indian officers transferred most, and the record behind each move.',
  },
];

const links = [
  {
    title: 'Neil Postman — Foreword to Amusing Ourselves to Death',
    url: 'https://www.tau.ac.il/education/muse/maslool/boidem/170foreword.html',
  },
  {
    title: 'Neil Postman — Informing Ourselves to Death',
    url: 'https://web.archive.org/web/20031029211844/http://www.frostbytes.com/~jimf/informing.html',
  },
  {
    title: "Stop Acting Like You're Famous",
    url: 'https://ajkprojects.com/stopactinglikeyourefamous',
  },
  {
    title: "Akin's Laws of Spacecraft Design",
    url: 'https://spacecraft.ssl.umd.edu/akins_laws.html',
  },
  {
    title: 'Why books donʼt work',
    url: 'https://andymatuschak.org/books/',
  },
  {
    title: 'How can we develop transformative tools for thought?',
    url: 'https://numinous.productions/ttft/',
  },
  {
    title: 'Speed matters: Why working quickly is more important than it seems',
    url: 'https://jsomers.net/blog/speed-matters',
  },
  {
    title: 'Patrick Collison — Fast',
    url: 'https://patrickcollison.com/fast',
  },
  {
    title: "Things That Aren't Doing the Thing",
    url: 'https://strangestloop.io/essays/things-that-arent-doing-the-thing',
  },
  {
    title: 'Richard Hamming — You and Your Research',
    url: 'https://d37ugbyn3rpeym.cloudfront.net/stripe-press/TAODSAE_zine_press.pdf',
  },
  {
    title: 'Richard Feynman — Cargo Cult Science',
    url: 'https://calteches.library.caltech.edu/51/2/CargoCult.htm',
  },
  {
    title: 'Reality has a surprising amount of detail',
    url: 'http://johnsalvatier.org/blog/2017/reality-has-a-surprising-amount-of-detail',
  },
  {
    title: 'Willingness to look stupid',
    url: 'https://danluu.com/look-stupid/',
  },
  {
    title: 'The Rise of "Worse is Better"',
    url: 'https://www.dreamsongs.com/RiseOfWorseIsBetter.html',
  },
  {
    title: 'Teach Yourself Programming in Ten Years',
    url: 'https://norvig.com/21-days.html',
  },
  {
    title: "Maker's Schedule, Manager's Schedule",
    url: 'https://paulgraham.com/makersschedule.html',
  },
];

export default function Page() {
  return (
    <section>
      <h1 className="font-medium text-2xl mb-8 tracking-tighter">
        hey, I'm akshat 👋
      </h1>
      <ul className="font-sm mb-12 flex flex-col space-x-0 space-y-2 text-neutral-600 md:flex-row md:space-x-4 md:space-y-0 dark:text-neutral-300">
        <li>
          <a
            className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
            rel="noopener noreferrer"
            target="_blank"
            href="mailto:hey@akshat.dev"
          >
            <ArrowIcon />
            <p className="ml-2 h-7">get in touch</p>
          </a>
        </li>
      </ul>
      <h2 className="font-medium text-xl mb-4 tracking-tighter">projects</h2>
      <div className="flex flex-col space-y-4">
        {projects.map((project) => (
          <a
            key={project.url}
            className="flex flex-col space-y-1 group"
            rel="noopener noreferrer"
            target="_blank"
            href={project.url}
          >
            <span className="text-neutral-900 dark:text-neutral-100 tracking-tight group-hover:underline">
              {project.title}
            </span>
            <span className="text-neutral-600 dark:text-neutral-400">
              {project.description}
            </span>
          </a>
        ))}
      </div>
      <h2 className="font-medium text-xl mt-12 mb-4 tracking-tighter">notes</h2>
      <div className="flex flex-col space-y-4">
        <Link href="/tv" className="flex flex-col space-y-1 group">
          <span className="text-neutral-900 dark:text-neutral-100 tracking-tight group-hover:underline">
            making an android tv less annoying
          </span>
          <span className="text-neutral-600 dark:text-neutral-400">
            Remote buttons, Google voice search, reversible channel filters and
            consent-first phone installers.
          </span>
        </Link>
        <Link href="/qin" className="flex flex-col space-y-1 group">
          <span className="text-neutral-900 dark:text-neutral-100 tracking-tight group-hover:underline">
            locking down a qin f21 pro
          </span>
          <span className="text-neutral-600 dark:text-neutral-400">
            Auditing and hardening a keypad Android phone over ADB, without
            root.
          </span>
        </Link>
      </div>
      <h2
        id="links"
        className="font-medium text-xl mt-12 mb-4 tracking-tighter"
      >
        links
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400 mb-4">
        Essays I keep coming back to.
      </p>
      <div className="flex flex-col space-y-2">
        {links.map((link) => (
          <a
            key={link.url}
            className="text-neutral-900 dark:text-neutral-100 tracking-tight hover:underline"
            rel="noopener noreferrer"
            target="_blank"
            href={link.url}
          >
            {link.title}
          </a>
        ))}
      </div>
    </section>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.07102 11.3494L0.963068 10.2415L9.2017 1.98864H2.83807L2.85227 0.454545H11.8438V9.46023H10.2955L10.3097 3.09659L2.07102 11.3494Z"
        fill="currentColor"
      />
    </svg>
  );
}
