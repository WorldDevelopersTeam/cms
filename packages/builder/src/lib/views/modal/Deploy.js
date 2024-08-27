import { get } from 'svelte/store'
import pages from '$lib/stores/data/pages'
import symbols from '$lib/stores/data/symbols'
import { dataChanged } from '$lib/database.js'
import { deploy } from '$lib/deploy'
import { buildStaticPage } from '$lib/stores/helpers'
import { processCode } from '$lib/utils'
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
	let assets_list = []
	let assets_map = {
		by_path: {},
		by_hash: {}
	}

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
		site_bundle = build_site_tree([...symbol_files, ...page_files.flat(), ...assets_list])
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

	async function sanitize_page_code(site, page, html, base, languages, path, curr_lang, is_redirect) {
		let rel_path = path !== 'index' ? (path + '/') : ''

		let common_tags = ''
		common_tags = common_tags + `<meta charset="utf-8">`
		common_tags = common_tags + `<meta http-equiv="X-UA-Compatible" content="IE=edge">`
		common_tags = common_tags + `<meta name="viewport" content="width=device-width, initial-scale=1.0"> `
		common_tags = common_tags + `<meta name="url" content="https://${base}/${curr_lang}/${rel_path}">`
		html = html.replace('<!--[wdt:tags:common]-->', common_tags)

		let links_tags = ''
		if (!is_redirect) {
			if (languages.length > 0)
			{
				for (var lang of languages)
				{
					if (lang !== curr_lang)
					{
						links_tags = links_tags + `<link rel="alternate" href="https://${base}/${lang}/${rel_path}" hreflang="${lang}">`
					}
				}
				links_tags = `<link rel="alternate" href="https://${base}/${curr_lang}/${rel_path}" hreflang="x-default">` + links_tags
				links_tags = `<link rel="canonical" href="https://${base}/${curr_lang}/${rel_path}">` + links_tags
			}
			else
			{
				links_tags = `<link rel="canonical" href="https://${base}/${rel_path}">` + links_tags
			}
		} else {
			for (var lang of languages)
			{
				links_tags = links_tags + `<link rel="canonical" href="https://${base}/${lang}/${path}">`
			}
		}
		html = html.replace('<!--[wdt:tags:links]-->', links_tags)

		let seo_tags = ''
		let page_title = ''
		if ('site_name' in site.content[curr_lang]) {
			if ('title' in page.content[curr_lang] && typeof page.content[curr_lang] == 'string' && page.content[curr_lang].length > 0) {
				page_title = page.content[curr_lang]['title'] + ' · ' + site.content[curr_lang]['site_name']
			} else {
				page_title = site.content[curr_lang]['site_name']
			}
		} else {
			page_title = 'An unnamed page'
		}
		seo_tags = seo_tags + `<title>${page_title}</title>`
		if ('description' in page.content[curr_lang]) {
			seo_tags = seo_tags + `<meta name="description" content="${page.content[curr_lang]['description']}">`
		}
		if ('keywords' in page.content[curr_lang]) {
			seo_tags = seo_tags + `<meta name="keywords" content="${page.content[curr_lang]['keywords']}">`
		}
		if ('page_name' in page.content[curr_lang]) {
			seo_tags = seo_tags + `<meta name="page_name" content="${page.content[curr_lang]['page_name']}">`
		}
		if ('copyright' in page.content[curr_lang]) {
			seo_tags = seo_tags + `<meta name="copyright" content="${page.content[curr_lang]['copyright']}">`
		}
		html = html.replace('<!--[wdt:tags:seo]-->', seo_tags)

		let og_tags = ''
		og_tags = og_tags + `<meta property="og:type" content="website">`
		og_tags = og_tags + `<meta property="og:url" content="https://${base}/${curr_lang}/${rel_path}">`
		og_tags = og_tags + `<meta property="og:locale" content="${curr_lang}">`
		for (var lang of languages)
		{
			if (lang !== curr_lang)
			{
				og_tags = og_tags + `<meta property="og:locale:alternate" content="${lang}">`
			}
		}

		if ('site_name' in site.content[curr_lang]) {
			og_tags = og_tags + `<meta property="og:site_name" content="${site.content[curr_lang]['site_name']}">`
		}
		og_tags = og_tags + `<meta property="og:title" content="${page_title}">`
		if ('description' in page.content[curr_lang]) {
			og_tags = og_tags + `<meta property="og:description" content="${page.content[curr_lang]['description']}">`
		}
		html = html.replace('<!--[wdt:tags:opengraph]-->', og_tags)

		if (is_redirect) {
			html = html.replaceAll(/\<\s*body[^\>]*?>[\s\S]*?\<\s*\/\s*body>/gim, '')
			html = html.replaceAll(/\<\s*script[^\>]*?\<\s*\/\s*script>/gim, '')
			html = html.replaceAll(/\<\s*style[^\>]*?\<\s*\/\s*style>/gim, '')
			html = html.replace(/\<\s*\/\s*head[^\>]*?>/gim, function(match) {
				return `<script type="text/javascript">!function(){var e,t=document.documentElement.lang,n=(e=document.cookie.match(RegExp("(?:^|; )"+"__wdt_userLocale".replace(/([\\.$?*|{}\\(\\)\\[\\]\\\\\\/\\+^])/g,"\\\\$1")+"=([^;]*)")))?decodeURIComponent(e[1]):void 0;if("string"!=typeof n&&(n="object"==typeof navigator&&("string"==typeof navigator.language&&"ru"===navigator.language.substring(0,2)||"object"==typeof navigator.languages&&"function"==typeof navigator.languages.find&&navigator.languages.find(function(e){return"string"==typeof e&&"ru"===e.substring(0,2)}))?"ru":"en"),"string"==typeof n){!function(e,t,n){var o=(n=n||{}).expires;if("number"==typeof o&&o){var a=new Date;a.setTime(a.getTime()+1e3*o),o=n.expires=a}o&&o.toUTCString&&(n.expires=o.toUTCString());var r=e+"="+(t=encodeURIComponent(t));for(var i in n){r+="; "+i;var c=n[i];!0!==c&&(r+="="+c)}document.cookie=r}("__wdt_userLocale",n,{expires:2592e3,secure:!0});var o="/"+n+window.location.pathname+window.location.search+window.location.hash;n!==t?window.location.replace(window.location.origin+o):"object"==typeof history&&"function"==typeof history.replaceState&&history.replaceState(null,null,o)}}();</script>` + match
			})
		}

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

		let { html } = await buildStaticPage({
			page,
			page_sections: sections,
			page_symbols: symbols.filter((symbol) =>
				sections.find((section) => section.symbol === symbol.id)
			),
			locale: language,
			grab_assets: include_assets,
			assets_list,
			assets_map
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

		// add redirect page
		if (is_multilang && is_primary) {
			page_tree.push({
				path,
				content: await sanitize_page_code(current_site, page, html, current_site.url, site_languages, full_url, language, true)
			})
		}

		// add page
		page_tree.push({
			path: is_multilang ? `${language}/${path}` : path,
			content: await sanitize_page_code(current_site, page, html, current_site.url, site_languages, full_url, language, False)
		})

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