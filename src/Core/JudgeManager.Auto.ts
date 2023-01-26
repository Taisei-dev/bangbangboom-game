import { injectable } from "inversify"
import { AbsctractJudgeManager } from "./JudgeManager"
import { GameState } from "./GameState"

@injectable()
export class AutoJudgeManager extends AbsctractJudgeManager {
    constructor(state: GameState) {
        super()

        let nextJudgeIndex = 0
        let nextSoundIndex = 0

        const list = state.map.notes

        const animloop = () => {
            if (state.ended) return
            requestAnimationFrame(animloop)
            if (state.paused) return

            const time = state.GetMusicTime()

            let i = nextJudgeIndex
            while (i < list.length && list[i].time <= time) {
                const note = list[i]
                note.judge = "perfect"
                if (note.type === "slidestart") {
                    note.parent.holded = true
                    //note.parent.nextJudgeIndex = 1
                } else if (note.type === "slideamong") {
                    //note.parent.nextJudgeIndex!++
                } else if (note.type === "slideend" || note.type === "flickend") {
                    note.parent.holded = false
                }
                state.on.judge.emit(note)
                i++
            }
            nextJudgeIndex = i

            i = nextSoundIndex
            while (i < list.length && list[i].time < time + 0.04) {
                const note = list[i]
                const type = note.type === "flick" || note.type === "flickend" ? "flick" : "perfect"
                state.on.soundEffect.emit(type, note.time - time)
                i++
            }
            nextSoundIndex = i
        }

        requestAnimationFrame(animloop)
    }
}
