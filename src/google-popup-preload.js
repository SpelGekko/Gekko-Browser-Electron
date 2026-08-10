const { webFrame } = require('electron');

// Runs in isolated context before ANY page scripts.
// Uses webFrame.executeJavaScript to inject into the main world synchronously first.
try {
  webFrame.executeJavaScript(`(function(){
    // --- navigator.userAgentData: add Google Chrome brand (Electron omits it) ---
    try {
      var _ua = navigator.userAgent;
      var _ci = _ua.indexOf('Chrome/');
      var _fv = _ci >= 0 ? _ua.slice(_ci + 7).split(' ')[0] : '136.0.7103.115';
      var _mv = _fv.split('.')[0];
      var _b = [
        {brand:'Google Chrome', version:_mv},
        {brand:'Not)A;Brand',   version:'8'},
        {brand:'Chromium',      version:_mv}
      ];
      var _fb = [
        {brand:'Google Chrome', version:_fv},
        {brand:'Not)A;Brand',   version:'8.0.0.0'},
        {brand:'Chromium',      version:_fv}
      ];
      var _ud = {
        brands: _b, mobile: false, platform: 'Windows',
        getHighEntropyValues: function(h) {
          var r = {brands:_b, mobile:false, platform:'Windows'};
          if (h.indexOf('architecture')    !== -1) r.architecture    = 'x86';
          if (h.indexOf('bitness')         !== -1) r.bitness         = '64';
          if (h.indexOf('platformVersion') !== -1) r.platformVersion = '15.0.0';
          if (h.indexOf('uaFullVersion')   !== -1) r.uaFullVersion   = _fv;
          if (h.indexOf('fullVersionList') !== -1) r.fullVersionList = _fb;
          if (h.indexOf('wow64')           !== -1) r.wow64           = false;
          if (h.indexOf('model')           !== -1) r.model           = '';
          return Promise.resolve(r);
        },
        toJSON: function() { return {brands:_b, mobile:false, platform:'Windows'}; }
      };
      Object.defineProperty(Navigator.prototype, 'userAgentData', {
        get: function() { return _ud; }, configurable: true
      });
    } catch(_) {}

    // --- Prevent Windows Security passkey dialog ---
    try {
      var _origCG = navigator.credentials && navigator.credentials.get
        ? navigator.credentials.get.bind(navigator.credentials) : null;
      if (_origCG) {
        Object.defineProperty(navigator.credentials, 'get', {
          value: function(o) {
            if (o && o.publicKey) return Promise.reject(new DOMException('Not supported','NotSupportedError'));
            return _origCG(o);
          },
          configurable: true
        });
      }
    } catch(_) {}

    // --- Hide Node.js globals (window.process is visible without contextIsolation) ---
    try { Object.defineProperty(window,'process',{value:undefined,writable:false,configurable:false}); } catch(_){}
    try { Object.defineProperty(window,'require',{value:undefined,writable:false,configurable:false}); } catch(_){}

    // --- navigator.webdriver = false ---
    try { Object.defineProperty(navigator,'webdriver',{get:function(){return false;},configurable:true}); } catch(_){}
  })()`);
} catch (_) {}
