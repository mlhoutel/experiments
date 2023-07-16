<script>
	import Imports from '$components/imports.svelte';

	export let setup = (app, pane) => {};
	export let draw = (app, pane) => {};
	export let settings = {};
	export let updates = [];

	let app = undefined;
	let pane = undefined;
	let canvas = undefined;

	const imports = [
		'https://cdn.jsdelivr.net/npm/tweakpane@3.1.10/dist/tweakpane.min.js',
		'https://pixijs.download/v7.2.4/pixi.min.js'
	];

	const mounted = () => {
		app = new PIXI.Application({
			resizeTo: window,
			antialias: true,
			...(settings?.renderer_options || [])
		});
		app.ticker.maxFPS = 60;
		pane = new Tweakpane.Pane({ title: 'default' });
		canvas = document.body.appendChild(app.view);
		canvas.setAttribute('id', 'canvas');

		settings.start = performance.now();
		settings.time = 0;
		settings.fps = 0;

		setup(app, pane);

		const advanced = pane.addFolder({
			title: 'Advanced'
		});

		advanced.addMonitor(settings, 'fps', {
			view: 'graph',
			bufferSize: 60,
			min: 0,
			max: 100
		});

		app.ticker.add((dt) => {
			draw(app, pane);

			settings.time = performance.now() - settings.start;
			settings.fps = app.ticker.FPS;

			updates.map((f) => f()); // apply changes after calculations
			updates = []; // clear update stack
		});
	};

	const destroyed = () => {
		canvas?.remove();
		pane?.dispose();
	};
</script>

<Imports {imports} {mounted} {destroyed} />
