// import {
//     Camera,
//     Color,
//     OrthographicCamera,
//     PerspectiveCamera,
//     Scene,
//     Texture,
//     TextureLoader,
//     Vector2,
//     WebGLRenderer
// } from "three";

// import {
//     BlendFunction,
//     BloomEffect,
//     BrightnessContrastEffect,
//     DepthDownsamplingPass,
//     EdgeDetectionMode,
//     Effect,
//     EffectComposer,
//     EffectPass,
//     NormalPass,
//     RenderPass,
//     SMAAEffect,
//     SMAAPreset,
//     SSAOEffect,
//     VignetteEffect
// } from "postprocessing";

// import { FolderApi } from "tweakpane";
// import { FinalEffect } from "./FinalEffect";

// export interface PostProcessingInterface {
//     renderer: WebGLRenderer;
//     scene: Scene;
//     camera: OrthographicCamera | PerspectiveCamera | Camera;
//     pixelRatio?: number;
//     width?: number;
//     height?: number;
// }

// export default class PostProcessing {
//     // core
//     private _composer: EffectComposer | null = null;
//     private _renderer!: WebGLRenderer;
//     private _scene!: Scene;
//     private _camera!: OrthographicCamera | PerspectiveCamera | Camera;

//     // helper passes
//     private _renderPass: RenderPass | null = null;
//     private _normalPass: NormalPass | null = null;
//     private _depthDownPass: DepthDownsamplingPass | null = null;

//     // single postprocessing pass
//     private _effectsMap: Record<keyof typeof this._effectEnabled, Effect> = {} as any;

//     // global on/off
//     public enabled = true;

//     // per-effect states
//     private _effectEnabled = { smaa: true, ssao: true, vignette: true, color: true, bloom: true, final: true };
//     private _effectsPass: EffectPass | null = null;

//     // tweakable params
//     private params = {
//         // Bloom
//         threshold: 0.34,
//         strength: 3.9,
//         radius: 0.5,
//         // SSAO
//         ssaoIntensity: 1.33,
//         ssaoRadius: 0.1,
//         ssaoBias: 0.025,
//         ssaoOpacity: 0.8,

//         // FinalEffect params (for reference; not exposed to UI)
//         noise: 0.08,
//         grainScale: 10.0,

//         vignetteCenter: { x: 0.5, y: 0.5 },
//         vignetteRadius: 0.3,
//         vignetteStrength: 0.15,
//         vignettePower: 0.8,
//         vignetteColor: { r: 0.06, g: 0.07, b: 0.10 }, // tweakpane 'float' color
//         finalOpacity: 1,
//         finalBlend: "SCREEN", // UI label; we map to BlendFunction
//     };

//     constructor({
//         renderer,
//         scene,
//         camera,
//         width = window.innerWidth,
//         height = window.innerHeight
//     }: PostProcessingInterface) {
//         this._renderer = renderer;
//         this._scene = scene;
//         this._camera = camera;

//         this._composer = new EffectComposer(renderer);
//         this._composer.setSize(width, height);

//         // load assets (SMAA images + grain)
//         const loader = new TextureLoader();
//         const assetUrls: Record<string, string> = {
//             "smaa-search": "/images/smaa-search.png",
//             "smaa-area": "/images/smaa-area.png",
//             "grainTexture": "/images/grainTexture.png"
//         };
//         const assets: Record<string, Texture | null> = {
//             "smaa-search": null,
//             "smaa-area": null,
//             "grainTexture": null
//         };

//         Object.entries(assetUrls).forEach(([key, url]) => {
//             loader.load(
//                 url,
//                 (texture) => {
//                     assets[key] = texture;
//                     if (Object.values(assets).every(Boolean)) {
//                         this._setup(scene, camera, assets);
//                     }
//                 },
//                 undefined,
//                 (err) => console.error(`Error loading texture ${key}:`, err)
//             );
//         });
//     }

