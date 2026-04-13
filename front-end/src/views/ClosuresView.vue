<script setup>
import { onMounted, reactive, ref } from "vue";
import SectionCard from "@/components/SectionCard.vue";
import closureAPI from "@/services/closureAPI";
import settingsAPI from "@/services/settingsAPI";
import tableAPI from "@/services/tableAPI";
import { todayDate } from "@/utils/formatters";
import { getApiErrorMessage } from "@/utils/http";

const closures = ref([]);
const tables = ref([]);
const settings = ref(null);
const feedback = ref("");
const error = ref("");
const filterDate = ref("");

const form = reactive({
  date: todayDate(),
  start_time: "18:00",
  end_time: "20:00",
  area: "",
  table_id: "",
  reason: "",
});

const loadClosures = async () => {
  try {
    const response = await closureAPI.getClosures(
      filterDate.value ? { date: filterDate.value } : {}
    );
    closures.value = response.data.collection;
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to load closures.");
  }
};

const loadPage = async () => {
  const [settingsResponse, tablesResponse] = await Promise.all([
    settingsAPI.getSettings(),
    tableAPI.getTables(),
  ]);
  settings.value = settingsResponse.data.item;
  tables.value = tablesResponse.data.collection;
  await loadClosures();
};

const submitClosure = async () => {
  feedback.value = "";
  error.value = "";
  try {
    await closureAPI.createClosure({
      ...form,
      table_id: form.table_id || null,
      area: form.area || null,
    });
    feedback.value = "Closure saved.";
    await loadClosures();
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to save closure.");
  }
};

const removeClosure = async (closureId) => {
  feedback.value = "";
  error.value = "";
  try {
    await closureAPI.deleteClosure(closureId);
    feedback.value = "Closure removed.";
    await loadClosures();
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to delete closure.");
  }
};

onMounted(loadPage);
</script>

<template>
  <div class="page-shell">
    <div class="page-header">
      <h1>Closures & blocked slots</h1>
      <p>
        Block an area, a specific table, or the whole restaurant for weather,
        events, or maintenance.
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
            <h2>Existing closures</h2>
            <p class="muted">Area-level and table-level blocking rules.</p>
          </div>
        </template>

        <div class="toolbar" style="margin-bottom: 1rem">
          <div class="field-group">
            <label class="field-label">Filter by date</label>
            <input v-model="filterDate" class="field-input" type="date" />
          </div>
          <button class="btn-secondary" @click="loadClosures">Apply</button>
        </div>

        <div v-if="closures.length === 0" class="empty-state">
          No closures match the current filter.
        </div>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Area</th>
              <th>Table</th>
              <th>Reason</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="closure in closures" :key="closure.id">
              <td>{{ closure.date }}</td>
              <td>{{ closure.start_time }} - {{ closure.end_time }}</td>
              <td>{{ closure.area || "Whole restaurant" }}</td>
              <td>{{ closure.table?.table_name || "Area-level" }}</td>
              <td>{{ closure.reason }}</td>
              <td>
                <button class="btn-danger" @click="removeClosure(closure.id)">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </SectionCard>

      <SectionCard>
        <template #header>
          <div>
            <h2>Block a slot</h2>
            <p class="muted">Use area or table scope as needed.</p>
          </div>
        </template>

        <div class="form-grid">
          <div class="field-group">
            <label class="field-label">Date</label>
            <input v-model="form.date" class="field-input" type="date" />
          </div>
          <div class="field-group">
            <label class="field-label">Area</label>
            <select v-model="form.area" class="field-select">
              <option value="">Whole restaurant / no area</option>
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
            <label class="field-label">Start time</label>
            <input v-model="form.start_time" class="field-input" type="time" />
          </div>
          <div class="field-group">
            <label class="field-label">End time</label>
            <input v-model="form.end_time" class="field-input" type="time" />
          </div>
          <div class="field-group">
            <label class="field-label">Specific table</label>
            <select v-model="form.table_id" class="field-select">
              <option value="">No table override</option>
              <option v-for="table in tables" :key="table.id" :value="table.id">
                {{ table.table_name }} ({{ table.area }})
              </option>
            </select>
          </div>
        </div>

        <div class="form-grid full" style="margin-top: 0.9rem">
          <div class="field-group">
            <label class="field-label">Reason</label>
            <textarea v-model="form.reason" class="field-textarea"></textarea>
          </div>
        </div>

        <div class="actions-row" style="margin-top: 1rem">
          <button class="btn-primary" @click="submitClosure">Save closure</button>
        </div>
      </SectionCard>
    </div>
  </div>
</template>
