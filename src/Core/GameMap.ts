import * as RawMap from "./RawMap"
import { findex } from "../Utils/Utils"
import { Judge, Lane } from "./Constants"
export { Lane } from "./Constants"
import { PointerEventInfo } from "./GameState"
import { ParticleOption } from "../Common/ParticleEmitter"

export type JudgePoint = {
    /** real time from music start */
    time: number
    /** left: 0 ---- right : 11 */
    lane: Lane

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
    direction: "up" | "right" | "left"
} & JudgePoint

export type Slide = {
    type: "slide"
    holded?: boolean
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
    direction: "up" | "right" | "left"
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
    ease: "none" | "in" | "out"
}

export type MainNote = Single | Flick | SlideStart | SlideEnd | SlideFlickEnd

export type Note = MainNote | SlideAmong

export type GameMap = {
    notes: Note[]
    bars: SlideBar[]
    simlines: SimLine[]
    combo: number
}

function comparator(a: JudgePoint, b: JudgePoint) {
    return a.time - b.time || a.lane.l - b.lane.l || a.lane.r - b.lane.r
}

export function fromRawMap(map: RawMap.RawMap): GameMap {
    let mainnotes: Array<Note> = []
    let slideamongs: Array<Note> = []

    let slideElements: Array<Omit<SlideStart | SlideBar | SlideEnd | SlideFlickEnd, "parent">> = []

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
                mainnotes.push({
                    type: "single",
                    critical: entity.archetype >= 10,
                    ...judgepoint,
                })
                break
            case 4:
            case 11:
                mainnotes.push({
                    type: "flick",
                    critical: entity.archetype >= 10,
                    direction: entity.data!.values[3] === -1 ? "up" : entity.data!.values[3] === 0 ? "left" : "right",
                    ...judgepoint,
                })
                break
            case 5:
            case 12:
                let slidestart: Omit<SlideStart, "parent"> = {
                    type: "slidestart",
                    critical: entity.archetype >= 10,
                    ...judgepoint,
                }
                slideElements.push(slidestart)
                break
            case 9:
            case 16:
                let slidebar: Omit<SlideBar, "parent"> = {
                    type: "slidebar",
                    critical: entity.archetype >= 10,
                    start: judgepoint,
                    end: {
                        time: entity.data!.values[3] + bgmOffset,
                        lane: {
                            l: Math.round(6 + entity.data!.values[4] - entity.data!.values[5]),
                            r: Math.round(5 + entity.data!.values[4] + entity.data!.values[5]),
                        },
                    },
                    ease: entity.data!.values[6] === -1 ? "none" : entity.data!.values[6] === 0 ? "in" : "out",
                }
                slideElements.push(slidebar)
                break
            case 7:
            case 14:
                let slideend: Omit<SlideEnd, "parent"> = {
                    type: "slideend",
                    critical: entity.archetype >= 10,
                    ...judgepoint,
                }
                slideElements.push(slideend)
                break
            case 8:
            case 15:
                let flickend: Omit<SlideFlickEnd, "parent"> = {
                    type: "flickend",
                    critical: entity.archetype >= 10,
                    direction: entity.data!.values[3] === -1 ? "up" : entity.data!.values[3] === 0 ? "left" : "right",
                    ...judgepoint,
                }
                slideElements.push(flickend)
                break
            case 6:
            case 13:
            case 17:
                slideamongs.push({
                    type: "slideamong",
                    critical: entity.archetype >= 10,
                    hidden: entity.archetype === 17,
                    ...judgepoint,
                })
                break
        }
    })
    //set slide
    let slideTemp: Array<Array<Omit<SlideStart | SlideBar | SlideEnd | SlideFlickEnd, "parent">>> = []
    for (let slidestart of slideElements.filter(slideEl => slideEl.type === "slidestart")) {
        slideTemp.push([slidestart])
    }
    for (let slidebar of slideElements.filter(slideEl => slideEl.type === "slidebar")) {
        slideTemp
            .find(slideElArray => {
                let end = slideElArray[slideElArray.length - 1]
                let point1 = end.type === "slidebar" ? (end as SlideBar).end : (end as SlideStart)
                let point2 = (slidebar as SlideBar).start
                return point1.time === point2.time && point1.lane.r === point2.lane.r && point1.lane.l === point2.lane.l
            })
            ?.push(slidebar)
    }
    for (let slideend of slideElements.filter(slideEl => slideEl.type === "slideend" || slideEl.type === "flickend")) {
        slideTemp
            .find(slideElArray => {
                let end = slideElArray[slideElArray.length - 1]
                let point1 = end.type === "slidebar" ? (end as SlideBar).end : (end as SlideStart)
                let point2 = slideend as SlideEnd | SlideFlickEnd
                return point1.time === point2.time && point1.lane.r === point2.lane.r && point1.lane.l === point2.lane.l
            })
            ?.push(slideend)
    }

    let slides: Array<Slide> = []
    let bars: Array<SlideBar> = []
    for (let slideElArray of slideTemp) {
        let slide: any = {}
        slide.type = "slide"
        slide.start = { ...slideElArray[0], parent: slide }
        slide.end = { ...slideElArray[slideElArray.length - 1], parent: slide }
        slide.bars = (slideElArray.filter(el => el.type === "slidebar") as Array<SlideBar>)
            .map(bar => {
                return { ...bar, parent: slide }
            })
            .sort((a: SlideBar, b: SlideBar) => comparator(a.start, b.start))
        slides.push(slide as Slide)
    }
    //console.log("slideTemp", slideTemp)
    //console.log("slides", slides)

    for (let slide of slides) {
        bars.push(...slide.bars)
        mainnotes.push(slide.start, slide.end)
    }

    // set simline
    let simlines: Array<SimLine> = []
    mainnotes.sort(comparator)
    for (let i = 0; i < mainnotes.length - 1; i++) {
        if (mainnotes[i].time === mainnotes[i + 1].time) {
            simlines.push({
                type: "simline",
                left: mainnotes[i] as JudgePoint,
                right: mainnotes[i + 1] as JudgePoint,
            })
        }
    }

    let notes: Array<Note> = [...mainnotes, ...slideamongs].sort(comparator)
    simlines.sort((a, b) => comparator(a.left, b.left))
    bars.sort((a, b) => comparator(a.start, b.start))

    //console.log({ notes, bars, simlines, combo: notes.length })
    return { notes, bars, simlines, combo: notes.length }
}
