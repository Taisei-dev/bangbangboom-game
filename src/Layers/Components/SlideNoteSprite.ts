import { Sprite } from "pixi.js"
import { Resources, NoteHelper } from "../../Utils/SymbolClasses"
import { SlideEnd, SlideStart, Lane } from "../../Core/GameMap"
import { injectable } from "inversify"

@injectable()
export class SlideNoteSprite extends Sprite {
    constructor(private resource: Resources, private helper: NoteHelper) {
        super()
        this.anchor.set(0.5)
        this.visible = false
    }

    setTexture(note: SlideStart | SlideEnd) {
        if (note.critical) {
            this.texture = this.resource.game.textures!["critical"]
        } else {
            this.texture = this.resource.game.textures!["slide"]
        }
    }

    note?: SlideStart | SlideEnd
    shouldRemove = false

    applyInfo(note: SlideStart | SlideEnd) {
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
        this.helper.setScale(this, p.scale, this.note.lane.r - this.note.lane.l + 1)

        this.zIndex = p.scale
    }
}
