import { get } from 'svelte/store'
import pages from '$lib/stores/data/pages'
import symbols from '$lib/stores/data/symbols'
import { dataChanged } from '$lib/database.js'
import { deploy } from '$lib/deploy'
import { buildStaticPage } from '$lib/stores/helpers'
import { processCode } from '$lib/utils'
import { createUniqueID } from '$lib/utilities'
import { toBase64 } from '@jsonjoy.com/base64'
import _ from 'lodash-es'
import { page } from '$app/stores'
import { site, content } from '$lib/stores/data/site'

/**
 * @param {{
 * 	repo_name: string,
 * 	provider: 'github' | 'gitlab'
 * }} params
 * @param {boolean} create_new
 * @returns {Promise<import('$lib/deploy.js').DeploymentResponse>}
 */
export async function push_site({repo_name, provider}, create_new = false, include_assets = get(site.include_assets), primary_language = get(site.primary_language)) {
	const site_bundle = await build_site_bundle({
		pages: get(pages),
		symbols: get(symbols),
		include_assets,
		primary_language
	})
	if (!site_bundle) {
		return null
	}
	const files = await Promise.all(site_bundle.map(async (file) => {
		let file_data = null
		if (file.blob) {
			file_data = toBase64(new Uint8Array(await file.blob.arrayBuffer()))
		} else {
			file_data = file.content
		}
		return {
			binary: file.blob ? true : false,
			file: file.path,
			data: file_data,
			size: (new Blob([file_data], { type: 'text/plain' }).size) / 1024
		}
	}))
	return await deploy({ files, site_id: get(site).id, repo_name, provider }, create_new)
}

export async function build_site_bundle({ pages, symbols, include_assets = get(site.include_assets), primary_language = get(site.primary_language)}) {
	let site_bundle
	let assets = []

	try {
		const page_files = await Promise.all(
			pages.map((page) => {
				return Promise.all(
					Object.keys(get(content)).map((language) => {
						return build_page_tree(page, language)
					})
				)
			})
		)

		const symbol_files = await Promise.all(
			symbols.filter((s) => s.code.js).map((symbol) => build_symbol_tree(symbol))
		)
		site_bundle = build_site_tree([...symbol_files, ...page_files.flat(), ...assets])
	} catch (e) {
		alert(e.message)
	}

	return site_bundle

	async function build_symbol_tree(symbol) {
		const res = await processCode({
			component: {
				html: symbol.code.html,
				css: symbol.code.css,
				js: symbol.code.js,
				data: symbol.content[primary_language]
			}
		})
		if (res.error) {
			throw Error('Error processing symbol ' + symbol.name)
		}
		const date = new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}).format(new Date())
		return {
			path: '_symbols/' + symbol.id + '.js',
			content: res.js
		}
	}

	async function make_default_page(html, base, languages, path) {
		path = path !== 'index' ? (path + '/') : ''
		html = html.replace(/\<\s*meta\s+charset.+?\>/gim, function(match) {
			var addins = "";
			for (var lang of languages)
			{
				addins = addins + `<link rel="canonical" href="https://${base}/${lang}/${path}">`
			}
			return match + addins
		})
		html = html.replace(/\<\s*body(\s*id="[^"]*")?>.+?\<\s*\/\s*body>/gim, '')
		html = html.replace(/\<\s*script.+?\<\s*\/\s*script>/gim, '')
		html = html.replace(/\<\s*style.+?\<\s*\/\s*style>/gim, '')
		html = html.replace(/\<\s*\/\s*head>/gim, function(match) {
			match = `<script type="text/javascript">!function(){var e,t=document.documentElement.lang,n=(e=document.cookie.match(RegExp("(?:^|; )"+"__wdt_userLocale".replace(/([\\.$?*|{}\\(\\)\\[\\]\\\\\\/\\+^])/g,"\\\\$1")+"=([^;]*)")))?decodeURIComponent(e[1]):void 0;if("string"!=typeof n&&(n="object"==typeof navigator&&("string"==typeof navigator.language&&"ru"===navigator.language.substring(0,2)||"object"==typeof navigator.languages&&"function"==typeof navigator.languages.find&&navigator.languages.find(function(e){return"string"==typeof e&&"ru"===e.substring(0,2)}))?"ru":"en"),"string"==typeof n){!function(e,t,n){var o=(n=n||{}).expires;if("number"==typeof o&&o){var a=new Date;a.setTime(a.getTime()+1e3*o),o=n.expires=a}o&&o.toUTCString&&(n.expires=o.toUTCString());var r=e+"="+(t=encodeURIComponent(t));for(var i in n){r+="; "+i;var c=n[i];!0!==c&&(r+="="+c)}document.cookie=r}("__wdt_userLocale",n,{expires:2592e3,secure:!0});var o="/"+n+window.location.pathname+window.location.search+window.location.hash;n!==t?window.location.replace(window.location.origin+o):"object"==typeof history&&"function"==typeof history.replaceState&&history.replaceState(null,null,o)}}();</script>` + match
			return match
		})
		return html
	}

	async function make_localized_page(html, base, languages, path, language) {
		path = path !== 'index' ? (path + '/') : ''
		html = html.replace(/\<\s*meta\s+charset.+?\>/gim, function(match) {
			var addins = ''
			if (languages.length > 0)
			{
				for (var lang of languages)
				{
					if (lang !== language)
					{
						addins = addins + `<link rel="alternate" href="https://${base}/${lang}/${path}" hreflang="${lang}">`
					}
				}
				addins = `<link rel="alternate" href="https://${base}/${languages[0]}/${path}" hreflang="x-default">` + addins
				addins = `<link rel="canonical" href="https://${base}/${language}/${path}">` + addins
			}
			else
			{
				addins = `<link rel="canonical" href="https://${base}/${path}">` + addins
			}
			return match + addins
		})
		return html
	}

	async function build_page_tree(page, language) {
		const current_site = get(site)
		const site_languages = Object.keys(current_site.content).sort().sort(function(x, y) {
			return x == primary_language ? -1 : 0
		})
		const is_multilang = site_languages.length > 1
		const is_primary = language === primary_language
		const sections = await dataChanged({
			table: 'sections',
			action: 'select',
			match: { page: page.id },
			order: ['index', { ascending: true }]
		})

		// Download assets & replace urls in sections
		if (include_assets && has_nested_property(sections, 'alt')) {
			await Promise.all(
				sections.map(async (section, i) => {
					const response = await swap_in_local_asset_urls(section.content)
					assets.push(...response.assets) // store image blobs for later download
					sections[i]['content'] = response.content // replace image urls in content with relative urls
				})
			)
		}

		let { html } = await buildStaticPage({
			page,
			page_sections: sections,
			page_symbols: symbols.filter((symbol) =>
				sections.find((section) => section.symbol === symbol.id)
			),
			locale: language
		})

		let parent_urls = []
		const parent = pages.find((p) => p.id === page.parent)

		if (parent) {
			let no_more_parents = false
			let grandparent = parent
			parent_urls.push(parent.url)
			while (!no_more_parents) {
				grandparent = pages.find((p) => p.id === grandparent.parent)
				if (!grandparent) {
					no_more_parents = true
				} else {
					parent_urls.unshift(grandparent.url)
				}
			}
		}

		let path
		let full_url = page.url
		if (page.url === 'index' || page.url === '404') {
			path = `${page.url}.html`
		} else if (parent) {
			path = `${parent_urls.join('/')}/${page.url}/index.html`
			full_url = `${parent_urls.join('/')}/${page.url}`
		} else {
			path = `${page.url}/index.html`
		}

		const page_tree = []

		// handle special pages
		if (page.url === '404') {
			if (is_primary) {
				page_tree.push({
					path,
					content: html
				})
			}
			return page_tree
		}

		// create default page
		if (is_multilang && is_primary) {
			page_tree.push({
				path,
				content: await make_default_page(html, current_site.url, site_languages, full_url)
			})
		}

		// add page
		if (is_multilang) {
			page_tree.push({
				path: `${language}/${path}`,
				content: await make_localized_page(html, current_site.url, site_languages, full_url, language)
			})
		} else {
			page_tree.push({
				path,
				content: await make_localized_page(html, current_site.url, [], full_url, '')
			})
		}

		return page_tree
	}

	async function build_site_tree(pages) {
		const site = get(page).data.site
		return [
			..._.flattenDeep(pages),
			{
				path: 'robots.txt',
				content: `User-agent: *`
			},
			{
				path: 'CNAME',
				content: site.url
			},
			{
				path: '.nojekyll',
				content: ''
			}
		]
	}
}

