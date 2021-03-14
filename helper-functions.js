// helper-functions.js

module.exports.getTime = (t, request) => {
	var h = Math.floor(t);
	var hc = h - 8;
	if (hc < 0) {
		hc = Math.abs(hc+24);
	};
	var m = Math.round((t%1)*100);
	var mm = m.toString().padStart(2,0);

	if (request == 'time') {
		if (t < 12) {
			if (h != 0) {
				return `${h}:${mm} AM` // 1 AM to 11 AM
			} else {
				return `12:${mm} AM` // 12 AM
			};
		}
		else if (t >= 13) {
			return `${(h-12)}:${mm} PM` // 1 PM to 11 PM
		}
		else {
			return `${h}:${mm} PM` // 12 PM
		};
	}
	else if (request == 'schedule') {
		return `${m} ${hc} * * *`
	}
	else if (request == 'ampm') {
		if (t <= 12) {return `AM`}
		else {return `PM`}
	};
};

module.exports.currentTime = (request) => {
	var d = new Date();
	var h = d.getHours() + 8;
	if (h >= 24) {
		h = Math.abs(h-24);
	};
	var m = d.getMinutes();
	var currenttime = h + (m/100);
	if (request == 'value') {return currenttime} // minutes will go from .00 to .59
	if (request == 'time') {
		var mm = m.toString().padStart(2,0);
		if (h < 12) { // Morning
			if (h != 0) {
				return `${h}:${mm} AM` // 1 AM to 11 AM
			} else {
				return `12:${mm} AM` // 12 AM
			};
		} else if (h == 12) { // Noon
			return `${h}:${mm} PM` // 12 PM
		} else if (h > 12) { // Afternoon
			return `${h-12}:${mm} PM` // 1 PM to 11 PM
		};
	};
};

module.exports.getTimeLeft = (timeValue) => {
	var mleft = 60 - Math.round((timeValue%1)*100);
	var hleft = 0;
	if (timeValue < 12) {
		hleft = Math.floor(12-timeValue)
	}
	else if (timeValue < 24) {
		hleft = Math.floor(24-timeValue)
	};

	if (hleft == 0) {
		return `${mleft} Minutes`
	}
	else if (mleft == 0 || mleft == 60) {
		return `${hleft} Hours`
	}
	else {
		return `${hleft} Hours and ${mleft} Minutes`
	};
};