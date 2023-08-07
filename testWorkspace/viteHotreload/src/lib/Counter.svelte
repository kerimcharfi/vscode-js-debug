<script lang="ts">
  import { doesSomething } from './test';
  let count: number = 0;
  const increment = () => {
    count += 1;
  };
  setTimeout(doesSomething, 0)
 
</script>

<button on:click={increment}>
  count is {count}
</button>
