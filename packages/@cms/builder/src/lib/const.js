import { customAlphabet } from 'nanoid/non-secure'
import { v4 as uuidv4 } from 'uuid'

/**
 * Creates a new field object with default values.
 * @param field - The field properties to be applied to the new field
 * @returns {import('$lib').Field}
 */
export const Field = (field = {}) => ({
	id: createUniqueID(),
	key: '',
	label: '',
	type: 'text',
	fields: [],
	options: {},
	is_static: false,
	...field
})

/**
 * Creates a new symbol object with default values.
 * @param symbol - The symbol properties to be applied to the new symbol
 * @returns {import('$lib').Symbol}
 */
export const Symbol = (symbol) => ({
	id: uuidv4(),
	name: 'New Block',
	code: {
		css: '',
		html: '',
		js: ''
	},
	fields: [],
	content: {
		en: {}
	},
	site: symbol.site,
	index: 0,
	...symbol
})

/**
 * Creates a new page object with default values.
 * @param page - The page properties to be applied to the new page
 * @returns {import('$lib').Page}
 */
export const Page = (page = {}) => ({
	id: uuidv4(),
	url: '',
	name: '',
	code: {
		html: {
			head: '',
			below: ''
		},
		css: '',
		js: ''
	},
	fields: [],
	content: {
		en: {}
	},
	parent: null,
	site: '',
	created_at: new Date().toISOString(),
	...page
})

/**
 * Creates a new site object with default values.
 * @param site - The site properties to be applied to the new site
 * @returns {import('$lib').Site}
 */
export const Site = ({ url, name } = { url: 'default', name: 'Default' }) => ({
	id: uuidv4(),
	url,
	name,
	code: {
		html: {
			head: ``,
			below: ''
		},
		css: `
/*! tailwindcss v2.2.17 | MIT License | https://tailwindcss.com *//*! modern-normalize v1.1.0 | MIT License | https://github.com/sindresorhus/modern-normalize */progress,sub,sup{vertical-align:baseline}blockquote,body,dd,dl,fieldset,figure,h1,h2,h3,h4,h5,h6,hr,ol,p,pre,ul{margin:0}fieldset,legend,ol,ul{padding:0}a,hr{color:inherit}*,::after,::before{box-sizing:border-box;box-sizing:border-box;border:0 solid currentColor;--tw-border-opacity:1;border-color:rgba(229,231,235,var(--tw-border-opacity))}body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji'}abbr[title]{-webkit-text-decoration:underline dotted;text-decoration:underline dotted}b,strong{font-weight:bolder}code,kbd,pre,samp{font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}button,input,optgroup,select,textarea{font-family:inherit;font-size:100%;line-height:1.15;margin:0}button,select{text-transform:none}[type=button],[type=reset],[type=submit],button{-webkit-appearance:button}::-moz-focus-inner{border-style:none;padding:0}:-moz-focusring{outline:ButtonText dotted 1px;outline:auto}:-moz-ui-invalid{box-shadow:none}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}button{background-color:transparent;background-image:none}ol,ul{list-style:none}html{-moz-tab-size:4;tab-size:4;-webkit-text-size-adjust:100%;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";line-height:1.5}body{font-family:inherit;line-height:inherit}hr{height:0;border-top-width:1px}img{border-style:solid}textarea{resize:vertical}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}[role=button],button{cursor:pointer}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{text-decoration:inherit}button,input,optgroup,select,textarea{padding:0;line-height:inherit;color:inherit}code,kbd,pre,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]{display:none}

#page {
  font-family: system-ui, sans-serif;
  color: var(--color);
  line-height: 1.6; 
  font-size: 1rem;
  background: var(--background);
}

.section-container {
  max-width: var(--max-width, 1200px);
  margin: 0 auto;
  padding: 3rem var(--padding, 1rem); 
}

.heading {
  font-size: 3rem;
  line-height: 1;
  font-weight: 700;
  margin: 0;
}

.button {
  color: white;
  background: var(--color-accent);
  border-radius: 5px;
  padding: 8px 20px;
  transition: var(--transition);

  &:hover {
    box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.1);
  } 

  &.inverted {
    background: transparent; 
    color: var(--color-accent); 
    border: 2px solid var(--color-accent);
  }
}
`,
		js: ''
	},
	fields: [],
	content: {
		en: {
			// locale
		}
	},
	active_deployment: null,
	created_at: new Date().toISOString()
})

