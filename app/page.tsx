import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const projects = [
  {
    title: 'sigiro',
    url: 'https://github.com/akshatagarwl/sigiro',
    description: 'OpenTelemetry traces, logs, metrics, and profiles in one place.',
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

export default function Page() {
  return (
    <section>
      <h1 className="font-medium text-2xl mb-8 tracking-tighter">
        hey, I'm akshat 👋
      </h1>
      <p className="prose prose-neutral dark:prose-invert"></p>
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
      <ul className="font-sm mt-8 flex flex-col space-x-0 space-y-2 text-neutral-600 md:flex-row md:space-x-4 md:space-y-0 dark:text-neutral-300">
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
