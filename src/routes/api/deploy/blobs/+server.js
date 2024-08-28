import { json, error as server_error } from '@sveltejs/kit'
import supabase_admin from '$lib/supabase/admin'
import axios from 'axios'

export async function POST({ request, locals }) {
  const session = await locals.getSession()
  if (!session) {
    // the user is not signed in
    throw server_error(401, { message: 'Unauthorized' })
  }

  let { repo_name, files, provider, site_url } = await request.json()

  const { data: token } = await supabase_admin
    .from('config')
    .select('value')
    .eq('id', `${provider}_token`)
    .single()

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
