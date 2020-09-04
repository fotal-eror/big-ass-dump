//@ts-check

//#region classes
/** @typedef {[number, number, number]} Vector3 */
/** Column-major order 3 by 3 Matrix
 * @typedef {
		[number, number, number,
		 number, number, number,
		 number, number, number]
	} Matrix3x3 */

/** Multilpy vector by matrix */
function matrix(/** @type {Matrix3x3} */ mtx, /** @type {Vector3} */ vec) {
	return /** @type {Vector3} */ ([
		vec[0] * mtx[0] + vec[1] * mtx[3] + vec[2] * mtx[6],
		vec[0] * mtx[1] + vec[1] * mtx[4] + vec[2] * mtx[7],
		vec[0] * mtx[2] + vec[1] * mtx[5] + vec[2] * mtx[8],
	])
}

function screenToNDC(/** @type {[number, number, number]} */ [x, y], /** @type {[number, number, number]} */ [w, h]) {
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

function drawLine(/** @type {Vector3} */ s, /** @type {Vector3} */ d, c = ctx) {
	const wh = /** @type {[number, number]} */ ([cnv.width, cnv.height]);
	const sw = Math.max(s[2], 0.001);
	const dw = Math.max(d[2], 0.001);
	const [sx, sy] = NDCToScreen([s[0] / sw, s[1] / sw], wh);
	const [dx, dy] = NDCToScreen([d[0] / dw, d[1] / dw], wh);
	c.beginPath();
	c.moveTo(sx, sy);
	c.lineTo(dx, dy);
	c.stroke();
}
function drawDot(/** @type {Vector3} */ s, c = ctx) {
	const r = c.lineWidth / 2;
	const wh = /** @type {[number, number]} */ ([cnv.width, cnv.height]);
	const sw = Math.max(s[2], 0.001);
	const [sx, sy] = NDCToScreen([s[0] / sw, s[1] / sw], wh);
	c.fillRect(sx - r, sy - r, 2 * r, 2 * r);
}
//#endregion

//#region dom
const cnv = /** @type {HTMLCanvasElement} */ (document.getElementById('cnv'));
const ctx = cnv.getContext('2d');

const dottedGrid_input = /** @type {HTMLInputElement} */ (document.getElementById('dottedGrid_input'));

const mtx_input = /** @type {HTMLCollectionOf<HTMLInputElement>} */ (document.getElementsByClassName('mtx_input'));
const vec_input = /** @type {HTMLCollectionOf<HTMLInputElement>} */ (document.getElementsByClassName('vec_input'));
const mtx_output = /** @type {HTMLCollectionOf<HTMLOutputElement>} */ (document.getElementsByClassName('mtx_output'));
const vec_output = /** @type {HTMLCollectionOf<HTMLOutputElement>} */ (document.getElementsByClassName('vec_output'));
const vecByMtx_output = /** @type {HTMLCollectionOf<HTMLOutputElement>} */ (document.getElementsByClassName('vecByMtx_output'));
const cart_output = /** @type {HTMLCollectionOf<HTMLOutputElement>} */ (document.getElementsByClassName('cart_output'));
//#endregion

//#region dom events
dottedGrid_input.oninput = ev => {
	dottedGrid = dottedGrid_input.checked;
	onChange();
};
for (let i of mtx_input)
	i.addEventListener('input', ev => {
		mtx[i.dataset.index] = parseFloat(i.value);
		onChange();
	});
for (let i of vec_input)
	i.addEventListener('input', ev => {
		vec[i.dataset.index] = parseFloat(i.value);
		onChange();
	});
function onChange() {
	for (let i of mtx_output)
		i.textContent = (mtx[i.dataset.index]).toFixed(2);
	for (let i of vec_output)
		i.textContent = (vec[i.dataset.index]).toFixed(2);
	const mtxByVec = matrix(mtx, vec);
	for (let i of vecByMtx_output)
		i.textContent = (mtxByVec[i.dataset.index]).toFixed(2);
	for (let i of cart_output)
		i.textContent = (mtxByVec[i.dataset.index] / mtxByVec[2]).toFixed(2);
	changed = true;
}
//#endregion

//#region vars
let vec = /** @type {Vector3} */ ([0.6, 0.4, 1]);
let mtx = /** @type {Matrix3x3} */ (
	[1, 0, 0,
	 0, 1, 0,
	 0, 0, 1]
);

let changed = true;
let handle = -1;
let dottedGrid = true;
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

	if (dottedGrid) {
		ctx.lineWidth = 1.5;
		for (let y = -2; y <= 2; y += gridScale)
			for (let x = -2; x <= 2; x += gridScale)
				drawDot(matrix(mtx, [x, y, 1]));
	} else {
		ctx.lineWidth = 1;
		for (let i = -2 + gridScale; i <= 2 - gridScale; i += gridScale) {
			drawLine(matrix(mtx, [i, -2, 1]), matrix(mtx, [i, 2, 1]));
			drawLine(matrix(mtx, [-2, i, 1]), matrix(mtx, [2, i, 1]));
		}
	}
	ctx.lineWidth = 4;
	const u00 = matrix(mtx, [0, 0, 1]);
	const u10 = matrix(mtx, [1, 0, 1]);
	const u01 = matrix(mtx, [0, 1, 1]);
	ctx.strokeStyle = '#f00';
	drawLine(u00, u10);
	ctx.strokeStyle = '#0f0';
	drawLine(u00, u01);
	ctx.lineWidth = 2;
	ctx.strokeStyle = '#000';
	drawLine(u00, matrix(mtx, vec));

	changed = false;
}
//#endregion
