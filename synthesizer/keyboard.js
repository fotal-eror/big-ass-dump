//@ts-check
//#region dom
const table_notes = {
	c:      document.getElementById('table_c'),
	cSharp: document.getElementById('table_cSharp'),
	d:      document.getElementById('table_d'),
	dSharp: document.getElementById('table_dSharp'),
	e:      document.getElementById('table_e'),
	f:      document.getElementById('table_f'),
	fSharp: document.getElementById('table_fSharp'),
	g:      document.getElementById('table_g'),
	gSharp: document.getElementById('table_gSharp'),
	a:      document.getElementById('table_a'),
	aSharp: document.getElementById('table_aSharp'),
	b:      document.getElementById('table_b'),
};
const controls = /** @type {HTMLFormElement} */ (document.getElementById('controls'));
const input_frequency = /** @type {HTMLInputElement} */ (document.getElementById('input_frequency'));
const input_detune = /** @type {HTMLInputElement} */ (document.getElementById('input_detune'));
const input_volume = /** @type {HTMLInputElement} */ (document.getElementById('input_volume'));
const input_adsrAttackDuration = /** @type {HTMLInputElement} */ (document.getElementById('input_adsrAttackDuration'));
const input_adsrDecayDuration = /** @type {HTMLInputElement} */ (document.getElementById('input_adsrDecayDuration'));
const input_adsrSustainAmplitude = /** @type {HTMLInputElement} */ (document.getElementById('input_adsrSustainAmplitude'));
const input_adsrReleaseTimeconstant = /** @type {HTMLInputElement} */ (document.getElementById('input_adsrReleaseTimeconstant'));
//#endregion


//#region consts
/** @typedef {'c' | 'cSharp' | 'd' | 'dSharp' | 'e' | 'f' | 'fSharp' | 'g' | 'gSharp' | 'a' | 'aSharp' | 'b'} NoteString */
/** @typedef {'sine' | 'square' | 'sawtooth' | 'triangle'} WaveType */

const noteStrings = /** @type {NoteString[]} */ ([
	'c',
	'cSharp',
	'd',
	'dSharp',
	'e',
	'f',
	'fSharp',
	'g',
	'gSharp',
	'a',
	'aSharp',
	'b'
]);

// https://en.wikipedia.org/wiki/Musical_note#Note_frequency_(hertz)
const notes = {
	c:      2 ** (-9 / 12),
	cSharp: 2 ** (-8 / 12),
	d:      2 ** (-7 / 12),
	dSharp: 2 ** (-6 / 12),
	e:      2 ** (-5 / 12),
	f:      2 ** (-4 / 12),
	fSharp: 2 ** (-3 / 12),
	g:      2 ** (-2 / 12),
	gSharp: 2 ** (-1 / 12),
	a:      2 ** ( 0 / 12),
	aSharp: 2 ** ( 1 / 12),
	b:      2 ** ( 2 / 12)
};

const interval = 0.004;
//#endregion

//#region vars
/** @type {AudioContext} */
var ctx;
/** Output volume gain node
 * @type {GainNode}
*/
var volumeGain;
/**
 * @type {DynamicsCompressorNode}

var compressor;
*/
var gains = /** @type {{ [key: string]: GainNode }} */ ({});
var oscs = /** @type {{ [key: string]: OscillatorNode }} */ ({});

var volume = 1;

// https://en.wikipedia.org/wiki/Envelope_(music)
var adsrAttackDuration      = 0.05;
var adsrDecayDuration       = 0.05;
var adsrSustainAmplitude    = 0.8;
var adsrReleaseTimeconstant = 0.3;
//#endregion

