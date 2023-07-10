<script>
	import { base } from '$app/paths';

	const pages = import.meta.glob('./*/*.svelte');
	const links = [...Object.values(pages)].map((link) => {
		return link.name.replace('.svelte', '').replace('./', '/').replace('/+page', '');
	});
</script>

{#each links as link}
	<div>
		<a href="{base}{link}">{link}</a>
	</div>
{/each}
