<script setup>
import { onMounted, reactive, ref } from "vue";
import SectionCard from "@/components/SectionCard.vue";
import tableAPI from "@/services/tableAPI";
import settingsAPI from "@/services/settingsAPI";
import { getApiErrorMessage } from "@/utils/http";

const tables = ref([]);
const settings = ref(null);
const selectedTableId = ref(null);
const feedback = ref("");
const error = ref("");

const createInitialForm = () => ({
  table_name: "",
  area: "",
  capacity: 2,
  is_active: true,
  notes: "",
});

const form = reactive(createInitialForm());

const resetForm = () => {
  Object.assign(form, createInitialForm());
  selectedTableId.value = null;
};

const loadTables = async () => {
  try {
    const response = await tableAPI.getTables();
    tables.value = response.data.collection;
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to load tables.");
  }
};

const loadSettings = async () => {
  const response = await settingsAPI.getSettings();
  settings.value = response.data.item;
};

const editTable = (table) => {
  Object.assign(form, {
    table_name: table.table_name,
    area: table.area,
    capacity: table.capacity,
    is_active: table.is_active,
    notes: table.notes || "",
  });
  selectedTableId.value = table.id;
};

const submitTable = async () => {
  feedback.value = "";
  error.value = "";
  try {
    if (selectedTableId.value) {
      await tableAPI.updateTable(selectedTableId.value, form);
      feedback.value = "Table updated.";
    } else {
      await tableAPI.createTable(form);
      feedback.value = "Table created.";
    }
    await loadTables();
    resetForm();
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to save table.");
  }
};

onMounted(async () => {
  await Promise.all([loadSettings(), loadTables()]);
});
</script>

<template>
  <div class="page-shell">
    <div class="page-header">
      <h1>Tables & seating areas</h1>
      <p>
        Maintain Kaya’s active tables, capacities, area assignments, and staff
        notes.
      </p>
    </div>

    <div v-if="error" class="feedback error" style="margin-bottom: 1rem">{{ error }}</div>
    <div v-if="feedback" class="feedback success" style="margin-bottom: 1rem">
      {{ feedback }}
    </div>

    <div class="page-grid two-column">
      <SectionCard>
        <template #header>
          <div>
            <h2>Current floor inventory</h2>
            <p class="muted">{{ tables.length }} tables configured.</p>
          </div>
        </template>

        <table class="data-table">
          <thead>
            <tr>
              <th>Table</th>
              <th>Area</th>
              <th>Capacity</th>
              <th>State</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="table in tables" :key="table.id">
              <td>{{ table.table_name }}</td>
              <td>{{ table.area }}</td>
              <td>{{ table.capacity }}</td>
              <td>{{ table.is_active ? "Active" : "Inactive" }}</td>
              <td>
                <button class="btn-secondary" @click="editTable(table)">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </SectionCard>

      <SectionCard>
        <template #header>
          <div>
            <h2>{{ selectedTableId ? "Edit table" : "Add table" }}</h2>
            <p class="muted">Area-aware table management for Kaya.</p>
          </div>
        </template>

        <div class="form-grid">
          <div class="field-group">
            <label class="field-label">Table name</label>
            <input v-model="form.table_name" class="field-input" type="text" />
          </div>
          <div class="field-group">
            <label class="field-label">Area</label>
            <select v-model="form.area" class="field-select">
              <option value="">Choose an area</option>
              <option
                v-for="area in settings?.seating_areas || []"
                :key="area"
                :value="area"
              >
                {{ area }}
              </option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Capacity</label>
            <input v-model="form.capacity" class="field-input" type="number" min="1" />
          </div>
          <div class="field-group" style="justify-content: end">
            <label style="display: flex; gap: 0.6rem; margin-top: 2rem">
              <input v-model="form.is_active" type="checkbox" />
              <span>Active for booking</span>
            </label>
          </div>
        </div>

        <div class="form-grid full" style="margin-top: 0.9rem">
          <div class="field-group">
            <label class="field-label">Notes</label>
            <textarea v-model="form.notes" class="field-textarea"></textarea>
          </div>
        </div>

        <div class="actions-row" style="margin-top: 1rem">
          <button class="btn-primary" @click="submitTable">
            {{ selectedTableId ? "Save table" : "Create table" }}
          </button>
          <button class="btn-secondary" @click="resetForm">Reset</button>
        </div>
      </SectionCard>
    </div>
  </div>
</template>