//#region dom events
// browsers requires a gesture (e.g. button press) before web audio stuff
//! do not call this function more than once
function start() {
	// init
	ctx = new AudioContext();

	volumeGain = ctx.createGain();
	volumeGain.connect(ctx.destination);

	/*
	compressor = ctx.createDynamicsCompressor();
	compressor.threshold.value = -48;
	compressor.ratio.value = 14;
	compressor.connect(volumeGain);
	*/

	for (let i of noteStrings) {
		gains[i] = ctx.createGain();
		gains[i].gain.value = 0;
		//gains[i].connect(compressor);
		gains[i].connect(volumeGain);
		oscs[i] = ctx.createOscillator();
		oscs[i].frequency.value = 440 * notes[i];
		oscs[i].connect(gains[i]);
		oscs[i].start();
		table_notes[i].onpointerenter = ev => playNote(i);
		table_notes[i].onpointerleave = ev => releaseNote(i);
	}

	// multiple oscillators playing at the same time cause distorsion
	// thats because multiple signals with amplitude of 1 added up are clamped to 1, i think
	// better use DynamicCompressorNode instead but i idk what values to set
	setInterval(() => {
		let sum = 0;
		for (let i of noteStrings)
			sum += gains[i].gain.value;
		volumeGain.gain.setValueAtTime(volumeGain.gain.value, ctx.currentTime);
		volumeGain.gain.linearRampToValueAtTime(volume * Math.min(1, 1 / sum), ctx.currentTime + interval);
	});

	// events

	onkeydown = ev => {
		if (ev.repeat)
			return;
		let note = keyToNote(ev.code);
		if (note === null)
			return;
		playNote(note);
	};
	onkeyup = ev => {
		let note = keyToNote(ev.code);
		if (note === null)
			return;
		releaseNote(note);
	};

	// why is using radio buttons so difficult?
	//@ts-ignore
	for (let i of controls.elements.namedItem('wavetype'))
		//@ts-ignore
		i.onchange = _onWavetypeChange;
	function _onWavetypeChange(ev) {
		//@ts-ignore
		const val = controls.elements.namedItem('wavetype').value;
		for (let i of noteStrings)
			oscs[i].type = val;
	}

	input_frequency.oninput = ev => {
		let val = parseFloat(input_frequency.value);
		if (isNaN(val))
			val = 440;
		for (let i of noteStrings) {
			oscs[i].frequency.cancelScheduledValues(ctx.currentTime);
			oscs[i].frequency.setValueAtTime(oscs[i].frequency.value, ctx.currentTime);
			oscs[i].frequency.linearRampToValueAtTime(val * notes[i], ctx.currentTime + interval);
		}
	};

	input_detune.oninput = ev => {
		const val = parseFloat(input_detune.value);
		for (let i of noteStrings) {
			oscs[i].detune.cancelScheduledValues(ctx.currentTime);
			oscs[i].detune.setValueAtTime(oscs[i].detune.value, ctx.currentTime);
			oscs[i].detune.linearRampToValueAtTime(val, ctx.currentTime + interval);
		}
	}

	input_volume.oninput = ev => {
		volume = parseFloat(input_volume.value);
	};

	// adsr
	input_adsrAttackDuration     .oninput = ev => {
		adsrAttackDuration = parseFloat(input_adsrAttackDuration.value);
		//@ts-ignore
		document.styleSheets[0].cssRules[1].style.transitionDuration = adsrAttackDuration + adsrDecayDuration + 's';
	}
	input_adsrDecayDuration      .oninput = ev => {
		adsrDecayDuration = parseFloat(input_adsrDecayDuration.value);
		//@ts-ignore
		document.styleSheets[0].cssRules[1].style.transitionDuration = adsrAttackDuration + adsrDecayDuration + 's';
	}
	input_adsrSustainAmplitude   .oninput = ev => {
		// as decay uses exponential ramp, for mathematical reasons we cant use 0 for start or end value
		// so we should use minimal 32-bit float value
		adsrSustainAmplitude = Math.max(1.40130e-45, parseFloat(input_adsrSustainAmplitude.value));
	}
	input_adsrReleaseTimeconstant.oninput = ev => {
		adsrReleaseTimeconstant = parseFloat(input_adsrReleaseTimeconstant.value);
		//@ts-ignore
		document.styleSheets[0].cssRules[3].style.transitionDuration = 20/3 * adsrReleaseTimeconstant + 's';
	}
}
//#endregion

//#region main
/**
 * @param {NoteString} note
*/
function playNote(note) {
	table_notes[note].classList.add('pressed_note');

	const gain = gains[note];
	gain.gain.cancelScheduledValues(ctx.currentTime);
	gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
	gain.gain.linearRampToValueAtTime(1, ctx.currentTime + adsrAttackDuration);
	gain.gain.exponentialRampToValueAtTime(adsrSustainAmplitude, ctx.currentTime + adsrAttackDuration + adsrDecayDuration);

	console.debug(`${note} played`);
}
/**
 * @param {NoteString} note
*/
function releaseNote(note) {
	table_notes[note].classList.remove('pressed_note');

	const gain = gains[note];
	gain.gain.cancelScheduledValues(ctx.currentTime);
	gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
	gain.gain.setTargetAtTime(0, ctx.currentTime, adsrReleaseTimeconstant);

	console.debug(`${note} released`);
}

/** Plays notes based from your text
 * @param {string} str
*/
function playText(str, bpm = 120) {
	let arr = [ [] ];
	for (let i = 0, j = 0, k = 0; i < str.length; i++)
		if (str[i] === ' ') {
			arr.push([]);
			++j;
			k = 0;
		} else if (str[i] === '#')
			arr[j][k - 1] += 'Sharp';
		else {
			arr[j].push(str[i].toLowerCase());
			++k;
		}
	for (let i = 0; i < arr.length; i++) {
		setTimeout(playNotes, i * 60000 / bpm, arr[i]);
		setTimeout(releaseNotes, i * 60000 / bpm + adsrAttackDuration * 1000 + adsrDecayDuration * 1000, arr[i]);
	}
}
/** Plays all the notes from an array at the same time
 * @param {NoteString[]} notes
*/
function playNotes(notes) {
	for (let i of notes)
		playNote(i);
}
/**
 * @param {NoteString[]} notes
*/
function releaseNotes(notes) {
	for (let i of notes)
		releaseNote(i);
}

/**
 * @param {string} key
 * @returns {NoteString | null} 
*/
function keyToNote(key) {
	switch (key) {
		case 'KeyA':
			return 'c';
		case 'KeyW':
			return 'cSharp';
		case 'KeyS':
			return 'd';
		case 'KeyE':
			return 'dSharp';
		case 'KeyD':
			return 'e';
		case 'KeyF':
			return 'f';
		case 'KeyT':
			return 'fSharp';
		case 'KeyG':
			return 'g';
		case 'KeyY':
			return 'gSharp';
		case 'KeyH':
			return 'a';
		case 'KeyU':
			return 'aSharp';
		case 'KeyJ':
			return 'b';
	}
	return null;
}
//#endregion
