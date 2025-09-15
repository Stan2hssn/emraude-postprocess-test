import { BlendFunction, BloomEffect, BrightnessContrastEffect, DepthDownsamplingPass, EdgeDetectionMode, Effect, EffectComposer, EffectPass, NormalPass, Pass, RenderPass, SepiaEffect, SMAAEffect, SMAAPreset, SSAOEffect, VignetteEffect } from "postprocessing";
import { Camera, Color, OrthographicCamera, PerspectiveCamera, Scene, Texture, TextureLoader, Vector2, WebGLRenderer } from "three";
import type { TabPageApi } from "tweakpane";
import { Params } from "./Constants";
import { FinalEffect } from './FinalEffect';

export interface PostProcessingInterface {
    renderer: WebGLRenderer;
    scene: Scene;
    camera: OrthographicCamera | PerspectiveCamera | Camera;
    pixelRatio?: number;
    width?: number;
    height?: number;
}

const DEFAULT_POSTPROCESSING_ORDER = {
    SMAA: 1,
    SSR: 2,
    SSAO: 3,
    DoF: 4,
    MotionBlur: 5,
    ChromaticAberration: 6,
    Bloom: 7,
    GodRays: 8,
    Vignette: 9,
    ToneMapping: 10,
    LUT: 11,
    FilmGrain: 12,
    Pixelation: 13,
    Color: 14,
    Final: 15,
};

export default class PostProcessingManager {
    // core
    private _composer: EffectComposer | null = null;
    private _renderer!: WebGLRenderer;
    private _scene!: Scene;
    private _camera!: OrthographicCamera | PerspectiveCamera | Camera;
    private _assets: Record<string, Texture | null> = {};

    // effects
    private _helpers: Record<string, Pass | DepthDownsamplingPass> = {};
    private _effects: Record<string, Effect> = {};

    // passes
    private _normalPass!: NormalPass;
    private _effectsPass: EffectPass | null = null;

    // utils
    private _effectEnabled: Record<string, boolean> = {
        smaa: true,
        ssao: true,
        bloom: true,
        vignette: true,
        color: true,
        sepia: true,
        final: true,
    };
    public enabled: boolean = true;

    constructor({
        renderer,
        scene,
        camera,
        width = window.innerWidth,
        height = window.innerHeight
    }: PostProcessingInterface) {
        this._reset();
        this._init({ renderer, scene, camera, width, height });
        this._loadPostProcessingAssets();
    }

    //#region Init
    private _reset(): void {
        this._composer = null;
        this._assets = {};
    }

    private _init(
        options: PostProcessingInterface
    ): void {
        this._renderer = options.renderer;
        this._scene = options.scene;
        this._camera = options.camera;

        this._composer = new EffectComposer(this._renderer);
        this._composer.setSize(options.width || window.innerWidth, options.height || window.innerHeight);
    }

    private _loadPostProcessingAssets(): void {
        // load assets (SMAA images + grain)
        const loader = new TextureLoader();
        const assetUrls: Record<string, string> = {
            "smaa-search": "/images/smaa-search.png",
            "smaa-area": "/images/smaa-area.png",
            "grainTexture": "/images/grainTexture.png"
        };
        this._assets = {
            "smaa-search": null,
            "smaa-area": null,
            "grainTexture": null
        };

        Object.entries(assetUrls).forEach(([key, url]) => {
            loader.load(
                url,
                (texture) => {
                    this._assets[key] = texture;
                    if (Object.values(this._assets).every(Boolean)) {
                        this.setupPostProcessing();
                    }
                },
                undefined,
                (err) => console.error(`Error loading texture ${key}:`, err)
            );
        });
    }
    //#endregion


    //#region PostProcessing Setup
    private setupPostProcessing(
    ): void {
        if (!this._composer) return;

        this.setupBasics();
        this._setupEffects();
    }

    private setupBasics(): void {
        this._helpers.renderPass = new RenderPass(this._scene, this._camera);

        this._normalPass = new NormalPass(this._scene, this._camera);
        this._helpers.normalPass = this._normalPass as NormalPass;

        if (this._renderer.capabilities.isWebGL2) {
            this._helpers.depthDownPass = new DepthDownsamplingPass({
                normalBuffer: this._normalPass.texture,
                resolutionScale: 0.5
            });
        }
    }

