/**
 * @author Peter Petrov (https://github.com/pesho)
 * @link https://github.com/pesho/node-mini18n
 * @license http://opensource.org/licenses/MIT
 */

var fs = require('fs');


var i18n = module.exports = function i18n(options) {
    options = this.options =  options || {};
    if (undefined === options.devMode)          options.devMode = (process.env.NODE_ENV == "development");
    if (undefined === options.locales)          options.locales = ['en'];
    if (undefined === options.defaultLocale)    options.defaultLocale = 'en';
    if (undefined === options.path)             options.path = 'i18n/';
    if (undefined === options.translateAlias)   options.translateAlias = '_';
    
    this.translations = {};
    

    this.middleware = function i18nMiddleware() {
        var self = this;
        return function i18nMiddlewareFunction(req, res, next) {
            req.i18n = {
                locale: self.options.defaultLocale,
                setLocale: function(locale) { req.i18n.locale = locale; },
                getLocale: function() { return req.i18n.locale; },
                translate: function(str) { return self.translate(req.i18n.locale, str); }
            };
            res.locals.i18n = req.i18n;
            res.locals[self.options.translateAlias] = req.i18n.translate;
            next();
        };
    };
    
    this.translate = function i18nTranslate(locale, str) {
        var ltrans = this.translations[locale];
        if (ltrans === undefined) {
            if (this.options.devMode) {
                ltrans = this.translations[locale] = {};
            } else {
                return str; // No translation was found, return original
            }
        }
        var translated = ltrans[str];
        if (translated === undefined) {
            if (this.options.devMode) {
                translated = ltrans[str] = str;
                this.writeFileSync(locale);
            } else {
                return str; // No translation was found, return original
            }
        }
        return translated;
    };
    
    this.readFileSync = function i18nReadFileSync(locale) {
        var sourceName = this.options.path + locale + '.json';
        try {
            var data = fs.readFileSync(sourceName, { encoding: 'utf8' });
            this.translations[locale] = JSON.parse(data);
        } catch (ex) {
            this.translations[locale] = {};
        }
    };
    
    this.writeFileSync = function i18nWriteFileSync(locale) {
        var targetName = this.options.path + locale + '.json',
            tmpName = targetName + '.tmp',
            data = JSON.stringify(this.translations[locale], null, 2);
        fs.writeFileSync(tmpName, data, 'utf8');
        fs.renameSync(tmpName, targetName);
    };
    
    
    for (var i = 0; i < options.locales.length; ++i) this.readFileSync(options.locales[i]);
        
    return this;
};
