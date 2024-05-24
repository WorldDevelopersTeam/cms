import { json } from '@sveltejs/kit'
import { html_server } from '../../../compiler/cloud-workers/server-compiler.js'
import { get } from 'svelte/store'
import postcss from '../../../compiler/cloud-workers/server-postcss.js'

export const POST = async (event) => {
  const { id, code, content, locale } = await event.request.json()

  const css = await postcss(code.css || '')

  let res = {}
  try {
    res = await html_server({
      component: {
        id,
        data: content[locale],
        html: code.html,
        css: css,
        js: code.js,
      },
    })
  } catch (e) {
    console.log(e.message)
  }

  return json(res)
}
