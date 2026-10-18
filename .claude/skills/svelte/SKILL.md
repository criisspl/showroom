---
name: svelte
description: Use when writing or reviewing Svelte components or reactive state in a project that uses Svelte 5 (with Vite, not necessarily SvelteKit).
---

# Svelte 5 (runas)

Código nuevo, siempre sintaxis de Svelte 5. Las runas (`$`-prefijo) son parte del lenguaje: no se importan, no son valores y solo valen en ciertas posiciones. Funcionan en `.svelte` y en `.svelte.js` / `.svelte.ts`.

## Errores típicos de LLM (Svelte 4)

| No | Sí |
|---|---|
| `let n = 0` reactivo | `let n = $state(0)` |
| `$: doble = n * 2` | `let doble = $derived(n * 2)` |
| `$: { efecto }` | `$effect(() => { ... })` |
| `export let name` | `let { name } = $props()` |
| `on:click={f}`, `on:click\|preventDefault` | `onclick={f}`, y `e.preventDefault()` dentro |
| `createEventDispatcher` | prop callback: `let { onsave } = $props()` |
| `<slot />`, `<slot name="x">`, `let:` | `{@render children?.()}`, snippets con parámetros |
| `new App({ target })`, `$set`, `$destroy`, `$on` | `mount(App, { target, props })`, `unmount(app)` |
| `beforeUpdate` / `afterUpdate` | `$effect.pre` / `$effect` (no se permiten en modo runas) |
| `<svelte:component this={C}>` | `<C />` (una variable con mayúscula ya es dinámica) |

## Estado y derivados

```svelte
<script lang="ts">
  let items = $state<Item[]>([]);          // proxy profundo: items.push(x) reacciona
  let total = $derived(items.length);
  let caro = $derived.by(() => items.filter((i) => i.precio > 100));
</script>
```

- `$state` en arrays y objetos planos es profundamente reactivo; las instancias de clase no se proxean (usa campos `$state` en la clase).
- Desestructurar un `$state` lee los valores una vez: pierdes reactividad.
- `$state.raw` para datos grandes que solo se reasignan; `$state.snapshot(x)` para pasar una copia sin proxy a librerías o `structuredClone`.
- `$derived` debe estar libre de efectos secundarios. Los derivados se pueden reasignar temporalmente (UI optimista) si no son `const`.

## `$effect`: último recurso

Para salir de Svelte: canvas, librerías de terceros, red, analítica. Solo corre en el navegador. Rastrea lo que se lee **de forma síncrona** (no tras un `await` ni en un `setTimeout`) y solo reacciona a reasignaciones, no a mutaciones internas de un objeto. Devuelve la limpieza:

```ts
$effect(() => {
  const id = setInterval(tick, ms);
  return () => clearInterval(id);
});
```

No sincronices estado con efectos: usa `$derived`, o un handler de evento.

## Props, `$bindable`, eventos, snippets

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    titulo: string;
    abierto?: boolean;
    onclose?: () => void;
    children?: Snippet;
    fila?: Snippet<[Item]>;
  }
  let { titulo, abierto = $bindable(false), onclose, children, fila }: Props = $props();
</script>

<button onclick={() => onclose?.()}>{titulo}</button>
{@render children?.()}
{#snippet vacio()}<p>Sin datos</p>{/snippet}
```

- Un hijo no debe mutar sus props; si padre e hijo comparten un valor, `$bindable()` y `bind:abierto` en el padre. Úsalo con moderación. Si un `$bindable` tiene fallback, el padre que use `bind:` debe pasar un valor distinto de `undefined`.
- Contenido dentro de las etiquetas del componente = snippet `children` implícito (no declares además una prop `children`). Los snippets declarados dentro también son props implícitas.
- Los atributos de evento distinguen mayúsculas (`onclick`, no `onClick`) y admiten abreviatura `{onclick}` y spread. Para `preventDefault` en táctiles pasivos usa `on` de `svelte/events`.
- `$props.id()` (5.20+) da un id único por instancia para `for`/`aria-labelledby`.

## Estado compartido en `.svelte.ts`

No se puede exportar un `$state` que se reasigna directamente (los importadores no verían el cambio). Exporta un objeto y muta sus propiedades, o usa getters/setters:

```ts
// carrito.svelte.ts
export const carrito = $state({ items: [] as Item[] });
// o
let n = $state(0);
export const contador = { get n() { return n; }, inc() { n++; } };
```

## TypeScript y montaje

- `<script lang="ts">`; solo funcionan características de solo-tipos (sin `enum`, ni parámetros-propiedad en constructores). Con Vite: `vitePreprocess`. `tsconfig`: `verbatimModuleSyntax` e `isolatedModules` a `true`.
- Tipos útiles: `Component<Props>`, `ComponentProps<typeof X>`, `Snippet<[T]>`; envolviendo elementos HTML, extiende `HTMLButtonAttributes` etc. de `svelte/elements`.
- Montaje: `mount(App, { target: document.getElementById('app')!, props })`. `mount` no ejecuta efectos de inmediato; en tests llama a `flushSync()` justo después. `unmount(app, { outro: true })` es asíncrono desde la 5.13.

## Verificar

- `npx svelte-check` (tipos y avisos de Svelte) además de `tsc` y el linter del proyecto.
- Tests y build del proyecto; en cambios de UI, abrir la pantalla en local.
- Buscar restos de sintaxis vieja: `grep -rnE "export let|\$:|on:[a-z]+=|<slot|createEventDispatcher|new [A-Z][A-Za-z]*\(\{ *target" src`.

## Fuentes

- https://svelte.dev/docs/svelte/what-are-runes
- https://svelte.dev/docs/svelte/$state
- https://svelte.dev/docs/svelte/$derived
- https://svelte.dev/docs/svelte/$effect
- https://svelte.dev/docs/svelte/$props
- https://svelte.dev/docs/svelte/$bindable
- https://svelte.dev/docs/svelte/snippet
- https://svelte.dev/docs/svelte/basic-markup
- https://svelte.dev/docs/svelte/imperative-component-api
- https://svelte.dev/docs/svelte/typescript
- https://svelte.dev/docs/svelte/v5-migration-guide
