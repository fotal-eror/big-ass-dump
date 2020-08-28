//@ts-check
// When editing this file, it's better to use VSCode or any other IDE with JSDoc support

//#region dom
const cnv = /** @type {HTMLCanvasElement} */ (document.getElementById('cnv'));
const res_input = /** @type {HTMLInputElement} */ (document.getElementById('res_input'));
const iter_input = /** @type {HTMLInputElement} */ (document.getElementById('iter_input'));
const run_button = /** @type {HTMLInputElement} */ (document.getElementById('run_button'));
const fps_counter = /** @type {HTMLSpanElement} */ (document.getElementById('fps_counter'));
const rMode_input_mono = /** @type {HTMLInputElement} */ (document.getElementById('rMode_input_mono'));
const rMode_input_color = /** @type {HTMLInputElement} */ (document.getElementById('rMode_input_color'));

const ctx = cnv.getContext('2d');
//#endregion

//#region dom events
res_input.addEventListener('input', ev => {
	res = parseInt(res_input.value);
});
iter_input.addEventListener('input', ev => {
	iter = parseInt(iter_input.value);
	changed = true;
});
cnv.addEventListener('mousedown', ev => {
	drag = true;
});
addEventListener('mouseup', ev => {
	drag = false;
});
cnv.addEventListener('mousemove', ev => {
	if (!drag)
		return;
	vr -= view(ev.movementX, cnv.clientWidth, vs, vs);
	vi -= view(ev.movementY, cnv.clientWidth, vs, vs);
	changed = true;
});
cnv.addEventListener('wheel', ev => {
	vs += vs * ev.deltaY / 600;
	changed = true;
});
addEventListener('keydown', ev => {
	switch (ev.code) {
		case 'NumpadAdd':
		case 'Equal':
			iter_input.value = (++iter).toString();
			changed = true;
			break;
		case 'NumpadSubtract':
		case 'Minus':
			iter_input.value = (--iter).toString();
			changed = true;
			break;
		case 'Enter':
		case 'NumpadEnter':
		case 'Space':
			changed = true;
			break;
	}
});
rMode_input_mono.addEventListener('input', ev => {
	renderingMode = rMode_input_color.checked ? 'color' : 'mono';
	changed = true;
});
rMode_input_color.addEventListener('input', ev => {
	renderingMode = rMode_input_color.checked ? 'color' : 'mono';
	changed = true;
});
//#endregion

//#region vars
/** Image resolution (canvas size) */
let res = 256;
/** Number of iterations to do */
let iter = 6;
// view coords
let vr = 0;
let vi = 0;
// view scale
let vs = 2;
// ^ these values will render image on intervals [-2, 2] [-2i, 2i]
/** Is a mouse button being pressed on the canvas */
let drag = false;
/** Animation frame handle (if === `-1` => animation paused) */
let handle = -1;
/** Were there any changed made? */
let changed = true;
/** Previous animation frame timestamp */
let _ts = 0;
/** @type {'mono' | 'color'} */
let renderingMode = 'color';
//#endregion

//#region functions and stuff
/**
 * @typedef {{ r: number, i: number }} Complex Represents a complex number
*/
/**
 * Squares complex number `z` then adds complex number `c` to it
 * @param {Complex} z
 * @param {Complex} c
 * @returns {Complex} `z ^ 2 + c`
*/
function f(z, c) {
	return { r: z.r ** 2 - z.i ** 2 + c.r, i: 2 * z.r * z.i + c.i };
}
/**
 * @param {Complex} v
 * @returns {number} (Squared) modulus of the complex number `v`
*/
function m(v) {
	return v.r ** 2 + v.i ** 2;
}

/**
 * Basically it just converts on-screen coord to "world" view coord
 * @param {number} x Screen coord (left/top)
 * @param {number} w Screen size (width/height)
 * @param {number} t View coord
 * @param {number} s View scale
*/
function view(x, w, t, s) {
	return s * (2 * x / w - 1) + t;
}
//#endregion

