<script lang="ts">
  // Grupo de opciones tipo chip (un radio por opción) para elegir un valor.
  interface Props {
    nombre: string;
    items: readonly (readonly string[])[];
    valor: string;
  }
  // `valor` se reasigna (bind:group); el resto solo se lee
  // eslint-disable-next-line prefer-const
  let { nombre, items, valor = $bindable() }: Props = $props();
</script>

{#each items as it (it[0])}
  <label
    ><input type="radio" name={nombre} value={it[0]} id={nombre + "-" + it[0]} bind:group={valor} /><span
      >{it[1]}</span
    ></label
  >
{/each}
