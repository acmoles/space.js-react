var t, i;
if ("undefined" != typeof window) t = window.requestAnimationFrame, i = window.cancelAnimationFrame;
else {
	const s = performance.now(), e = 1e3 / 60;
	t = (t) => setTimeout(() => {
		t(performance.now() - s);
	}, e), i = clearTimeout;
}
const s = new class {
	constructor() {
		this.callbacks = [], this.last = performance.now(), this.time = 0, this.delta = 0, this.frame = 0, this.isAnimating = !1;
	}
	onTick = (i) => {
		this.isAnimating && (this.requestId = t(this.onTick)), this.delta = i - this.last, this.last = i, this.time = .001 * i, this.frame++;
		for (let t = this.callbacks.length - 1; t >= 0; t--) {
			const s = this.callbacks[t];
			if (s) {
				if (s.fps) {
					const t = i - s.last;
					if (t < 1e3 / s.fps) continue;
					s.last = i, s.frame++, s(this.time, t, s.frame);
					continue;
				}
				s(this.time, this.delta, this.frame);
			}
		}
	};
	add(t, i) {
		i && (t.fps = i, t.last = performance.now(), t.frame = 0), this.callbacks.unshift(t);
	}
	remove(t) {
		const i = this.callbacks.indexOf(t);
		~i && this.callbacks.splice(i, 1);
	}
	start() {
		this.isAnimating || (this.isAnimating = !0, this.requestId = t(this.onTick));
	}
	stop() {
		this.isAnimating && (this.isAnimating = !1, i(this.requestId));
	}
	setRequestFrame(i) {
		t = i;
	}
	setCancelFrame(t) {
		i = t;
	}
}();
var e = class {
	constructor(t) {
		this.params = Object.assign({
			width: 1,
			height: 1,
			tileSize: 250,
			monochrome: !0
		}, t), this.initCanvas();
	}
	initCanvas() {
		this.canvas = this.params.canvas, this.canvas.width = this.params.width, this.canvas.height = this.params.height, this.context = this.canvas.getContext("2d"), this.tile = new OffscreenCanvas(this.params.tileSize, this.params.tileSize), this.tile.width = this.params.tileSize, this.tile.height = this.params.tileSize, this.tileContext = this.tile.getContext("2d");
	}
	resize = (t, i, s) => {
		this.canvas.width = Math.round(t * s), this.canvas.height = Math.round(i * s), this.tile.width = Math.round(this.params.tileSize * s), this.tile.height = Math.round(this.params.tileSize * s), this.width = this.canvas.width / this.tile.width + 1, this.height = this.canvas.height / this.tile.height, this.update();
	};
	update = () => {
		const t = new ImageData(this.tile.width, this.tile.height);
		for (let i = 0, s = t.data.length; i < s; i += 4) {
			const s = 255 * Math.random();
			t.data[i] = this.params.monochrome ? s : 255 * Math.random(), t.data[i + 1] = this.params.monochrome ? s : 255 * Math.random(), t.data[i + 2] = this.params.monochrome ? s : 255 * Math.random(), t.data[i + 3] = 255;
		}
		this.tileContext.putImageData(t, 0, 0);
		for (let i = 0, s = this.width; i < s; i++) for (let t = 0, e = this.height; t < e; t++) this.context.drawImage(this.tile, i * this.tile.width - (t % 2 == 0 ? this.tile.width / 2 : 0), t * this.tile.height, this.tile.width, this.tile.height);
	};
};
new class {
	constructor() {
		this.addListeners();
	}
	addListeners() {
		addEventListener("message", this.onMessage), s.start();
	}
	onMessage = ({ data: t }) => {
		this[t.message.fn].call(this, t.message);
	};
	onUpdate = () => {
		this.noise.update();
	};
	init = ({ params: t }) => {
		this.noise = new e(t);
	};
	resize = ({ width: t, height: i, dpr: s }) => {
		this.noise.resize(t, i, s);
	};
	start = ({ fps: t }) => {
		s.add(this.onUpdate, t);
	};
	stop = () => {
		s.remove(this.onUpdate);
	};
}();