//     private _setup(
//         scene: Scene,
//         camera: OrthographicCamera | PerspectiveCamera | Camera,
//         assets: Record<string, Texture | null>,
//     ) {
//         console.log('PostProcessing: assets loaded, setting up passes');

//         // 1) Base & G-buffers
//         this._renderPass = new RenderPass(scene, camera);

//         this._normalPass = new NormalPass(scene, camera);
//         if (this._renderer.capabilities.isWebGL2) {
//             this._depthDownPass = new DepthDownsamplingPass({
//                 normalBuffer: this._normalPass.texture,
//                 resolutionScale: 0.5
//             });
//         }

//         // 2) Effects (no pass yet)
//         this._effectsMap.smaa = new SMAAEffect({
//             preset: SMAAPreset.HIGH,
//             edgeDetectionMode: EdgeDetectionMode.DEPTH,
//             ...{
//                 searchImage: assets["smaa-search"]!,
//                 areaImage: assets["smaa-area"]!
//             }
//         });

//         this._effectsMap.ssao = new SSAOEffect(camera, this._normalPass.texture, {
//             blendFunction: BlendFunction.MULTIPLY,
//             distanceScaling: true,
//             depthAwareUpsampling: true,
//             normalDepthBuffer: this._depthDownPass ? this._depthDownPass.texture : undefined,
//             samples: 9,
//             rings: 7,
//             distanceThreshold: 0.02,
//             distanceFalloff: 0.0025,
//             rangeThreshold: 0.0003,
//             rangeFalloff: 0.0001,
//             luminanceInfluence: 0.7,
//             minRadiusScale: 0.33,
//             radius: this.params.ssaoRadius,
//             intensity: this.params.ssaoIntensity,
//             bias: this.params.ssaoBias,
//             fade: 0.01,
//             resolutionScale: 0.5
//         });
//         this._effectsMap.ssao.blendMode.opacity.value = this.params.ssaoOpacity;

//         this._effectsMap.bloom = new BloomEffect({
//             blendFunction: BlendFunction.ADD,
//             luminanceThreshold: this.params.threshold,
//             luminanceSmoothing: 0.01,
//             resolutionScale: this.params.radius,
//             intensity: this.params.strength,
//             mipmapBlur: true
//         });
//         this._effectsMap.vignette = new VignetteEffect({
//             eskil: false,
//             offset: 0.2,
//             darkness: 1.,
//             blendFunction: BlendFunction.NORMAL
//         });
//         this._effectsMap.color = new BrightnessContrastEffect({
//             brightness: .2,
//             contrast: 0.05,
//             blendFunction: BlendFunction.SOFT_LIGHT
//         });
//         this._effectsMap.final = new FinalEffect({
//             grain: assets["grainTexture"]!,
//             noise: this.params.noise,
//             grainScale: this.params.grainScale,
//             vignetteCenter: new Vector2(this.params.vignetteCenter.x, this.params.vignetteCenter.y),
//             vignetteRadius: this.params.vignetteRadius,
//             vignetteStrength: this.params.vignetteStrength,
//             vignettePower: this.params.vignettePower,
//             vignetteColor: new Color(
//                 this.params.vignetteColor.r,
//                 this.params.vignetteColor.g,
//                 this.params.vignetteColor.b
//             ),
//             blendFunction: (() => {
//                 switch (this.params.finalBlend) {
//                     case "NORMAL": return BlendFunction.NORMAL;
//                     case "SCREEN": return BlendFunction.SCREEN;
//                     case "ADD": return BlendFunction.ADD;
//                     case "MULTIPLY": return BlendFunction.MULTIPLY;
//                     case "OVERLAY": return BlendFunction.OVERLAY;
//                     case "SOFT_LIGHT": return BlendFunction.SOFT_LIGHT;
//                     default: return BlendFunction.SCREEN;
//                 }
//             })()
//         });

//         this._rebuildEffectsPass();
//     }

