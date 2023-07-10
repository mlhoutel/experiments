<script>
	import { onMount, onDestroy } from 'svelte';

	export let imports = [];
	export let mounted = () => {};
	export let destroyed = () => {};

	const scripts = [];

	const loadScript = (src) => {
		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = src;
			script.onload = resolve;
			script.onerror = reject;
			document.head.appendChild(script);
			scripts.push(script);
		});
	};

	onMount(async () => {
		await Promise.all(imports.map((src) => loadScript(src)));
		mounted();
	});

	onDestroy(() => {
		scripts.map((script) => script?.remove());
		destroyed();
	});
</script>