    private _setupEffects(): void {
        if (!this._composer) return;
        this._effects.smaa = new SMAAEffect({
            preset: SMAAPreset.HIGH,
            edgeDetectionMode: EdgeDetectionMode.DEPTH,
            ...{
                searchImage: this._assets["smaa-search"]!,
                areaImage: this._assets["smaa-area"]!
            }
        });

        this._effects.ssao = new SSAOEffect(this._camera, this._normalPass.texture, {
            blendFunction: BlendFunction.MULTIPLY,
            distanceScaling: true,
            depthAwareUpsampling: true,
            normalDepthBuffer: this._helpers.depthDownPass ? (this._helpers.depthDownPass as DepthDownsamplingPass).texture : undefined,
            samples: 9,
            rings: 7,
            distanceThreshold: 0.02,
            distanceFalloff: 0.0025,
            rangeThreshold: 0.0003,
            rangeFalloff: 0.0001,
            luminanceInfluence: 0.7,
            minRadiusScale: 0.33,
            radius: Params.ssaoRadius,
            intensity: Params.ssaoIntensity,
            bias: Params.ssaoBias,
            fade: 0.01,
            resolutionScale: 0.5
        });
        this._effects.ssao.blendMode.opacity.value = Params.ssaoOpacity;

        this._effects.bloom = new BloomEffect({
            blendFunction: BlendFunction.ADD,
            luminanceThreshold: Params.threshold,
            luminanceSmoothing: 0.01,
            resolutionScale: Params.radius,
            intensity: Params.strength,
            mipmapBlur: true
        });
        this._effects.vignette = new VignetteEffect({
            eskil: true,
            offset: 0.2,
            darkness: 1.,
            blendFunction: BlendFunction.NORMAL
        });
        this._effects.color = new BrightnessContrastEffect({
            brightness: .2,
            contrast: 0.05,
            blendFunction: BlendFunction.SOFT_LIGHT
        });
        this._effects.sepia = new SepiaEffect({
            intensity: 1,
            blendFunction: BlendFunction.SOFT_LIGHT
        });

        const sepia = this._effects.sepia as SepiaEffect;
        sepia.intensity = Params.sepiaIntensity;

        this._effects.final = new FinalEffect({
            grain: this._assets["grainTexture"]!,
            noise: Params.noise,
            grainScale: Params.grainScale,
            vignetteCenter: new Vector2(Params.vignetteCenter.x, Params.vignetteCenter.y),
            vignetteRadius: Params.vignetteRadius,
            vignetteStrength: Params.vignetteStrength,
            vignettePower: Params.vignettePower,
            vignetteColor: new Color(
                Params.vignetteColor.r,
                Params.vignetteColor.g,
                Params.vignetteColor.b
            ),
            blendFunction: (() => {
                switch (Params.finalBlend) {
                    case "NORMAL": return BlendFunction.NORMAL;
                    case "SCREEN": return BlendFunction.SCREEN;
                    case "ADD": return BlendFunction.ADD;
                    case "MULTIPLY": return BlendFunction.MULTIPLY;
                    case "OVERLAY": return BlendFunction.OVERLAY;
                    case "SOFT_LIGHT": return BlendFunction.SOFT_LIGHT;
                    default: return BlendFunction.SCREEN;
                }
            })()
        });

        // enable all effects by default
        Object.keys(this._effects).forEach(key => {
            this._effectEnabled[key] = true;
        });

        this._buildPostProcessingPipeline();
    }
    //#endregion


    //#region Builder
    private _buildPostProcessingPipeline(
        customOrder: Record<string, number> = {}
    ): void {
        if (!this._composer) return;
        const order = { ...DEFAULT_POSTPROCESSING_ORDER, ...customOrder };

        // sort effects by order value
        this._effects = Object.fromEntries(
            Object.entries(this._effects).sort(([, a], [, b]) => {
                const orderA = order[a.name as keyof typeof order] ?? 999;
                const orderB = order[b.name as keyof typeof order] ?? 999;
                return orderA - orderB;
            })
        );

        // setup effect pass
        // remove previous pass if it exists
        if (this._effectsPass) {
            this._composer.removePass(this._effectsPass);
            this._effectsPass.dispose?.();
        }

        const activeEffects: Effect[] = Object.entries(this._effectEnabled)
            .filter(([_, enabled]) => enabled)
            .map(([key]) => this._effects[key as keyof typeof this._effects]);

        this._effectsPass = new EffectPass(this._camera, ...activeEffects);
        this._effectsPass.renderToScreen = true;
        this._composer.reset();
        // add passes in order
        this._composer.addPass(this._helpers.renderPass as RenderPass);
        this._composer.addPass(this._normalPass);
        if (this._helpers.depthDownPass) this._composer.addPass(this._helpers.depthDownPass as DepthDownsamplingPass);
        this._composer.addPass(this._effectsPass);
    }

