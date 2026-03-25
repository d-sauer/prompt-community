<script setup lang="ts">
import { ref, computed } from 'vue'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminLabels, validateLabel, type RepoLabel } from '@/composables/queries/useAdminLabels'

const { groupedLabels, isLoading, createLabelMutation, updateLabelMutation, deleteLabelMutation } =
  useAdminLabels()

const namespaces = computed(() => Object.keys(groupedLabels.value).sort())

// Add label form
const showAddForm = ref(false)
const addForm = ref({ name: '', color: '6b7280', description: '' })
const addError = computed(() => (addForm.value.name ? validateLabel(addForm.value.name) : null))

async function submitAdd() {
  if (addError.value) return
  await createLabelMutation.mutateAsync({
    name: addForm.value.name,
    color: addForm.value.color,
    description: addForm.value.description,
  })
  addForm.value = { name: '', color: '6b7280', description: '' }
  showAddForm.value = false
}

// Edit label form
const editingLabel = ref<RepoLabel | null>(null)
const editForm = ref({ newName: '', color: '', description: '' })
const editError = computed(() =>
  editForm.value.newName ? validateLabel(editForm.value.newName) : null,
)

function startEdit(label: RepoLabel) {
  editingLabel.value = label
  editForm.value = {
    newName: label.name,
    color: label.color,
    description: label.description ?? '',
  }
}

function cancelEdit() {
  editingLabel.value = null
}

async function submitEdit() {
  if (!editingLabel.value || editError.value) return
  await updateLabelMutation.mutateAsync({
    oldName: editingLabel.value.name,
    newName: editForm.value.newName,
    color: editForm.value.color,
    description: editForm.value.description,
  })
  editingLabel.value = null
}

async function deleteLabel(name: string) {
  if (!window.confirm(`Delete label "${name}"? This cannot be undone.`)) return
  await deleteLabelMutation.mutateAsync(name)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Add label button + form -->
    <div class="mb-4">
      <button
        v-if="!showAddForm"
        class="rounded border border-border px-4 py-2 text-sm hover:bg-muted"
        @click="showAddForm = true"
      >
        + Add Label
      </button>

      <div v-else class="rounded-lg border border-border bg-card p-4">
        <h3 class="mb-3 text-sm font-medium">New Label</h3>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs text-muted-foreground">Name (namespace:value)</label>
            <input
              v-model="addForm.name"
              type="text"
              placeholder="category:writing"
              class="w-full rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p v-if="addError" class="mt-1 text-xs text-destructive">{{ addError }}</p>
          </div>
          <div>
            <label class="mb-1 block text-xs text-muted-foreground">Color (hex without #)</label>
            <div class="flex items-center gap-2">
              <input
                v-model="addForm.color"
                type="text"
                placeholder="6b7280"
                class="w-28 rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div
                class="h-5 w-5 rounded"
                :style="{ backgroundColor: `#${addForm.color}` }"
              />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs text-muted-foreground">Description</label>
            <input
              v-model="addForm.description"
              type="text"
              placeholder="Optional description"
              class="w-full rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div class="flex gap-2">
            <button
              class="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              :disabled="!!addError || createLabelMutation.isPending.value"
              @click="submitAdd"
            >
              Save
            </button>
            <button
              class="rounded border border-border px-4 py-1.5 text-sm hover:bg-muted"
              @click="showAddForm = false"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading skeletons -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i">
        <Skeleton class="mb-2 h-5 w-24" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="mt-1 h-10 w-full" />
      </div>
    </div>

    <!-- Label groups -->
    <div v-else v-for="ns in namespaces" :key="ns" class="space-y-1">
      <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{{ ns }}</h3>

      <div
        v-for="label in groupedLabels[ns]"
        :key="label.name"
        class="rounded-lg border border-border bg-card"
      >
        <!-- View mode -->
        <div
          v-if="editingLabel?.name !== label.name"
          class="flex items-center gap-3 px-4 py-2"
        >
          <div
            class="h-3 w-3 flex-shrink-0 rounded-sm"
            :style="{ backgroundColor: `#${label.color}` }"
          />
          <span class="flex-1 text-sm font-medium text-foreground">{{ label.name }}</span>
          <span class="flex-1 text-sm text-muted-foreground">{{ label.description }}</span>
          <div class="flex gap-2">
            <button
              class="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
              @click="startEdit(label)"
            >
              Edit
            </button>
            <button
              class="rounded border border-destructive/50 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
              :disabled="deleteLabelMutation.isPending.value"
              @click="deleteLabel(label.name)"
            >
              Delete
            </button>
          </div>
        </div>

        <!-- Edit mode (inline) -->
        <div v-else class="space-y-3 p-4">
          <h4 class="text-sm font-medium">Editing: {{ label.name }}</h4>
          <div>
            <label class="mb-1 block text-xs text-muted-foreground">Name (namespace:value)</label>
            <input
              v-model="editForm.newName"
              type="text"
              class="w-full rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p v-if="editError" class="mt-1 text-xs text-destructive">{{ editError }}</p>
          </div>
          <div>
            <label class="mb-1 block text-xs text-muted-foreground">Color (hex without #)</label>
            <div class="flex items-center gap-2">
              <input
                v-model="editForm.color"
                type="text"
                class="w-28 rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div
                class="h-5 w-5 rounded"
                :style="{ backgroundColor: `#${editForm.color}` }"
              />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs text-muted-foreground">Description</label>
            <input
              v-model="editForm.description"
              type="text"
              class="w-full rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div class="flex gap-2">
            <button
              class="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              :disabled="!!editError || updateLabelMutation.isPending.value"
              @click="submitEdit"
            >
              Save
            </button>
            <button
              class="rounded border border-border px-4 py-1.5 text-sm hover:bg-muted"
              @click="cancelEdit"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <p v-if="!isLoading && namespaces.length === 0" class="text-center text-muted-foreground py-10">
      No labels found.
    </p>
  </div>
</template>
