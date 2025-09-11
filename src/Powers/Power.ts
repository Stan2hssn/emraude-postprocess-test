import { Color, DirectionalLight, Group, Mesh, MeshStandardMaterial, OrthographicCamera, PlaneGeometry, PointLight, type Object3D } from "three";
import LateNight from "./LateNight";

export default class Power {
    private _componentsGroup: Group = new Group;
    private _lightsGroup: Group = new Group;
    private _meshesGroup: Group = new Group;

    private _components: Record<string, Object3D> = {};

    private _lateNight: LateNight | undefined = undefined;


    constructor() {

        this._init();
    }

    private _init(): void {
        this._setupMeshes();
        this._setupLight();

        this._componentsGroup.add(this._meshesGroup, this._lightsGroup);
    }

    _setupLight(): void {
        const point = new PointLight(new Color(0xCFD3FF), 1);
        point.position.set(0, 2, 0);
        this._lightsGroup.add(point);

        const lanternsPositions = [
            { x: 5, y: 3, z: 5 },
            { x: -5, y: 3, z: 5 },
            { x: 5, y: 3, z: -5 },
            { x: -5, y: 3, z: -5 },
        ];

        lanternsPositions.forEach((pos) => {
            const lantern = new PointLight(new Color(0xCFD3FF), 10);
            lantern.position.set(pos.x, pos.y, pos.z);
            this._lightsGroup.add(lantern);
        });

        const backLight = new DirectionalLight(new Color(0xCFD3FF), 2);
        backLight.position.set(0, 7, -10); // elevate & angle a bit
        backLight.castShadow = true;

        backLight.shadow.mapSize.set(2048, 2048);

        const cam = backLight.shadow.camera as OrthographicCamera;
        cam.left = -60;
        cam.right = 60;
        cam.top = 60;
        // cam.bottom = -60;
        cam.near = 0.5;
        // cam.far = 150;
        cam.updateProjectionMatrix();

        backLight.shadow.bias = -0.0005;
        backLight.shadow.normalBias = 0.02;

        backLight.target.position.set(0, 0, 0);

        const frontLight = new DirectionalLight(new Color(0xFEAD00), 1);
        frontLight.position.set(-5, 10, 20); // elevate & angle a bit
        frontLight.castShadow = true;

        frontLight.shadow.mapSize.set(2048, 2048);

        const frontCam = frontLight.shadow.camera as OrthographicCamera;
        frontCam.left = -60;
        frontCam.right = 60;
        frontCam.top = 60;
        frontCam.bottom = -60;
        frontCam.near = 0.5;
        frontCam.far = 150;
        frontCam.updateProjectionMatrix();

        frontLight.shadow.bias = -0.0005;
        frontLight.shadow.normalBias = 0.02;

        frontLight.target.position.set(0, 0, 0);

        this._lightsGroup.add(backLight.target, frontLight.target);

        // Helpers
        // const directionalHelper = new DirectionalLightHelper(directionalLight, 2);
        // const shadowCamHelper = new CameraHelper(directionalLight.shadow.camera);

        this._lightsGroup.add(backLight, frontLight);
    }

    _setupMeshes(): void {
        this._lateNight = new LateNight();


        const floor = new Mesh(
            new PlaneGeometry(1000, 1000),
            new MeshStandardMaterial({ color: new Color(0x000000) })
        );
        floor.rotation.x = - Math.PI * 0.5;
        floor.position.y = -.4;
        floor.receiveShadow = true;

        this._meshesGroup.add(floor);

        this._lateNight.whenReady().then((model) => {
            this._components.lateNight = model;
            this._components.lateNight.receiveShadow = true;
            this._components.lateNight.castShadow = true;
            this._meshesGroup.add(model);
        }).catch(() => {
            // swallow; error already logged in loader
        });
    }

    public render(t: number): void {
        if (!t) return;
        this._lateNight?.render(t);
    }

    public resize(): void {

    }

    // public dispose(): void {
    //     this._meshesGroup.traverse((child) => {
    //         if ((child as any).isMesh) {
    //             (child as any).geometry.dispose();
    //             if (Array.isArray((child as any).material)) {
    //                 (child as any).material.forEach((material: any) => material.dispose());
    //             } else {
    //                 (child as any).material.dispose();
    //             }
    //         }
    //     });
    // }

    public setDebug(debug: any): void {
        if (!debug) return;
    }

    public get componentsGroup(): Group {
        return this._componentsGroup;
    }
}