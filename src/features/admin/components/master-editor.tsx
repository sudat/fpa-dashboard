import { useMasterEditor } from "@/features/admin/hooks/use-master-editor";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountMappingTable } from "./account-mapping-table";
import { DepartmentMappingTable } from "./department-mapping-table";
import { MasterSaveBar } from "./master-save-bar";

export function MasterEditor() {
  const editor = useMasterEditor();

  if (editor.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>マスタ編集</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>マスタ編集</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">勘定科目マスタ</TabsTrigger>
            <TabsTrigger value="department">部署マスタ</TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <AccountMappingTable
              entries={editor.accountEntries}
              onUpdate={editor.updateAccountEntry}
              onAdd={editor.addAccountEntry}
              onRemove={editor.removeAccountEntry}
            />
          </TabsContent>
          <TabsContent value="department">
            <DepartmentMappingTable
              entries={editor.departmentEntries}
              onUpdate={editor.updateDepartmentEntry}
              onAdd={editor.addDepartmentEntry}
              onRemove={editor.removeDepartmentEntry}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      <MasterSaveBar
        isDirty={editor.isDirty}
        saveStatus={editor.saveStatus}
        saveError={editor.saveError}
        unassignedCount={editor.unassignedCount}
        excludedCount={editor.excludedCount}
        onSave={editor.save}
        onReset={editor.reset}
      />
    </Card>
  );
}
