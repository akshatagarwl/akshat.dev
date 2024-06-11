export default async function sitemap() {
  let routes = ['', '/work', '/links'].map((route) => ({
    url: `https://akshat.dev${route}`,
    lastModified: new Date().toISOString().split('T')[0],
  }));

  return [...routes];
}
