import * as XLSX from "xlsx"
import { describe, expect, it } from "vitest"
import { detectScenariosFromBase64, parseUploadWorkbookFromBase64 } from "./detect-client"

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
        rangeStartMonth: "2025-04",
        rangeEndMonth: "2026-02",
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
        rangeStartMonth: "2026-03",
        rangeEndMonth: "2026-03",
        forecastStart: "2026-03",
      },
    ])
  })
})

describe("parseUploadWorkbookFromBase64", () => {
  it("returns upload rows normalized for GAS commit", () => {
    const base64 = createWorkbookBase64([
      ["計画・実績", "年月", "ログラス科目コード", "外部システム科目コード", "科目", "科目タイプ", "ログラス部署コード", "外部システム部署コード", "部署", "金額"],
      ["実績", new Date(Date.UTC(2026, 0, 1)), "A001", "", "売上高", "収益", "D001", "", "営業部", 1200000],
    ])

    expect(parseUploadWorkbookFromBase64(base64).rawRows).toEqual([
      {
        シナリオ: "実績",
        年月度: "2026-01",
        科目コード: "A001",
        外部科目コード: "",
        科目: "売上高",
        科目タイプ: "収益",
        部署コード: "D001",
        外部部署コード: "",
        部署: "営業部",
        金額: 1200000,
      },
    ])
  })
})
