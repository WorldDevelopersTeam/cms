import { find as _find, chain as _chain, flattenDeep as _flattenDeep } from 'lodash-es'
import _ from 'lodash-es'
import { get } from 'svelte/store'
import { processors } from '../component.js'
import { site as activeSite, primary_language } from './data/site.js'
import sections from './data/sections.js'
import symbols from './data/symbols.js'
import pages from './data/pages.js'
import activePage from './app/activePage.js'
import { mapValuesAsync } from '../utilities.js'
import RMD160 from 'jshashes'
import { locale } from './app/misc.js'
import { processCSS, getEmptyValue } from '../utils.js'

export function getSymbolUseInfo(symbolID) {
	const info = { pages: [], frequency: 0 }
	get(pages).forEach((page) => {
		// TODO: fix this
		// page.sections.forEach(section => {
		//   if (section.symbolID === symbolID) {
		//     info.frequency++
		//     if (!info.pages.includes(page.id)) info.pages.push(page.name)
		//   }
		// })
	})
	return info
}

export function getSymbol(symbolID) {
	return _find(get(symbols), ['id', symbolID])
}

/**
 * @param {{
 *  page?: import('$lib').Page
 *  site?: import('$lib').Site
 *  page_sections?: import('$lib').Section[]
 *  page_symbols?: import('$lib').Symbol[]
 *  locale?: string
 *  no_js?: boolean
 * }} details
 * @returns {Promise<{ html: string, js: string}>}
 * */
export async function buildStaticPage({
	page = get(activePage),
	site = get(activeSite),
	page_sections = get(sections),
	page_symbols = get(symbols),
	locale = get(primary_language),
	no_js = false,
	grab_assets = false,
	assets_list = [],
	assets_map = { by_path: {}, by_hash: {} }
}) {
	const hydratable_symbols_on_page = page_symbols.filter(
		(s) => s.code.js && page_sections.some((section) => section.symbol === s.id)
	)

	const component = await Promise.all([
		(async () => {
			const css = await processCSS(site.code.css + page.code.css)
			const data = grab_assets ? (await grabAssetsAndGetPageData({ page, site, assets_list, assets_map, loc: locale })) : getPageData({ page, site, loc: locale })
			const locales = Object.keys(site.content).sort()
			return {
				html: `
          <svelte:head>
            ${site.code.html.head}
            ${page.code.html.head}
            <style>${css}</style>
          </svelte:head>`,
				css: ``,
				js: ``,
				data
			}
		})(),
		...page_sections
			.map(async (section) => {
				const symbol = page_symbols.find((symbol) => symbol.id === section.symbol)
				const { html, css: postcss, js } = symbol.code
				const data = get_content_with_static({
					component: section,
					symbol,
					loc: locale
				})
				const { css, error } = await processors.css(postcss || '')
				const section_id = section.id.split('-')[0]
				return {
					html: `
          <div class="section" id="section-${section_id}">
            ${html}
          </div>`,
					js,
					css,
					data
				}
			})
			.filter(Boolean), // remove options blocks
		(async () => {
			const data = grab_assets ? (await grabAssetsAndGetPageData({ page, site, assets_list, assets_map, loc: locale })) : getPageData({ page, site, loc: locale })
			return {
				html: site.code.html.below + page.code.html.below,
				css: ``,
				js: ``,
				data
			}
		})()
	])

	const res = await processors.html({
		component,
		locale
	})

	const final = `\
  <!DOCTYPE html>
  <html lang="${locale}">
    <head>
      ${res.head}
      <style>${res.css}</style>
    </head>
    <body id="page">
    	<div id="canvas">
      	${res.html}
      	${no_js ? `` : `<script type="module">${fetch_modules(hydratable_symbols_on_page)}</script>`}
      </div>
    </body>
  </html>
  `

	return {
		html: final,
		js: res.js,
		assets: assets_list
	}

	// fetch module to hydrate component, include hydration data
	function fetch_modules(symbols) {
		return symbols
			.map(
				(symbol) => `
      import('/_symbols/${symbol.id}.js')
      .then(({default:App}) => {
        ${page_sections
					.filter((section) => section.symbol === symbol.id)
					.map((section) => {
						const section_id = section.id.split('-')[0]
						const instance_content = get_content_with_static({
							component: section,
							symbol,
							loc: locale
						})
						return `
            new App({
              target: document.querySelector('#section-${section_id}'),
              hydrate: true,
              props: ${JSON.stringify(instance_content)}
            })
          `
					})
					.join('\n')}
      })
      .catch(e => console.error(e))
    	`
			)
			.join('\n')
	}
}

// Include static content alongside the component's content
/**
 * @param {{
 *  component?: import('$lib').Section
 *  symbol?: import('$lib').Symbol
 *  loc?: string
 * }} details
 * @returns {import('$lib').Content}
 * */
