import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShreddit, fullRedditImage } from './media.js';

const base = { id: 't3_a', title: 'T', permalink: '/r/x/comments/a/t/', subreddit: 'r/x', author: 'u' };

test('preview url -> full i.redd.it image', () => {
  assert.equal(fullRedditImage('https://preview.redd.it/heavy-rain-v0-2pd13ilb870i1.jpeg?width=640&crop=smart'), 'https://i.redd.it/2pd13ilb870i1.jpeg');
  assert.equal(fullRedditImage('https://i.redd.it/gfb2gi4t470i1.jpeg'), 'https://i.redd.it/gfb2gi4t470i1.jpeg');
  assert.equal(fullRedditImage('https://external-preview.redd.it/abc.jpeg?blur=40'), null);
});

test('text post is skipped, ids and permalink carried', () => {
  assert.equal(normalizeShreddit({ ...base, type: 'text', href: 'https://www.reddit.com/r/x/comments/a/t/' }), null);
  const m = normalizeShreddit({ ...base, type: 'image', href: 'https://i.redd.it/gfb2gi4t470i1.jpeg' });
  assert.equal(m.id, 't3_a');
  assert.equal(m.permalink, 'https://www.reddit.com/r/x/comments/a/t/');
  assert.deepEqual([m.type, m.src], ['image', 'https://i.redd.it/gfb2gi4t470i1.jpeg']);
});

test('redgifs link and crosspost embed -> video with redgifs id', () => {
  const a = normalizeShreddit({ ...base, type: 'link', href: 'https://www.redgifs.com/watch/LegalDevotedBug', images: ['https://external-preview.redd.it/x.jpeg?blur=40'] });
  assert.equal(a.type, 'video');
  assert.equal(a.redgifs, 'legaldevotedbug');
  assert.equal(a.poster, null); // blurred preview is not used
  const b = normalizeShreddit({ ...base, type: 'crosspost', href: '/r/y/comments/b/t/', embed: 'https://www.redgifs.com/ifr/likableunrulysnail' });
  assert.equal(b.redgifs, 'likableunrulysnail');
});

test('v.redd.it video and gif-as-mp4', () => {
  const v = normalizeShreddit({ ...base, type: 'video', href: 'https://v.redd.it/413f', hls: 'https://v.redd.it/413f/HLSPlaylist.m3u8', mp4: 'https://packaged-media.redd.it/413f/m2-res_720p.mp4', poster: 'https://p/x.png' });
  assert.deepEqual([v.type, v.hls, v.mp4, v.poster], ['video', 'https://v.redd.it/413f/HLSPlaylist.m3u8', 'https://packaged-media.redd.it/413f/m2-res_720p.mp4', 'https://p/x.png']);
  const g = normalizeShreddit({ ...base, type: 'gif', href: 'https://i.redd.it/4kd.gif', mp4: 'https://preview.redd.it/4kd.gif?format=mp4' });
  assert.deepEqual([g.type, g.mp4], ['video', 'https://preview.redd.it/4kd.gif?format=mp4']);
});

test('gallery: deduped, full size', () => {
  const m = normalizeShreddit({ ...base, type: 'gallery', gallery: [
    'https://preview.redd.it/r-v0-2pd13ilb870i1.jpeg?width=640', 'https://i.redd.it/2pd13ilb870i1.jpeg', 'https://preview.redd.it/r-v0-pfc0s0hc870i1.jpeg?width=640'] });
  assert.equal(m.type, 'gallery');
  assert.deepEqual(m.images.map((x) => x.src), ['https://i.redd.it/2pd13ilb870i1.jpeg', 'https://i.redd.it/pfc0s0hc870i1.jpeg']);
});

test('external link: clear preview shown, avatar/blur ignored', () => {
  const m = normalizeShreddit({ ...base, type: 'link', href: 'https://ex.com/a', images: ['https://styles.redditmedia.com/t5_1/styles/profileIcon_x.jpeg', 'https://external-preview.redd.it/p.jpeg?width=140'] });
  assert.deepEqual([m.type, m.src], ['image', 'https://external-preview.redd.it/p.jpeg?width=140']);
  assert.equal(normalizeShreddit({ ...base, type: 'link', href: 'https://ex.com/a', images: ['https://external-preview.redd.it/p.jpeg?blur=40'] }), null);
});
