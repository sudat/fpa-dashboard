import { describe, expect, test } from "vitest";

import {
  applyDepartmentMapping,
  applyMasterMapping,
  getDefaultAccountMaster,
  getDefaultDepartmentMaster,
  getOrderedAggregateAccounts,
} from "../master-schema";

describe("master-schema", () => {
  test("GMV sort order is less than 売上高 in the default master", () => {
    const accountMaster = getDefaultAccountMaster();
    const gmvEntry = accountMaster.find((entry) => entry.aggregateAccountName === "GMV");
    const revenueEntry = accountMaster.find((entry) => entry.aggregateAccountName === "売上高");

    expect(gmvEntry?.sortOrder).toBeLessThan(revenueEntry?.sortOrder ?? Number.POSITIVE_INFINITY);
  });

  test("unknown account maps to 未割当", () => {
    const mapped = applyMasterMapping("未知の科目", getDefaultAccountMaster());

    expect(mapped).toMatchObject({
      rawAccountName: "未知の科目",
      detailAccountName: "未知の科目",
      aggregateAccountName: "未割当",
      bucketStatus: "unassigned",
      bucketLabel: "未割当",
      includeInAnalysis: true,
    });
  });

  test("unknown department maps to 未割当", () => {
    const mapped = applyDepartmentMapping("未知の部署", getDefaultDepartmentMaster());

    expect(mapped).toMatchObject({
      rawDepartmentName: "未知の部署",
      detailDepartmentName: "未知の部署",
      businessUnitName: "未割当",
      bucketStatus: "unassigned",
      bucketLabel: "未割当",
      includeInAnalysis: true,
    });
  });

  test("集計不要 accounts are excluded from ordered output", () => {
    const orderedAccounts = getOrderedAggregateAccounts(getDefaultAccountMaster());

    expect(orderedAccounts).not.toContain("営業利益");
    expect(orderedAccounts).not.toContain("集計不要");
  });

  test("default master has GMV as the first aggregate", () => {
    expect(getOrderedAggregateAccounts(getDefaultAccountMaster())[0]).toBe("GMV");
  });

  test("applyMasterMapping respects bucketStatus", () => {
    const mapped = applyMasterMapping("営業利益", getDefaultAccountMaster());

    expect(mapped).toMatchObject({
      rawAccountName: "営業利益",
      detailAccountName: "営業利益",
      aggregateAccountName: "営業利益",
      bucketStatus: "excluded",
      bucketLabel: "集計不要",
      includeInAnalysis: false,
      autoAggregation: false,
    });
  });

  test("getOrderedAggregateAccounts returns sorted list without excluded items", () => {
    const orderedAccounts = getOrderedAggregateAccounts([
      {
        detailAccountName: "販管費-1",
        aggregateAccountName: "販管費",
        sortOrder: 5,
        isGmv: false,
        bucketStatus: "normal",
      },
      {
        detailAccountName: "GMV-1",
        aggregateAccountName: "GMV",
        sortOrder: 1,
        isGmv: true,
        bucketStatus: "normal",
      },
      {
        detailAccountName: "売上高-1",
        aggregateAccountName: "売上高",
        sortOrder: 2,
        isGmv: false,
        bucketStatus: "normal",
      },
      {
        detailAccountName: "営業利益",
        aggregateAccountName: "営業利益",
        sortOrder: 9,
        isGmv: false,
        bucketStatus: "excluded",
      },
      {
        detailAccountName: "未設定",
        aggregateAccountName: "未割当",
        sortOrder: 99,
        isGmv: false,
        bucketStatus: "unassigned",
      },
      {
        detailAccountName: "売上高-2",
        aggregateAccountName: "売上高",
        sortOrder: 2,
        isGmv: false,
        bucketStatus: "normal",
      },
    ]);

    expect(orderedAccounts).toEqual(["GMV", "売上高", "販管費", "未割当"]);
  });

  test("applyMasterMapping can map raw rows to account and department hierarchy", () => {
    const mappedRows = applyMasterMapping(
      [
        {
          明細科目名: "SaaS利用料売上",
          部署名: "SaaS事業部",
        },
        {
          明細科目名: "未知の科目",
          部署名: "未知の部署",
        },
      ],
      getDefaultAccountMaster(),
      getDefaultDepartmentMaster(),
    );

    expect(mappedRows).toHaveLength(2);
    expect(mappedRows[0]).toMatchObject({
      accountMapping: {
        aggregateAccountName: "売上高",
        bucketStatus: "normal",
      },
      departmentMapping: {
        businessUnitName: "SaaS事業部",
        bucketStatus: "normal",
      },
    });
    expect(mappedRows[1]).toMatchObject({
      accountMapping: {
        aggregateAccountName: "未割当",
        bucketStatus: "unassigned",
      },
      departmentMapping: {
        businessUnitName: "未割当",
        bucketStatus: "unassigned",
      },
    });
  });
});
