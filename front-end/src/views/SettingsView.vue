<script setup>
import { onMounted, reactive, ref } from "vue";
import SectionCard from "@/components/SectionCard.vue";
import settingsAPI from "@/services/settingsAPI";
import { dayLabels } from "@/utils/formatters";
import { getApiErrorMessage } from "@/utils/http";

const settings = ref(null);
const hours = reactive([]);
const feedback = ref("");
const error = ref("");

const loadSettings = async () => {
  try {
    const response = await settingsAPI.getSettings();
    settings.value = response.data.item;
    hours.splice(
      0,
      hours.length,
      ...(settings.value.weekly_hours || []).map((item) => ({
        day_of_week: item.day_of_week,
        open_time: item.open_time ? item.open_time.slice(0, 5) : "",
        close_time: item.close_time ? item.close_time.slice(0, 5) : "",
        is_closed: item.is_closed,
      }))
    );
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to load settings.");
  }
};

const saveHours = async () => {
  feedback.value = "";
  error.value = "";
  try {
    await settingsAPI.updateOperatingHours(hours);
    feedback.value = "Operating hours updated.";
    await loadSettings();
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to update operating hours.");
  }
};

onMounted(loadSettings);
</script>

<template>
  <div class="page-shell">
    <div class="page-header">
      <h1>Settings & hours</h1>
      <p>
        Review Kaya’s centralized operational defaults and maintain editable
        weekly opening hours.
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
            <h2>Backend defaults</h2>
            <p class="muted">Single operational source of truth exposed via API.</p>
          </div>
        </template>

        <div v-if="settings" class="stack-list">
          <div class="list-card">
            <strong>Restaurant</strong>
            <div class="muted">{{ settings.restaurant_name }}</div>
          </div>
          <div class="list-card">
            <strong>Timezone</strong>
            <div class="muted">{{ settings.timezone }}</div>
          </div>
          <div class="list-card">
            <strong>Default duration</strong>
            <div class="muted">
              {{ settings.default_reservation_duration_minutes }} minutes
            </div>
          </div>
          <div class="list-card">
            <strong>Alternative step size</strong>
            <div class="muted">
              {{ settings.alternative_slot_step_minutes }} minutes
            </div>
          </div>
          <div class="list-card">
            <strong>Phone country</strong>
            <div class="muted">{{ settings.default_phone_country }}</div>
          </div>
          <div class="list-card">
            <strong>Seating areas</strong>
            <div class="muted">{{ settings.seating_areas.join(", ") }}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <template #header>
          <div>
            <h2>Weekly opening hours</h2>
            <p class="muted">These rows feed the availability engine directly.</p>
          </div>
        </template>

        <table class="data-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Open</th>
              <th>Close</th>
              <th>Closed</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in hours" :key="item.day_of_week">
              <td>{{ dayLabels[item.day_of_week] }}</td>
              <td>
                <input
                  v-model="item.open_time"
                  class="field-input"
                  type="time"
                  :disabled="item.is_closed"
                />
              </td>
              <td>
                <input
                  v-model="item.close_time"
                  class="field-input"
                  type="time"
                  :disabled="item.is_closed"
                />
              </td>
              <td>
                <input v-model="item.is_closed" type="checkbox" />
              </td>
            </tr>
          </tbody>
        </table>

        <div class="actions-row" style="margin-top: 1rem">
          <button class="btn-primary" @click="saveHours">Save hours</button>
        </div>
      </SectionCard>
    </div>
  </div>
</template>
