// FinalEffect.ts
import { BlendFunction, Effect } from "postprocessing";
import { Color, Texture, Uniform, Vector2, Vector3 } from "three";
// @ts-ignore
import fragmentShader from "/src/shaders/postProcess.frag";

type FinalOpts = {
    grain: Texture;
    resolution?: { width: number; height: number; };
    blendFunction?: BlendFunction;

    // Look params (defaults match our suggested shader)
    grainScale?: number;           // frequency of grain tiling
    noiseStrength?: number;        // strength of grain (aka uNoiseStrength)
    noise?: number;                // alias for noiseStrength (backward compat)
    vignetteCenter?: Vector2;      // usually (0.5, 0.5)
    vignetteRadius?: number;       // start radius
    vignetteStrength?: number;     // multiplicative strength
    vignettePower?: number;        // falloff power
    vignetteColor?: Vector3 | Color; // subtle tint
};

export class FinalEffect extends Effect {
    constructor(opts: FinalOpts) {
        super("FinalEffect", fragmentShader, {
            blendFunction: opts.blendFunction ?? BlendFunction.SCREEN,
            uniforms: new Map<string, Uniform>([
                ["tGrain", new Uniform(opts.grain)],
                ["uResolution", new Uniform(new Vector2(
                    opts.resolution?.width ?? 1,
                    opts.resolution?.height ?? 1
                ))],
                ["uTime", new Uniform(0)],

                // Grain
                ["uGrainScale", new Uniform(opts.grainScale ?? 6.0)],
                ["uNoiseStrength", new Uniform(opts.noiseStrength ?? opts.noise ?? 0.18)],
                // (Keep uNoise for shader variants that still read it)
                ["uNoise", new Uniform(opts.noiseStrength ?? opts.noise ?? 0.18)],

                // Vignette
                ["uVignetteCenter", new Uniform(opts.vignetteCenter ?? new Vector2(0.5, 0.5))],
                ["uVignetteRadius", new Uniform(opts.vignetteRadius ?? 0.3)],
                ["uVignetteStrength", new Uniform(opts.vignetteStrength ?? 0)],
                ["uVignettePower", new Uniform(opts.vignettePower ?? .8)],
                ["uVignetteColor", new Uniform(
                    opts.vignetteColor instanceof Color
                        ? new Vector3(opts.vignetteColor.r, opts.vignetteColor.g, opts.vignetteColor.b)
                        : (opts.vignetteColor ?? new Vector3(0.06, 0.07, 0.10))
                )],
            ]),
        });
    }

    // ---------- time / size ----------
    update(_renderer: any, _inputBuffer: any, deltaTime: number) {
        (this.uniforms.get("uTime") as Uniform<number>).value += deltaTime;
    }
    setSize(w: number, h: number) {
        (this.uniforms.get("uResolution") as Uniform<Vector2>).value.set(w, h);
    }

    // ---------- grain ----------
    get grainScale() { return (this.uniforms.get("uGrainScale") as Uniform<number>).value; }
    set grainScale(v: number) { (this.uniforms.get("uGrainScale") as Uniform<number>).value = v; }

    get noise() { return (this.uniforms.get("uNoiseStrength") as Uniform<number>).value; }
    set noise(v: number) {
        (this.uniforms.get("uNoiseStrength") as Uniform<number>).value = v;
        (this.uniforms.get("uNoise") as Uniform<number>).value = v; // keep both in sync
    }

    // ---------- vignette ----------
    get vignetteCenter() { return (this.uniforms.get("uVignetteCenter") as Uniform<Vector2>).value; }
    set vignetteCenter(v: Vector2) { (this.uniforms.get("uVignetteCenter") as Uniform<Vector2>).value.copy(v); }

    get vignetteRadius() { return (this.uniforms.get("uVignetteRadius") as Uniform<number>).value; }
    set vignetteRadius(v: number) { (this.uniforms.get("uVignetteRadius") as Uniform<number>).value = v; }

    get vignetteStrength() { return (this.uniforms.get("uVignetteStrength") as Uniform<number>).value; }
    set vignetteStrength(v: number) { (this.uniforms.get("uVignetteStrength") as Uniform<number>).value = v; }

    get vignettePower() { return (this.uniforms.get("uVignettePower") as Uniform<number>).value; }
    set vignettePower(v: number) { (this.uniforms.get("uVignettePower") as Uniform<number>).value = v; }

    set vignetteColorHex(hex: number | string) {
        const c = new Color(hex as any);
        (this.uniforms.get("uVignetteColor") as Uniform<Vector3>).value.set(c.r, c.g, c.b);
    }
}
