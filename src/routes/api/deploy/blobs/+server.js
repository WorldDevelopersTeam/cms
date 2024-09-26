import { minify_sync as minifyJS } from 'terser';
import { minify as minifyHTML } from 'html-minifier-terser';
import { json, error as server_error } from '@sveltejs/kit'
import supabase_admin from '$lib/supabase/admin'
import axios from 'axios'

export async function POST({ request, locals }) {
  const session = await locals.getSession()
  if (!session) {
    // the user is not signed in
    throw server_error(401, { message: 'Unauthorized' })
  }

  let { repo_name, files, provider } = await request.json()

  const { data: token } = await supabase_admin
    .from('config')
    .select('value')
    .eq('id', `${provider}_token`)
    .single()

  // minify html and js
  files = await Promise.all(files.map(async (file) => {
    if (typeof file === 'object')
    {
      let path = file.file
      let content = file.data
      if (typeof path === 'string' && typeof content === 'string')
      {
        path = path.toLowerCase()
        if (path.endsWith('.js'))
        {
          // minify class names
          content = content.replaceAll(/svelte-/gm, 'sc-')
          // minify js
          content = minifyJS(content, { sourceMap: false }).code
        }
        else if (path.endsWith('.html'))
        {
          // strip comments
          content = await minifyHTML(content, {
            html5: true,
            removeComments: true,
          })
          // merge inline styles
          while (content.match(/(\<\s*style[^\>]*?\>)([\s\S]+?)(\<\s*\/\s*style\s*\>)\s*(\<\s*style[^\>]*?\>)([\s\S]+?)(\<\s*\/\s*style\s*\>)/im)) {
            content = content.replaceAll(/(\<\s*style[^\>]*?\>)([\s\S]+?)(\<\s*\/\s*style\s*\>)\s*(\<\s*style[^\>]*?\>)([\s\S]+?)(\<\s*\/\s*style\s*\>)/gim, function(stylesElems, style1OpenTag, style1Content, style1CloseTag, style2OpenTag, style2Content, style2CloseTag) {
              return style1OpenTag + style1Content + '\n' + style2Content + style2CloseTag;
            })
          }
          // normalize sinline styles
          content = content.replaceAll(/\<\s*style\s*\>/gim, '<style type="text/css">')
          // normalize inline scripts
          content = content.replaceAll(/\<\s*script\s*\>/gim, '<script type="text/javascript">')
          // minify class names
          content = content.replaceAll(/svelte-/gm, 'sc-')
          // minify html
          content = await minifyHTML(content, {
            html5: true,
            minifyCSS: true,
            minifyJS: true,
            minifyURLs: true,
            quoteCharacter: '"',
            removeEmptyAttributes: true,
            collapseWhitespace: true,
            sortAttributes: true,
            sortClassName: true
          })
        }
        file.data = content
      }
    }
    return file
  }))

  let res = [];

  for (let key in files) {
    const blob_sha = await create_blob({
      binary: files[key].binary,
      content: files[key].data,
      token: token?.value,
      repo_name,
    })
    res[key] = {
      path: files[key].file,
      sha: blob_sha
    }
  }

  return json(res)
}

async function create_blob({ binary, content, repo_name, token }) {
  const data = (await axios.post(
    `https://api.github.com/repos/${repo_name}/git/blobs`,
    {
      content: content,
      encoding: binary ? 'base64' : 'utf-8',
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )).data

  return data.sha
}
