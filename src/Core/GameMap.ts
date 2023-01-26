import * as RawMap from "./RawMap"
import { findex } from "../Utils/Utils"
import { Judge, Lane } from "./Constants"
export { Lane } from "./Constants"
import { PointerEventInfo } from "./GameState"

export type NoteBase = {
    /** real time from music starts */
    time: number
    /** left: 0 ---- right : 11 */
    lane: Lane
}

export type JudgePoint = {
    /** real time from music start */
    time: number
    /** the first on the left is 0 */
    lane: Lane

    // judgeType?: {
    //     canDown: () => boolean
    //     canUp: () => boolean
    // }
    judge?: Judge
}

export type Single = {
    type: "single"
    critical: boolean
} & JudgePoint

export type Flick = {
    type: "flick"
    //pointerId?: number
    start?: PointerEventInfo
    critical: boolean
} & JudgePoint

export type Slide = {
    type: "slide"
    //flickend: boolean
    //long?: boolean
    //nextJudgeIndex?: number
    //pointerId?: number
    holded?: boolean
    //notes: Array<SlideStart | SlideAmong | SlideEnd | SlideFlickEnd>
    start: SlideStart
    bars: SlideBar[]
    end: SlideEnd | SlideFlickEnd
}

export type SlideStart = {
    type: "slidestart"
    parent: Slide
    critical: boolean
} & JudgePoint

export type SlideAmong = {
    type: "slideamong"
    critical: boolean
    hidden: boolean
} & JudgePoint

export type SlideEnd = {
    type: "slideend"
    parent: Slide
    critical: boolean
} & JudgePoint

export type SlideFlickEnd = {
    type: "flickend"
    parent: Slide
    start?: PointerEventInfo
    critical: boolean
} & JudgePoint

export type SimLine = {
    type: "simline"
    left: JudgePoint
    right: JudgePoint
}

export type SlideBar = {
    type: "slidebar"
    parent: Slide
    start: JudgePoint
    end: JudgePoint
    critical: boolean
}

export type MainNote = Single | Flick | SlideStart | SlideEnd | SlideFlickEnd

export type Note = MainNote | SlideAmong

export type GameMap = {
    notes: Note[]
    bars: SlideBar[]
    simlines: SimLine[]
    combo: number
}

function comparator(a: NoteBase, b: NoteBase) {
    return a.time - b.time || a.lane.l - b.lane.l || a.lane.r - b.lane.r
}

// export function fromRawMap(map: RawMap.RawMap): GameMap {
//     map.notes = map.notes.sort(comparator)
//     const slideset = new Map<number, Slide>()
//     const slidenotes = new Map<number, RawMap.NoteType[]>()
//     for (const n of map.notes) {
//         if (n.type === "slide") {
//             const list = slidenotes.get(n.slideid)
//             if (!list) slidenotes.set(n.slideid, [n])
//             else list.push(n)
//         }
//     }
//     const notes: Note[] = []
//     const simlines: SimLine[] = []
//     const bars: SlideBar[] = []
//     const timeMap = new Map<number, Note>()
//     for (const n of map.notes) {
//         if (n.type !== "slide") {
//             notes.push({ ...n })
//         } else {
//             const s = slideset.get(n.slideid)||{
//                 type: "slide",
//                 flickend: false,
//                 start:{},
//                 end:n
//             }
//             //if (!s)throw new Error("Can not find slide for note")
//             const l = slidenotes.get(n.slideid)
//             if (!l) throw new Error("Never happens")
//             if (l.length < 2) throw new Error("Slide can not have less than 2 notes")
//             // slides may includes overlapping
//             const m = slidenotes.get(n.slideid - 1)
//             if (m && !comparator(m[0], l[0])) continue
//             if (n === l[0]) {
//                 notes.push({ type: "slidestart", parent: s, time: n.time, lane: n.lane })
//                 const start = findex(notes, -1) as SlideStart
//                 s.start=start
//             } else {
//                 if (n === l[l.length - 1]) {
//                     if (s.flickend) notes.push({ type: "flickend", parent: s, time: n.time, lane: n.lane })
//                     else notes.push({ type: "slideend", parent: s, time: n.time, lane: n.lane })
//                     s.end=findex(notes,-1) as SlideEnd
//                 } else notes.push({ type: "slideamong", time: n.time, lane: n.lane })
//                 const start = s.start
//                 const end = s.end
//                 //s.notes.push(end)
//                 bars.push({ type: "slidebar", parent: s, start:start as JudgePoint, end:end as JudgePoint })
//             }
//         }
//         const right = findex(notes, -1)!
//         if (right.type !== "slideamong") {
//             const left = timeMap.get(n.time)
//             if (left) {
//                 simlines.push({ type: "simline", left, right })
//             }
//             timeMap.set(n.time, right)
//         }
//     }
//     notes.sort(comparator)
//     simlines.sort((a, b) => comparator(a.left, b.left))
//     bars.sort((a, b) => comparator(a.start, b.start))

//     return { notes, bars, simlines, combo: notes.length }
// }

export function fromRawMap(map: RawMap.RawMap): GameMap {
    let notes: Array<Note> = []
    let bars: Array<SlideBar> = []
    let simlines: Array<SimLine> = []

    let slides: Array<Slide> = []

    const bgmOffset = map.bgmOffset

    map.entities.forEach(entity => {
        if ([0, 1, 2].includes(entity.archetype)) return
        let judgepoint: JudgePoint = {
            time: entity.data!.values[0] + bgmOffset,
            lane: {
                l: Math.round(6 + entity.data!.values[1] - entity.data!.values[2]),
                r: Math.round(5 + entity.data!.values[1] + entity.data!.values[2]),
            },
        }
        switch (entity.archetype) {
            case 3:
            case 10:
                notes.push({
                    type: "single",
                    critical: entity.archetype >= 10,
                    ...judgepoint,
                })
                break
            case 4:
            case 11:
                notes.push({
                    type: "flick",
                    critical: entity.archetype >= 10,
                    ...judgepoint,
                })
                break
            case 5:
            case 12:
                let slidestart: any = {
                    type: "slidestart",
                    critical: entity.archetype >= 10,
                    ...judgepoint,
                }
                break
            case 6:
            case 13:
            case 17:
                notes.push({
                    type: "slideamong",
                    critical: entity.archetype >= 10,
                    hidden: entity.archetype === 17,
                    ...judgepoint,
                })
                break
        }
    })
    notes.sort(comparator)
    simlines.sort((a, b) => comparator(a.left, b.left))
    bars.sort((a, b) => comparator(a.start, b.start))
    console.log({ notes, bars, simlines, combo: notes.length })
    return { notes, bars, simlines, combo: notes.length }
}
