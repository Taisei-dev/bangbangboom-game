import { Container, ITextureDictionary } from "pixi.js"
import { injectable } from "inversify"
import { EffectInfo } from "../../Common/InfoObject/InfoType"
import { Resources, GlobalEvents } from "../../Utils/SymbolClasses"
import { InfoEffect } from "../../Common/InfoObject/InfoEffect"
import { GameState } from "../../Core/GameState"
import { Slide, SlideBar } from "../../Core/GameMap"
import { ratio, findex, ObjectPool } from "../../Utils/Utils"
import { LaneCenterX, LaneBottomY, LayerWidth, LayerHeight } from "../../Core/Constants"
import { GameConfig } from "../../Core/GameConfig"

type EffectLayerInfo = {
    tap: EffectInfo
    single: EffectInfo
    flick: EffectInfo
    slide: EffectInfo
    fullcombo: EffectInfo
}

export class SingleEffectLayer extends Container {
    constructor(private info: EffectInfo, private textures: ITextureDictionary | undefined, private initScale: number) {
        super()
        this.pool.newObj = () => {
            const eff = new InfoEffect(this.info, this.textures)
            eff.scale.set(this.initScale)
            this.addChild(eff)
            return eff
        }
        this.pool.beforeSave = e => (e.visible = false)
    }

    private pool = new ObjectPool<InfoEffect>()

    update(dt: number) {
        for (let i = 0; i < this.children.length; i++) {
            const x = this.children[i]
            if (x instanceof InfoEffect) {
                x.update(dt)
                if (x.visible && x.allAnimEnd()) {
                    this.pool.save(x)
                }
            }
        }
    }

    setEffect(x: number, y: number) {
        const e = this.pool.get()
        e.setPosition(x, y)
        e.resetAnim()
        e.visible = true
    }

    setTrackedEffect(tracker: () => { x: number; y: number; visible: boolean }) {
        const e = this.pool.get()

        const pupdate = e.update
        e.update = dt => {
            if (!e.visible) return
            const t = tracker()
            if (!t.visible) {
                e.update = pupdate
                e.stopEmit()
                return
            }
            e.setPosition(t.x, t.y)
            pupdate.call(e, dt)
        }
        const tr = tracker()

        e.setPosition(tr.x, tr.y)
        e.resetAnim()
        e.visible = true
    }
}

function GetSlidePos(note: SlideBar, musicTime: number) {
    const n1 = note.start
    const n2 = note.end
    return ratio(n1.time, n2.time, musicTime, LaneCenterX(n1.lane), LaneCenterX(n2.lane))
}

@injectable()
export class EffectLayer extends Container {
    constructor(resources: Resources, state: GameState, events: GlobalEvents, config: GameConfig) {
        super()
        const info = resources.effect.data.info as EffectLayerInfo
        const textures = resources.effect.textures

        const tap = new SingleEffectLayer(info.tap, textures, config.noteScale)
        const single = new SingleEffectLayer(info.single, textures, config.noteScale)
        const flick = new SingleEffectLayer(info.flick, textures, config.noteScale)
        const slide = new SingleEffectLayer(info.slide, textures, config.noteScale)
        const fullcombo = new SingleEffectLayer(info.fullcombo, textures, config.noteScale)

        const slides = new Set<Slide>()

        state.on.judge.add((remove, n) => {
            if (n.judge === "miss") {
                if ("parent" in n) {
                    slides.delete(n.parent)
                }
                return
            }
            if (n.type === "flick" || n.type === "flickend") {
                flick.setEffect(LaneCenterX(n.lane), LaneBottomY)
            } else {
                single.setEffect(LaneCenterX(n.lane), LaneBottomY)
            }
            if (n.type !== "single" && n.type !== "flick" && n.type !== "slideamong") {
                if (slides.has(n.parent)) {
                    if (n.type === "slideend" || n.type === "flickend") slides.delete(n.parent)
                } else {
                    slides.add(n.parent)
                    slide.setTrackedEffect(() => {
                        const p = n.parent
                        const mt = state.on.musicTimeUpdate.prevArgs[0].visualTime
                        const visible = !p.end.judge && slides.has(p) && p.end.time >= mt
                        return {
                            x: (visible && GetSlidePos(p.bars[0], mt)) || 0,
                            y: LaneBottomY,
                            visible,
                        }
                    })
                }
            }
        })

        state.on.emptyTap.add((remove, l) => {
            if (-6 <= l && l < 6) tap.setEffect(LaneCenterX(l), LaneBottomY)
        })

        state.on.fullCombo.add(() => {
            fullcombo.setEffect(LayerWidth / 2, LayerHeight / 2)
        })

        events.Update.add((remove, dt) => {
            if (!this.parent) return remove()
            if (state.paused) return
            for (const x of this.children) {
                if (x instanceof SingleEffectLayer) {
                    x.update(dt)
                }
            }
        })

        this.addChild(tap, single, flick, slide, fullcombo)
    }
}
