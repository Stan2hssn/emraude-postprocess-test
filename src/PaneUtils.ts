import { Pane } from "tweakpane";

export class PaneUtils {
    private _pane: Pane;

    constructor() {
        this._pane = new Pane();
    }

    public addFolder(name: string) {
        return this.pane.addFolder({ title: name });
    }

    public get pane() {
        return this._pane;
    }
}