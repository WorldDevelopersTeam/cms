<script>
  import { WdtPage } from '@worlddev/cms-builder'

  export let data
</script>

<WdtPage
  page={{
    ...data.page,
    sections: data.sections,
  }}
/>
