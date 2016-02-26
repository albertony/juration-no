/*
 * juration-no - a natural language duration parser
 * https://github.com/albertony/juration-no
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
      patterns: ['år?', 'a'],
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
        // Modified regex for norwegian non-ASCII characters (æøå) to cope with the fact that the word
		// boundary \b character class does not handle these correctly. The class \b is equivalent to
		// the regex "(?<=\W)(?=\w)|(?<=\w)(?=\W)", where \w represents word characters and \W is just
		// a negation of that (non-word characters). The problem is that \w is equivalent to the character
		// set "[A-Za-z0-9_]", so non-ASCII characters are not considered. We could replace the character
		// set with "[A-Za-z0-9_æåø]" and substitute this back to into "(?<=\W)(?=\w)|(?<=\w)(?=\W)" to
		// form an regex expression equivalent to \b but considering norwegian characters. The problem with
		// this is that it uses the positive lookbehind "?<="  assertion, which is not supported in JavaScript
		// so we are back at square one. But wait: Our complete regex is matching a number optionally followed
		// by a space first, then the unit pattern consisting of word characters, before looking behind for
		// a word boundary (or space or digit). This means the first part of the \b expression "(?<=\W)(?=\w)"
		// will never be matched. The second part "(?<=\w)(?=\W)" is first looking behind for a word character,
		// but assuming all our unit patterns only contain (or at least end with) word characters this will
		// always be the case. So then we are left with the simple (?=\W) looking behind for non-word chararcters.
		// If we replace this with (?=[^A-Za-z0-9_æøå]) then we have achieved the same thing as the original
		// use of "\b" but now considering the norwegian non-ASCII characters!
		// Update: Need to also check for the end of line anchor ($) since that is also part of the word boundary
		// definition, but not covered by the character set rewrite. So we need to use: "([^A-Za-z0-9_æøå]|$)"
        //var regex = new RegExp("((?:\\d+\\.\\d+)|\\d+)\\s?(" + UNITS[unit].patterns[i] + "(?=\\s|\\d|\\b))", 'gi');
		var regex = new RegExp("((?:\\d+\\.\\d+)|\\d+)\\s?(" + UNITS[unit].patterns[i] + "(?=\\s|\\d|([^A-Za-z0-9_æøå]|$)))", 'gi');
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
