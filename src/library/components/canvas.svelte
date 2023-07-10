<script>
	import Imports from '$components/imports.svelte';

	export let setup = (app, pane) => {};
	export let draw = (app, pane) => {};

	let app = undefined;
	let pane = undefined;
	let canvas = undefined;

	const imports = [
		'https://cdn.jsdelivr.net/npm/tweakpane@3.1.10/dist/tweakpane.min.js',
		'https://pixijs.download/v7.2.4/pixi.min.js'
	];

	const mounted = () => {
		app = new PIXI.Application({ resizeTo: window });
		pane = new Tweakpane.Pane({ title: 'default' });
		canvas = document.body.appendChild(app.view);
		canvas.setAttribute('id', 'canvas');

		setup(app, pane);
		app.ticker.add(() => {
			draw(app, pane);
		});
	};

	const destroyed = () => {
		canvas?.remove();
		pane?.dispose();
	};
</script>

<Imports {imports} {mounted} {destroyed} />
