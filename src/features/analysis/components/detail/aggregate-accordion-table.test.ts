import { describe, it, expect } from "vitest"
import type { SummaryRow } from "@/features/analysis/lib/summary"
import type { AccountMasterConfig } from "@/lib/domain/master-schema"

const testAccountMaster: AccountMasterConfig = [
  { detailAccountName: "SaaS GMV", aggregateAccountName: "GMV", sortOrder: 10, isGmv: true, bucketStatus: "normal" },
  { detailAccountName: "売上高", aggregateAccountName: "売上高", sortOrder: 20, isGmv: false, bucketStatus: "normal" },
  { detailAccountName: "売上原価", aggregateAccountName: "売上原価", sortOrder: 30, isGmv: false, bucketStatus: "normal" },
  { detailAccountName: "売上総利益", aggregateAccountName: "売上総利益", sortOrder: 40, isGmv: false, bucketStatus: "normal" },
  { detailAccountName: "販管費", aggregateAccountName: "販管費", sortOrder: 50, isGmv: false, bucketStatus: "normal" },
  { detailAccountName: "営業利益", aggregateAccountName: "営業利益", sortOrder: 60, isGmv: false, bucketStatus: "excluded" },
  { detailAccountName: "未割当", aggregateAccountName: "未割当", sortOrder: 99000, isGmv: false, bucketStatus: "unassigned" },
  { detailAccountName: "集計不要", aggregateAccountName: "集計不要", sortOrder: 99001, isGmv: false, bucketStatus: "excluded" },
]

function makeSummaryRow(overrides: Partial<SummaryRow> & { accountName: string }): SummaryRow {
  return {
    accountCode: overrides.accountCode ?? overrides.accountName,
    aggregateName: overrides.aggregateName ?? overrides.accountName,
    periodType: "着地見込",
    A: 100,
    B: 200,
    BA: 100,
    C: 150,
    BC: 50,
    ...overrides,
  }
}

async function importBuildAggregateSections() {
  const { buildAggregateSections } = await import("./aggregate-accordion-table")
  return buildAggregateSections
}

describe("buildAggregateSections", () => {
  it("groups summary rows by aggregate and orders by master sortOrder", async () => {
    const buildAggregateSections = await importBuildAggregateSections()
    const summaryRows = [
      makeSummaryRow({ accountName: "売上原価" }),
      makeSummaryRow({ accountName: "売上高" }),
    ]

    const sections = buildAggregateSections(summaryRows, new Map(), testAccountMaster)
    const names = sections.map((s) => s.aggregateName)

    expect(names).toEqual(["売上高", "売上原価"])
  })

  it("excludes aggregates with bucketStatus excluded", async () => {
    const buildAggregateSections = await importBuildAggregateSections()
    const summaryRows = [
      makeSummaryRow({ accountName: "売上高" }),
      makeSummaryRow({ accountName: "営業利益" }),
    ]

    const sections = buildAggregateSections(summaryRows, new Map(), testAccountMaster)
    const names = sections.map((s) => s.aggregateName)

    expect(names).not.toContain("営業利益")
    expect(names).toContain("売上高")
  })

  it("includes GMV before 売上高 when present", async () => {
    const buildAggregateSections = await importBuildAggregateSections()
    const summaryRows = [
      makeSummaryRow({ accountName: "売上高" }),
      makeSummaryRow({ accountName: "GMV" }),
    ]

    const sections = buildAggregateSections(summaryRows, new Map(), testAccountMaster)
    const names = sections.map((s) => s.aggregateName)

    expect(names.indexOf("GMV")).toBeLessThan(names.indexOf("売上高"))
  })

  it("attaches detail rows to correct aggregate group", async () => {
    const buildAggregateSections = await importBuildAggregateSections()
    const summaryRows = [
      makeSummaryRow({ accountName: "売上高" }),
    ]
    const detailMap = new Map<string, SummaryRow[]>([
      ["売上高", [
        makeSummaryRow({ accountName: "SaaS売上", accountCode: "SaaS001", aggregateName: "売上高" }),
      ]],
    ])

    const sections = buildAggregateSections(summaryRows, detailMap, testAccountMaster)
    const uriageSection = sections.find((s) => s.aggregateName === "売上高")

    expect(uriageSection?.detailRows).toHaveLength(1)
    expect(uriageSection?.detailRows[0].accountName).toBe("SaaS売上")
  })

  it("shows 未割当 group at the bottom with isUnassigned=true", async () => {
    const buildAggregateSections = await importBuildAggregateSections()
    const summaryRows = [
      makeSummaryRow({ accountName: "売上高" }),
      makeSummaryRow({ accountName: "未割当" }),
    ]

    const sections = buildAggregateSections(summaryRows, new Map(), testAccountMaster)
    const lastSection = sections[sections.length - 1]

    expect(lastSection.aggregateName).toBe("未割当")
    expect(lastSection.isUnassigned).toBe(true)
  })

  it("hides 集計不要 aggregate completely", async () => {
    const buildAggregateSections = await importBuildAggregateSections()
    const summaryRows = [
      makeSummaryRow({ accountName: "売上高" }),
      makeSummaryRow({ accountName: "集計不要" }),
    ]

    const sections = buildAggregateSections(summaryRows, new Map(), testAccountMaster)
    const names = sections.map((s) => s.aggregateName)

    expect(names).not.toContain("集計不要")
  })

  it("returns empty array for all-excluded rows", async () => {
    const buildAggregateSections = await importBuildAggregateSections()
    const summaryRows = [
      makeSummaryRow({ accountName: "営業利益" }),
    ]

    const sections = buildAggregateSections(summaryRows, new Map(), testAccountMaster)
    expect(sections).toHaveLength(0)
  })
})
