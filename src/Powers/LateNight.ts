import { Color, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class LateNight {
    _modelLoader: GLTFLoader = new GLTFLoader();
    _model: Object3D | undefined;
    private _readyPromise!: Promise<Object3D>;

    constructor() {
        this.init();
    }

    private init(): void {
        this._readyPromise = new Promise<Object3D>((resolve, reject) => {
            this._modelLoader.load(
                '/models/LateNight.glb',
                (gltf: GLTF) => {
                    this._model = gltf.scene as Object3D;
                    this._model.traverse((child) => {
                        if ((child as any).isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;

                            if ((child as any).userData.isGlass) {
                                child.castShadow = false;
                                child.receiveShadow = false;
                            }

                            if ((child as any).userData.isEmmisive) {
                                const color = (child as any).material.emissive;

                                ((child as any).material as any).emissive = new Color(color.r * 2, color.g * 2, color.b * 2);
                                ((child as any).material as any).emissiveIntensity = 0.1;
                            }

                        }
                    });
                    resolve(this._model);
                },
                undefined,
                (error) => {
                    console.error('An error happened while loading the model:', error);
                    reject(error);
                }
            );
        });
    }

    public whenReady(): Promise<Object3D> {
        return this._readyPromise;
    }

    public render(t: number): void {
        if (!t) return;
    }

    public resize(): void {

    }

    public setDebug(debug: any): void {
        if (!debug) return;
    }
}