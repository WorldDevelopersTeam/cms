<script>
	import Wdt from '$lib/Wdt.svelte'

	export let data
</script>

<Wdt {data}>
	<slot />
</Wdt>
