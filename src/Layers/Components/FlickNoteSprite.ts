import { Sprite } from "pixi.js"
import { Resources, NoteHelper } from "../../Utils/SymbolClasses"
import { Lane, Flick, SlideFlickEnd } from "../../Core/GameMap"
import { injectable } from "inversify"

@injectable()
export class FlickNoteSprite extends Sprite {
    constructor(private resource: Resources, private helper: NoteHelper) {
        super()
        this.anchor.set(0.5)
        this.visible = false

        this.top = new Sprite()
        this.top.anchor.set(0.5, 1)

        this.addChild(this.top)
    }

    private top: Sprite

    setTexture(note: Flick | SlideFlickEnd) {
        if (note.critical) {
            this.texture = this.resource.game.textures!["critical"]
            if (note.direction === "up") {
                this.top.texture =
                    this.resource.game.textures![
                        "flick_top_critical_" + (Math.ceil((note.lane.r - note.lane.l + 1) / 2) * 2 - 1)
                    ]
            } else {
                this.top.texture =
                    this.resource.game.textures![
                        "flick_top_directional_critical_" + (Math.ceil((note.lane.r - note.lane.l + 1) / 2) * 2 - 1)
                    ]
            }
        } else {
            this.texture = this.resource.game.textures!["flick"]
            if (note.direction === "up") {
                this.top.texture =
                    this.resource.game.textures![
                        "flick_top_" + (Math.ceil((note.lane.r - note.lane.l + 1) / 2) * 2 - 1)
                    ]
            } else {
                this.top.texture =
                    this.resource.game.textures![
                        "flick_top_directional_" + (Math.ceil((note.lane.r - note.lane.l + 1) / 2) * 2 - 1)
                    ]
            }
        }
    }

    note?: Flick | SlideFlickEnd
    shouldRemove = false

    applyInfo(note: Flick | SlideFlickEnd) {
        this.note = note
        this.setTexture(note)
        this.top.scale.set(3 / (this.note.lane.r - this.note.lane.l), 2)
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
        this.helper.setScale(
            this,
            p.scale,
            (this.note.lane.r - this.note.lane.l + 1) * (this.note.direction === "right" ? -1 : 1)
        )

        this.top.y = Math.sin(musicTime * 10) * 30 - 30
        this.zIndex = p.scale
    }
}
