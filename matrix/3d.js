//@ts-check

//#region classes
/** @typedef {[number, number, number, number]} Vector4 */
/** Column-major order 3 by 3 Matrix
 * @typedef {
		[number, number, number, number,
		 number, number, number, number,
		 number, number, number, number,
		 number, number, number, number]
	} Matrix4x4 */

/** Multilpy vector by matrix */
function matrix(/** @type {Matrix4x4} */ mtx, /** @type {Vector4} */ vec) {
	return /** @type {Vector4} */ ([
		vec[0] * mtx[0] + vec[1] * mtx[4] + vec[2] * mtx[8]  + vec[3] * mtx[12],
		vec[0] * mtx[1] + vec[1] * mtx[5] + vec[2] * mtx[9]  + vec[3] * mtx[13],
		vec[0] * mtx[2] + vec[1] * mtx[6] + vec[2] * mtx[10] + vec[3] * mtx[14],
		vec[0] * mtx[3] + vec[1] * mtx[7] + vec[2] * mtx[11] + vec[3] * mtx[15],
	]);
}

const lerp = (x, y0, y1) => x * (y1 - y0) + y0;

function screenToNDC(/** @type {[number, number]} */ [x, y], /** @type {[number, number]} */ [w, h]) {
	return /** @type {[number, number]} */ ([
		 2 * x / w - 1,
		-2 * y / h + 1
	]);
}
function NDCToScreen(/** @type {[number, number]} */ [x, y], /** @type {[number, number]} */ [w, h]) {
	return /** @type {[number, number]} */ ([
		(x + 1) * w /  2,
		(y - 1) * h / -2
	]);
}

function drawLine(/** @type {Vector4} */ s, /** @type {Vector4} */ d, c = ctx) {
	const wh = /** @type {[number, number]} */ ([cnv.width, cnv.height]);
	const sw = Math.max(s[3], 0.001);
	const dw = Math.max(d[3], 0.001);
	const [sx, sy] = NDCToScreen([s[0] / sw, s[1] / sw], wh);
	const [dx, dy] = NDCToScreen([d[0] / dw, d[1] / dw], wh);
	c.beginPath();
	c.moveTo(sx, sy);
	c.lineTo(dx, dy);
	c.stroke();
}
function drawDot(/** @type {Vector4} */ s, c = ctx) {
	const r = c.lineWidth / 2;
	const wh = /** @type {[number, number]} */ ([cnv.width, cnv.height]);
	const sw = Math.max(s[3], 0.001);
	const sz = s[2] / sw;
	const col = lerp((-sz + 1) / 2, 0, 255);
	c.fillStyle = `rgb(0, 0, ${col}, 255)`;
	const [sx, sy] = NDCToScreen([s[0] / sw, s[1] / sw], wh);
	c.fillRect(sx - r, sy - r, 2 * r, 2 * r);
}
//#endregion

//#region dom
const cnv = /** @type {HTMLCanvasElement} */ (document.getElementById('cnv'));
const ctx = cnv.getContext('2d');

const grid_input = /** @type {NodeListOf<HTMLInputElement>} */ (document.getElementsByName('grid_input'));

const mtx_input = /** @type {NodeListOf<HTMLInputElement>} */ (document.getElementsByName('mtx_input'));
const vec_input = /** @type {NodeListOf<HTMLInputElement>} */ (document.getElementsByName('vec_input'));
//#endregion

//#region dom events
for (let i of grid_input)
	i.oninput = ev => {
		if (i.checked)
			//@ts-ignore
			gridType = i.value;
		onChange();
	};
for (let i of mtx_input)
	i.oninput = ev => {
		mtx[i.dataset.index] = parseFloat(i.value);
		onChange();
	};
for (let i of vec_input)
	i.oninput = ev => {
		vec[i.dataset.index] = parseFloat(i.value);
		onChange();
	};
function onChange() {
	changed = true;
}
//#endregion

//#region vars
let vec = /** @type {Vector4} */ ([0.6, 0.4, 0.3, 1]);
let mtx = /** @type {Matrix4x4} */ (
	[1, 0, 0, 0,
	 0, 1, 0, 0,
	 0, 0, 1, 0,
	 0, 0, 0, 1]
);

let changed = true;
let handle = -1;
let gridType = /** @type {'dotted' | 'lined' | 'planes'} */ ('dotted');
let gridScale = 0.25;
//#endregion

//#region main
onChange();

function run() {
	if (handle !== -1)
		return;
	handle = requestAnimationFrame(tick);
}
run();
function stop() {
	cancelAnimationFrame(handle);
	handle = -1;
}
function tick(ts) {
	handle = requestAnimationFrame(tick);
	if (!changed)
		return;

	ctx.clearRect(0, 0, cnv.width, cnv.height);
	ctx.fillStyle = ctx.strokeStyle = '#000';

	if (gridType === 'dotted') {
		ctx.lineWidth = 1.5;
		for (let z = -2; z <= 2; z += gridScale)
			for (let y = -2; y <= 2; y += gridScale)
				for (let x = -2; x <= 2; x += gridScale)
					drawDot(matrix(mtx, [x, y, z, 1]));
	} else if (gridType === 'lined') {
		ctx.lineWidth = 1;
		for (let y = -2 + gridScale; y <= 2 - gridScale; y += gridScale)
			for (let x = -2 + gridScale; x <= 2 - gridScale; x += gridScale) {
				drawLine(matrix(mtx, [x, y, -2, 1]), matrix(mtx, [x, y, 2, 1]));
				drawLine(matrix(mtx, [x, -2, y, 1]), matrix(mtx, [x, 2, y, 1]));
				drawLine(matrix(mtx, [-2, x, y, 1]), matrix(mtx, [2, x, y, 1]));
			}
	} else {
		ctx.lineWidth = 1;
		for (let x = -2; x <= 2; x += gridScale) {
			drawLine(matrix(mtx, [x, -2, 0, 1]), matrix(mtx, [x, 2, 0, 1]));
			drawLine(matrix(mtx, [-2, x, 0, 1]), matrix(mtx, [2, x, 0, 1]));
			drawLine(matrix(mtx, [x, 0, -2, 1]), matrix(mtx, [x, 0, 2, 1]));
			drawLine(matrix(mtx, [-2, 0, x, 1]), matrix(mtx, [2, 0, x, 1]));
			drawLine(matrix(mtx, [0, x, -2, 1]), matrix(mtx, [0, x, 2, 1]));
			drawLine(matrix(mtx, [0, -2, x, 1]), matrix(mtx, [0, 2, x, 1]));
		}
	}
	ctx.lineWidth = 4;
	const u000 = matrix(mtx, [0, 0, 0, 1]);
	const u100 = matrix(mtx, [1, 0, 0, 1]);
	const u010 = matrix(mtx, [0, 1, 0, 1]);
	const u001 = matrix(mtx, [0, 0, 1, 1]);
	ctx.strokeStyle = '#f00';
	drawLine(u000, u100);
	ctx.strokeStyle = '#0f0';
	drawLine(u000, u010);
	ctx.strokeStyle = '#00f';
	drawLine(u000, u001);
	ctx.lineWidth = 2;
	ctx.strokeStyle = '#000';
	drawLine(u000, matrix(mtx, vec));

	changed = false;
}
//#endregion
