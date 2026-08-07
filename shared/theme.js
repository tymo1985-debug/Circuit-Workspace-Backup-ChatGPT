/** Circuit Workspace — общая тема интерфейса: auto | light | dark. */
(function (global) {
  'use strict';

  var KEY = 'cw-theme';
  var VALUES = ['auto', 'light', 'dark'];
  var media = global.matchMedia ? global.matchMedia('(prefers-color-scheme: dark)') : null;
  var fallback = 'auto';
  var current = null;
  var listeners = [];
  var bound = false;

  function normalize(value) {
    return VALUES.indexOf(value) >= 0 ? value : null;
  }

  function read() {
    try { return normalize(global.localStorage.getItem(KEY)); }
    catch (e) { return null; }
  }

  function effective(value) {
    if (value === 'dark' || value === 'light') return value;
    return media && media.matches ? 'dark' : 'light';
  }

  function apply() {
    var resolved = effective(current || fallback);
    if (global.document && global.document.documentElement) {
      global.document.documentElement.setAttribute('data-theme', resolved);
      global.document.documentElement.style.colorScheme = resolved;
      var meta = global.document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', resolved === 'dark' ? '#140d28' : '#fffbff');
    }
    return resolved;
  }

  function notify() {
    var resolved = apply();
    listeners.slice().forEach(function (fn) {
      try { fn(current, resolved); } catch (e) { console.warn('CWTheme listener failed', e); }
    });
  }

  function bind() {
    if (bound) return;
    bound = true;
    global.addEventListener('storage', function (event) {
      if (!event || event.key !== KEY) return;
      var next = read() || fallback;
      if (next === current) return;
      current = next;
      notify();
    });
    if (media) {
      var onSystemChange = function () { if (current === 'auto') notify(); };
      if (media.addEventListener) media.addEventListener('change', onSystemChange);
      else if (media.addListener) media.addListener(onSystemChange);
    }
  }

  global.CWTheme = {
    KEY: KEY,
    VALUES: VALUES.slice(),

    init: function (options) {
      fallback = normalize(options && options.default) || 'auto';
      current = read() || fallback;
      bind();
      apply();
      return current;
    },

    get: function () { return current || (current = read() || fallback); },
    effective: function () { return effective(global.CWTheme.get()); },

    set: function (value) {
      var next = normalize(value);
      if (!next) return global.CWTheme.get();
      try { global.localStorage.setItem(KEY, next); } catch (e) { /* no-op */ }
      if (next !== current) { current = next; notify(); }
      return current;
    },

    onChange: function (fn) {
      if (typeof fn !== 'function') return function () {};
      listeners.push(fn);
      return function () {
        var index = listeners.indexOf(fn);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
  };
})(typeof self !== 'undefined' ? self : this);