export const languages = [
	{
		key: 'af',
		name: 'Afrikaans'
	},
	{
		key: 'ar',
		name: 'Arabic'
	},
	{
		key: 'be',
		name: 'Belarusian'
	},
	{
		key: 'bg',
		name: 'Bulgarian'
	},
	{
		key: 'bs',
		name: 'Bosnian'
	},
	{
		key: 'ca',
		name: 'Catalan'
	},
	{
		key: 'cs',
		name: 'Czech'
	},
	{
		key: 'cy',
		name: 'Welsh'
	},
	{
		key: 'da',
		name: 'Danish'
	},
	{
		key: 'de',
		name: 'German'
	},
	{
		key: 'el',
		name: 'Greek'
	},
	{
		key: 'en',
		name: 'English'
	},
	{
		key: 'fa',
		name: 'Persian'
	},
	{
		key: 'fi',
		name: 'Finnish'
	},
	{
		key: 'fr',
		name: 'French'
	},
	{
		key: 'he',
		name: 'Hebrew'
	},
	{
		key: 'hi',
		name: 'Hindi'
	},
	{
		key: 'hu',
		name: 'Hungarian'
	},
	{
		key: 'hy-am',
		name: 'Armenian'
	},
	{
		key: 'id',
		name: 'Indonesian'
	},
	{
		key: 'is',
		name: 'Icelandic'
	},
	{
		key: 'it',
		name: 'Italian'
	},
	{
		key: 'ja',
		name: 'Japanese'
	},
	{
		key: 'ka',
		name: 'Georgian'
	},
	{
		key: 'kk',
		name: 'Kazakh'
	},
	{
		key: 'km',
		name: 'Cambodian'
	},
	{
		key: 'ko',
		name: 'Korean'
	},
	{
		key: 'lo',
		name: 'Lao'
	},
	{
		key: 'lt',
		name: 'Lithuanian'
	},
	{
		key: 'lv',
		name: 'Latvian'
	},
	{
		key: 'mk',
		name: 'Macedonian'
	},
	{
		key: 'mn',
		name: 'Mongolian'
	},
	{
		key: 'ms',
		name: 'Malay'
	},
	{
		key: 'my',
		name: 'Burmese'
	},
	{
		key: 'ne',
		name: 'Nepalese'
	},
	{
		key: 'nl',
		name: 'Dutch'
	},
	{
		key: 'pl',
		name: 'Polish'
	},
	{
		key: 'pt',
		name: 'Portuguese'
	},
	{
		key: 'ro',
		name: 'Romanian'
	},
	{
		key: 'ru',
		name: 'Russian'
	},
	{
		key: 'sk',
		name: 'Slovak'
	},
	{
		key: 'sl',
		name: 'Slovenian'
	},
	{
		key: 'sq',
		name: 'Albanian'
	},
	{
		key: 'sv',
		name: 'Swedish'
	},
	{
		key: 'th',
		name: 'Thai'
	},
	{
		key: 'tl-ph',
		name: 'Tagalog (Philippines)'
	},
	{
		key: 'tr',
		name: 'Turkish'
	},
	{
		key: 'uk',
		name: 'Ukrainian'
	},
	{
		key: 'ur',
		name: 'Urdu'
	},
	{
		key: 'uz',
		name: 'Uzbek'
	},
	{
		key: 'vi',
		name: 'Vietnamese'
	},
	{
		key: 'zh',
		name: 'Chinese'
	},
	{
		key: 'es',
		name: 'Spanish'
	},
	{
		key: 'et',
		name: 'Estonian'
	}
]

function createUniqueID(length = 5) {
	const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', length)
	return nanoid()
}


export const Language_Name = (language) => _find(languages, ['key', language])['name']