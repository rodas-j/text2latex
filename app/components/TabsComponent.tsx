import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TabsComponent() {
  return (
    <Tabs defaultValue="text" className="mb-6">
      <TabsList>
        <TabsTrigger
          value="text"
          className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-gray-200"
        >
          Text
        </TabsTrigger>
        <TabsTrigger
          value="documents"
          disabled
          className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-gray-200"
        >
          Documents <span className="text-xs text-gray-500">(coming soon)</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
