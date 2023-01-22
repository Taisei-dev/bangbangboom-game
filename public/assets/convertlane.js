const fs = require("fs")
let chart = require("./chart.json")
const l = [0, 1, 2, 4, 6, 7, 8]
const r = [3, 4, 5, 7, 9, 10, 11]
for (level of chart.chartInfo.difficulty) {
    for (note of chart.chartData[level.type].notes) {
        note.lane = { l: l[note.lane], r: r[note.lane] }
    }
}
fs.writeFileSync("newchart.json", JSON.stringify(chart))
