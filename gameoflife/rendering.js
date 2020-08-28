var ctx;

addEventListener('DOMContentLoaded', () => {
	ctx = canvas.getContext('2d');
	canvas.width = canvas.height = size;
	requestAnimationFrame(render);
});

function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	var arr = new Uint8ClampedArray(size * size * 4);
	for (let y = 0; y < size; y++)
		for (let x = 0; x < size; x++) {
			let i = y * size + x;
			if (scene[i]) {
				arr[i * 4] = arr[i * 4 + 1] = arr[i * 4 + 2] = 255;
				arr[i * 4 + 3] = 255;
			} else {
				arr[i * 4] = arr[i * 4 + 1] = arr[i * 4 + 2] = 0;
				arr[i * 4 + 3] = 255;
			}
		}

	ctx.putImageData(new ImageData(arr, size, size), 0, 0);

	requestAnimationFrame(render);
}