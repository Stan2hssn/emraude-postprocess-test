import Stats from 'stats-gl';
import {
	Camera,
	Color,
	EquirectangularReflectionMapping,
	OrthographicCamera,
	PCFSoftShadowMap,
	PerspectiveCamera,
	PMREMGenerator,
	Scene,
	TextureLoader,
	WebGLRenderer
} from 'three';
// import { ThreePerf } from 'three-perf';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { PaneUtils } from './PaneUtils';
import Power from './Powers/Power';
import PostProcessingManager from './postprocessing/PostProcessingManager';




export default class Playground {
	private _viewport: Record<'width' | 'height', number>;
	private _camera: OrthographicCamera | PerspectiveCamera | Camera | null = null;
	private _scene: Scene | null = null;
	private _renderer: WebGLRenderer | null = null;
	private _controls: OrbitControls | null = null;
	private _postprocessing: PostProcessingManager | undefined;

	private _stats: Stats | undefined = undefined;
	// private _perf: ThreePerf | undefined = undefined;

	private _power: Power | undefined = undefined;

	public _debugPanel: Pane | null = null;

	constructor(canvas: HTMLCanvasElement) {
		this._viewport = {
			width: window.innerWidth,
			height: window.innerHeight,
		} as Record<'width' | 'height', number>;

		this.init(canvas);
	}

	// Setup all initial configurations
	init(canvas: HTMLCanvasElement) {
		this.setupCamera();
		this.setupScene();
		this.setupRenderer(canvas);
		this.setupComposer();
		this.setupPowers();
		this.setupControls();
		this.setupDebugPanel();
		this.setupStats();
	}

	setupStats() {
		this._stats = new Stats({
			trackGPU: true,
			trackHz: true,
			trackCPT: true,
			logsPerSecond: 4,
			graphsPerSecond: 30,
			samplesLog: 40,
			samplesGraph: 10,
			precision: 2,
			horizontal: false,
			minimal: false,
			mode: 2,
		});

		// if (this._stats && this._renderer) {
		this._renderer?.domElement.parentElement?.appendChild(this._stats.dom);
		this._stats.init(this._renderer);

		// 	this._perf = new ThreePerf({
		// 		anchorX: 'right',
		// 		anchorY: 'bottom',
		// 		domElement: document.body, // or other canvas rendering wrapper
		// 		renderer: this._renderer // three js renderer instance you use for rendering
		// 	});
		// }
	}

	// Configure the camera
	setupCamera() {
		this._camera = new PerspectiveCamera(80, this._viewport.width / this._viewport.height, 0.1, 1000);
		this._camera.position.set(6, 4, 7);
		this._camera.lookAt(0, 0, 0);
	}

	// Create and configure the scene
	setupScene() {
		this._scene = new Scene();
		this._scene.background = new Color(0x060606);

		const loader = new TextureLoader();
		loader.load('/envMap/EnvMap.png', (texture) => {
			texture.mapping = EquirectangularReflectionMapping;

			const pmremGenerator = new PMREMGenerator(this._renderer!);
			pmremGenerator.compileEquirectangularShader();

			const envMap = pmremGenerator.fromEquirectangular(texture).texture;

			this._scene!.environment = envMap;
			this._scene!.environmentIntensity = .1;

			texture.dispose();
			pmremGenerator.dispose();
		});

	}

	// Configure the renderer
	setupRenderer(canvas: HTMLCanvasElement) {
		this._renderer = new WebGLRenderer({
			canvas,
		});
		this._renderer.shadowMap.enabled = true;
		this._renderer.shadowMap.type = PCFSoftShadowMap;

		this._renderer.setSize(this._viewport.width, this._viewport.height);
		this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	}

	// Create and configure the mesh
	setupPowers() {
		this._power = new Power;

		this._scene?.add(this._power?.componentsGroup);

		console.log('scene', this._scene);

	}

