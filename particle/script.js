//@ts-check

//#region classes
/** @typedef {number} index */
/** @typedef {[number, number]} Vector2 */

class Engine {
	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Particle[]} bodies
	 * @param gravity m^3 kg^-1 s^-2
	 * @param view_s How much there are meters in half-screen
	*/
	constructor (ctx, bodies, gravity, speed = 1, view_x = 0, view_y = 0, view_s = 1) {
		this.ctx = ctx;
		this.bodies = bodies;
		this.gravity = gravity;
		this.speed = speed;
		this.view_x = view_x;
		this.view_y = view_y;
		this.view_s = view_s;

		this.handle = -1;
	}
	static test1() {
		// earth and moon simulation
		const bodies = [
			// earth
			new Particle(0, 0, 5.972e24, 6.371e6, 0, 0, '#2bf984'),
			// moon (in apogee)
			new Particle(0, 4.055e8, 7.34767309e22, 1.7371e6, 9.70e2, 0, '#b6c1c2')
		];
		const gravity = 6.67408e-11;
		const zoom = 1e9;
		return new Engine(ctx, bodies, gravity, 1, 0, 0, zoom);
	}

	get alive() {
		return this.handle !== -1;
	}

	resume(tickrate = 60) {
		if (this.alive)
			return;
		this.handle = setInterval(this.tick, 1000 / tickrate, 1000 / tickrate, this);
	}
	pause() {
		clearInterval(this.handle);
		this.handle = -1;
	}

	/**
	 * @param {number} delta
	*/
	tick(delta, thisArg = this) {
		const l = thisArg.bodies.length;

		for (let i = 0; i < l; i++)
			thisArg.bodies[i].update(thisArg, delta, thisArg.speed, thisArg.bodies, i);

		thisArg.render(delta);
	}
	render(delta, thisArg = this) {
		thisArg.ctx.clearRect(0, 0, thisArg.ctx.canvas.width, thisArg.ctx.canvas.height)
		const p = params(thisArg.ctx.canvas);
		for (let i of thisArg.bodies)
			i.render(thisArg.ctx, delta, { x: thisArg.view_x, y: thisArg.view_y, s: thisArg.view_s }, p);
	}

	/**
	 * @param {Particle} applyTo Body to apply the force to
	 * @param {Particle} attractTo Body that applies the force
	 * @return Force vector
	*/
	applyGravity(applyTo, attractTo) {
		let dX = attractTo.pos_x - applyTo.pos_x,
			 dY = attractTo.pos_y - applyTo.pos_y;
		let d = Math.hypot(dX, dY);
		return /** @type {Vector2} */ ([
			this.gravity * applyTo.mass * attractTo.mass / d ** 3 * dX * (d > applyTo.radius + attractTo.radius ? 1 : -1),
			this.gravity * applyTo.mass * attractTo.mass / d ** 3 * dY * (d > applyTo.radius + attractTo.radius ? 1 : -1)
		]);
	}
}

class Particle {
	/**
	 * @param {number} x meters
	 * @param {number} y meters
	 * @param {number} m kilogrammes
	 * @param {number} r meters
	 * @param vX meters per second
	 * @param vY meters per second
	 * @param {string} style
	*/
	constructor (x, y, m, r, vX = 0, vY = 0, style = undefined, fillStyle = style && style.startsWith('#') && style.length < 8 ? style + '66' : style) {
		this.pos_x = x;
		this.pos_y = y;
		this.nextPos_x = x;
		this.nextPos_y = y;
		this.mass = m;
		this.radius = r;
		this.vel_x = vX;
		this.vel_y = vY;
		if (style) {
			this.style = style;
			this.fillStyle = fillStyle;
		} else {
			// generate random color
			let foo = Math.floor(Math.random() * 2 ** 24).toString(16);
			this.style = `#${'0'.repeat(6 - foo.length) + foo}`;
			this.fillStyle = this.style + '88';
		}
	}

