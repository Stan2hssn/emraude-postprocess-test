import {
	Camera,
	DoubleSide,
	Mesh,
	MeshBasicMaterial,
	OrthographicCamera,
	PlaneGeometry,
	Scene,
	ShaderMaterial,
	SRGBColorSpace,
	Texture,
	TextureLoader,
	WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { PaneUtils } from './PaneUtils';


export default class Playground {
	private _viewport: Record<'width' | 'height', number>;
	private _camera: OrthographicCamera | Camera | null = null;
	private _scene: Scene | null = null;
	private _renderer: WebGLRenderer | null = null;
	private _mesh: Mesh | null = null;
	private _material: MeshBasicMaterial | ShaderMaterial | null = null;
	private _controls: OrbitControls | null = null;
	public _textureLoader = new TextureLoader();
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
		this.setupMesh();
		this.setupControls();
		this.setupDebugPanel();
	}

	// Configure the camera
	setupCamera() {
		this._camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 3);
		this._camera.position.set(0, 0, 1);
	}

	// Create and configure the scene
	setupScene() {
		this._scene = new Scene();
	}

	// Configure the renderer
	setupRenderer(canvas: HTMLCanvasElement) {
		this._renderer = new WebGLRenderer({
			canvas,
		});

		this._renderer.setSize(this._viewport.width, this._viewport.height);
		this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	}

	// Create and configure the mesh
	setupMesh() {
		this._textureLoader = new TextureLoader();

		const textures = {
		} as Record<string, Texture>;

		Object.values(textures).forEach((texture: Texture) => {
			if (!texture) {
				console.error(`Texture failed to load.`);
			} else {
				texture.colorSpace = SRGBColorSpace;
				texture.flipY = false;
			}
		});

		this._material = new MeshBasicMaterial({ side: DoubleSide });

		this._material.onBeforeCompile = (shader) => {
			shader.vertexShader = "varying vec2 vUv;\n" + shader.vertexShader;
			shader.vertexShader = shader.vertexShader.replace(
				"#include <begin_vertex>",
				`
			  #include <begin_vertex>
			  vUv = uv;
			`
			);
			shader.fragmentShader = "varying vec2 vUv;\n" + shader.fragmentShader;
			shader.fragmentShader = shader.fragmentShader.replace(
				"#include <color_fragment>",
				`
			  diffuseColor.rgb = vec3(vUv, 1.0);
			`
			);
		};

		this._mesh = new Mesh(new PlaneGeometry(1, 1), this._material);

		this._scene?.add(this._mesh);
	}

	// Setup the debug panel
	setupDebugPanel() {
		this._debugPanel = new PaneUtils().pane;

		if (this._debugPanel) {
			// const folder = this.debugPanel.addFolder({ title: 'Settings' });

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
	}
	render(time: number) {
		if (this._controls) {
			this._controls.update(time);
		}

		if (this._renderer && this._scene && this._camera) {
			this._renderer.render(this._scene, this._camera);
		}
		requestAnimationFrame(this.render.bind(this));
	}

	// Handle viewport resize
	resize() {
		this._viewport = {
			width: window.innerWidth,
			height: window.innerHeight,
		};
		if (this._camera && 'updateProjectionMatrix' in this._camera && typeof this._camera.updateProjectionMatrix === 'function') {
			this._camera.updateProjectionMatrix();
		}

		if (this._renderer) {
			this._renderer.setSize(this._viewport.width, this._viewport.height);
			this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		}
	}

	// Dispose resources
	dispose() { }
}
