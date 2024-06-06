<script>
	import WdtPage from '$lib/views/editor/Page.svelte'

	export let data
</script>

<WdtPage
	page={{
		...data.page,
		sections: data.sections
	}}
/>
