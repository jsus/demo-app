window.addEvent('domready', function() {
	var checkboxes = document.getElements('input[type=checkbox]');
	var resultField = document.getElement('#result input[type=text]');
	console.log(resultField);
	var recalculateResult = function() {
		var result = [];
		checkboxes.each(function(cb) {
			if (cb.checked)
				result.push(cb.name.replace(/\//, ':'));
		});
		var resultingString = result.join('+');
		resultField.set('value', resultingString);
	}

	checkboxes.each(function(cb){
		cb.addEvent('click', recalculateResult);
	});

	var resultButton = document.getElement('#result input#go');
	resultButton.addEvent('click', function(e) {
		e.stop();
		var prefix = '/javascripts/jsus/require/';
		window.location = prefix + resultField.get('value');
	});

	var resetButton = document.getElement('#result input#reset');
	resetButton.addEvent('click', function(e) {
		checkboxes.each(function(cb) { cb.checked = false });
		recalculateResult();
	});
});
