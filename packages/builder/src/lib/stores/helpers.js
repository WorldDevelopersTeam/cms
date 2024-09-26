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
import Hashes from 'jshashes'
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

	if (grab_assets) {
		page = {
			...await unpromiseData(page),
			content: await mapValuesAsync(page.content, async function(loc_content) {
				return await grabAssets(assets_list, assets_map, _.cloneDeep(loc_content))
			})
		}
		site = {
			...await unpromiseData(site),
			content: await mapValuesAsync(site.content, async function(loc_content) {
				return await grabAssets(assets_list, assets_map, _.cloneDeep(loc_content))
			})
		}
		const new_page_sections = []
		for (let idx in page_sections) {
			new_page_sections[idx] = {
				...page_sections[idx],
				content: await mapValuesAsync(page_sections[idx].content, async function(loc_content) {
					return await grabAssets(assets_list, assets_map, _.cloneDeep(loc_content))
				})
			}
		}
		page_sections = new_page_sections
		const new_page_symbols = []
		for (let idx in page_symbols) {
			new_page_symbols[idx] = {
				...page_symbols[idx],
				content: await mapValuesAsync(page_symbols[idx].content, async function(loc_content) {
					return await grabAssets(assets_list, assets_map, _.cloneDeep(loc_content))
				})
			}
		}
		page_symbols = new_page_symbols
	}

	const component = await Promise.all([
		(async () => {
			const css = await processCSS(site.code.css + page.code.css)
			const data = getPageData({ page, site, loc: locale })
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
				if ('id' in section.content && typeof section.content.id == 'string')
          {
            section_id = section.content.id
          }
				return {
					html: `
          <div class="section" id="${section_id}">
            ${html}
          </div>`,
					js,
					css,
					data
				}
			})
			.filter(Boolean), // remove options blocks
		(async () => {
			const data = getPageData({ page, site, loc: locale })
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
  <html lang="${locale}" xmlns="http://www.w3.org/1999/xhtml" xmlns:b="http://www.google.com/2005/gml/b" xmlns:data="http://www.google.com/2005/gml/data" xmlns:expr="http://www.google.com/2005/gml/expr">
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

export async function unpromiseData(data, objects = []) {
	if (typeof data === 'object' && data !== null && objects.indexOf(data) === -1) {
		objects.push(data)
		if (data instanceof Promise) {
			data = await data
			objects.push(data)
		}
		for (let i in data) {
			data[i] = await unpromiseData(data[i], objects)
			objects.push(data)
		}
	}
	return data
}

export async function hasAsset(data) {
	if (data.hasOwnProperty('url') && data.hasOwnProperty('type')) {
		if (data.type === 'file' || (data.type === 'image' || data.hasOwnProperty('alt'))) {
			return typeof data.url === 'string' && data.url.length > 0 && (data.url.startsWith('http://') || data.url.startsWith('https://'))
		}
	}

	return false
}

export async function grabAssetsInField(assets_list, assets_map, field) {
	if (typeof field === 'object' && field !== null) {
		const urlObject = new URL(field.url)
		const pathname = urlObject.pathname
		if (pathname in assets_map.by_path) {
				return {
					...field,
					url: '/' + assets_map.by_path[pathname]
				}
			}

		const extension = pathname.slice(pathname.lastIndexOf('.'))

		if (extension.length < 2) {
			return field
		}

		try {
			const resp = await fetch(field.url);
			const blob = await resp.blob();

			const hash = (new Hashes.RMD160).hex(await blob.text()) + '.' + blob.size.toString(16)

			if (hash in assets_map.by_hash) {
				return {
					...field,
					url: '/' + assets_map.by_hash[hash]
				}
			}

			let path = ''
			if (typeof field.path == 'string' && field.path != '')
			{
				path = field.path
			} else {
				path = '_assets/' + hash + extension
			}

			assets_list.push({
				path,
				blob
			});
			assets_map.by_path[pathname] = path
			assets_map.by_hash[hash] = path

			return {
				...field,
				url: '/' + path
			}
		} catch (e) {
			console.error('Error while fetching asset', e.message);
		}
	}
	return field
}

export async function grabAssets(assets_list, assets_map, data, objects = []) {
	if (typeof data === 'object' && data !== null && objects.indexOf(data) === -1) {
		objects.push(data)
		let new_data;
		if (await hasAsset(data)) {
			new_data = await grabAssetsInField(assets_list, assets_map, data)
		} else if (Array.isArray(data)) {
			new_data = []
			for (let idx in data) {
				new_data[idx] = await grabAssets(assets_list, assets_map, data[idx], objects)
			}
		} else {
			new_data = await mapValuesAsync(data, async function (field) {
				return await grabAssets(assets_list, assets_map, field, objects)
			})
		}
		if (new_data !== data)
		{
			objects.push(new_data)
			data = new_data
		}
	}
	return data
}