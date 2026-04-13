<script setup>
import { computed, onMounted, ref } from "vue";
import SectionCard from "@/components/SectionCard.vue";
import StatusPill from "@/components/StatusPill.vue";
import reservationAPI from "@/services/reservationAPI";
import settingsAPI from "@/services/settingsAPI";
import { todayDate } from "@/utils/formatters";
import { getApiErrorMessage } from "@/utils/http";

const reservations = ref([]);
const settings = ref(null);
const error = ref("");

const metrics = computed(() => {
  const collection = reservations.value;
  return {
    total: collection.length,
    confirmed: collection.filter((item) => item.status === "confirmed").length,
    completed: collection.filter((item) => item.status === "completed").length,
    noShow: collection.filter((item) => item.status === "no_show").length,
  };
});

const loadDashboard = async () => {
  error.value = "";
  try {
    const [settingsResponse, reservationsResponse] = await Promise.all([
      settingsAPI.getSettings(),
      reservationAPI.getReservations({ date: todayDate() }),
    ]);
    settings.value = settingsResponse.data.item;
    reservations.value = reservationsResponse.data.collection;
  } catch (err) {
    error.value = getApiErrorMessage(
      err,
      "Unable to load the Kaya dashboard right now."
    );
  }
};

onMounted(loadDashboard);
</script>

<template>
  <div class="page-shell">
    <div class="page-header">
      <h1>Kaya Staff Dashboard</h1>
      <p>
        Today’s floor overview, reservation volume, and operating context for
        the Kaya team.
      </p>
    </div>

    <div v-if="error" class="feedback error">{{ error }}</div>

    <div class="metric-grid">
      <div class="metric-card">
        <strong>{{ metrics.total }}</strong>
        <span>Reservations today</span>
      </div>
      <div class="metric-card">
        <strong>{{ metrics.confirmed }}</strong>
        <span>Confirmed</span>
      </div>
      <div class="metric-card">
        <strong>{{ metrics.completed }}</strong>
        <span>Completed</span>
      </div>
      <div class="metric-card">
        <strong>{{ metrics.noShow }}</strong>
        <span>No show</span>
      </div>
    </div>

    <div class="page-grid two-column" style="margin-top: 1.5rem">
      <SectionCard>
        <template #header>
          <div>
            <h2>Today’s reservations</h2>
            <p class="muted">Operational list for {{ todayDate() }}.</p>
          </div>
        </template>

        <div v-if="reservations.length === 0" class="empty-state">
          No reservations are scheduled for today yet.
        </div>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Guest</th>
              <th>Time</th>
              <th>Guests</th>
              <th>Area</th>
              <th>Table</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in reservations" :key="item.id">
              <td>{{ item.customer?.name }}</td>
              <td>{{ item.start_time }}</td>
              <td>{{ item.guest_count }}</td>
              <td>{{ item.seating_area || "Unassigned" }}</td>
              <td>{{ item.table?.table_name || "Pending" }}</td>
              <td><StatusPill :status="item.status" /></td>
            </tr>
          </tbody>
        </table>
      </SectionCard>

      <SectionCard>
        <template #header>
          <div>
            <h2>Operational settings</h2>
            <p class="muted">Backend-driven defaults exposed to staff.</p>
          </div>
        </template>

        <div v-if="settings" class="stack-list">
          <div class="list-card">
            <strong>Timezone</strong>
            <div class="muted">{{ settings.timezone }}</div>
          </div>
          <div class="list-card">
            <strong>Default reservation duration</strong>
            <div class="muted">
              {{ settings.default_reservation_duration_minutes }} minutes
            </div>
          </div>
          <div class="list-card">
            <strong>Configured seating areas</strong>
            <div class="muted">{{ settings.seating_areas.join(", ") }}</div>
          </div>
          <div class="list-card">
            <strong>Reception number</strong>
            <div class="muted">{{ settings.reception_number || "Not set" }}</div>
          </div>
        </div>
      </SectionCard>
    </div>
  </div>
</template>
