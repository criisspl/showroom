import { test, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import { abreImagen, imagenParaIA } from "../src/lib/ai.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function lienzo() {
  const dibujos: number[][] = [];
  const c = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: (_i: unknown, _x: number, _y: number, w: number, h: number) => dibujos.push([w, h])
    }),
    toDataURL: (tipo: string, calidad: number) => `data:${tipo};q=${calidad};${c.width}x${c.height}`
  };
  vi.stubGlobal("document", { createElement: () => c });
  return dibujos;
}

test("imagenParaIA reduce a 1024 px, dibuja y libera el bitmap", async () => {
  const dibujos = lienzo();
  const close = vi.fn();
  vi.stubGlobal("createImageBitmap", async () => ({ width: 4000, height: 2000, close }));
  const url = await imagenParaIA(new Blob(["x"]));
  assert.equal(url, "data:image/jpeg;q=0.85;1024x512");
  assert.deepEqual(dibujos, [[1024, 512]]);
  assert.equal(close.mock.calls.length, 1);
});

test("imagenParaIA no agranda una foto pequeña", async () => {
  lienzo();
  vi.stubGlobal("createImageBitmap", async () => ({ width: 300, height: 200, close() {} }));
  assert.equal(await imagenParaIA(new Blob(["x"])), "data:image/jpeg;q=0.85;300x200");
});

test("sin createImageBitmap usa <img> y mide con naturalWidth", async () => {
  lienzo();
  vi.stubGlobal("createImageBitmap", undefined);
  vi.stubGlobal("URL", { createObjectURL: () => "blob:x", revokeObjectURL: () => {} });
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 2048;
      naturalHeight = 1024;
      decode = async () => {};
    }
  );
  vi.useFakeTimers();
  assert.equal(await imagenParaIA(new Blob(["x"]), 512), "data:image/jpeg;q=0.85;512x256");
});

test("si createImageBitmap falla, prueba con <img> y espera a onload si no hay decode", async () => {
  vi.stubGlobal("createImageBitmap", async () => {
    throw new Error("formato");
  });
  const revoca = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: () => "blob:x", revokeObjectURL: revoca });
  class Img {
    onload: () => void = () => {};
    set src(_: string) {
      queueMicrotask(() => this.onload());
    }
  }
  vi.stubGlobal("Image", Img);
  vi.useFakeTimers();
  const img = await abreImagen(new Blob(["x"]));
  assert.ok(img instanceof Img);
  vi.advanceTimersByTime(1000);
  assert.equal(revoca.mock.calls.length, 1);
});

test("si la foto no se puede abrir, el error está en español", async () => {
  vi.stubGlobal("createImageBitmap", undefined);
  vi.stubGlobal("URL", { createObjectURL: () => "blob:x", revokeObjectURL: () => {} });
  vi.stubGlobal(
    "Image",
    class {
      decode = async () => {
        throw new Error("roto");
      };
    }
  );
  vi.useFakeTimers();
  await assert.rejects(abreImagen(new Blob(["x"])), /No he podido abrir esa foto/);
});
