function test() {
	pause();
	var mid = size * size / 2 + size / 2;
	scene[mid] = scene[mid + size] = scene[mid + 2 * size]
	= scene[mid + 2 * size + 1] = scene[mid + size + 2] = true;
	run();
}

const size = 128;
const time = 1000 / 15;
const max = 3;
const min = 2;
const birth = 3;

var scene;
var live = false;

var handle;

reset();
function reset() {
	scene = new Array(size * size).fill(false);
}
function run() {
	live = true;
	handle = setInterval(tick, time);
}
function pause() {
	live = false;
	clearInterval(handle);
}

function tick() {
	var ts = performance.now();

	var nextScene = scene.slice();

	for (let y = 0; y < size; y++)
		for (let x = 0; x < size; x++) {
			let i = y * size + x;

			if (scene[i]) {
				let n = countAdjacent(x, y);
				if (n < min || n > max)
					nextScene[i] = false;

			} else {
				let n = countAdjacent(x, y);
				if (n >= birth && n <= max)
					nextScene[i] = true;
			}

		}
	scene = nextScene;

	console.debug(`Tick took ${performance.now() - ts} ms`);
}

function countAdjacent(x, y) {
	let n = 0;

	n += scene[$(x -1, y -1)];
	n += scene[$(x +0, y -1)];
	n += scene[$(x +1, y -1)];
	n += scene[$(x -1, y +0)];
	n += scene[$(x +1, y +0)];
	n += scene[$(x -1, y +1)];
	n += scene[$(x +0, y +1)];
	n += scene[$(x +1, y +1)];

	return n;
}

function $(x, y) {
	return size * (y < 0 ? size + y % size : y % size) + (x < 0 ? size + x % size : x % size);
}
