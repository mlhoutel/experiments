<script>
	import Canvas from '$components/canvas.svelte';
	import { Body, System } from './index';
	import { Random, Vec2, ColorGradient, ColorToHex } from '$utils/math.js';
	import imageCircle from '$assets/circle.png';

	let system = new System();
	let circles = [];
	let radius = [];
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
		nb_objects: 1,
		fading_color: 0xf9f9f9,
		fading: true,
		dt: system.dt,
		bruteforce: true,
		g_constant: system.g_constant,
		min_dist: system.min_dist,
		quad_capacity: system.quad_capacity,
		quad_maxdepth: system.quad_maxdepth,
		quad_theta: system.quad_theta,
		iterations: system.iterations,
		paused: false
	};

	let updates = [];

	const galaxy_gradient = ColorGradient(
		[
			[84, 103, 142],
			[191, 114, 105],
			[241, 232, 229]
		],
		100
	);

	const orbits_settings = () => {
		settings.renderer_options = {
			preserveDrawingBuffer: true,
			clearBeforeRender: false
		};
		settings.nb_objects = 40;
		settings.shading = true;
		settings.fading = true;
		settings.dt = 0.1;
		settings.bruteforce = true;
		settings.g_constant = 9.2 * 10e-1;
		settings.quad_capacity = 1;
		settings.quad_maxdepth = 10;
		settings.quad_theta = 0.5;
		settings.iterations = 10;
		settings.min_dist = 10e-1;
	};

	const orbits_system = () => {
		system.bodies = [];
		system.add(new Body(new Vec2(0, 0), new Vec2(0, 0), 10e5));

		for (let i = 0; i < settings.nb_objects; ++i) {
			const dist = 0.2 + (i + 1) / (settings.nb_objects / 0.45);
			system.add(
				new Body(new Vec2(dist * system.bounds.b.y, 0), new Vec2(0, 55 * settings.dt), 20)
			);
		}
	};

	const solar_settings = () => {
		settings.renderer_options = {
			preserveDrawingBuffer: true,
			clearBeforeRender: false
		};
		settings.nb_objects = 20;
		settings.shading = false;
		settings.fading = false;
		settings.dt = 0.1;
		settings.bruteforce = true;
		settings.g_constant = 9.2 * 10e-1;
		settings.quad_capacity = 1;
		settings.quad_maxdepth = 10;
		settings.quad_theta = 0.5;
		settings.iterations = 10;
		settings.min_dist = 10e-1;
	};

	const solar_system = () => {
		system.bodies = [];

		const orthogonal = (A, pos, mass) => {
			const G = settings.g_constant;
			const M = A.mass;
			const r = A.pos.clone().minus(pos).length();

			const vel = Math.sqrt((G * M) / r);
			return new Body(pos, new Vec2(0, vel * settings.dt), mass);
		};

		const sun = new Body(new Vec2(0, 0), new Vec2(0, 0), 10e5);
		const earth = orthogonal(sun, new Vec2(0.5 * system.bounds.b.y, 0), 2 * 10e2);
		const moon = orthogonal(earth, new Vec2(50 + 0.5 * system.bounds.b.y, 0), 11);

		system.add(sun);
		system.add(earth);
		system.add(moon);
	};

	const galaxy_settings = () => {
		settings.renderer_options = {
			preserveDrawingBuffer: true,
			clearBeforeRender: false
		};
		settings.nb_objects = 1500;
		settings.shading = true;
		settings.fading_color = 0xf9f9f9;
		settings.fading = true;
		settings.dt = 0.1;
		settings.bruteforce = false;
		settings.g_constant = 1.1 * 10e1;
		settings.quad_capacity = 10;
		settings.quad_maxdepth = 15;
		settings.quad_theta = 1.2;
		settings.iterations = 1;
		settings.min_dist = 10e3;
	};

	const galaxy_system = () => {
		system.bodies = [];
		system.add(new Body(new Vec2(0, 0), new Vec2(0, 0), 10e4));
		for (let i = 0; i < settings.nb_objects - 1; i++) {
			const angle = Random(-Math.PI, Math.PI - 0.01);
			const dist = Random(0.02, 0.5);
			const pos = new Vec2(dist * system.bounds.b.y, 0).rotateAround(angle, new Vec2(0, 0));
			const vel = new Vec2(5 + 0.01 / (0.01 + dist ** 5), 0)
				.rotateAround(angle, new Vec2(0, 0))
				.norm();
			const mass = Math.exp(Random(1, 4));
			system.add(new Body(pos, vel, mass));
		}
	};

	const scenarios = {
		galaxy: {
			settings: galaxy_settings,
			system: galaxy_system
		},
		solar: {
			settings: solar_settings,
			system: solar_system
		},
		orbits: {
			settings: orbits_settings,
			system: orbits_system
		}
	};

	const setup_app = (app, pane) => {
		circles.forEach((c) => c.destroy());
		circles = [];
		radius = [];

		app.stage.removeChildren();
		app.renderer.clear();

		scenarios[settings.scenario].system();

		system.dt = settings.dt;
		system.bruteforce = settings.bruteforce;
		system.g_constant = settings.g_constant;
		system.quad_capacity = settings.quad_capacity;
		system.quad_maxdepth = settings.quad_maxdepth;
		system.quad_theta = settings.quad_theta;
		system.iterations = settings.iterations;
		system.min_dist = settings.min_dist;

		pane.refresh();

		const circles_container = new PIXI.Container();
		const texture = PIXI.Texture.from(imageCircle);
		for (let i = 0; i < system.bodies.length; ++i) {
			const sprite = new PIXI.Sprite(texture);
			sprite.anchor.set(0.5);
			sprite.scale.set(0);
			circles_container.addChild(sprite);
			circles.push(sprite);
			radius.push(0.01 + Math.cbrt(system.bodies[i].mass) * 0.01);
		}

		app.stage.addChild(circles_container);
		const fade = new PIXI.Graphics();
		fade.blendMode = PIXI.BLEND_MODES.MULTIPLY;
		fade.beginFill(settings.fading_color);
		fade.drawRect(0, 0, window.innerWidth, window.innerHeight);
		fade.endFill();
		circles_container.addChild(fade);

		const debug_container = new PIXI.Container();
		debug = new PIXI.Graphics();
		debug_container.addChild(debug);
		app.stage.addChild(debug_container);
	};

	const setup_pane = (app, pane) => {
		pane.title = 'Barnes-hut simulation';

		pane
			.addInput(settings, 'scenario', {
				options: {
					galaxy: 'galaxy',
					solar: 'solar',
					orbits: 'orbits'
				},
				label: 'scenario'
			})
			.on('change', (e) => {
				settings.scenario = e.value;
				scenarios[settings.scenario].settings();
				updates.push(() => setup_app(app, pane));
			});

		let folder_quadtree;
		pane
			.addInput(settings, 'bruteforce', {
				options: {
					bruteforce: true,
					clustering: false
				},
				label: 'method'
			})
			.on('change', (e) => {
				updates.push(() => (system.bruteforce = e.value));
				folder_quadtree.disabled = e.value;
			});

		pane
			.addInput(settings, 'nb_objects', {
				step: 10,
				min: 0,
				max: 3000,
				format: (n) => Math.floor(n),
				label: 'count'
			})
			.on('change', () => {
				updates.push(() => setup_app(app, pane));
			});

		pane
			.addInput(settings, 'dt', {
				min: 0.01,
				max: 1,
				label: 'step'
			})
			.on('change', (e) => {
				updates.push(() => (system.dt = e.value));
			});

		pane
			.addInput(settings, 'iterations', {
				min: 1,
				max: 100,
				format: (v) => Math.floor(v),
				label: 'iteration'
			})
			.on('change', (e) => {
				updates.push(() => (system.iterations = e.value));
			});

		pane
			.addInput(settings, 'g_constant', {
				step: 0.1,
				min: 0.1,
				max: 10e3,
				label: 'G'
			})
			.on('change', (e) => {
				updates.push(() => (system.g_constant = e.value));
			});

		pane.addButton({ title: 'Reset' }).on('click', () => {
			updates.push(() => setup_app(app, pane));
		});

		pane.addButton({ title: 'Pause/Play' }).on('click', () => {
			settings.paused = !settings.paused;
		});

		folder_quadtree = pane.addFolder({ title: 'Quadtree', expanded: false });

		folder_quadtree.disabled = system.bruteforce;

		folder_quadtree
			.addInput(settings, 'quad_capacity', {
				step: 1,
				min: 1,
				max: 100,
				format: (v) => Math.floor(v),
				label: 'capacity'
			})
			.on('change', (e) => {
				updates.push(() => (system.quad_capacity = e.value));
			});

		folder_quadtree
			.addInput(settings, 'quad_maxdepth', {
				step: 1,
				min: 1,
				max: 20,
				format: (v) => Math.floor(v),
				label: 'max depth'
			})
			.on('change', (e) => {
				updates.push(() => (system.quad_maxdepth = e.value));
			});

		folder_quadtree
			.addInput(settings, 'quad_theta', {
				step: 0.1,
				min: 0.0,
				max: 2.0,
				label: 'theta'
			})
			.on('change', (e) => {
				updates.push(() => (system.quad_theta = e.value));
			});

		folder_quadtree.addInput(settings, 'debug', {
			label: 'debug'
		});

		const graphics_folder = pane.addFolder({ title: 'Graphics', expanded: false });

		graphics_folder.addInput(settings, 'shading', {
			label: 'shading'
		});
		graphics_folder.addInput(settings, 'fading', {
			label: 'fading'
		});

		const metrics = pane.addFolder({
			title: 'Metrics',
			expanded: false
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
	};

	const setup = (app, pane) => {
		setup_pane(app, pane);

		scenarios[settings.scenario].settings();

		setup_app(app, pane);

		document.addEventListener('mousemove', (e) => {
			mouse = new Vec2(e.x, e.y);
		});
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

	const draw_debug_quadtree = () => {
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

		/*if (mouse) {
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
		}*/
	};

	const draw_debug = () => {
		if (!settings.bruteforce) {
			draw_debug_quadtree();
		}
	};

	const draw_system = () => {
		const resolution = compute_resolution();
		const origin = compute_origin();

		for (let i = 0; i < system.bodies.length; ++i) {
			circles[i].x = (origin.x + system.bodies[i].pos.x) * resolution;
			circles[i].y = (origin.y + system.bodies[i].pos.y) * resolution;
			circles[i].scale.set(radius[i] * resolution);

			if (settings.shading) {
				const pow = Math.floor(
					system.bodies[i].vel.length_2() * system.dt * 15 + system.bodies[i].mass * 0.5 - 70
				);

				const col = ColorToHex(galaxy_gradient[Math.max(Math.min(pow, 99), 0)]);
				circles[i].tint = col;
			} else {
				circles[i].tint = 0xffffff;
			}
		}
	};

	const draw = (app, pane) => {
		const s_sys = performance.now();

		if (!settings.paused) {
			system.step(settings.dt);
		}

		settings.t_sys = performance.now() - s_sys;

		const s_draw = performance.now();

		if (!settings.fading) {
			app.renderer.clear();
			app.renderer.background.color = 0x000000;
		}

		draw_system();

		debug.clear();
		if (settings.debug) {
			draw_debug();
		}
		settings.t_draw = performance.now() - s_draw;
	};
</script>

<Canvas {setup} {draw} bind:updates bind:settings />
