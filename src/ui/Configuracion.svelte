<script lang="ts">
  // Configuración inicial, tras la bienvenida: la app sugiere dónde guardar los datos y qué IA usar,
  // y cada persona puede elegir otra cosa. Se monta siempre, pero el formulario solo existe cuando toca.
  import { app } from "../state.js";
  import { ver } from "./comun.js";
  import FormConfig from "./FormConfig.svelte";
  import { cambios } from "./puente.svelte.ts";

  // Se enseña hasta que la persona guarda su configuración
  const pendiente = $derived.by(() => {
    void cambios.n;
    return !app.configElegida;
  });

  const sigue = () => ver("analisis");
</script>

<header class="a-head">
  <p class="eyebrow">Último paso</p>
  <h1 class="a-h1">Tu configuración</h1>
</header>
{#if pendiente}
  <div class="card paso">
    <p class="a-msg">
      Esto es lo que sugerimos: tus datos en este dispositivo y la IA de la app. Puedes cambiarlo ahora o más
      tarde en Ajustes.
    </p>
    <FormConfig pref="c" textoGuardar="Guardar y continuar" alGuardar={sigue} />
  </div>
{/if}
