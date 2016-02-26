Juration-No.js
========

A simple natural language duration parser for Norwegian, written in javascript. Time ranges (in seconds) can also be converted to human readable strings. Check out the [demo](http://domchristie.github.com/juration) of the original english version.

Forked from [Juration](https://github.com/domchristie/juration), which was inspired by [chronic](https://github.com/mojombo/chronic/) and [chronic_duration](https://github.com/hpoydar/chronic_duration).

Usage
-----

### Parsing

    juration.parse("3min 5sek"); // returns 185

### Stringifying
    
    juration.stringify(185); // returns "3 min 5 sek"
    juration.stringify(185, { format: 'small' }); // returns "3 min 5 sek"
    juration.stringify(185, { format: 'micro' }); // returns "3m 5s"
    juration.stringify(185, { format: 'long' });  // returns "3 minutter 5 sekunder"
    juration.stringify(185, { format: 'long', units: 1 });  // returns "3 minutter"
    juration.stringify(3601, { format: 'micro', units: 2 });  // returns "1t"

Examples
--------
Parse-able strings:

* 12.4 sekunder
* 3 min 4 sek
* 2 tmr 20 min
* 2t20min
* 6 mnd 1 day
* 47 år 6 mnd and 4d
* 3 uker og 2 dager

Todo
----
* Add customisable default unit option, e.g. `juration.parse("10", { defaultUnit: 'minutter' }) // returns 600`
* Parse chrono format i.e. hh:mm:ss

Licence
-------
Juration-no is forked from [Juration](https://github.com/domchristie/juration), which was created by [Dom Christie](http://domchristie.co.uk) and released under the MIT license. All other copyright for project Juration-no are held by [Albertony](https://github.com/albertony) &copy; 2016.