export function get_content_with_static({ component, symbol, loc }) {
	if (!symbol) return { [primary_language]: {} }
	const content = _chain(symbol.fields)
		.map((field) => {
			const field_value = field.is_language_independent
					? (component.content?.[get(primary_language)]?.[field.key] || component.content?.[loc]?.[field.key])
					: component.content?.[loc]?.[field.key]
			const default_value = (field.is_language_independent
					? (symbol.content?.[get(primary_language)]?.[field.key] || symbol.content?.[loc]?.[field.key]) 
					: symbol.content?.[loc]?.[field.key]) || getEmptyValue(field)
			return {
				key: field.key,
				value: (field.is_static || field_value === undefined) ? default_value : field_value
			}
		})
		.keyBy('key')
		.mapValues('value')
		.value()

	return _.cloneDeep(content)
}

export function getPageData({ page = get(activePage), site = get(activeSite), loc = get(locale) }) {
	const page_content = page.content[loc]
	const site_content = site.content[loc]
	return {
		...site_content,
		...page_content
	}
}

export async function grabAssetsAndGetPageData({ page = get(activePage), site = get(activeSite), loc = get(locale), assets_list = [], assets_map = { by_path: {}, by_hash: {} } }) {
	const page_content = hasNestedAssets(page.content[loc]) ? (await grabAssets(assets_list, assets_map, page.content, loc)) : page.content[loc]
	const site_content = hasNestedAssets(site.content[loc]) ? (await grabAssets(assets_list, assets_map, site.content, loc)) : site.content[loc]
	return {
		...site_content,
		...page_content
	}
}

export async function isAssetField(obj) {
	if (obj instanceof Promise) {
		obj = await obj
	}
	if (typeof obj === 'object' && obj !== null && obj.hasOwnProperty('url') && obj.hasOwnProperty('type')) {
		console.warn("isAssetField", obj, obj.type === 'file' || obj.type === 'image')
		return obj.type === 'file' || obj.type === 'image'
	}
	return false
}

export async function hasNestedAssets(obj) {
	if (await isAssetField(obj)) {
		console.warn("hasNestedAssets", obj, true)
		return true
	}
	for (let i in obj) {
		if (typeof obj[i] === 'object') {
			if (hasNestedAssets(obj[i])) {
				console.warn("hasNestedAssets", obj, true)
				return true
			}
		}
	}
	console.warn("hasNestedAssets", obj, false)
	return false
}

export async function grabAsset(assets_list, assets_map, field) {
	console.warn("grabAsset", field)
	const urlObject = new URL(field.url)
	const pathname = urlObject.pathname
	const extension = pathname.slice(pathname.lastIndexOf('.'))

	if (extension.length > 1) {
		if (pathname in assets_map.by_path) {
			return {
				...field,
				url: `/_assets/${assets_map.by_path[pathname]}`
			}
		}

		try {
			const response = await fetch(field.url);
			const blob = await response.blob();

			const blob_str = await blob.text()

			const hash = (new RMD160).hex(blob_str) + '.' + blob.size.toString(16)

			if (hash in assets_map.by_hash) {
				return {
					...field,
					url: `/_assets/${assets_map.by_hash[hash]}`
				}
			}

			const filename = hash + extension

			assets_list.push({
				path: `_assets/${filename}`,
				blob
			});
			assets_map.by_path[pathname] = filename
			assets_map.by_hash[hash] = filename

			return {
				...field,
				url: `/_assets/${filename}`
			}
		} catch (e) {
			console.error('Error while fetching asset', e.message);
		}
	}

	return field
}

export async function grabAssetsFromField(assets_list, assets_map, field) {
	console.warn("grabAssetsFromField", field)
	if (typeof field !== 'object' || field === null) {
		return field
	}

	if (Array.isArray(field)) {
		for (let idx in field) {
			field[idx] = grabAssetsFromField(assets_list, assets_map, field[idx])
		}
	}

	if (await isAssetField(field)) {
		return await grabAsset(assets_list, assets_map, field)
	}

	return await grabAssetsFromFields(assets_list, assets_map, field)
}

export async function grabAssetsFromFields(assets_list, assets_map, obj) {
	console.warn("grabAssetsFromFields", obj)
	let new_fields = await mapValuesAsync(obj, async function (field) {
		return await grabAssetsFromField(assets_list, assets_map, field)
	})
	return new_fields
}

export async function grabAssets(assets_list, assets_map, obj, lang) {
	console.warn("grabAssets", obj, lang)
	if (!lang) {
		return await mapValuesAsync(obj, async function (lang_content) {
			return await grabAssetsFromFields(assets_list, assets_map, lang_content)
		})
	} else {
		return await grabAssetsFromFields(assets_list, assets_map, obj[lang])
	}
}