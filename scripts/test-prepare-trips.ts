import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const moduleUrl = new URL('./prepare-trips.ts', import.meta.url).href;
const preview = { TRAVEL_PREVIEW: '1' };
const isolated = { ...preview, TRAVEL_PREVIEW_DRAFTS_ONLY: '1' };

function trip(draft: boolean, id = 'taiwan') {
  const prefix = draft ? `/travels/preview/${id}` : `/travels/${id}`;
  const photo = {
    id: 'photo', src: `${prefix}/photo-1800.webp`, alt: 'A test landscape', width: 1800, height: 1200,
    original: { src: `${prefix}/photo-original.webp`, width: 3600, height: 2400 },
  };
  return { id, title: draft ? 'Private draft' : 'Approved trip', month: '2024-04', draft,
    cover: photo, stops: [{ id: 'stop', place: 'Taiwan', photos: [photo] }] };
}

async function snapshot(root: string): Promise<Record<string, string>> {
  const files = await readdir(root, { recursive: true, withFileTypes: true });
  const entries = await Promise.all(files.filter(file => file.isFile()).map(async file => {
    const path = join(file.parentPath, file.name);
    return [path.slice(root.length), (await readFile(path)).toString('hex')];
  }));
  return Object.fromEntries(entries);
}

async function fixture(check: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'prepare-trips-'));
  try {
    for (const dir of ['data', '.generated/travel-draft/media', 'originals', 'public/travels/taiwan']) {
      await mkdir(join(root, dir), { recursive: true });
    }
    await writeFile(join(root, 'data/trips.json'), JSON.stringify([trip(false), trip(false, 'approved-only')]));
    await writeFile(join(root, '.generated/travel-draft/trips.json'), JSON.stringify([trip(true)]));
    for (const size of ['640', '1280', '1800', 'original']) {
      await writeFile(join(root, `.generated/travel-draft/media/photo-${size}.webp`), `sanitized ${size}`);
    }
    await writeFile(join(root, 'originals/camera-original.heic'), 'untouched original GPS metadata');
    await writeFile(join(root, 'public/travels/taiwan/approved.webp'), 'approved asset');
    const protectedRoots = ['data', '.generated/travel-draft', 'originals', 'public/travels/taiwan'];
    const before = await Promise.all(protectedRoots.map(path => snapshot(join(root, path))));
    await check(root);
    const after = await Promise.all(protectedRoots.map(path => snapshot(join(root, path))));
    assert.deepEqual(after, before, 'sources, original media and approved assets must not mutate');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function prepare(root: string, flags: Record<string, string> = {}) {
  return run(process.execPath, ['--eval', `import { prepareTrips } from ${JSON.stringify(moduleUrl)}; await prepareTrips();`], {
    cwd: root,
    env: { ...process.env, TRAVEL_PREVIEW: '', TRAVEL_PREVIEW_DRAFTS_ONLY: '', CI: '', WORKERS_CI: '', ...flags },
  });
}

async function exported(root: string) {
  return JSON.parse(await readFile(join(root, '.generated/trips.json'), 'utf8'));
}

test('default production exports approved records only', () => fixture(async root => {
  await prepare(root);
  assert.deepEqual((await exported(root)).map((t: { draft: boolean }) => t.draft), [false, false]);
  await assert.rejects(readFile(join(root, 'public/travels/preview/taiwan/photo-1800.webp')), { code: 'ENOENT' });
}));

test('default preview rejects promoted draft collisions', () => fixture(async root => {
  await assert.rejects(prepare(root, preview), /Preview records must be distinct/);
}));

test('default preview retains approved trips alongside distinct drafts', () => fixture(async root => {
  await writeFile(join(root, 'data/trips.json'), JSON.stringify([trip(false, 'another-trip')]));
  // The fixture snapshots data, so restore this intentional test setup change afterwards.
  try {
    await prepare(root, preview);
    assert.deepEqual((await exported(root)).map((t: { id: string }) => t.id), ['another-trip', 'taiwan']);
  } finally {
    await writeFile(join(root, 'data/trips.json'), JSON.stringify([trip(false), trip(false, 'approved-only')]));
  }
}));

test('isolated preview exports only the legacy draft and sanitized copies', () => fixture(async root => {
  await prepare(root, isolated);
  const records = await exported(root);
  assert.equal(records.length, 1);
  assert.equal(records[0].draft, true);
  assert.equal(records[0].title, 'Private draft');
  for (const size of ['640', '1280', '1800', 'original']) {
    assert.equal(await readFile(join(root, `public/travels/preview/taiwan/photo-${size}.webp`), 'utf8'), `sanitized ${size}`);
  }
}));

test('draft-only flag is rejected outside private preview', () => fixture(async root => {
  await assert.rejects(prepare(root, { TRAVEL_PREVIEW_DRAFTS_ONLY: '1' }), /requires TRAVEL_PREVIEW=1/);
}));

for (const variable of ['CI', 'WORKERS_CI']) {
  test(`private isolation is forbidden in ${variable}`, () => fixture(async root => {
    await assert.rejects(prepare(root, { ...isolated, [variable]: '1' }), /cannot be built for CI/);
  }));
}

test('isolation still validates approved records', () => fixture(async root => {
  const path = join(root, 'data/trips.json');
  const previous = await readFile(path);
  try {
    for (const invalid of [[{ id: 'broken' }], [trip(true)]]) {
      await writeFile(path, JSON.stringify(invalid));
      await assert.rejects(prepare(root, isolated), /Trips need unique|Drafts\/preview assets/);
    }
  } finally {
    await writeFile(path, previous);
  }
}));
