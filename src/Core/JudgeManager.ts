import { injectable } from "inversify"
import { GameState, PointerEventInfo } from "./GameState"
import { Note, Slide, Flick, SlideAmong, SlideFlickEnd, SlideEnd, SlideStart } from "./GameMap"
import { GameConfig } from "./GameConfig"
import { JudgeOffset, Judge } from "./Constants"
import { findex, assert } from "../Utils/Utils"
import { Point } from "pixi.js"

export abstract class AbsctractJudgeManager {}

const Getters = {
    single() {
        return JudgeOffset.typeA
    },
    flick() {
        return JudgeOffset.typeA
    },
    slidestart(note: SlideStart) {
        /*if (note.parent.long)*/ return JudgeOffset.typeA
        return JudgeOffset.typeC
    },
    slideamong(note: SlideAmong) {
        //if (!note.parent.pointerId) return JudgeOffset.typeC
        return JudgeOffset.typeE
    },
    slideend(note: SlideEnd) {
        if (!note.parent.holded) return JudgeOffset.typeA
        //if (note.parent.long) return JudgeOffset.typeB
        return JudgeOffset.typeC
    },
    flickend(note: SlideFlickEnd) {
        if (!note.parent.holded) return JudgeOffset.typeA
        return JudgeOffset.typeD
    },
}
function getJudgeFunction(note: Note) {
    return Getters[note.type](note as any)
}

/*function slideNowJudge(note: SlideStart | SlideAmong | SlideEnd | SlideFlickEnd) {
    const i = note.parent.nextJudgeIndex || 0
    return note.parent.notes[i] === note
}*/

function distance2(p1: PointerEventInfo, p2: PointerEventInfo) {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return dx * dx + dy * dy
}