//     private _rebuildEffectsPass() {
//         if (!this._composer) return;

//         // remove previous pass if it exists
//         if (this._effectsPass) {
//             this._composer.removePass(this._effectsPass);
//             this._effectsPass.dispose?.();
//         }

//         const activeEffects: Effect[] = Object.entries(this._effectEnabled)
//             .filter(([_, enabled]) => enabled)
//             .map(([key]) => this._effectsMap[key as keyof typeof this._effectsMap]);

//         this._effectsPass = new EffectPass(this._camera, ...activeEffects);
//         this._effectsPass.renderToScreen = true;
//         this._composer.addPass(this._effectsPass);
//     }

//     /** Global toggle: bypass composer in render while preserving per-effect states. */
//     public setEnabled(v: boolean) { this.enabled = v; }

//     /** Enable/disable one effect (and helper passes if needed). */
//     public setEffectEnabled(effect: keyof typeof this._effectEnabled, enabled: boolean) {
//         this._effectEnabled[effect] = enabled;
//         this._rebuildEffectsPass();
//     }

//     render() {
//         if (!this.enabled) {
//             this._renderer.render(this._scene, this._camera);
//             return;
//         }
//         this._composer?.render();
//     }

//     setupDebugPanel(folder: FolderApi) {
//         // Global
//         folder.addBinding(this, "enabled", { label: "Enable Post FX" })
//             .on("change", (ev) => this.setEnabled(ev.value));

//         // SMAA
//         const smaaFolder = folder.addFolder({ title: "🎯 Antialiasing (SMAA)", expanded: false });
//         const smaaState = { enabled: this._effectEnabled.smaa };
//         smaaFolder.addBinding(smaaState, "enabled", { label: "Enable" })
//             .on("change", (ev) => this.setEffectEnabled("smaa", ev.value));

//         // SSAO
//         const ssaoFolder = folder.addFolder({ title: "👻 SSAO", expanded: false });
//         const ssaoState = { enabled: this._effectEnabled.ssao };
//         ssaoFolder.addBinding(ssaoState, "enabled", { label: "Enable" })
//             .on("change", (ev) => this.setEffectEnabled("ssao", ev.value));

//         ssaoFolder.addBinding(this.params, "ssaoOpacity", { label: "Opacity", min: 0, max: 1, step: 0.01 })
//             .on("change", (ev) => { if (this._effectsMap.ssao) this._effectsMap.ssao.blendMode.opacity.value = ev.value; });

//         ssaoFolder.addBinding(this.params, "ssaoIntensity", { label: "Intensity", min: 0, max: 4, step: 0.01 })
//             .on("change", (ev) => { if (this._effectsMap.ssao) this._effectsMap.ssao.intensity = ev.value; });

//         ssaoFolder.addBinding(this.params, "ssaoRadius", { label: "Radius", min: 0.01, max: 1, step: 0.005 })
//             .on("change", (ev) => { if (this._effectsMap.ssao) this._effectsMap.ssao.radius = ev.value; });

//         // Bloom
//         const bloomFolder = folder.addFolder({ title: "🌸 Bloom", expanded: false });
//         const bloomState = { enabled: this._effectEnabled.bloom };
//         bloomFolder.addBinding(bloomState, "enabled", { label: "Enable" })
//             .on("change", (ev) => this.setEffectEnabled("bloom", ev.value));

//         bloomFolder.addBinding(this.params, "threshold", { label: "Luminance Threshold", min: 0, max: 1, step: 0.01 })
//             .on("change", (ev) => { if (this._effectsMap.bloom) this._effectsMap.bloom.luminanceMaterial.threshold = ev.value; });

//         bloomFolder.addBinding(this.params, "strength", { label: "Intensity", min: 0, max: 20, step: 0.1 })
//             .on("change", (ev) => { if (this._effectsMap.bloom) this._effectsMap.bloom.intensity = ev.value; });

