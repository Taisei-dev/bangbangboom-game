import ajv from "ajv"
import { Lane } from "./Constants"

// export type NoteBase = {
//     /** real time from music starts */
//     time: number
//     /** left: 0 ---- right : 11 */
//     lane: Lane
// }

// export type Single = NoteBase & {
//     type: "single"
//     /** is the note on beat or not */
//     onbeat: boolean
// }

// export type Flick = NoteBase & {
//     type: "flick"
// }

// export type Slide = {
//     id: number
//     flickend: boolean
// }

// export type SlideNote = NoteBase & {
//     type: "slide"
//     slideid: number
// }

// export type NoteType = Single | Flick | SlideNote

// export type RawMap = {
//     notes: NoteType[]
//     slides: Slide[]
// }

// export const ValidateRawMap = ajv().compile({
//     definitions: {
//         Lane: {
//             type: "object",
//             properties: {
//                 l: { type: "integer", minimum: 0, maximum: 11 },
//                 r: { type: "integer", minimum: 0, maximum: 11 },
//             },
//             required: ["l", "r"],
//         },
//         NoteBase: {
//             type: "object",
//             properties: {
//                 time: { type: "number", minimum: 0 },
//                 lane: { $ref: "#/definitions/Lane" },
//             },
//             required: ["time", "lane"],
//         },
//         Single: {
//             allOf: [
//                 { $ref: "#/definitions/NoteBase" },
//                 {
//                     type: "object",
//                     properties: {
//                         type: { enum: ["single"] },
//                         onbeat: { type: "boolean" },
//                     },
//                     required: ["type"],
//                 },
//             ],
//         },
//         Flick: {
//             allOf: [
//                 { $ref: "#/definitions/NoteBase" },
//                 {
//                     type: "object",
//                     properties: {
//                         type: { enum: ["flick"] },
//                     },
//                     required: ["type"],
//                 },
//             ],
//         },
//         Slide: {
//             type: "object",
//             properties: {
//                 id: { type: "number" },
//                 flickend: { type: "boolean" },
//             },
//             required: ["id"],
//         },
//         SlideNote: {
//             allOf: [
//                 { $ref: "#/definitions/NoteBase" },
//                 {
//                     type: "object",
//                     properties: {
//                         type: { enum: ["slide"] },
//                         slideid: { type: "number" },
//                     },
//                     required: ["type", "slideid"],
//                 },
//             ],
//         },
//     },

//     type: "object",
//     properties: {
//         notes: {
//             type: "array",
//             items: {
//                 anyOf: [
//                     { $ref: "#/definitions/Single" },
//                     { $ref: "#/definitions/Flick" },
//                     { $ref: "#/definitions/SlideNote" },
//                 ],
//             },
//         },
//         slides: {
//             type: "array",
//             items: { $ref: "#/definitions/Slide" },
//         },
//     },
//     required: ["notes", "slides"],
// })

export const ValidateRawMap = ajv().compile({
    type: "object",
    properties: {
        bgmOffset: { type: "number" },
        entities: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    archetype: { type: "number" },
                    data: {
                        type: "object",
                        properties: {
                            index: { type: "number" },
                            values: {
                                type: "array",
                                items: { type: "number" },
                            },
                        },
                        required: ["index", "values"],
                    },
                },
                required: ["archetype"],
            },
        },
    },
    required: ["bgmOffset", "entities"],
})

export type Entity = {
    archetype: number
    data?: {
        index: 0
        values: number[]
    }
}

export type RawMap = {
    bgmOffset: number
    entities: Entity[]
}
