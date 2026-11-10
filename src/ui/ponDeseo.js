// Marca una prenda del perfil como «quiero», «tengo» o «no» (o la quita con null). Lo usan Deseos y Hoy.
import { app, repinta } from "../state.js";
import { falla } from "./comun.js";

export async function ponDeseo(id, estadoD) {
  try {
    if (estadoD) {
      app.D[id] = { ...app.D[id], id, estado: estadoD };
      await app.store.set("deseos", id, { estado: estadoD, cuando: new Date().toISOString() });
    } else {
      delete app.D[id];
      await app.store.del("deseos", id);
    }
  } catch (e) {
    falla(e);
  }
  repinta("deseos");
}
