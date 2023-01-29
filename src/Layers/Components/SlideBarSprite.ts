import { Sprite2d } from "../../Common/Sprite2d"
import { injectable } from "inversify"
import { Resources, NoteHelper } from "../../Utils/SymbolClasses"
import { SlideBar } from "../../Core/GameMap"
import { ratio } from "../../Utils/Utils"
import { LaneCenterX } from "../../Core/Constants"
import { projection } from "../../Core/Projection"
import { filters, Matrix } from "pixi.js"

@injectable()
export class SlideBarSprite extends Sprite2d {
    constructor(private resource: Resources, private helper: NoteHelper) {
        super(resource.game.textures?.slide_bar)
        this.scale.set(0.2)
        this.anchor.set(0.5, 1)
        this.visible = false
    }

    setTexture(bar: SlideBar) {
        if (bar.critical) {
            this.texture = this.resource.game.textures!["slide_bar_critical"]
        } else {
            this.texture = this.resource.game.textures!["slide_bar"]
        }
    }

    shouldRemove = false
    bar?: SlideBar

    applyInfo(bar: SlideBar) {
        this.bar = bar
        this.setTexture(bar)
        this.visible = true
        this.shouldRemove = false
    }

    update(musicTime: number) {
        if (!this.visible || this.shouldRemove || !this.bar) return

        let st = this.bar.start.time
        if (st < musicTime && this.bar.parent.holded) st = musicTime
        let et = this.bar.end.time
        if (et > musicTime + this.helper.staytime) et = musicTime + this.helper.staytime

        if (this.bar.parent.start.time <= musicTime && !this.bar.parent.holded) {
            const matrix = new filters.ColorMatrixFilter()
            matrix.brightness(0.5, false)
            this.filters = [matrix]
        } else {
            this.filters = []
        }

        if (
            this.bar.end.judge ||
            /*this.bar.start.judge === "miss" ||*/
            st >= et ||
            musicTime > this.bar.end.time + 1 /*||
            (!this.bar.start.parent.pointerId && musicTime > this.bar.start.time + 1)*/
        ) {
            this.shouldRemove = true
            this.visible = false
            this.zIndex = 0
            return
        }

        const startPos = ratio(
            this.bar.start.time,
            this.bar.end.time,
            st,
            LaneCenterX(this.bar.start.lane),
            LaneCenterX(this.bar.end.lane)
        )
        const startT = (st - musicTime) / this.helper.staytime
        const sp = projection(startT, startPos)

        const endPos = ratio(
            this.bar.start.time,
            this.bar.end.time,
            et,
            LaneCenterX(this.bar.start.lane),
            LaneCenterX(this.bar.end.lane)
        )
        const endT = (et - musicTime) / this.helper.staytime
        const ep = projection(endT, endPos)

        const f = sp.scale / ep.scale

        const sx = (this.helper.noteScale.x * sp.scale) / NoteHelper.noteInitScaleX
        const sy = ((sp.y - ep.y) / this.texture.height) * f
        this.transform.setFromMatrix(new Matrix(sx, 0, ((ep.x - sp.x) / (ep.y - sp.y)) * sy, sy, sp.x, sp.y))

        this.projectionY = 1 - f

        this.zIndex = sp.scale
    }
}
