import {
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
	private viewport: Record<'width' | 'height', number>;
	private camera: OrthographicCamera;
	private scene: Scene;
	private renderer: WebGLRenderer;
	private mesh: Mesh;
	private material: MeshBasicMaterial | ShaderMaterial;
	private controls: OrbitControls;
	public textureLoader = new TextureLoader();
	public debugPanel: Pane | null = null;



	constructor(canvas: HTMLCanvasElement) {
		this.viewport = {
			width: window.innerWidth,
			height: window.innerHeight,
		} as Record<'width' | 'height', number>;
		this.camera = null as unknown as OrthographicCamera;
		this.scene = null as unknown as Scene;
		this.renderer = null as unknown as WebGLRenderer;
		this.mesh = null as unknown as Mesh;
		this.material = null as unknown as ShaderMaterial;
		this.controls = null as unknown as OrbitControls;
		this.textureLoader = null as unknown as TextureLoader;
		this.debugPanel = null as unknown as Pane;

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
		this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 3);
		this.camera.position.set(0, 0, 1);
	}

	// Create and configure the scene
	setupScene() {
		this.scene = new Scene();
	}

	// Configure the renderer
	setupRenderer(canvas: HTMLCanvasElement) {
		this.renderer = new WebGLRenderer({
			canvas,
		});

		this.renderer.setSize(this.viewport.width, this.viewport.height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	}

	// Create and configure the mesh
	setupMesh() {
		this.textureLoader = new TextureLoader();

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

		this.material = new MeshBasicMaterial({ side: DoubleSide });

		this.material.onBeforeCompile = (shader) => {
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

		this.mesh = new Mesh(new PlaneGeometry(1, 1), this.material);

		this.scene.add(this.mesh);
	}

	// Setup the debug panel
	setupDebugPanel() {
		const debugPanel = new PaneUtils();
		this.debugPanel = debugPanel.getPane();

		if (this.debugPanel) {
			// const folder = this.debugPanel.addFolder({ title: 'Settings' });

		}
	}
	// Configure controls
	setupControls() {
		this.controls = new OrbitControls(this.camera, document.querySelector("canvas"));
		this.controls.enableDamping = true;
	}

	// Render the scene
	render(time: number) {
		this.controls.update(time);

		this.renderer.render(this.scene, this.camera);
		requestAnimationFrame(this.render.bind(this));
	}

	// Handle viewport resize
	resize() {
		this.viewport = {
			width: window.innerWidth,
			height: window.innerHeight,
		};


		this.camera.updateProjectionMatrix();

		this.renderer.setSize(this.viewport.width, this.viewport.height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	}

	// Dispose resources
	dispose() { }
}
