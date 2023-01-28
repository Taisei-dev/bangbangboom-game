import ajv from "ajv"

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
