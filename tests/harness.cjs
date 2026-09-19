// Browser adapters for running the real game script in Node.js.
// This checks state and control flow; it does not replace browser visual testing.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const noop = () => {};

async function setup(options = {}) {
  const events = {}, elements = new Map(), writes = [], frames = [];
  const listeners = { window: {}, document: {} };
  const listen = scope => (name, fn) => (listeners[scope][name] ||= []).push(fn);
  let raw = options.saved || null;
  const storage = { fail: !!options.fail, readFail: false };
  let clock = options.clock || new Date(2026, 8, 19, 12).getTime();
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  }
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key === 'createLinearGradient' || key === 'createRadialGradient') {
        return () => ({ addColorStop: noop });
      }
      if (key === 'measureText') return () => ({ width: 10 });
      return noop;
    },
    set: () => true,
  });
  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        style: {}, classList: { toggle: noop, add: noop, remove: noop },
        getContext: () => ctx,
        addEventListener: (name, fn) => { events[id + ':' + name] = fn; },
        querySelector: () => element('query'), querySelectorAll: () => [],
        appendChild: noop, remove: noop, textContent: '', value: '루미',
        toDataURL: () => '',
      });
    }
    return elements.get(id);
  }
  const env = {
    Image: options.Image, Date: Clock, console, performance: { now: () => 10000 },
    window: {
      innerWidth: 800, innerHeight: 600, devicePixelRatio: 1,
      storage: options.host, addEventListener: listen('window'),
    },
    document: {
      getElementById: element, createElement: () => element('created'),
      addEventListener: listen('document'), body: { appendChild: noop },
    },
    localStorage: {
      setItem(key, value) {
        if (storage.fail) throw Error('Storage unavailable');
        raw = value;
        writes.push([key, value]);
      },
      getItem() {
        if (storage.readFail) throw Error('Storage unavailable');
        return raw;
      },
    },
    navigator: {}, setTimeout: noop, clearTimeout: noop, setInterval: noop,
    requestAnimationFrame: fn => frames.push(fn),
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    escape, unescape,
  };
  vm.createContext(env);
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], env);
  await new Promise(setImmediate);
  return {
    env, writes, storage, frames, events, elements,
    dispatch(scope, name, fields = {}) {
      const event = { preventDefault() { this.defaultPrevented = true; }, ...fields };
      for (const fn of listeners[scope][name] || []) fn(event);
      return event;
    },
    get raw() { return raw; },
    setClock(value) { clock = value; },
    run(source) { return vm.runInContext(source, env); },
    fresh() { return JSON.parse(this.run('buildSaveJson()')); },
    valid(data) { env.input = JSON.stringify(data); return this.run('parseSave(input)'); },
    code(data) { return 'LUMI1:' + Buffer.from(JSON.stringify(data)).toString('base64url'); },
    import(data) { env.input = this.code(data); return this.run('importCode(input)'); },
  };
}

module.exports = { setup };
