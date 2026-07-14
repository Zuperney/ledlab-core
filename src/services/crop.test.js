// crop.test.js — fillCrop (recorte "preencher/cover" + deslocamento).
// Os dois primeiros casos foram validados visualmente no app (v0.20.8).
import { describe, it, expect } from "vitest";
import { fillCrop } from "./crop.js";

describe("fillCrop", () => {
  it("FHD → tela 4:3 (1536×1152): recorta as laterais", () => {
    const r = fillCrop(1920, 1080, 1536, 1152, 0.5);
    expect(r.cropW).toBe(1440);
    expect(r.cropH).toBe(1080);
    expect(r.x).toBe(240); // centralizado
    expect(r.y).toBe(0);
    expect(r.slackX).toBe(480);
    expect(r.axis).toBe("x");
  });

  it("FHD → tela em pé (1920×2160): meia largura, escala 2×", () => {
    const r = fillCrop(1920, 1080, 1920, 2160, 0.5);
    expect(r.cropW).toBe(960);
    expect(r.cropH).toBe(1080);
    expect(r.x).toBe(480);
    expect(r.slackX).toBe(960);
    expect(r.scale).toBe(2);
    expect(r.axis).toBe("x");
  });

  it("deslocamento: 0 = esquerda, 1 = direita, e clampa fora de 0..1", () => {
    expect(fillCrop(1920, 1080, 1920, 2160, 0).x).toBe(0);
    expect(fillCrop(1920, 1080, 1920, 2160, 1).x).toBe(960);
    expect(fillCrop(1920, 1080, 1920, 2160, -5).x).toBe(0);
    expect(fillCrop(1920, 1080, 1920, 2160, 9).x).toBe(960);
  });

  it("mesmo aspecto: sem sobra, sem eixo de deslocamento", () => {
    const r = fillCrop(1920, 1080, 1920, 1080, 0.5);
    expect(r.cropW).toBe(1920);
    expect(r.cropH).toBe(1080);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.slackX).toBe(0);
    expect(r.slackY).toBe(0);
    expect(r.axis).toBeNull();
  });

  it("tela ultrawide: a sobra fica no eixo Y", () => {
    const r = fillCrop(1920, 1080, 3840, 1080, 0.5);
    expect(r.cropW).toBe(1920);
    expect(r.cropH).toBe(540);
    expect(r.axis).toBe("y");
    expect(r.slackY).toBe(540);
    expect(r.y).toBe(270);
  });

  it("entradas degeneradas (0/NaN) não geram NaN", () => {
    const r = fillCrop(0, 0, 0, 0, 0.5);
    expect(Number.isFinite(r.cropW)).toBe(true);
    expect(Number.isFinite(r.cropH)).toBe(true);
    expect(Number.isFinite(r.x)).toBe(true);
    expect(Number.isFinite(r.y)).toBe(true);
  });
});
