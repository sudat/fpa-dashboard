import * as XLSX from "xlsx"
import { describe, expect, it } from "vitest"
import { detectScenariosFromBase64 } from "./detect-client"

function createWorkbookBase64(rows: unknown[][]): string {
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
  return Buffer.from(buffer).toString("base64")
}

describe("detectScenariosFromBase64", () => {
  it("returns the actual range and forecastStart from workbook data", () => {
    const base64 = createWorkbookBase64([
      ["シナリオ", "計上日"],
      ["実績", new Date(Date.UTC(2025, 3, 1))],
      ["実績", new Date(Date.UTC(2025, 4, 1))],
      ["実績", new Date(Date.UTC(2026, 1, 1))],
      ["26年3月期着地見込0224時点", new Date(Date.UTC(2026, 2, 1))],
      ["26年3月期着地見込0224時点", new Date(Date.UTC(2026, 2, 1))],
    ])

    expect(detectScenariosFromBase64(base64)).toEqual([
      {
        kind: "actual",
        scenarioKey: "実績",
        targetMonth: "2026-02",
        monthCount: 3,
        rowCount: 3,
        firstMonth: "2025-04",
        lastMonth: "2026-02",
        forecastStart: undefined,
      },
      {
        kind: "forecast",
        scenarioKey: "26年3月期着地見込0224時点",
        targetMonth: "2026-02",
        monthCount: 1,
        rowCount: 2,
        firstMonth: "2026-03",
        lastMonth: "2026-03",
        forecastStart: "2026-03",
      },
    ])
  })
})