async function swap_in_local_asset_urls(obj) {
	let files_list = []
	let files_map = {}

	const updated_content = _.mapValues(obj, (lang_content) => {
		return process_fields_for_swap_asset(files_list, files_map, lang_content)
	})

	const assets = []
	await Promise.all(
		files_list.map(async ({ url, filename }) => {
			try {
				const response = await fetch(url);
				const blob = await response.blob();

				assets.push({
					path: `_assets/${filename}`,
					blob
				});
			} catch (e) {
				console.log(e.message);
			}
		})
	)

	return {
		content: updated_content,
		assets
	}
}

function process_fields_for_swap_asset(files_list, files_map, obj) {
	let processed_fields = _.mapValues(obj, (val) => {

		function swap_asset(field_value) {
			const urlObject = new URL(field_value.url)
			const pathname = urlObject.pathname
			if (pathname in files_map) {
				return {
					...field_value,
					url: `/_assets/${files_map[pathname]}`
				}
			}
			const extension = pathname.slice(pathname.lastIndexOf('.'))
			const filename = createUniqueID(20) + extension

			files_list.push({
				url: field_value.url,
				filename
			})
			files_map[pathname] = filename
			return {
				...field_value,
				url: `/_assets/${filename}`
			}
		}

		if (typeof val === 'object') {
			if (val.hasOwnProperty('alt') && val.url != "") {
				return swap_asset(val)
			} else if (Array.isArray(val)) {
				let field_value_copy = [];
				_.each(val, (value) => {
					if (typeof value === 'object' && value.hasOwnProperty('image') && typeof value.image === 'object') {
						let img = value.image;
						if (img.url != "" && img.url.indexOf("data:image") == -1) {
							field_value_copy.push({
								...value,
								image: swap_asset(img)
							});
						}
					} else {
						field_value_copy.push(value)
					}
				});
				return field_value_copy
			} else {
				return process_fields_for_swap_asset(files_list, files_map, val)
			}
		} else {
			return val
		}
	})
	return processed_fields
}

function has_nested_property(obj, key) {
	if (obj.hasOwnProperty(key)) {
		return true
	}
	for (let i in obj) {
		if (typeof obj[i] === 'object') {
			if (has_nested_property(obj[i], key)) {
				return true
			}
		}
	}
	return false
}