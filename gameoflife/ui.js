addEventListener('DOMContentLoaded', () => {
	canvas.addEventListener('click', e => {
		var x = Math.floor(e.offsetX / canvas.clientWidth * size);
		var y = Math.floor(e.offsetY / canvas.clientHeight * size);
		scene[size * y + x] = !scene[size * y + x];
	});
	addEventListener('keypress', e => {
		switch (e.code) {
			case 'KeyP':
				toggle();
				break;
			case 'KeyT':
				tick();
				break;
			case 'KeyR':
				reset();
				break;
		}
	});
});

function toggle() {
	if (live)
		pause();
	else
		run();
}