	// Setup the debug panel
	setupDebugPanel() {
		this._debugPanel = new PaneUtils().pane;
		if (!this._debugPanel) return;

		const tab = this._debugPanel.addTab({
			pages: [
				{ title: "🌐 Global Settings" },
				{ title: "✨ PostProcessing" },
			],
		});

		const globalTab = tab.pages[0];

		// 🌍 OrbitControls
		const controlsFolder = globalTab.addFolder({ title: "🌀 Orbit Controls", expanded: false });
		const controlsState = { active: true };
		controlsFolder.addBinding(controlsState, "active", {
			label: "Enable",
		}).on("change", (ev) => {
			if (this._controls) this._controls.enabled = ev.value;
		});

		// 🎥 Camera
		if (this._camera) {
			const camFolder = globalTab.addFolder({ title: "🎥 Camera Settings", expanded: false });

			if ((this._camera as any).isPerspectiveCamera) {
				const cam = this._camera as PerspectiveCamera;
				camFolder.addBinding(cam, "fov", {
					label: "Field of View",
					min: 10, max: 120, step: 1,
				}).on("change", () => cam.updateProjectionMatrix());
			}

			if ((this._camera as any).isOrthographicCamera) {
				const cam = this._camera as OrthographicCamera;
				camFolder.addBinding(cam, "zoom", {
					label: "Zoom",
					min: 0.1, max: 5, step: 0.01,
				}).on("change", () => cam.updateProjectionMatrix());
			}

			const posFolder = camFolder.addFolder({ title: "📍 Position", expanded: false });
			posFolder.addBinding(this._camera.position, "x", { label: "X", min: -20, max: 20, step: 0.1 });
			posFolder.addBinding(this._camera.position, "y", { label: "Y", min: -20, max: 20, step: 0.1 });
			posFolder.addBinding(this._camera.position, "z", { label: "Z", min: -20, max: 20, step: 0.1 });
		}

		// ✨ PostProcessing
		if (this._postprocessing) {
			const ppTab = tab.pages[1];

			// Let PostProcessing populate its own sub-folders
			this._postprocessing.setupDebugPanel(ppTab);
		}
	}


	// Configure controls
	setupControls() {
		const canvas = document.querySelector("canvas");
		if (!canvas) {
			console.error("Canvas element not found.");
			return;
		}
		if (!this._camera) {
			console.error("Camera not initialized.");
			return;
		}
		this._controls = new OrbitControls(this._camera, canvas);
		this._controls.enableDamping = true;
		this._controls.target.set(0, 0, 0);
	}


	setupComposer() {
		this._postprocessing = new PostProcessingManager({
			renderer: this._renderer as WebGLRenderer,
			scene: this._scene as Scene,
			camera: this._camera as OrthographicCamera | PerspectiveCamera | Camera,
			pixelRatio: window.devicePixelRatio,
			width: this._viewport.width,
			height: this._viewport.height
		}
		);
	}

	render(time: number) {
		if (this._stats) this._stats.update();
		if (this._power) this._power.render(time / 1000);
		if (this._controls) this._controls.update();

		// Always call PostProcessing.render; it will bypass when disabled
		if (this._postprocessing) {
			this._postprocessing.render(time);
		} else if (this._renderer && this._scene && this._camera) {
			// if (this._perf) this._perf.begin();
			this._renderer.render(this._scene, this._camera);
			// if (this._perf) this._perf.end();
		}

		requestAnimationFrame(this.render.bind(this));
	}

	// Handle viewport resize
	resize() {
		this._viewport = {
			width: window.innerWidth,
			height: window.innerHeight,
		};

		this._postprocessing?.resize(this._viewport.width, this._viewport.height);

		if (this._camera) {
			// Only PerspectiveCamera has 'aspect' and 'updateProjectionMatrix'
			if ('isPerspectiveCamera' in this._camera && (this._camera as any).isPerspectiveCamera) {
				const perspectiveCamera = this._camera as PerspectiveCamera;
				perspectiveCamera.aspect = this._viewport.width / this._viewport.height;
				perspectiveCamera.updateProjectionMatrix();
			}
			// Only OrthographicCamera has 'updateProjectionMatrix'
			else if ('isOrthographicCamera' in this._camera && (this._camera as any).isOrthographicCamera) {
				const orthoCamera = this._camera as OrthographicCamera;
				// OrthographicCamera does not have 'aspect', but you may want to update left/right/top/bottom here if needed
				orthoCamera.updateProjectionMatrix();
			}
			this._camera.updateMatrixWorld();
		}

		if (this._renderer) {
			this._renderer.setSize(this._viewport.width, this._viewport.height);
			this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		}
	}

	// Dispose resources
	dispose() { }
}
