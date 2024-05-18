<script>
	import { loadingSite } from '../../stores/app/misc'
	import Spinner from '../../components/misc/Spinner.svelte'
	import WdtLogo from '../svg/WdtLogo.svelte'
</script>

<a class="wdt-button" aria-label="See all sites" href="/" data-sveltekit-reload>
	{#if $loadingSite}
		<Spinner />
	{:else}
		<WdtLogo />
	{/if}
</a>

<style lang="postcss">
	.wdt-button {
		aspect-ratio: 1;
		padding: 0.5rem;
		border-radius: var(--wdt-border-radius);
		display: block;
		height: 100%;
		background: var(--wdt-color-codeblack);
		transition: background 0.1s, box-shadow 0.1s;
		width: 2.5rem;
		background-size: 2rem;
		background-repeat: no-repeat;
		background-position: center;
		outline: 0;
		display: flex;
		justify-content: center;
		align-items: center;

		&:hover {
			box-shadow: var(--wdt-ring-wdtgreen);
		}

		&:focus {
			box-shadow: var(--wdt-ring-wdtgreen-thin);
		}

		&:active {
			background: var(--color-gray-8);
		}
	}
</style>
