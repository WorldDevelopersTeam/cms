<script>
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  import { Spinner } from '../misc'

  export let variants = ''
  export let type = 'button'
  export let disabled = false
  export let loading = false
</script>

<button
  class={variants}
  class:disabled={disabled || loading}
  disabled={disabled || loading}
  on:click={(e) => dispatch('click', e)}
  {type}
>
  {#if loading}
    <Spinner />
  {:else}
    <slot />
  {/if}
</button>

<style lang="postcss">
  button {
    background: var(--wdt-color-brand);
    color: var(--wdt-color-black);
    padding: 0.5rem 1rem;
    border-radius: var(--wdt-border-radius);
    font-weight: 600;
    transition: background 0.1s, color 0.1s;

    &:hover {
      background: var(--wdt-color-brand-dark);
      color: var(--wdt-color-white);
    }

    &.disabled {
      background: var(--color-gray-6);
      color: var(--color-gray-9);
    }
  }
</style>
