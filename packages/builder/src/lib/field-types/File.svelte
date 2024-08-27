<script>
	import Icon from '@iconify/svelte'
	import { createEventDispatcher } from 'svelte'
	import TextInput from '$lib/ui/TextInput.svelte'
	import Spinner from '$lib/ui/Spinner.svelte'
	import site from '$lib/stores/data/site'
	import { storageChanged } from '$lib/database'
	import { v4 as uuidv4 } from 'uuid';

	const dispatch = createEventDispatcher()

	const defaultValue = {
		type: 'file',
		url: '',
		path: ''
	}

	export let field = {
		value: defaultValue,
		options: {
			size: null,
			type: null
		}
	}

	if (typeof field.value === 'string' || !field.value) {
		field.value = defaultValue
	}

	function set_url(url) {
		field.value = {
			...defaultValue,
			url
		}
	}

	function set_path(path) {
		field.value = {
			...defaultValue,
			path
		}
	}

	function set_options(options) {
		field.options = {
			...field.options,
			...options
		}
	}

	async function uploadFile(file) {
		loading = true

		const key = `${$site.id}/${uuidv4() + file.name.slice(file.name.lastIndexOf("."))}`
		const url = await storageChanged({
			bucket: 'files',
			action: 'upload',
			key,
			file
		})

		if (url) {
			filePreview = url
			set_url(url)
			set_options({
				original_type: field.options.original_type || file.type,
				type: file.type,
				size: Math.round(file.size / 1000)
			})
			dispatch('input', field)
		}
		loading = false
	}

	let filePreview = field.value.url || ''
	let loading = false
</script>

<div class="file-field">
	<span class="field-label">{field.label}</span>
	<div class="file-info">
		<div class="file-preview">
			{#if loading}
				<div class="spinner-container">
					<Spinner />
				</div>
			{:else}
				{#if field.options.size}
					<span class="field-size">
						{field.options.size}KB
					</span>
				{/if}
				<label class="file-upload">
					<Icon icon="uil:file-upload" />
					{#if !field.value.url}
						<span>Upload</span>
					{/if}
					<input
						on:change={({ target }) => {
							const { files } = target
							if (files.length > 0) {
								const file = files[0]
								uploadFile(file)
							}
						}}
						type="file"
						accept="file/*"
					/>
				</label>
			{/if}
		</div>
		<div class="inputs">
			<TextInput
				value={field.value.url}
				label="URL"
				on:input={({ detail: value }) => {
					filePreview = value
					set_url(value)
					dispatch('input', field)
				}}
			/>
			<TextInput
				value={field.value.path}
				label="Path"
				on:input={({ detail: value }) => {
					set_path(value)
				}}
			/>
		</div>
	</div>
</div>
<slot />

<style lang="postcss">
	* {
		--TextInput-label-font-size: 0.75rem;
	}
	.file-field {
		display: grid;
		gap: 0.5rem;
	}
	.field-label {
		font-weight: 600;
		display: inline-block;
		font-size: var(--label-font-size, 1rem);
	}
	.file-info {
		display: flex;
		gap: 0.75rem;
		overflow: hidden;
		align-items: flex-start;
		/* border: 1px solid var(--wdt-color-brand); */
		/* padding: 0.5rem; */

		.spinner-container {
			background: var(--wdt-color-brand);
			height: 100%;
			width: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 3rem;
		}
	}
	input {
		background: var(--color-gray-8);
	}
	.file-preview {
		border: 1px dashed #3e4041;
		border-radius: 4px;
		aspect-ratio: 1;
		height: 100%;
		width: 13rem;
		position: relative;

		.file-upload {
			flex: 1 1 0%;
			padding: 1rem;
			cursor: pointer;
			position: relative;
			width: 100%;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			color: var(--color-gray-2);
			background: var(--color-gray-9);
			font-weight: 600;
			text-align: center;
			position: absolute;
			inset: 0;
			opacity: 0.5;
			transition: opacity, background;
			transition-duration: 0.1s;

			&:hover {
				opacity: 0.95;
				background: var(--wdt-color-brand);
			}

			span {
				margin-top: 0.25rem;
			}

			input {
				visibility: hidden;
				border: 0;
				width: 0;
				position: absolute;
			}
		}

		.field-size {
			background: var(--color-gray-8);
			color: var(--color-gray-3);
			position: absolute;
			top: 0;
			left: 0;
			z-index: 1;
			padding: 0.25rem 0.5rem;
			font-size: var(--font-size-1);
			font-weight: 600;
			border-bottom-right-radius: 0.25rem;
		}
	}

	.inputs {
		display: grid;
		row-gap: 6px;
		width: 100%;
		--TextInput-font-size: 0.75rem;
	}

	.file-type-buttons {
		margin-top: 3px;
		font-size: 0.75rem;
		display: flex;
		border-radius: var(--wdt-border-radius);
		border: 1px solid var(--color-gray-8);
		justify-self: flex-start;

		button {
			padding: 2px 6px;

			&.active {
				cursor: unset;
				color: var(--wdt-color-brand);
			}

			&:last-child {
				border-left: 1px solid var(--color-gray-8);
			}
		}
	}
</style>
