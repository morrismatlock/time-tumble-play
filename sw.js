// Time Tumble service worker. vite.config.ts copies this to dist/sw.js and fills in the version and
// the file list at build time, so every deploy gets its own cache and the old one is deleted.
//  - The page (index.html), version.json and art/manifest.json are fetched from the network first, so
//    a new deploy is always picked up as soon as you're online (cache is only the offline fallback).
//  - Everything else is built to a hashed name or is a picture/sound, so it's served from the cache.
//  - Anything on another site (the online scoreboard) is left alone: it just fails when offline and
//    the game already handles that.
const VERSION = '0.14.0';
const CACHE = 'tt-' + VERSION;
const FILES = ["./","./apple-touch-icon.png","./art/brk0.webp","./art/brk1.webp","./art/brk2.webp","./art/brk3.webp","./art/brk4.webp","./art/brk5.webp","./art/brk6.webp","./art/brk7.webp","./art/cave0.webp","./art/cave1.webp","./art/cave2.webp","./art/cave3.webp","./art/cave4.webp","./art/cave5.webp","./art/cave6.webp","./art/cave7.webp","./art/decor0_0.webp","./art/decor0_1.webp","./art/decor0_2.webp","./art/decor0_3.webp","./art/decor1_0.webp","./art/decor1_1.webp","./art/decor1_2.webp","./art/decor1_3.webp","./art/decor2_0.webp","./art/decor2_1.webp","./art/decor2_2.webp","./art/decor2_3.webp","./art/decor3_0.webp","./art/decor3_1.webp","./art/decor3_2.webp","./art/decor3_3.webp","./art/decor4_0.webp","./art/decor4_1.webp","./art/decor4_2.webp","./art/decor4_3.webp","./art/decor5_0.webp","./art/decor5_1.webp","./art/decor5_2.webp","./art/decor5_3.webp","./art/decor6_0.webp","./art/decor6_1.webp","./art/decor6_2.webp","./art/decor6_3.webp","./art/decor7_0.webp","./art/decor7_1.webp","./art/decor7_2.webp","./art/decor7_3.webp","./art/far0.webp","./art/far1.webp","./art/far2.webp","./art/far3.webp","./art/far4.webp","./art/far5.webp","./art/far6.webp","./art/far7.webp","./art/frame_a.webp","./art/hillsMid0.webp","./art/hillsMid1.webp","./art/hillsMid2.webp","./art/hillsMid3.webp","./art/hillsMid4.webp","./art/hillsMid5.webp","./art/hillsMid6.webp","./art/hillsMid7.webp","./art/ledge0.webp","./art/ledge1.webp","./art/ledge2.webp","./art/ledge3.webp","./art/ledge4.webp","./art/ledge5.webp","./art/ledge6.webp","./art/ledge7.webp","./art/manifest.json","./art/mat0.webp","./art/mat1.webp","./art/mat2.webp","./art/mat3.webp","./art/mat4.webp","./art/mat5.webp","./art/mat6.webp","./art/mat7.webp","./art/near0.webp","./art/near1.webp","./art/near2.webp","./art/near3.webp","./art/near4.webp","./art/near5.webp","./art/near6.webp","./art/near7.webp","./art/pad0.webp","./art/pad1.webp","./art/pad2.webp","./art/pad3.webp","./art/pad4.webp","./art/pad5.webp","./art/pad6.webp","./art/pad7.webp","./art/prop0_block.webp","./art/prop0_tall.webp","./art/prop0_wide.webp","./art/prop1_block.webp","./art/prop1_tall.webp","./art/prop1_wide.webp","./art/prop2_block.webp","./art/prop2_tall.webp","./art/prop2_wide.webp","./art/prop3_block.webp","./art/prop3_tall.webp","./art/prop3_wide.webp","./art/prop4_block.webp","./art/prop4_tall.webp","./art/prop4_wide.webp","./art/prop5_block.webp","./art/prop5_tall.webp","./art/prop5_wide.webp","./art/prop6_block.webp","./art/prop6_tall.webp","./art/prop6_wide.webp","./art/prop7_block.webp","./art/prop7_tall.webp","./art/prop7_wide.webp","./art/p_blBasket_bl_airship.webp","./art/p_blBasket_bl_moon.webp","./art/p_blBasket_bl_patch.webp","./art/p_blEnv_bl_airship.webp","./art/p_blEnv_bl_moon.webp","./art/p_blEnv_bl_patch.webp","./art/p_bsBody_bs_mammoth.webp","./art/p_bsBody_bs_steed.webp","./art/p_bsBody_bs_trike.webp","./art/p_bsHead_bs_mammoth.webp","./art/p_bsHead_bs_steed.webp","./art/p_bsHead_bs_trike.webp","./art/p_ctView_ct_oak.webp","./art/p_ctView_ct_royal.webp","./art/p_hbView_hb_flame.webp","./art/p_hbView_hb_neon.webp","./art/p_sbDinoBody.webp","./art/p_sbDinoHead.webp","./art/p_sbGolemBody.webp","./art/p_sbGolemHead.webp","./art/p_sbHead_admiral.webp","./art/p_sbHead_astro.webp","./art/p_sbHead_cleo.webp","./art/p_sbHead_fox.webp","./art/p_sbHead_neo.webp","./art/p_sbHead_queen.webp","./art/p_sbHead_rex.webp","./art/p_sbHead_sirhop.webp","./art/p_sbHead_tumble.webp","./art/p_sbHead_viking.webp","./art/p_sbHead_void.webp","./art/p_sbHead_wizard.webp","./art/p_sbRobotBody.webp","./art/p_sbRobotHead.webp","./art/p_sbTorso_admiral.webp","./art/p_sbTorso_astro.webp","./art/p_sbTorso_cleo.webp","./art/p_sbTorso_fox.webp","./art/p_sbTorso_neo.webp","./art/p_sbTorso_queen.webp","./art/p_sbTorso_rex.webp","./art/p_sbTorso_sirhop.webp","./art/p_sbTorso_tumble.webp","./art/p_sbTorso_viking.webp","./art/p_sbTorso_void.webp","./art/p_sbTorso_wizard.webp","./art/p_scView_sc_gold.webp","./art/p_scView_sc_horus.webp","./art/README.md","./art/sky0.webp","./art/sky1.webp","./art/sky2.webp","./art/sky3.webp","./art/sky4.webp","./art/sky5.webp","./art/sky6.webp","./art/sky7.webp","./assets/index-qd2HFlcI.js","./audio/sfx/blackhole.mp3","./audio/sfx/combo.mp3","./audio/sfx/death.mp3","./audio/sfx/gem.mp3","./audio/sfx/grow.mp3","./audio/sfx/jump.mp3","./audio/sfx/land.mp3","./audio/sfx/power.mp3","./audio/sfx/shrink.mp3","./audio/sfx/smash.mp3","./audio/theme.mp3","./audio/vo/balloon.mp3","./audio/vo/beast.mp3","./audio/vo/blackhole.mp3","./audio/vo/catapult.mp3","./audio/vo/caught.mp3","./audio/vo/combo1.mp3","./audio/vo/combo2.mp3","./audio/vo/combo3.mp3","./audio/vo/combo4.mp3","./audio/vo/combo5.mp3","./audio/vo/combo6.mp3","./audio/vo/combo7.mp3","./audio/vo/era2.mp3","./audio/vo/era3.mp3","./audio/vo/era4.mp3","./audio/vo/era5.mp3","./audio/vo/era6.mp3","./audio/vo/era7.mp3","./audio/vo/era8.mp3","./audio/vo/freeze.mp3","./audio/vo/hover.mp3","./audio/vo/newRecord.mp3","./audio/vo/powerEarned.mp3","./audio/vo/scarab.mp3","./audio/vo/superbig.mp3","./audio/vo/weekly.mp3","./favicon-32.png","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./icon.svg","./index.html","./manifest.webmanifest"];
const NETWORK_FIRST = /(^|\/)(index\.html|version\.json|manifest\.webmanifest|art\/manifest\.json)$/;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // bypass the browser's own cache so we never store last version's files under this version
    await Promise.all(FILES.map(async (f) => {
      try { const r = await fetch(new Request(f, { cache: 'reload' })); if (r.ok) await cache.put(f, r); } catch { /* fetched on demand later */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('tt-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function networkFirst(req, fallbackKey) {
  const cache = await caches.open(CACHE);
  try {
    const r = await Promise.race([fetch(new Request(req, { cache: 'no-cache' })), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 4000))]);
    if (r.ok) cache.put(fallbackKey || req, r.clone());
    return r;
  } catch (err) {
    return (await cache.match(fallbackKey || req, { ignoreSearch: true })) || Response.error();
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, new URL('./', self.registration.scope).href)); return; }
  if (NETWORK_FIRST.test(url.pathname)) { e.respondWith(networkFirst(req)); return; }
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const r = await fetch(req);
    if (r.ok) cache.put(req, r.clone());
    return r;
  })());
});
