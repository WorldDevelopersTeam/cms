<script>
  import { WdtPage } from '@cms/builder'

  export let data
</script>

<WdtPage
  page={{
    ...data.page,
    sections: data.sections,
  }}
/>
