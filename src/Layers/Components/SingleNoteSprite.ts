import { Sprite } from "pixi.js"
import { Resources, NoteHelper } from "../../Utils/SymbolClasses"
import { Lane, Single } from "../../Core/GameMap"
import { injectable } from "inversify"
import { GameConfig } from "../../Core/GameConfig"

@injectable()
export class SingleNoteSprite extends Sprite {
    constructor(private resource: Resources, private helper: NoteHelper, private config: GameConfig) {
        super()
        this.anchor.set(0.5)
        this.visible = false
    }

    setTexture(lane: Lane) {
        if (!this.note?.onbeat && this.config.beatNote) this.texture = this.resource.game.textures!["critical"]
        else this.texture = this.resource.game.textures!["single"]
    }

    note?: Single
    shouldRemove = false

    applyInfo(note: Single) {
        this.note = note
        this.setTexture(note.lane)
        this.shouldRemove = false
        this.visible = true
    }

    update(musicTime: number) {
        if (!this.visible || this.shouldRemove || !this.note) return

        if (this.note.judge || musicTime > this.note.time + 1) {
            this.shouldRemove = true
            this.visible = false
            this.zIndex = 0
            return
        }

        const p = this.helper.calc(this.note, musicTime)
        this.position.set(p.x, p.y)
        this.helper.setScale(this, p.scale, this.note.lane.r - this.note.lane.l)

        this.zIndex = p.scale
    }
}
