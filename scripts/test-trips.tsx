import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseTrips, photoSrcSet, tripDate, tripMedia, videoDuration, videoPosition, type VideoPosition } from '../lib/trips';
import { TravelGallery } from '../components/TravelGallery';
import publishedTrips from '../data/trips.json' with { type: 'json' };

const image = { id: 'sample', src: '/travels/fixture/sample-1800.webp', alt: 'Clearly labelled test photograph.', width: 1800, height: 1800 };
const valid = { id: 'fixture', title: 'Test trip <script>', month: '2025-06', cover: image, stops: [{ id: 'test-place', place: 'Test place', location: [121, 23], photos: [image] }] };
const parse = (value: unknown) => parseTrips([value]);
assert.deepEqual(parseTrips([]), []);
assert.equal(renderToStaticMarkup(<TravelGallery trips={[]} />), '');
assert.equal(parse(valid)[0].title, valid.title);
assert.equal(parse({ ...valid, stops: [{ ...valid.stops[0], date: '2025-06-17' }] })[0].stops[0].date, '2025-06-17');
for (const date of ['2025-02-29', '2026-02-31', '2026-13-01', 'tomorrow', '2026-10-20T12:30:00Z']) assert.throws(() => parse({ ...valid, stops: [{ ...valid.stops[0], date }] }));
assert.equal(tripDate('2026-10-17'), '17 Oct 2026');
assert.equal(tripDate('2026-10'), 'Oct 2026');
for (const value of [null, {}, { ...valid, id: '../oops' }, { ...valid, month: '2025-99' }, { ...valid, stops: [] }, { ...valid, cover: { ...image, id: 'not-in-trip' } }, { ...valid, draft: 'true' }]) assert.throws(() => parse(value));
for (const location of [[181, 23], [121, 85], [NaN, 23], [121], ['121', 23]]) assert.throws(() => parse({ ...valid, stops: [{ ...valid.stops[0], location }] }));
for (const src of ['https://example.com/a.webp', '/travels/../private.webp', '/travels/a/a.webp?gps=1']) assert.throws(() => parse({ ...valid, cover: { ...image, src } }));
assert.throws(() => parse({ ...valid, stops: [{ ...valid.stops[0], photos: [{ ...image, width: -1 }] }] }));
assert.throws(() => parseTrips([valid, valid]));
assert.throws(() => parse({ ...valid, stops: [valid.stops[0], { ...valid.stops[0], id: 'other' }] }));
const video = { id: 'clip', src: '/travels/fixture/clip.mp4', poster: '/travels/fixture/clip-poster.webp', title: 'Factual test clip.', width: 1280, height: 720, duration: 173.95 };
const withVideo = { ...valid, stops: [...valid.stops, { id: 'video-stop', place: 'Test region', photos: [], videos: [video] }] };
assert.equal(parse(withVideo)[0].stops[1].videos?.[0].duration, 173.95);
assert.equal(videoDuration(video.duration), '2:54');
const captured = [121.3527327, 23.0734238];
const individual = parse({ ...withVideo, stops: [
  { ...valid.stops[0], photos: [{ ...image, gps: captured }] },
  { ...withVideo.stops[1], videos: [{ ...video, gps: captured }] },
] })[0];
const items = tripMedia(individual);
assert.equal(items.length, 2);
assert.deepEqual(items.map(item => item.gps), [captured, captured]);
assert.deepEqual(tripMedia(parse(withVideo)[0]).map(item => item.gps), [undefined, undefined]);
for (const gps of [[181, 23], [121, 85], [NaN, 23], [121], ['121', 23]]) {
  assert.throws(() => parse({ ...valid, stops: [{ ...valid.stops[0], photos: [{ ...image, gps }] }] }));
}
for (const src of ['https://example.com/clip.mp4', '/travels/../clip.mp4', '/travels/a/clipXmp4', '/travels/a/clip.mp4?gps=1']) assert.throws(() => parse({ ...valid, stops: [{ ...valid.stops[0], videos: [{ ...video, src }] }] }));
const hostedSrc = 'https://media.akshat.dev/travels/taiwan/clip-123abc.mp4';
const hostedVideo = {
  ...video,
  src: hostedSrc,
  original: { src: hostedSrc, mime: 'video/mp4; codecs="avc1.640028"', width: 1920, height: 1080 },
};
const parseVideo = (clip: unknown) => parse({
  ...valid,
  stops: [{ ...valid.stops[0], videos: [clip] }],
});
const parsePhoto = (photo: unknown) => parse({
  ...valid,
  stops: [{ ...valid.stops[0], photos: [photo] }],
})[0].stops[0].photos[0];
for (const caption of [undefined, null, 'my Huandao bicycle']) {
  const photo = parsePhoto({ ...image, caption });
  const clip = parseVideo({ ...video, caption, captions: '/travels/fixture/captions.vtt' })[0].stops[0].videos![0];
  assert.equal(photo.caption, caption);
  assert.equal(photo.alt, image.alt, 'Visible captions must not replace accessible photo text.');
  assert.equal(clip.caption, caption);
  assert.equal(clip.title, video.title, 'Visible captions must not replace accessible video titles.');
  assert.equal(clip.captions, '/travels/fixture/captions.vtt', 'VTT captions are independent of descriptions.');
}
for (const caption of ['', '   ', 0, false, [], {}]) {
  assert.throws(() => parsePhoto({ ...image, caption }));
  assert.throws(() => parseVideo({ ...video, caption }));
}
assert.equal(parsePhoto(image).caption, undefined);
assert.equal(parseVideo(video)[0].stops[0].videos![0].caption, undefined);
assert.throws(() => parsePhoto({ ...image, caption: null, alt: '' }));
assert.throws(() => parseVideo({ ...video, caption: null, title: '' }));
assert.equal(parseVideo(hostedVideo)[0].stops[0].videos?.[0].src, hostedSrc);
assert.equal(parseVideo(hostedVideo)[0].stops[0].videos?.[0].original?.src, hostedSrc);
for (const src of [
  'http://media.akshat.dev/travels/taiwan/clip.mp4',
  'https://media.akshat.dev.evil.example/travels/taiwan/clip.mp4',
  'https://media.akshat.dev@evil.example/travels/taiwan/clip.mp4',
  '//media.akshat.dev/travels/taiwan/clip.mp4',
  `${hostedSrc}?token=secret`,
  `${hostedSrc}#fragment`,
  'https://media.akshat.dev/travels/../clip.mp4',
  'https://media.akshat.dev/travels/taiwan/%2e%2e/clip.mp4',
]) {
  assert.throws(() => parseVideo({ ...video, src }));
  assert.throws(() => parseVideo({ ...hostedVideo, original: { ...hostedVideo.original, src } }));
}
assert.throws(() => parseVideo({ ...video, poster: 'https://media.akshat.dev/travels/taiwan/poster.webp' }));
assert.throws(() => parse({ ...valid, cover: { ...image, src: 'https://media.akshat.dev/travels/taiwan/photo.webp' } }));
for (const duration of [0, -1, Infinity, NaN]) assert.throws(() => parse({ ...valid, stops: [{ ...valid.stops[0], videos: [{ ...video, duration }] }] }));
assert.throws(() => parse({ ...valid, stops: [{ ...valid.stops[0], videos: [{ ...video, id: image.id }] }] }));
assert.throws(() => parse({ ...valid, stops: [{ ...valid.stops[0], videos: [{ ...video, captions: 'https://example.com/captions.vtt' }] }] }));
assert.throws(() => parse({ ...valid, stops: [{ ...valid.stops[0], photos: [], videos: [] }] }));
const track: VideoPosition[] = [[0, 121, 23], [1, 122, 24], [10, 123, 25]];
assert.deepEqual(videoPosition(track, 0), [121, 23]);
assert.deepEqual(videoPosition(track, .5), [121.5, 23.5]);
assert.equal(videoPosition(track, 5), undefined);
assert.equal(videoPosition(track, -1), undefined);
assert.equal(videoPosition(track, 12), undefined);
assert.equal(videoPosition(undefined, 0), undefined);
assert.deepEqual(videoPosition(track, 10), [123, 25]);
assert.deepEqual(parse({ ...valid, stops: [{ ...valid.stops[0], videos: [{ ...video, track }] }] })[0].stops[0].videos?.[0].track, track);
for (const badTrack of [[], [[0, 121, 23]], [[0, 121, 23], [0, 122, 24]], [[1, 121, 23], [0, 122, 24]], [[0, 181, 23], [1, 122, 24]], [[0, 121, 23], [174, 122, 24]], [[0, NaN, 23], [1, 122, 24]], [[0, 121, 23], [1, 122, 85]]]) assert.throws(() => parse({ ...valid, stops: [{ ...valid.stops[0], videos: [{ ...video, track: badTrack }] }] }));
assert.match(photoSrcSet(image)!, /sample-640.webp 640w/);
const html = renderToStaticMarkup(<TravelGallery trips={parse(valid)} />);
assert.ok(html.includes('&lt;script&gt;') && !html.includes('<script>'));
assert.ok(html.includes('/travels/fixture'));
const taiwan = parseTrips(publishedTrips).find(trip => trip.id === 'taiwan');
for (const clip of taiwan?.stops.flatMap(stop => stop.videos ?? []) ?? []) {
  assert.ok(clip.original, 'Published Taiwan videos require original-quality media.');
  assert.equal(clip.src, clip.original.src, 'Published playback must not use reduced-resolution derivatives.');
  assert.deepEqual([clip.width, clip.height], [clip.original.width, clip.original.height]);
}
console.log('Trip checks pass: validation, local media, bounds, empty gallery, escaping, responsive photos and real date-only values.');
