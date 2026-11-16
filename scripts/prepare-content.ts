import { mkdir, readFile, writeFile } from 'node:fs/promises';
import notes from '../data/notes.json';

await mkdir('.generated', { recursive: true });
const content: Record<string, string> = {};
for (const { slug } of notes) {
  const markdown = await readFile(`content/${slug}.md`, 'utf8');
  const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  content[slug] = Bun.markdown.html(body);
}
await writeFile('.generated/notes.json', JSON.stringify(content));
console.log(`Prepared ${notes.length} trusted, local agent notes.`);
