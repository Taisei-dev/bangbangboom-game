import { GameEvent } from "../Common/GameEvent"
import { LoaderResource, Container, Sprite } from "pixi.js"
import { injectable } from "inversify"
import { GameConfig, staytime } from "../Core/GameConfig"
import { JudgePoint } from "../Core/GameMap"
import { projection } from "../Core/Projection"
import { LaneCenterX } from "../Core/Constants"

export class MainStage extends Container {}

export class GlobalEvents {
    /** delta, time in seconds */
    Update = new GameEvent<[number, number]>()
    /** width, height */
    Resize = new GameEvent<[number, number]>()
    WindowBlur = new GameEvent<[]>()
    WindowFocus = new GameEvent<[]>()
    End = new GameEvent<[]>()
}

export class Resources {
    [key: string]: LoaderResource
}

@injectable()
export class NoteHelper {
    static noteInitScaleX = 0.42
    static noteInitScaleY = 0.6
    constructor(config: GameConfig) {
        this.staytime = staytime(config.speed)
        this.noteScale = {
            x: NoteHelper.noteInitScaleX * config.noteScale,
            y: NoteHelper.noteInitScaleY * config.noteScale,
        }
    }

    noteScale: { x: number; y: number }
    staytime: number

    /** pre-multiplied config note scale */
    calc(note: JudgePoint, musicTime: number) {
        const dt = musicTime - note.time
        const t = dt / this.staytime
        return projection(t, LaneCenterX(note.lane))
    }

    setScale(note: Sprite, scale: number, xScale: number) {
        note.scale.set(scale * this.noteScale.x * xScale, scale * this.noteScale.y)
    }
}
