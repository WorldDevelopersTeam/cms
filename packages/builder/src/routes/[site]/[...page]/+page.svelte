<script>
	import { WdtPage } from '$lib/index.js'

	export let data
</script>

<WdtPage
	page={{
		...data.page,
		sections: data.sections
	}}
/>