@injectable()
export class JudgeManager extends AbsctractJudgeManager {
    constructor(state: GameState, config: GameConfig) {
        super()

        const list = state.map.notes

        let pool: Note[] = []

        /*const holdingSlides = new Map<
            number,
            {
                track: PointerEventInfo[]
                slide: Slide
            }
        >()*/
        const holdingPoints = new Map<number, PointerEventInfo>()
        const nowSlides = new Set<Slide>()
        const holdingFlicks = new Set<Flick | SlideFlickEnd>() /* new Map<
            number,
            {
                note: Flick | SlideFlickEnd
                start: PointerEventInfo
            }
        >()*/

        state.on.judge.add((remove, note) => {
            if (state.ended) remove()
            if (note.judge && note.judge !== "bad" && note.judge !== "miss") {
                if (note.type === "flick" || note.type === "flickend") {
                    state.on.soundEffect.emit("flick", 0)
                } else {
                    state.on.soundEffect.emit(note.judge, 0)
                }
            }
        })

        // --------------------------------------- Interval Judges ---------------------------------------

        let nextJudgeIndex = 0

        let lastMusicTime = 0

        const interval = () => {
            if (state.ended) return
            requestAnimationFrame(interval)
            if (state.paused) return

            const mt = state.GetMusicTime() + config.judgeOffset / 1000

            let i = nextJudgeIndex
            while (i < list.length && list[i].time <= mt + 0.3) {
                if (!list[i].judge) pool.push(list[i])
                i++
            }
            nextJudgeIndex = i

            const judgedNotes = new Set<Note>()

            for (const x of pool) {
                // focus on notes can miss
                if (!(mt - x.time >= 0.1)) continue
                const j = getJudgeFunction(x)(mt - x.time)
                if (j === "miss") {
                    x.judge = j

                    if (x.type === "slidestart") {
                        //x.parent.nextJudgeIndex = 1
                        nowSlides.add(x.parent)
                    } else if (x.type !== "single" && x.type !== "flick") {
                        //slideamong slideend flickend
                        //x.parent.nextJudgeIndex!++
                        if (x.type !== "slideamong") {
                            //slideend flickend
                            nowSlides.delete(x.parent)
                            //holdingSlides.delete(x.parent.pointerId!)
                            if (x.type === "flickend") {
                                holdingFlicks.delete(x /*pointerId!*/)
                            }
                            x.parent.holded = undefined
                        }
                    } else if (x.type === "flick") {
                        holdingFlicks.delete(x /*.pointerId!*/)
                        //x.pointerId = undefined
                    }
                    state.on.judge.emit(x)
                    judgedNotes.add(x)
                }
            }

            if (judgedNotes.size > 0) {
                pool = pool.filter(x => !judgedNotes.has(x))
                judgedNotes.clear()
            }

            for (const s of pool) {
                // focus on slideamongs
                if (!((s.type === "slideamong") /* && s.parent.pointerId && slideNowJudge(s)*/)) continue
                const j = getJudgeFunction(s)(mt - s.time)
                if (j === "perfect") {
                    /*// this only indicates we can judge it now
                    const p = s.parent
                    const info = holdingSlides.get(p.pointerId!)
                    if (info) {
                        const current = findex(info.track, -1)
                        if (s.lane.l - 1 <= current.lane || current.lane <= s.lane.r + 1) {
                            // todo: care about this
                            s.judge = j
                            p.nextJudgeIndex!++
                            state.on.judge.emit(s)
                            judgedNotes.add(s)
                        }
                    }*/
                    if (
                        [...holdingPoints].some(([pointerid, info]) => s.lane.l <= info.lane && info.lane <= s.lane.r)
                    ) {
                        s.judge = j
                        state.on.judge.emit(s)
                        judgedNotes.add(s)
                    }
                }
            }

            if (judgedNotes.size > 0) {
                pool = pool.filter(x => !judgedNotes.has(x))
                judgedNotes.clear()
            }

            for (const x of holdingFlicks) {
                // flicks that holds too long will miss
                if (!x.start) continue
                const jt = x.type === "flick" ? x.start.time : x.time
                if (mt - jt > JudgeOffset.flickOutTime) {
                    x.judge = "miss"
                    if (x.type === "flickend") {
                        //holdingSlides.delete(x.note.parent.pointerId!)
                        x.parent.holded = undefined
                        //x.note.parent.nextJudgeIndex!++
                    }
                    holdingFlicks.delete(x /*.start.pointerId*/)
                    state.on.judge.emit(x)
                    judgedNotes.add(x)
                }
            }

            if (judgedNotes.size > 0) {
                pool = pool.filter(x => !judgedNotes.has(x))
                judgedNotes.clear()
            }

            for (const s of pool) {
                // focus on flickend which will turn to be able to judge
                if (!(s.type === "flickend" /*&& !s.parent.long */ && s.parent.holded)) continue
                const func = getJudgeFunction(s)
                if (func(mt - s.time) === "perfect" && func(lastMusicTime - s.time) === undefined) {
                    const start = [...holdingPoints].find(([pointerid, info]) => {
                        s.lane.l <= info.lane && info.lane <= s.lane.r
                    })?.[1] //findex(assert(holdingSlides.get(s.parent.pointerId!)).track, -1)
                    if (!start) continue
                    s.start = start
                    holdingFlicks.add(s)
                    /*if (s.lane.l - 1 <= start.lane || start.lane <= s.lane.r + 1) {
                        holdingFlicks.set(s.parent.pointerId!, {
                            note: s,
                            start,
                        })
                    }*/
                }
            }

            /*for (const x of pool) {
                // miss for notes in slide that the next note is closer to judge line
                if ("parent" in x && x.type !== "slidestart") {
                    const index = (x.parent.nextJudgeIndex || 0) + 1
                    if (x.parent.notes[index] === x && mt >= x.time && lastMusicTime < x.time) {
                        const last = x.parent.notes[index - 1]
                        if (last.judge) continue
                        last.judge = "miss"
                        x.parent.nextJudgeIndex = index
                        state.on.judge.emit(last)
                        judgedNotes.add(last)
                    }
                }
            }*/

            if (judgedNotes.size > 0) {
                pool = pool.filter(x => !judgedNotes.has(x))
                judgedNotes.clear()
            }

            lastMusicTime = mt
        }

        requestAnimationFrame(interval)

        // --------------------------------------- Pointer Events ---------------------------------------

        state.on.pointer.add((remove, pointer) => {
            if (state.ended) return remove()
            if (state.paused) return

            const mt = state.GetMusicTime() + config.judgeOffset / 1000
            pointer.time = mt

            const comparator = (l: Note, r: Note) => {
                const dt = Math.abs(l.time - mt) - Math.abs(r.time - mt)
                if (dt) return dt
                const dl = Math.abs(l.lane.l - pointer.lane) - Math.abs(r.lane.l - pointer.lane)
                if (dl) return dl
                return Math.abs(l.lane.r - pointer.lane) - Math.abs(r.lane.r - pointer.lane)
            }

            const judgedNotes = new Set<Note>()

            let downHandled = false

            switch (pointer.type) {
                case "down": {
                    if (pointer.lane < 0) break
                    holdingPoints.set(pointer.pointerId, pointer)

                    let canDown = pool.filter(x => {
                        if (pointer.lane < x.lane.l || x.lane.r < pointer.lane) return false
                        //if ("parent" in x && !slideNowJudge(x)) return false
                        // holding flicks
                        if (x.type === "flick" && x.start) return false
                        // holding slide notes
                        if (
                            /*x.type === "slideamong" ||*/ (x.type === "slideend" || x.type === "flickend") &&
                            x.parent.holded
                        )
                            return false
                        return true
                    })
                    if (canDown.length <= 0) break
                    canDown = canDown.sort(comparator)
                    const n = canDown[0]
                    const j = getJudgeFunction(n)(mt - n.time) as Judge
                    if (j !== undefined) {
                        downHandled = true
                        if (n.type !== "flick" && n.type !== "flickend") {
                            n.judge = j

                            if (n.type === "slidestart" /* || n.type === "slideamong"*/) {
                                n.parent.holded = true //pointer.pointerId
                                //if (!n.parent.nextJudgeIndex) n.parent.nextJudgeIndex = 0
                                //n.parent.nextJudgeIndex++
                                /*holdingSlides.set(pointer.pointerId, {
                                    track: [pointer],
                                    slide: n.parent,
                                })*/
                                nowSlides.add(n.parent)
                                if (
                                    n.type === "slidestart" &&
                                    /*n.parent.long && n.parent.flickend*/ n.parent.end.type === "flickend"
                                ) {
                                    /*holdingFlicks.set(pointer.pointerId, {
                                        note: n.parent.end,
                                        start: pointer,
                                    })*/
                                    n.parent.end.start = pointer
                                    holdingFlicks.add(n.parent.end)
                                }
                            } else if (n.type === "slideend") {
                                //n.parent.nextJudgeIndex!++
                                n.parent.holded = undefined
                                nowSlides.delete(n.parent)
                            }

                            state.on.judge.emit(n)
                            judgedNotes.add(n)
                        } else {
                            /*holdingFlicks.set(pointer.pointerId, {
                                note: n,
                                start: pointer,
                            })
                            if (n.type === "flick") n.pointerId = pointer.pointerId*/
                            n.start = pointer
                            holdingFlicks.add(n)
                        }
                    }
                    break
                }
                case "up": {
                    holdingPoints.delete(pointer.pointerId)

                    let canUp = pool.filter(x => {
                        if (pointer.lane < x.lane.l || x.lane.r < pointer.lane) return false

                        if (x.type === "flick" && x.start) {
                            x.judge = "miss"
                            holdingFlicks.delete(x)
                            judgedNotes.add(x)
                            state.on.judge.emit(x)
                            return false
                        }
                        if (x.type === "flickend") {
                            x.judge = "miss"
                            x.parent.holded = undefined
                            holdingFlicks.delete(x)
                            judgedNotes.add(x)
                            state.on.judge.emit(x)
                            return false
                        }
                        if (x.type === "slideend") return true
                        return false
                    })
                    if (canUp.length <= 0) break
                    canUp = canUp.sort(comparator)
                    const n = canUp[0]
                    const j = getJudgeFunction(n)(mt - n.time) as Judge
                    if (j !== undefined) {
                        if (n.type === "slideend") {
                            n.parent.holded = false
                            nowSlides.delete(n.parent)
                        }
                        state.on.judge.emit(n)
                        judgedNotes.add(n)
                    }

                    /*const f = holdingFlicks.get(pointer.pointerId)
                    const s = holdingSlides.get(pointer.pointerId)
                    if (f) {
                        f.note.judge = "miss"
                        if (f.note.type === "flickend") {
                            f.note.parent.holded = undefined
                            //f.note.parent.nextJudgeIndex!++
                        }
                        judgedNotes.add(f.note)
                        state.on.judge.emit(f.note)
                    } else if (s) {
                        s.slide.pointerId = undefined
                        const n = s.slide.notes[s.slide.nextJudgeIndex!]
                        if (n.type === "slideend") {
                            let j = getJudgeFunction(n)(mt - n.time) as Judge
                            if (j === undefined || pointer.lane < n.lane.l || n.lane.r < pointer.lane) j = "miss"
                            n.judge = j
                            judgedNotes.add(n)
                            state.on.judge.emit(n)
                        }
                    }*/
                    //holdingSlides.delete(pointer.pointerId)
                    //holdingFlicks.delete(pointer.pointerId)
                    break
                }
                case "move": {
                    holdingPoints.set(pointer.pointerId, pointer)

                    /*const pointerHis = holdingSlides.get(pointer.pointerId)
                    if (pointerHis) pointerHis.track.push(pointer)*/
                    const f = [...holdingFlicks].find(flick => flick.start?.pointerId === pointer.pointerId)
                    if (f) {
                        if (distance2(f.start!, pointer) > JudgeOffset.flickOutDis * JudgeOffset.flickOutDis) {
                            const jt = f.type === "flick" ? f.start!.time : mt
                            const j = getJudgeFunction(f)(jt - f.time) as Judge
                            if (j !== undefined) {
                                if (f.type === "flickend") {
                                    f.parent.holded = undefined
                                    //f.note.parent.nextJudgeIndex!++
                                    nowSlides.delete(f.parent)
                                }
                                f.judge = j
                                judgedNotes.add(f)
                                state.on.judge.emit(f)
                                //holdingSlides.delete(pointer.pointerId)
                                holdingFlicks.delete(f)
                            }
                        }
                    }
                    break
                }
            }

            if (judgedNotes.size > 0) {
                pool = pool.filter(x => !judgedNotes.has(x))
                judgedNotes.clear()
            }

            if (pointer.type === "down" && !downHandled) {
                if (pointer.lane !== -1) state.on.emptyTap.emit(pointer.lane)
            }
        })
    }
}
