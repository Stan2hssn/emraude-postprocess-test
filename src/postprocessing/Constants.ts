export const Params = {

    // Bloom
    threshold: 0.43,
    strength: 1,
    radius: 0.5,
    // SSAO
    ssaoIntensity: 1.33,
    ssaoRadius: 0.1,
    ssaoBias: 0.025,
    ssaoOpacity: 0.8,

    // FinalEffect params (for reference; not exposed to UI)
    noise: 0.038,
    grainScale: 6.0,

    vignetteCenter: { x: 0.5, y: 0.5 },
    vignetteRadius: 0.3,
    vignetteStrength: 0.15,
    vignettePower: 0.8,
    vignetteColor: { r: 0.06, g: 0.07, b: 0.10 }, // tweakpane 'float' color
    finalOpacity: 1,
    finalBlend: "ADD", // UI label; we map to BlendFunction

    // Color
    brightness: 0,
    contrast: 0,

    // Sepia
    sepiaIntensity: .43,
    sepiaBlend: "ADD", // UI label; we map to BlendFunction
};