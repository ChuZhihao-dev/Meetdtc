const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function environment(file, { reduced = false, editor = false, loadGlobe } = {}) {
  const observers = [];
  const frames = new Map();
  const log = [];
  const definitions = new Map();
  let frameId = 0;
  class Motion extends EventTarget { matches = reduced; }
  const motion = new Motion();
  class Element extends EventTarget {
    attrs = new Map();
    dataset = {};
    children = [];
    refs = {};
    isConnected = true;
    classList = { values: new Set(), add: (x) => this.classList.values.add(x), remove: (x) => this.classList.values.delete(x), contains: (x) => this.classList.values.has(x) };
    hasAttribute(x) { return this.attrs.has(x); }
    setAttribute(x, y) { this.attrs.set(x, y); }
    removeAttribute(x) { this.attrs.delete(x); }
    querySelectorAll() { return this.children; }
    connectedCallback() {}
    updatedCallback() {}
    disconnectedCallback() {}
  }
  class Observer {
    targets = new Set();
    disconnected = false;
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); this.disconnected = true; }
    enter(target, visible = true) { this.callback([{ target, isIntersecting: visible }]); }
  }
  const win = new EventTarget();
  Object.assign(win, { innerHeight: 800, Shopify: { designMode: editor } });
  const doc = new EventTarget();
  doc.hidden = false;
  const context = {
    Component: Element, HTMLElement: Element, HTMLInputElement: Element, Element,
    Event, AbortController, queueMicrotask, console, window: win, document: doc,
    innerHeight: 800, devicePixelRatio: 1, matchMedia: () => motion,
    IntersectionObserver: Observer, ResizeObserver: Observer,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    customElements: { get: (name) => definitions.get(name), define: (name, value) => definitions.set(name, value) },
    loadGlobe,
  };
  let source = fs.readFileSync(path.join(__dirname, '..', 'assets', file), 'utf8').replace(/^import .*;\n/, '');
  source = source.replace("import('./cobe.js')", 'loadGlobe()');
  vm.runInNewContext(source, context);
  return { create: () => new [...definitions.values()][0](), Element, observers, motion, frames, win, doc, log };
}

function revealTarget(env, top) {
  const target = new env.Element();
  target.dataset = new Proxy({}, { set(object, key, value) { env.log.push('write'); object[key] = value; return true; } });
  target.getBoundingClientRect = () => { env.log.push('read'); return { top, bottom: top + 100 }; };
  target.style = { setProperty() { env.log.push('write'); } };
  return target;
}

test('reveal batches geometry reads, isolates instances, and cleans observers on re-render/removal', () => {
  const env = environment('scroll-reveal.js');
  const first = env.create(); first.setAttribute('data-reveal-scope', '');
  first.children = [revealTarget(env, 100), revealTarget(env, 1000)];
  first.connectedCallback();
  assert.deepEqual(env.log.slice(0, 2), ['read', 'read']);
  assert.equal(first.children[0].dataset.state, 'in');
  assert.equal(first.children[1].dataset.state, 'before');
  const second = env.create(); second.setAttribute('data-reveal-scope', '');
  second.children = [revealTarget(env, 1200)]; second.connectedCallback();
  env.observers[0].enter(first.children[1]);
  assert.equal(second.children[0].dataset.state, 'before');
  first.updatedCallback();
  assert.equal(env.observers[0].disconnected, true);
  first.disconnectedCallback(); second.disconnectedCallback();
  assert(env.observers.every((observer) => observer.disconnected));
  assert.equal(first.classList.contains('reveal-ready'), false);
});

test('reveal immediately restores visibility when reduced motion changes, and skips editor effects', () => {
  const env = environment('scroll-reveal.js');
  const el = env.create(); el.setAttribute('data-reveal-scope', '');
  el.children = [revealTarget(env, 1200)]; el.connectedCallback();
  env.motion.matches = true; env.motion.dispatchEvent(new Event('change'));
  assert.equal(el.classList.contains('reveal-ready'), false);
  assert(env.observers.every((o) => o.disconnected));
  el.disconnectedCallback();
  const editor = environment('scroll-reveal.js', { editor: true });
  const edited = editor.create(); edited.setAttribute('data-reveal-scope', '');
  edited.children = [revealTarget(editor, 1200)]; edited.connectedCallback();
  assert.equal(editor.observers.length, 0);
  edited.disconnectedCallback();
});

test('disabled reveal scope does not create observers or change visible content', () => {
  const env = environment('scroll-reveal.js');
  const el = env.create(); el.children = [revealTarget(env, 1200)];
  el.connectedCallback();
  assert.equal(env.observers.length, 0);
  assert.equal(el.classList.contains('reveal-ready'), false);
  el.disconnectedCallback();
});

test('footer prevents duplicate native submissions, restores after pageshow, and cancels work on removal', async () => {
  const env = environment('footer-diagnosis.js');
  const footer = env.create();
  const form = new env.Element(); const website = new env.Element(); const button = new env.Element();
  website.value = 'example.com'; form.checkValidity = () => true;
  form.querySelector = (selector) => selector.includes('website') ? website : button;
  footer.querySelector = () => form;
  footer.connectedCallback();
  website.dispatchEvent(new Event('blur'));
  assert.equal(website.value, 'https://example.com');
  form.dispatchEvent(new Event('submit', { cancelable: true })); await Promise.resolve();
  assert.equal(button.attrs.get('aria-disabled'), 'true');
  const duplicate = new Event('submit', { cancelable: true }); form.dispatchEvent(duplicate);
  assert.equal(duplicate.defaultPrevented, true);
  env.win.dispatchEvent(new Event('pageshow'));
  assert.equal(button.attrs.has('aria-disabled'), false);
  form.dispatchEvent(new Event('submit', { cancelable: true })); footer.disconnectedCallback();
  await Promise.resolve();
  assert.equal(button.attrs.has('aria-disabled'), false);
  footer.connectedCallback(); footer.disconnectedCallback();
});

test('globe skips WebGL entirely with reduced motion and does not initialize after leaving viewport during import', async () => {
  let imports = 0; let renders = 0; let resolveImport;
  const env = environment('services-globe.js', { reduced: true, loadGlobe: () => { imports++; return new Promise((resolve) => { resolveImport = resolve; }); } });
  const globe = env.create();
  const canvas = new env.Element(); const host = new env.Element(); host.clientWidth = 400;
  canvas.parentElement = host;
  canvas.getContext = () => ({ isContextLost: () => false, getError: () => 0, NO_ERROR: 0 });
  globe.refs = { canvas, host, fallback: new env.Element() };
  globe.connectedCallback(); env.observers[0].enter(globe);
  assert.equal(imports, 0);
  env.motion.matches = false; env.motion.dispatchEvent(new Event('change'));
  assert.equal(imports, 1);
  env.observers[0].enter(globe, false);
  resolveImport({ default: () => { renders++; return { update() {}, destroy() {} }; } });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(renders, 0);
  globe.disconnectedCallback();
  assert.equal(env.frames.size, 0);
  assert(env.observers.every((o) => o.disconnected));
});
