/**
 * @author Peter Petrov (https://github.com/pesho)
 * @link https://github.com/pesho/node-mini18n
 * @license http://opensource.org/licenses/MIT
 */

var fs = require('fs'),
    util = require('util');


var i18n = module.exports = function i18n(options) {
    var self = this;
    
    options = self.options =  options || {};
    if (undefined === options.devMode)          options.devMode = (process.env.NODE_ENV == "development");
    if (undefined === options.locales)          options.locales = ['en'];
    if (undefined === options.defaultLocale)    options.defaultLocale = 'en';
    if (undefined === options.path)             options.path = 'i18n/';
    if (undefined === options.translateAlias)   options.translateAlias = '_';
    if (undefined === options.updateAsNull)     options.updateAsNull = true;
    if (undefined === options.updateAllLocales) options.updateAllLocales = true;
    
    self.translations = {};
    

    self.middleware = function middleware(req, res, next) {
        var _i18n = req.i18n = {
            locale: self.options.defaultLocale,
            refreshed: false,
            
            setLocale: function setLocale(locale) {
                if (_i18n.locale != locale) _i18n.refreshed = false;
                _i18n.locale = locale;
            },
            
            getLocale: function getLocale() {
                return _i18n.locale;
            },
            
            translate: function translate(str) {
                if (self.options.devMode && !_i18n.refreshed) {
                    self.readFileSync(_i18n.locale);
                    _i18n.refreshed = true;
                }
                return self.translate.apply(self, [_i18n.locale].concat(Array.prototype.slice.call(arguments)));
            }
        };
        if (res.locals) { // Express 3+
            res.locals.i18n = _i18n;
            res.locals[self.options.translateAlias] = _i18n.translate;
        }
        next();
    };
    
    self.format = function format(fmt, params) {
        if (arguments.length <= 1) return fmt;
        if ('object' == typeof params && !Array.isArray(params)) {
            return fmt.replace(/%\(\s*([^)]+)\s*\)s/g, function(m, v) { return String(params[v.trim()]); });
        }
        var arr = Array.isArray(params) ? params : Array.prototype.slice.call(arguments, 1);
        return util.format.apply(util, [fmt].concat(arr));
    };
    
    self.translate = function translate(locale, str) {
        var catalog = self.translations[locale];
        if (catalog === undefined) {
            if (self.options.devMode) {
                catalog = self.translations[locale] = {};
            } else {
                return self.format.apply(self, Array.prototype.slice.call(arguments, 1));
            }
        }
        var translated = catalog[str];
        if (translated === undefined) {
            translated = str;
            if (self.options.devMode) {
                var updateValue = self.options.updateAsNull ? null : str;
                if (self.options.updateAllLocales) {
                    self.options.locales.forEach(function updateLocale(lcl) {
                        var ctlg = self.translations[lcl];
                        if (ctlg === undefined) ctlg = self.translations[lcl] = {};
                        if (!(str in ctlg)) {
                            ctlg[str] = updateValue;
                            self.writeFileSync(lcl);
                        }
                    });
                } else {
                    catalog[str] = updateValue;
                    self.writeFileSync(locale);
                }
            }
        }
        if (translated === null) translated = str;
        return self.format.apply(self, [translated].concat(Array.prototype.slice.call(arguments, 2)));
    };
    
    self.readFileSync = function readFileSync(locale) {
        var sourceName = self.options.path + locale + '.json';
        try {
            var data = fs.readFileSync(sourceName, { encoding: 'utf8' });
            self.translations[locale] = JSON.parse(data);
        } catch (ex) {
            self.translations[locale] = {};
        }
    };
    
    self.writeFileSync = function writeFileSync(locale) {
        var targetName = self.options.path + locale + '.json',
            tmpName = targetName + '.tmp',
            data = JSON.stringify(self.translations[locale], null, 2);
        fs.writeFileSync(tmpName, data, 'utf8');
        fs.renameSync(tmpName, targetName);
    };
    
    
    options.locales.forEach(function readLocale(locale) {
        self.translations[locale] = {};
        self.readFileSync(locale);
    });
        
    return self;
};
