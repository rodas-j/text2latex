import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TabsComponent() {
  return (
    <Tabs defaultValue="text" className="mb-6">
      <TabsList>
        <TabsTrigger value="text">Text</TabsTrigger>
        <TabsTrigger value="documents" disabled>
          Documents
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