//#region run
function run() {
	if (handle === -1)
		handle = requestAnimationFrame(render);
}
run();
function stop() {
	cancelAnimationFrame(handle);
	handle = -1;
}
/** Draws a frame (only if `changed`) */
function render(ts) {
	if (changed) {
		cnv.width = cnv.height = res; // this one also clears the canvas
		let data = mandelbrot(res, iter, vr, vi, vs); // get mandelbrot data
		// makes an image and draws it
		if (renderingMode === 'color') // color
			ctx.putImageData(colorImgData(data, res, iter), 0, 0);
		else // mono
			ctx.putImageData(monoImgData(data, res, iter), 0, 0);
		// no more changed
		changed = false;
		fps_counter.innerHTML = Math.round(1000 / (ts - _ts)).toString(); // change fps counter
	}

	_ts = ts;
	handle = requestAnimationFrame(render);
}
//#endregion

//#region main
/**
 * @param {number} res
 * @param {number} iter
 * @param {number} vr
 * @param {number} vi
 * @param {number} vs
 * @returns Array of iterations at which the corresponding values diverged
*/
// basically mandelbrot set is the set of complex numbers `c` for which the sequence `z[n] = z[(n-1)] ^ 2 + c` does not diverge
// (i.e. modulus of each number in the set should be less than 2)
function mandelbrot(res, iter, vr = 0, vi = 0, vs = 2) {
	let ret = /** @type {number[]} */ (new Array(res * res).fill(0));

	// for each pixel
	for (let y = 0; y < res; y++) {
		for (let x = 0; x < res; x++) {
			let z = { r: 0, i: 0 }; // z value
			const c = { r: view(x, res, vr, vs), i: view(y, res, vi, vs) }; // value c that corresponds to the pixel coords
			for (let i = 0; i < iter; i++) {
				z = f(z, c); // set new z value
				if (m(z) >= 4) { // if modulus > 2 => the value diverges
					ret[res * y + x] = i;
					break;
				} else if (i === iter - 1) // if it is the last iteration
					ret[res * y + x] = iter;
			}
		}
		/* prints progress percentage
		if (Math.floor(y / res * 100) !== Math.floor((y - 1) / res * 100))
			console.debug(Math.floor(y / res * 100));
		*/
	}

	return ret;
}

/**
 * @param {number[]} data
 * @param {number} res
 * @param {number} iter
*/
// ideally, we want a complex number to either *belong* to the set, or *not belong*.
// But it takes infinite iterations to determine that.
// Instead, we color some pixels based on number of iterations it took them to diverge
function colorImgData(data, res, iter) {
	let ret = new Uint8ClampedArray(4 * res * res);

	for (let y = 0; y < res; y++)
		for (let x = 0; x < res; x++) {

			// does magic
			const v = data[res * y + x] / iter;
			if (v === 1) {
				ret[4 * (res * y + x)]     = 0;
				ret[4 * (res * y + x) + 1] = 0;
				ret[4 * (res * y + x) + 2] = 0;
			} else if (v < 1/3) {
				ret[4 * (res * y + x)]     = 0;
				ret[4 * (res * y + x) + 1] = 0;
				ret[4 * (res * y + x) + 2] = 381 * v;
			} else if (v < 2/3) {
				ret[4 * (res * y + x)]     = 765 * v - 255;
				ret[4 * (res * y + x) + 1] = 765 * v - 255;
				ret[4 * (res * y + x) + 2] = 384 * v - 1;
			} else {
				ret[4 * (res * y + x)]     = 255;
				ret[4 * (res * y + x) + 1] = -384 * v + 511;
				ret[4 * (res * y + x) + 2] = -765 * v + 765;
			}

			ret[4 * (res * y + x) + 3] = 255;
		}
	
	return new ImageData(ret, res, res);
}
/**
 * @param {number[]} data
 * @param {number} res
 * @param {number} iter
*/
// if belongs => black, else => white
function monoImgData(data, res, iter) {
	let ret = new Uint8ClampedArray(4 * res * res);

	for (let y = 0; y < res; y++)
		for(let x = 0; x < res; x++) {
			if (data[res * y + x] === iter) {
				ret[4 * (res * y + x)] = 0;
				ret[4 * (res * y + x) + 1] = 0;
				ret[4 * (res * y + x) + 2] = 0;
			} else {
				ret[4 * (res * y + x)] = 255;
				ret[4 * (res * y + x) + 1] = 255;
				ret[4 * (res * y + x) + 2] = 255;
			}
			ret[4 * (res * y + x) + 3] = 255;
		}

	return new ImageData(ret, res, res);
}
//#endregion