//         bloomFolder.addBinding(this.params, "radius", { label: "Radius / Resolution", min: 0.1, max: 2, step: 0.01 })
//             .on("change", (ev) => { if (this._effectsMap.bloom) (this._effectsMap.bloom as any).resolution.scale = ev.value; });

//         // Final (grain/noise)
//         const finalFolder = folder.addFolder({ title: "🎛️ Final Mix" });
//         const finalState = { enabled: this._effectEnabled.final };
//         finalFolder.addBinding(finalState, "enabled", { label: "Enable" })
//             .on("change", (ev) => this.setEffectEnabled("final", ev.value));

//         // ---- Grain
//         finalFolder.addBinding(this.params, "noise", { label: "Noise Strength", min: 0, max: 0.5, step: 0.001 })
//             .on("change", (ev) => { if (this._effectsMap.final) this._effectsMap.final.noise = ev.value; });

//         finalFolder.addBinding(this.params, "grainScale", { label: "Grain Scale", min: 1, max: 16, step: 0.1 })
//             .on("change", (ev) => { if (this._effectsMap.final) this._effectsMap.final.grainScale = ev.value; });

//         // ---- Vignette / Halo
//         finalFolder.addBinding(this.params, "vignetteCenter", {
//             label: "Center", x: { min: 0, max: 1, step: 0.001 }, y: { min: 0, max: 1, step: 0.001 }
//         }).on("change", (ev) => {
//             if (this._final) this._final.vignetteCenter.set(ev.value.x, ev.value.y);
//         });

//         finalFolder.addBinding(this.params, "vignetteRadius", { label: "Radius", min: 0.3, max: 0.95, step: 0.001 })
//             .on("change", (ev) => { if (this._effectsMap.final) this._effectsMap.final.vignetteRadius = ev.value; });

//         finalFolder.addBinding(this.params, "vignetteStrength", { label: "Strength", min: 0, max: 1, step: 0.001 })
//             .on("change", (ev) => { if (this._effectsMap.final) this._effectsMap.final.vignetteStrength = ev.value; });

//         finalFolder.addBinding(this.params, "vignettePower", { label: "Falloff Power", min: 0.8, max: 4, step: 0.01 })
//             .on("change", (ev) => { if (this._effectsMap.final) this._effectsMap.final.vignettePower = ev.value; });

//         finalFolder.addBinding(this.params, "vignetteColor", {
//         }).on("change", (ev) => {
//             if (this._effectsMap.final) this._effectsMap.final.vignetteColorHex = new Color(ev.value.r, ev.value.g, ev.value.b).getHex();
//         });

//         // ---- Blend / Opacity
//         finalFolder.addBinding(this.params, "finalOpacity", { label: "Opacity", min: 0, max: 1, step: 0.01 })
//             .on("change", (ev) => { if (this._effectsMap.final) this._effectsMap.final.blendMode.opacity.value = ev.value; });

//         // blend function dropdown
//         finalFolder.addBinding(this.params, "finalBlend", {
//             label: "Blend",
//             options: { Normal: "NORMAL", Screen: "SCREEN", Add: "ADD", Multiply: "MULTIPLY", Overlay: "OVERLAY", SoftLight: "SOFT_LIGHT" }
//         }).on("change", (ev) => {
//             if (!this._final) return;
//             const map: Record<string, BlendFunction> = {
//                 NORMAL: BlendFunction.NORMAL,
//                 SCREEN: BlendFunction.SCREEN,
//                 ADD: BlendFunction.ADD,
//                 MULTIPLY: BlendFunction.MULTIPLY,
//                 OVERLAY: BlendFunction.OVERLAY,
//                 SOFT_LIGHT: BlendFunction.SOFT_LIGHT,
//             };
//             this._effectsMap.final.blendMode.setBlendFunction(map[ev.value]);
//         });
//     }

//     public resize(width: number, height: number) {
//         this._composer?.setSize(width, height);
//     }
// }
