<script setup lang="ts">
import { useAdminStats } from '@/composables/queries/useAdminStats'
import AdminStatsBar from '@/components/admin/AdminStatsBar.vue'
import AdminQueueTab from '@/components/admin/AdminQueueTab.vue'
import AdminLabelsTab from '@/components/admin/AdminLabelsTab.vue'
import AdminLogTab from '@/components/admin/AdminLogTab.vue'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const { total, flagged, featured } = useAdminStats()
</script>

<template>
  <div class="container py-6">
    <div class="sticky top-16 z-10 bg-background pb-2">
      <AdminStatsBar :total :flagged :featured />
    </div>
    <Tabs default-value="queue">
      <TabsList>
        <TabsTrigger value="queue">Queue</TabsTrigger>
        <TabsTrigger value="labels">Labels</TabsTrigger>
        <TabsTrigger value="log">Log</TabsTrigger>
      </TabsList>
      <TabsContent value="queue"><AdminQueueTab /></TabsContent>
      <TabsContent value="labels"><AdminLabelsTab /></TabsContent>
      <TabsContent value="log"><AdminLogTab /></TabsContent>
    </Tabs>
  </div>
</template>
