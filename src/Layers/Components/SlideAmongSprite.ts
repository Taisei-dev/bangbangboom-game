import { Sprite } from "pixi.js"
import { Resources, NoteHelper } from "../../Utils/SymbolClasses"
import { Slide, SlideAmong } from "../../Core/GameMap"
import { injectable } from "inversify"

@injectable()
export class SlideAmongSprite extends Sprite {
    constructor(private resource: Resources, private helper: NoteHelper) {
        super()
        this.anchor.set(0.5)
        this.visible = false
    }

    setTexture(note: SlideAmong) {
        if (note.critical) {
            this.texture = this.resource.game.textures!["slide_among_critical"]
        } else if (!note.hidden) {
            this.texture = this.resource.game.textures!["slide_among"]
        }
    }

    note?: SlideAmong
    shouldRemove = false

    applyInfo(note: SlideAmong) {
        this.note = note
        this.setTexture(note)
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
        this.helper.setScale(this, p.scale, 1)

        this.zIndex = p.scale
    }
}
