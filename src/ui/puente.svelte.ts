// Puente mientras conviven la interfaz antigua y la de Svelte: main.js sigue avisando con repinta()
// y las pantallas en Svelte vuelven a leer el estado del motor (que no es reactivo) cuando cambia este contador.
export const cambios = $state({ n: 0 });
export const avisa = () => {
  cambios.n++;
};