	/**
	 * @param {Engine} engn
	 * @param {number} delta
	 * @param {number} multi
	 * @param {Particle[]} bodies
	 * @param {index} inx
	*/
	update(engn, delta, multi = 1, bodies, inx) {
		const l = bodies.length;
		const t = delta / 1000 * multi;

		this.pos_x = this.nextPos_x;
		this.pos_y = this.nextPos_y;

		this.nextPos_x += this.vel_x * t;
		this.nextPos_y += this.vel_y * t;

		// calculating force
		let fX = 0, fY = 0;
		for (let i = 0; i < l; i++) {
			if (i === inx)
				continue;
			let vec = bodies[i].interract(engn, this, i, inx);
			fX += vec[0]; fY += vec[1];
		}

		// acceleration
		const aX = fX / this.mass;
		const aY = fY / this.mass;

		this.vel_x += aX * t;
		this.vel_y += aY * t;

		return this;
	}
	/**
	 * @param {Engine} engn
	 * @param {Particle} body Body to interract with
	 * @param {index} bodyInx
	 * @param {index} thisInx
	 * @returns Acceleration vector to apply to `body`
	*/
	interract(engn, body, thisInx, bodyInx) {
		return engn.applyGravity(body, this);
	}

	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} delta
	*/
	render(ctx, delta, { x, y, s }, { m, w, h, dw, dh, u }) {
		ctx.lineWidth = 4;

		// center point
		ctx.beginPath();
		ctx.strokeStyle = ctx.fillStyle = this.style;
		ctx.arc(NDCAspectToScreenX((this.pos_x - x) / s, w, dw), NDCAspectToScreenY((this.pos_y - y) / s, h, dh), 4, 0, 2 * Math.PI);
		ctx.fill();

		// radius arc and fill
		ctx.beginPath();
		ctx.fillStyle = this.fillStyle;
		ctx.arc(NDCAspectToScreenX((this.pos_x - x) / s, w, dw), NDCAspectToScreenY((this.pos_y - y) / s, h, dh), this.radius * u / s, 0, 2 * Math.PI);
		ctx.fill();
		ctx.stroke();
	}
}
//#endregion

//#region dom
const cnv = /** @type {HTMLCanvasElement} */ (document.getElementById('cnv'));
const ctx = cnv.getContext('2d');
//#endregion

//#region events
onresize = ev => {
	cnv.width = innerWidth;
	cnv.height = innerHeight;
};
//@ts-ignore
onresize();

cnv.onmousedown = ev => {
	viewDrag = true;
}
onmouseup = ev => {
	viewDrag = false;
}
cnv.onmousemove = ev => {
	if (!viewDrag)
		return;
	const m = Math.max(cnv.width, cnv.height);
	engine.view_x -= 2 * ev.movementX / m * engine.view_s;
	engine.view_y += 2 * ev.movementY / m * engine.view_s;
}
cnv.onwheel = ev => {
	engine.view_s += engine.view_s * ev.deltaY / 600;
}
//#endregion

//#region vars
var engine = Engine.test1();

var viewDrag = false;
//#endregion

//#region main
function run() {
	engine.speed = 86400;
	engine.resume();
}
run();
//#endregion

//#region rendering
function params(canvas = cnv) {
	const m = Math.max(canvas.width, canvas.height);
	const w = canvas.width; const h = canvas.height;
	const dw = (m - w) / 2; const dh = (m - h) / 2;
	const u = m / 2;
	return {
		m: m,
		w: w, h: h,
		dw: dw, dh: dh,
		u: u
	};
}

/**
 * @param {number} x
*/
function screenToNDCAspectX(x, w = cnv.width, d = (Math.max(w, cnv.height) - w) / 2) {
	return (x / w - .5) / (d / w + .5);
}
/**
 * @param {number} y
*/
function screenToNDCAspectY(y, h = cnv.height, d = (Math.max(cnv.width, h) - h) / 2) {
	return -(y / h - .5) / (d / h + .5);
}
/**
 * @param {number} x
*/
function NDCAspectToScreenX(x, w = cnv.width, d = (Math.max(w, cnv.height) - w) / 2) {
	return (x * (d / w + .5) + .5) * w;
}
/**
 * @param {number} y
*/
function NDCAspectToScreenY(y, h = cnv.height, d = (Math.max(cnv.width, h) - h) / 2) {
	return -(y * (d / h + .5) - .5) * h;
}
//#endregion
