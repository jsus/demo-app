/*
---

script: Date.Arabic.js

name: Date.Arabic

description: Date messages for Arabic.

license: MIT-style license

authors:
  - Chafik Barbar

requires:
  - /Locale

provides: [Date.Arabic]

...
*/

Locale.define('ar', 'Date', {

	// Culture's date order: DD/MM/YYYY
	dateOrder: ['date', 'month', 'year'],
	shortDate: '%d/%m/%Y',
	shortTime: '%H:%M'

});
