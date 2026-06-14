// Fingerprint protection injected into every webview page via executeJavaScript on dom-ready.
// Uses only ES5-safe syntax to avoid any serialization issues when passed as a string.

export const FINGERPRINT_INJECT_CODE = [
  '(function() {',
  '  if (window.__gkFP) return;',
  '  window.__gkFP = true;',

  // Per-session noise: ±1, different each session
  '  var N1 = Math.random() > 0.5 ? 1 : -1;',
  '  var N2 = Math.random() > 0.5 ? 1 : -1;',

  // ── Canvas: override toDataURL to return slightly noised pixels ──
  '  var _origToDataURL = HTMLCanvasElement.prototype.toDataURL;',
  '  HTMLCanvasElement.prototype.toDataURL = function(type, quality) {',
  '    try {',
  '      if (!this.width || !this.height) return _origToDataURL.call(this, type, quality);',
  '      var off = document.createElement("canvas");',
  '      off.width = this.width; off.height = this.height;',
  '      var ctx = off.getContext("2d");',
  '      ctx.drawImage(this, 0, 0);',
  '      var img = ctx.getImageData(0, 0, off.width, off.height);',
  '      var d = img.data;',
  '      var step = Math.max(4, Math.floor(d.length / 8));',
  '      for (var i = 0; i < d.length; i += step) {',
  '        d[i]   = Math.max(0, Math.min(255, d[i]   + N1));',
  '        if (i+1 < d.length) d[i+1] = Math.max(0, Math.min(255, d[i+1] + N2));',
  '      }',
  '      ctx.putImageData(img, 0, 0);',
  '      return _origToDataURL.call(off, type, quality);',
  '    } catch(e) { return _origToDataURL.call(this, type, quality); }',
  '  };',

  // ── Canvas: override getImageData ──
  '  var _origGetImageData = CanvasRenderingContext2D.prototype.getImageData;',
  '  CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {',
  '    var img = _origGetImageData.call(this, sx, sy, sw, sh);',
  '    var d = img.data;',
  '    var step = Math.max(4, Math.floor(d.length / 8));',
  '    for (var i = 0; i < d.length; i += step) {',
  '      d[i]   = Math.max(0, Math.min(255, d[i]   + N1));',
  '      if (i+1 < d.length) d[i+1] = Math.max(0, Math.min(255, d[i+1] + N2));',
  '    }',
  '    return img;',
  '  };',

  // ── WebGL: spoof vendor/renderer, add noise to readPixels ──
  '  var VENDOR   = "Google Inc. (Intel)";',
  '  var RENDERER = "ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)";',
  '  var GL_VENDOR = 0x1F00, GL_RENDERER = 0x1F01;',
  '  var UNMASKED_VENDOR = 0x9245, UNMASKED_RENDERER = 0x9246;',

  '  function patchGL(proto) {',
  '    var _origGet = proto.getParameter;',
  '    proto.getParameter = function(p) {',
  '      if (p === GL_VENDOR || p === UNMASKED_VENDOR)   return VENDOR;',
  '      if (p === GL_RENDERER || p === UNMASKED_RENDERER) return RENDERER;',
  '      return _origGet.call(this, p);',
  '    };',
  '    var _origRead = proto.readPixels;',
  '    proto.readPixels = function(x, y, w, h, fmt, type, px) {',
  '      _origRead.call(this, x, y, w, h, fmt, type, px);',
  '      if (px && px.length) {',
  '        var step = Math.max(4, Math.floor(px.length / 8));',
  '        for (var i = 0; i < px.length; i += step) {',
  '          px[i] = Math.max(0, Math.min(255, px[i] + N1));',
  '        }',
  '      }',
  '    };',
  '  }',

  '  if (typeof WebGLRenderingContext !== "undefined") patchGL(WebGLRenderingContext.prototype);',
  '  if (typeof WebGL2RenderingContext !== "undefined") patchGL(WebGL2RenderingContext.prototype);',

  // ── Navigator: normalize identifying hardware metrics ──
  '  try {',
  '    Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { get: function() { return 4; }, configurable: true });',
  '  } catch(e) {}',
  '  try {',
  '    Object.defineProperty(Navigator.prototype, "deviceMemory", { get: function() { return 8; }, configurable: true });',
  '  } catch(e) {}',

  // ── AudioContext: tiny noise on frequency data ──
  '  try {',
  '    var _origGetFloat = AnalyserNode.prototype.getFloatFrequencyData;',
  '    AnalyserNode.prototype.getFloatFrequencyData = function(arr) {',
  '      _origGetFloat.call(this, arr);',
  '      if (arr && arr.length) arr[0] += N1 * 0.0001;',
  '    };',
  '  } catch(e) {}',

  '})();',
].join('\n');
