/*
 * juration-no - a natural language duration parser
 * https://github.com/domchristie/juration
 *
 * Copyright 2016, Albertony
 * Licenced under the MIT licence
 *
 * Based on work by Dom Christie
 */

(function() {

  var UNITS = {
    seconds: {
      patterns: ['sekund(er)?', 'sek?', 's'],
      value: 1,
      formats: {
        'chrono': '',
        'micro':  's',
        'short':  'sek',
        'long':   'sekund'
      }
    },
    minutes: {
      patterns: ['minutt(er)?', 'mi?n', 'n'], // NB: m is treated as month, minutes is 'n'!
      value: 60,
      formats: {
        'chrono': ':',
        'micro':  'n', // NB: When stringifying we use 'n' instead of 'm' to avoid ambiguity with month.
        'short':  'min',
        'long':   'minutt'
      }
    },
    hours: {
      patterns: ['timer?', 'tmr?', 't'],
      value: 3600,
      formats: {
        'chrono': ':',
        'micro':  't',
        'short':  'tm',
        'long':   'time'
      }
    },
    days: {
      patterns: ['dag(er)?', 'dag', 'dgr?', 'd'],
      value: 86400,
      formats: {
        'chrono': ':',
        'micro':  'd',
        'short':  'dg',
        'long':   'dag'
      }
    },
    weeks: {
      patterns: ['uker?', 'veker?', 'uk?', 'vk?'],
      value: 604800,
      formats: {
        'chrono': ':',
        'micro':  'u',
        'short':  'uk',
        'long':   'uke'
      }
    },
    months: {
      patterns: ['måned(er)?', 'månad(er)?', 'mnd?', 'm'],
      value: 2628000,
      formats: {
        'chrono': ':',
        'micro':  'm',
        'short':  'mnd',
        'long':   'måned'
      }
    },
    years: {
      patterns: ['år', 'a'], // TODO: Wanted 'år?' so that one could use single-character 'å', but because the boundary character class (\b) in JavaScript regex does not handle non-ASCII characters this does not work! So the single character (micro) symbol is therefore 'a' (for anno?) instead.
      value: 31536000,
      formats: {
        'chrono': ':',
        'micro':  'a',
        'short':  'år',
        'long':   'år'
      }
    }
  };
    
  var stringify = function(seconds, options) {
    
    if(!_isNumeric(seconds)) {
      throw "juration.stringify(): Unable to stringify a non-numeric value";
    }
    
    if((typeof options === 'object' && options.format !== undefined) && (options.format !== 'micro' && options.format !== 'short' && options.format !== 'long' && options.format !== 'chrono')) {
      throw "juration.stringify(): format cannot be '" + options.format + "', and must be either 'micro', 'short', or 'long'";
    }
    
    var defaults = {
      format: 'short',
      units: undefined
    };
    
    var opts = _extend(defaults, options);
    
    var units = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'], values = [];
    var remaining = seconds;
    var activeUnits = 0;
    for(var i = 0, len = units.length;
        i < len && (opts.units == undefined || activeUnits < opts.units);
        i++) {
      var unit = UNITS[units[i]];
      values[i] = Math.floor(remaining / unit.value);
      if (values[i] > 0 || activeUnits > 0)
        activeUnits++;

      if(opts.format === 'micro' || opts.format === 'chrono') {
        values[i] += unit.formats[opts.format];
      }
      else {
        values[i] += ' ' + _pluralize(values[i], opts.format, unit.formats[opts.format]);
      }
      remaining = remaining % unit.value;
    }
    var output = '';
    for(i = 0, len = values.length; i < len; i++) {
      if(values[i].charAt(0) !== "0" && opts.format != 'chrono') {
        output += values[i] + ' ';
      }
      else if (opts.format == 'chrono') {
        output += _padLeft(values[i]+'', '0', i==values.length-1 ? 2 : 3);
      }
    }
    return output.replace(/\s+$/, '').replace(/^(00:)+/g, '').replace(/^0/, '');
  };
  
  var parse = function(string) {
    
    // returns calculated values separated by spaces
    for(var unit in UNITS) {
      for(var i = 0, mLen = UNITS[unit].patterns.length; i < mLen; i++) {
        // TODO: The word boundary \b character class does not handle non-ascii characters like norwegian æøå correctly.
        //   - Tried to rewrite the \b into an equivalent expression using lookbehind:
        //        The boundary "\b" can be replaced by "(?<=\W)(?=\w)|(?<=\w)(?=\W)". The \w class represents
        //        word characters, which in ascii is [A-Za-z0-9_], and \W is just the negated [^A-Za-z0-9_].
        //        The idea was to replace \w to include the norwegian characters: [A-Za-z0-9_æøå], and \W negation
        //        of that. For example like this:
        //           var wordchars_no = 'A-Za-z0-9_æøå'
        //           var boundary_no = '(?<=[^'+wordchars_no+'])(?=['+wordchars_no+'])|(?<=['+wordchars_no+'])(?=[^'+wordchars_no+'])'
        //        The problem is that JavaScript does not support the positive lookbehind "?<=" assertion either, so
        //        we are back at square one...
        //        Until this is solved: The problematic cases are when the unit patterns are ending on æøå, so for instance
        //        for year we cannot have 'å' as a pattern but 'år' works!
        var regex = new RegExp("((?:\\d+\\.\\d+)|\\d+)\\s?(" + UNITS[unit].patterns[i] + "s?(?=\\s|\\d|\\b))", 'gi');
        string = string.replace(regex, function(str, p1, p2) {
          return " " + (p1 * UNITS[unit].value).toString() + " ";
        });
      }
    }
    
    var sum = 0,
        numbers = string
                    .replace(/(?!\.)\W+/g, ' ')                       // replaces non-word chars (excluding '.') with whitespace
                    .replace(/^\s+|\s+$|(?:og|pluss|med)\s?/g, '')   // trim L/R whitespace, replace known join words with ''
                    .split(' ');
    
    for(var j = 0, nLen = numbers.length; j < nLen; j++) {
      if(numbers[j] && isFinite(numbers[j])) {
         sum += parseFloat(numbers[j]);
      } else if(!numbers[j]) {
        throw "juration.parse(): Unable to parse: a falsey value";
      } else {
        // throw an exception if it's not a valid word/unit
        throw "juration.parse(): Unable to parse: " + numbers[j].replace(/^\d+/g, '');
      }
    }
    return sum;
  };
  
  // _padLeft('5', '0', 2); // 05
  var _padLeft = function(s, c, n) {
      if (! s || ! c || s.length >= n) {
        return s;
      }
      
      var max = (n - s.length)/c.length;
      for (var i = 0; i < max; i++) {
        s = c + s;
      }
      
      return s;
  };
  
  var _pluralize = function(count, format, singular) {
    if (count == 1 || singular == "år") {
        return singular;
    } else {
        var plural = singular;
        if (format == 'long' && singular[singular.length-1] != "e")
            plural += "e";
        plural += "r";
        return plural;
    }
  };
  
  var _isNumeric = function(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  };
  
  var _extend = function(obj, extObj) {
    for (var i in extObj) {
      if(extObj[i] !== undefined) {
        obj[i] = extObj[i];
      }
    }
    return obj;
  };
  
  var juration = {
    parse: parse,
    stringify: stringify,
    humanize: stringify
  };

  if ( typeof module === "object" && module && typeof module.exports === "object" ) {
    //loaders that implement the Node module pattern (including browserify)
    module.exports = juration;
  } else {
    // Otherwise expose juration
    window.juration = juration;

    // Register as a named AMD module
    if ( typeof define === "function" && define.amd ) {
      define("juration", [], function () { return juration; } );
    }
  }
})();
