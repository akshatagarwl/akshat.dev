import Link from 'next/link';

export default function Page() {
  const links = [
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
      title:
        'Speed matters: Why working quickly is more important than it seems',
      url: 'https://jsomers.net/blog/speed-matters',
    },
  ];

  return (
    <section>
      <h1 className="font-medium text-2xl mb-8 tracking-tighter">links</h1>
      <div className="prose prose-neutral dark:prose-invert">
        <p>A bunch of blogs, comments, books I keep coming back to:</p>
        <hr className="my-6 border-neutral-100 dark:border-neutral-800" />
        {links.map((link) => (
          <Link
            key={link.title}
            className="flex flex-col w-full space-y-1 mb-4 text-neutral-900 dark:text-neutral-100 tracking-tight"
            href={`${link.url}`}
          >
            {link.title}
          </Link>
        ))}
      </div>
    </section>
  );
}