    //#endregion

    //#region Public Methods
    /** Global toggle: bypass composer in render while preserving per-effect states. */
    public setEnabled(v: boolean) { this.enabled = v; }

    /** Enable/disable one effect (and helper passes if needed). */
    public setEffectEnabled(effect: keyof typeof this._effectEnabled, enabled: boolean) {
        this._effectEnabled[effect] = enabled;
        this._buildPostProcessingPipeline();
    }

    public render(t: number): void {
        if (!this._composer) return;
        this._composer.render(t);
    }

    public resize(width: number, height: number) {
        this._composer?.setSize(width, height);
    }

    public setupDebugPanel(root: TabPageApi) {
        // 🎯 SMAA
        const smaaFolder = root.addFolder({ title: "🎯 SMAA", expanded: false });
        smaaFolder.addBinding(this._effectEnabled, "smaa", { label: "Enable" })
            .on("change", (ev) => this.setEffectEnabled("smaa", ev.value));

        // 👻 SSAO
        const ssaoFolder = root.addFolder({ title: "👻 SSAO", expanded: false });
        ssaoFolder.addBinding(this._effectEnabled, "ssao", { label: "Enable" })
            .on("change", (ev) => this.setEffectEnabled("ssao", ev.value));
        ssaoFolder.addBinding(Params, "ssaoOpacity", { label: "Opacity", min: 0, max: 1, step: 0.01 })
            .on("change", (ev) => { if (this._ssao) this._ssao.blendMode.opacity.value = ev.value; });
        ssaoFolder.addBinding(Params, "ssaoIntensity", { label: "Intensity", min: 0, max: 4, step: 0.01 })
            .on("change", (ev) => { if (this._ssao) this._ssao.intensity = ev.value; });
        ssaoFolder.addBinding(Params, "ssaoRadius", { label: "Radius", min: 0.01, max: 1, step: 0.005 })
            .on("change", (ev) => { if (this._ssao) this._ssao.radius = ev.value; });

        // 🌸 Bloom
        const bloomFolder = root.addFolder({ title: "🌸 Bloom", expanded: false });
        bloomFolder.addBinding(this._effectEnabled, "bloom", { label: "Enable" })
            .on("change", (ev) => this.setEffectEnabled("bloom", ev.value));
        bloomFolder.addBinding(Params, "threshold", { label: "Threshold", min: 0, max: 1, step: 0.01 })
            .on("change", (ev) => { if (this._bloom) this._bloom.luminanceMaterial.threshold = ev.value; });
        bloomFolder.addBinding(Params, "strength", { label: "Intensity", min: 0, max: 20, step: 0.1 })
            .on("change", (ev) => { if (this._bloom) this._bloom.intensity = ev.value; });
        bloomFolder.addBinding(Params, "radius", { label: "Radius / Resolution", min: 0.1, max: 2, step: 0.01 })
            .on("change", (ev) => { if (this._bloom) (this._bloom as any).resolution.scale = ev.value; });

        // 🌑 Vignette
        const vignetteFolder = root.addFolder({ title: "🌑 Vignette", expanded: false });
        vignetteFolder.addBinding(this._effectEnabled, "vignette", { label: "Enable" })
            .on("change", (ev) => this.setEffectEnabled("vignette", ev.value));

        // 🎨 Sepia
        const sepiaFolder = root.addFolder({ title: "🎨 Sepia", expanded: false });
        sepiaFolder.addBinding(this._effectEnabled, "sepia", { label: "Enable" })
            .on("change", (ev) => this.setEffectEnabled("sepia", ev.value));
        sepiaFolder.addBinding(Params, "sepiaIntensity", { label: "Intensity", min: 0, max: 1, step: 0.01 });

        // 🎨 Color (Brightness/Contrast)
        const colorFolder = root.addFolder({ title: "🎨 Color", expanded: false });
        colorFolder.addBinding(this._effectEnabled, "color", { label: "Enable" })
            .on("change", (ev) => this.setEffectEnabled("color", ev.value));
        // colorFolder.addBinding((this._color as BrightnessContrastEffect).uniforms.get("brightness"), "value", {
        //     label: "Brightness", min: -1, max: 1, step: 0.01
        // });
        // colorFolder.addBinding((this._color as BrightnessContrastEffect).uniforms.get("contrast"), "value", {
        //     label: "Contrast", min: -1, max: 1, step: 0.01
        // });

        // 🎛️ Final Mix
        const finalFolder = root.addFolder({ title: "🎛️ Final Mix", expanded: false });
        finalFolder.addBinding(this._effectEnabled, "final", { label: "Enable" })
            .on("change", (ev) => this.setEffectEnabled("final", ev.value));
        finalFolder.addBinding(Params, "noise", { label: "Noise Strength", min: 0, max: 0.5, step: 0.001 })
            .on("change", (ev) => { if (this._final) this._final.noise = ev.value; });
        finalFolder.addBinding(Params, "grainScale", { label: "Grain Scale", min: 1, max: 16, step: 0.1 })
            .on("change", (ev) => { if (this._final) this._final.grainScale = ev.value; });
        finalFolder.addBinding(Params, "vignetteCenter", {
            label: "Center", x: { min: 0, max: 1, step: 0.001 }, y: { min: 0, max: 1, step: 0.001 }
        }).on("change", (ev) => { if (this._final) this._final.vignetteCenter.set(ev.value.x, ev.value.y); });
        finalFolder.addBinding(Params, "vignetteRadius", { label: "Radius", min: 0.3, max: 0.95, step: 0.001 })
            .on("change", (ev) => { if (this._final) this._final.vignetteRadius = ev.value; });
        finalFolder.addBinding(Params, "vignetteStrength", { label: "Strength", min: 0, max: 1, step: 0.001 })
            .on("change", (ev) => { if (this._final) this._final.vignetteStrength = ev.value; });
        finalFolder.addBinding(Params, "vignettePower", { label: "Falloff Power", min: 0.8, max: 4, step: 0.01 })
            .on("change", (ev) => { if (this._final) this._final.vignettePower = ev.value; });
        finalFolder.addBinding(Params, "vignetteColor", { label: "Color" })
            .on("change", (ev) => {
                if (this._final) this._final.vignetteColorHex =
                    new Color(ev.value.r, ev.value.g, ev.value.b).getHex();
            });
        finalFolder.addBinding(Params, "finalOpacity", { label: "Opacity", min: 0, max: 1, step: 0.01 })
            .on("change", (ev) => { if (this._final) this._final.blendMode.opacity.value = ev.value; });
        finalFolder.addBinding(Params, "finalBlend", {
            label: "Blend Mode",
            options: {
                Normal: "NORMAL",
                Screen: "SCREEN",
                Add: "ADD",
                Multiply: "MULTIPLY",
                Overlay: "OVERLAY",
                SoftLight: "SOFT_LIGHT",
            },
        }).on("change", (ev) => {
            if (!this._final) return;
            const map: Record<string, BlendFunction> = {
                NORMAL: BlendFunction.NORMAL,
                SCREEN: BlendFunction.SCREEN,
                ADD: BlendFunction.ADD,
                MULTIPLY: BlendFunction.MULTIPLY,
                OVERLAY: BlendFunction.OVERLAY,
                SOFT_LIGHT: BlendFunction.SOFT_LIGHT,
            };
            this._final.blendMode.setBlendFunction(map[ev.value]);
        });
    }



    //#region Getters
    get _renderPass() { return this._helpers.renderPass as RenderPass; }
    get _depthDownPass() { return this._helpers.depthDownPass as DepthDownsamplingPass | undefined; }

    get _smaa() { return this._effects.smaa as SMAAEffect; }
    get _ssao() { return this._effects.ssao as SSAOEffect; }
    get _bloom() { return this._effects.bloom as BloomEffect; }
    get _vignette() { return this._effects.vignette as VignetteEffect; }
    get _color() { return this._effects.color as BrightnessContrastEffect; }
    get _sepia() { return this._effects.sepia as SepiaEffect; }
    get _final() { return this._effects.final as FinalEffect; }

    get _effectsMap() {
        return {
            smaa: this._smaa,
            ssao: this._ssao,
            bloom: this._bloom,
            vignette: this._vignette,
            color: this._color,
            final: this._final,
        };
    }
}