import { Pane } from "tweakpane";

export class PaneUtils {
    private pane: Pane;

    constructor() {
        this.pane = new Pane({
            title: 'Debug Panel',
        });
    }

    public addFolder(name: string) {
        return this.pane.addFolder({ title: name });
    }

    public getPane() {
        return this.pane;
    }
}