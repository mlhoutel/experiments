<script>
	import Canvas from '$components/canvas.svelte';
	import { Body, System } from './index';
	import { Random, Vec2, ColorGradient, ColorToHex } from '$utils/math.js';
	import imageCircle from '$assets/circle.png';

	let system = undefined;
	let circles = [];
	let debug = undefined;
	let mouse = undefined;
	let settings = {
		renderer_options: {
			preserveDrawingBuffer: true,
			clearBeforeRender: false
		},
		scenario: 'galaxy',
		debug: false,
		shading: true,
		t_sys: 0,
		t_draw: 0,
		nb_objects: 3000,
		fading: 0xf9f9f9
	};

	const galaxy_gradient = ColorGradient(
		[
			[84, 103, 142],
			[191, 114, 105],
			[241, 232, 229]
		],
		100
	);

	const galaxy_system = () => {
		const system = new System();
		for (let i = 0; i < settings.nb_objects; i++) {
			const angle = Random(-Math.PI, Math.PI);
			const dist = Random(0, 0.5);
			const pos = new Vec2(dist * system.bounds.b.y, 0).rotateAround(angle, new Vec2(0, 0));
			const vel = new Vec2(7 + 0.01 / (0.001 + dist * dist), 0)
				.rotateAround(angle, new Vec2(0, 0))
				.norm();
			system.add(new Body(pos, vel, Math.exp(Random(1, 4))));
		}
		return system;
	};

	const scenarios = {
		galaxy: galaxy_system
	};

	const setup = (app, pane) => {
		system = scenarios[settings.scenario]();

		document.addEventListener('mousemove', (e) => {
			mouse = new Vec2(e.x, e.y);
		});

		pane.title = 'Barnes-hut simulation';

		pane.addInput(settings, 'scenario', {
			options: {
				galaxy: 'galaxy'
			}
		});

		pane.addInput(settings, 'nb_objects', {
			step: 10,
			min: 0,
			max: 10000,
			format: (n) => Math.floor(n)
		});

		pane.addInput(settings, 'fading', {
			picker: 'inline',
			view: 'color'
		});

		pane.addInput(settings, 'shading');
		pane.addInput(settings, 'debug');

		const metrics = pane.addFolder({
			title: 'Metrics'
		});

		metrics.addMonitor(settings, 't_sys', {
			view: 'graph',
			bufferSize: 60,
			min: 0,
			max: 100
		});

		metrics.addMonitor(settings, 't_draw', {
			view: 'graph',
			bufferSize: 60,
			min: 0,
			max: 100
		});

		const texture = PIXI.Texture.from(imageCircle);
		for (let i = 0; i < system.bodies.length; ++i) {
			const sprite = new PIXI.Sprite(texture);
			sprite.scale.set(0);
			app.stage.addChild(sprite);
			circles.push(sprite);
		}

		debug = new PIXI.Graphics();
		app.stage.addChild(debug);

		const fade = new PIXI.Graphics();
		app.stage.addChild(fade);

		// Blend Mode
		fade.blendMode = PIXI.BLEND_MODES.MULTIPLY;
		fade.beginFill(settings.fading);
		fade.drawRect(0, 0, window.innerWidth, window.innerHeight);
		fade.endFill();
	};

	const compute_resolution = () => {
		return Math.max(
			window.innerWidth / (system.bounds.b.x - system.bounds.a.x),
			window.innerHeight / (system.bounds.b.y - system.bounds.a.y)
		);
	};

	const compute_origin = () => {
		const origin = system.bounds.b.clone().minus(system.bounds.a).divide(2);
		return new Vec2(origin.x, origin.y * Math.min(window.innerHeight / window.innerWidth, 1));
	};

	const draw_debug = () => {
		const resolution = compute_resolution();
		const origin = compute_origin();

		debug.lineStyle(0.5, 0xff0000, 1);

		const draw_quad = (q) => {
			if (q.childs?.length) {
				const half = q.half().plus(origin).times(resolution);
				const start = q.bounds.a.clone().plus(origin).times(resolution);
				const end = q.bounds.b.clone().plus(origin).times(resolution);

				debug.moveTo(start.x, half.y);
				debug.lineTo(end.x, half.y);

				debug.moveTo(half.x, start.y);
				debug.lineTo(half.x, end.y);

				for (let i = 0; i < q.childs.length; i++) {
					draw_quad(q.childs[i]);
				}
			}
		};

		draw_quad(system.quad);
		if (mouse) {
			debug.lineStyle(1, 0x00ff00, 1);
			debug.beginFill(0x00ff00, 0.3);
			const f = system.quad.retrieve(mouse.clone().divide(resolution).minus(origin));
			debug.drawRect(
				(origin.x + f.bounds.a.x) * resolution,
				(origin.y + f.bounds.a.y) * resolution,
				(f.bounds.b.x - f.bounds.a.x) * resolution,
				(f.bounds.b.y - f.bounds.a.y) * resolution
			);
			debug.endFill();
		}
	};

	const draw_system = () => {
		const resolution = compute_resolution();
		const origin = compute_origin();

		for (let i = 0; i < system.bodies.length; ++i) {
			circles[i].x = (origin.x + system.bodies[i].pos.x) * resolution;
			circles[i].y = (origin.y + system.bodies[i].pos.y) * resolution;
			circles[i].scale.set(Math.log2(system.bodies[i].mass) * 0.01 * resolution);

			if (settings.shading) {
				const pow = Math.floor(system.bodies[i].vel.length_2() + system.bodies[i].mass * 0.3) - 50;
				const col = ColorToHex(galaxy_gradient[Math.max(Math.min(pow, 99), 0)]);
				circles[i].tint = col;
			} else {
				circles[i].tint = 0xffffff;
			}
		}
	};

	const draw_effects = () => {};

	const draw = (app, pane) => {
		const s_sys = performance.now();
		system.step();
		settings.t_sys = performance.now() - s_sys;

		const s_draw = performance.now();
		draw_system();

		debug.clear();
		if (settings.debug) {
			draw_debug();
		}
		settings.t_draw = performance.now() - s_draw;
	};
</script>

<Canvas {setup} {draw} bind:settings />
