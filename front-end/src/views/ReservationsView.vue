<script setup>
import { onMounted, reactive, ref } from "vue";
import SectionCard from "@/components/SectionCard.vue";
import StatusPill from "@/components/StatusPill.vue";
import reservationAPI from "@/services/reservationAPI";
import settingsAPI from "@/services/settingsAPI";
import { todayDate } from "@/utils/formatters";
import { getApiErrorMessage, getApiErrors } from "@/utils/http";

const settings = ref(null);
const reservations = ref([]);
const selectedReservationId = ref(null);
const loading = ref(false);
const feedback = ref("");
const error = ref("");
const availability = ref(null);
const dateFilter = ref(todayDate());

const reservationSources = [
  "staff_dashboard",
  "manual",
  "phone_agent",
  "whatsapp",
  "web",
];

const createInitialForm = () => ({
  reservation_id: null,
  customer_name: "",
  phone_number: "",
  reservation_date: todayDate(),
  reservation_time: "20:00",
  guest_count: 2,
  seating_preference: "",
  special_request: "",
  source: "staff_dashboard",
  duration_minutes: "",
  preferred_language: "",
});

const form = reactive(createInitialForm());

const resetForm = () => {
  Object.assign(form, createInitialForm());
  selectedReservationId.value = null;
  availability.value = null;
  feedback.value = "";
  error.value = "";
};

const applyReservationToForm = (item) => {
  Object.assign(form, {
    reservation_id: item.id,
    customer_name: item.customer?.name || "",
    phone_number: item.customer?.phone_e164 || "",
    reservation_date: item.reservation_date,
    reservation_time: item.start_time.slice(0, 5),
    guest_count: item.guest_count,
    seating_preference: item.seating_area || "",
    special_request: item.special_request || "",
    source: item.source || "staff_dashboard",
    duration_minutes: "",
    preferred_language: item.customer?.preferred_language || "",
  });
  selectedReservationId.value = item.id;
  availability.value = null;
  feedback.value = "";
  error.value = "";
};

const loadReservations = async () => {
  loading.value = true;
  error.value = "";
  try {
    const response = await reservationAPI.getReservations({ date: dateFilter.value });
    reservations.value = response.data.collection;
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to load reservations.");
  } finally {
    loading.value = false;
  }
};

const loadSettings = async () => {
  const response = await settingsAPI.getSettings();
  settings.value = response.data.item;
};

const loadPage = async () => {
  try {
    if (!settings.value) {
      await loadSettings();
    }
    await loadReservations();
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to load Kaya reservations.");
  }
};

const buildPayload = () => ({
  customer_name: form.customer_name,
  phone_number: form.phone_number,
  reservation_date: form.reservation_date,
  reservation_time: form.reservation_time,
  guest_count: Number(form.guest_count),
  seating_preference: form.seating_preference || null,
  special_request: form.special_request || null,
  source: form.source,
  duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
  preferred_language: form.preferred_language || null,
});

const submitReservation = async () => {
  feedback.value = "";
  error.value = "";
  availability.value = null;

  try {
    if (form.reservation_id) {
      await reservationAPI.updateReservation(form.reservation_id, buildPayload());
      feedback.value = "Reservation updated.";
    } else {
      const response = await reservationAPI.createReservation(buildPayload());
      feedback.value = response.data.duplicate
        ? "Matching confirmed reservation already existed; the existing booking was reused."
        : "Reservation created.";
    }

    await loadReservations();
    resetForm();
  } catch (err) {
    const fieldErrors = getApiErrors(err);
    error.value = getApiErrorMessage(
      err,
      "Unable to save this reservation right now."
    );
    if (fieldErrors?.alternative_slots || fieldErrors?.alternative_areas) {
      availability.value = {
        available: false,
        explanation: error.value,
        alternative_slots: fieldErrors.alternative_slots || [],
        alternative_areas: fieldErrors.alternative_areas || [],
      };
    }
  }
};

const checkAvailability = async () => {
  feedback.value = "";
  error.value = "";
  try {
    const response = await reservationAPI.checkAvailability(buildPayload());
    availability.value = response.data.item;
  } catch (err) {
    error.value = getApiErrorMessage(
      err,
      "Unable to check availability right now."
    );
  }
};

const updateStatus = async (reservationId, status) => {
  feedback.value = "";
  error.value = "";
  try {
    await reservationAPI.updateReservationStatus(reservationId, status);
    feedback.value = `Reservation marked as ${status.replaceAll("_", " ")}.`;
    await loadReservations();
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to update reservation status.");
  }
};

const cancelReservation = async (reservationId) => {
  feedback.value = "";
  error.value = "";
  try {
    await reservationAPI.cancelReservation(reservationId);
    feedback.value = "Reservation cancelled.";
    await loadReservations();
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to cancel this reservation.");
  }
};

onMounted(loadPage);
</script>

<template>
  <div class="page-shell">
    <div class="page-header">
      <h1>Reservations</h1>
      <p>
        Create, edit, complete, or cancel Kaya reservations with area-aware
        availability and table assignment.
      </p>
    </div>

    <div class="toolbar" style="margin-bottom: 1rem">
      <div class="field-group">
        <label class="field-label" for="date-filter">Service date</label>
        <input
          id="date-filter"
          v-model="dateFilter"
          class="field-input"
          type="date"
          @change="loadReservations"
        />
      </div>
      <button class="btn-secondary" @click="loadReservations">Refresh</button>
      <button class="btn-secondary" @click="resetForm">New Reservation</button>
    </div>

    <div v-if="error" class="feedback error" style="margin-bottom: 1rem">
      {{ error }}
    </div>
    <div v-if="feedback" class="feedback success" style="margin-bottom: 1rem">
      {{ feedback }}
    </div>

    <div class="page-grid two-column">
      <SectionCard>
        <template #header>
          <div>
            <h2>Reservation list</h2>
            <p class="muted">
              {{ loading ? "Loading..." : `${reservations.length} bookings on this date.` }}
            </p>
          </div>
        </template>

        <div v-if="reservations.length === 0" class="empty-state">
          No reservations found for the selected service date.
        </div>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Guest</th>
              <th>Time</th>
              <th>Area</th>
              <th>Table</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in reservations"
              :key="item.id"
              :style="
                item.id === selectedReservationId
                  ? 'background: rgba(205, 161, 91, 0.08);'
                  : ''
              "
            >
              <td>
                <strong>{{ item.customer?.name }}</strong>
                <div class="muted">{{ item.guest_count }} guests</div>
              </td>
              <td>{{ item.start_time }} - {{ item.end_time }}</td>
              <td>{{ item.seating_area || "No preference" }}</td>
              <td>{{ item.table?.table_name || "Pending" }}</td>
              <td><StatusPill :status="item.status" /></td>
              <td>
                <div v-if="item.status === 'confirmed'" class="actions-row">
                  <button class="btn-secondary" @click="applyReservationToForm(item)">
                    Edit
                  </button>
                  <button
                    class="btn-secondary"
                    @click="updateStatus(item.id, 'completed')"
                  >
                    Complete
                  </button>
                  <button
                    class="btn-secondary"
                    @click="updateStatus(item.id, 'no_show')"
                  >
                    No show
                  </button>
                  <button class="btn-danger" @click="cancelReservation(item.id)">
                    Cancel
                  </button>
                </div>
                <span v-else class="muted">No further action</span>
              </td>
            </tr>
          </tbody>
        </table>
      </SectionCard>

      <SectionCard>
        <template #header>
          <div>
            <h2>{{ form.reservation_id ? "Edit reservation" : "New reservation" }}</h2>
            <p class="muted">Manual Kaya booking form for staff operations.</p>
          </div>
        </template>

        <div class="form-grid">
          <div class="field-group">
            <label class="field-label">Customer name</label>
            <input v-model="form.customer_name" class="field-input" type="text" />
          </div>
          <div class="field-group">
            <label class="field-label">Phone number</label>
            <input v-model="form.phone_number" class="field-input" type="text" />
          </div>
          <div class="field-group">
            <label class="field-label">Reservation date</label>
            <input v-model="form.reservation_date" class="field-input" type="date" />
          </div>
          <div class="field-group">
            <label class="field-label">Reservation time</label>
            <input v-model="form.reservation_time" class="field-input" type="time" />
          </div>
          <div class="field-group">
            <label class="field-label">Guest count</label>
            <input v-model="form.guest_count" class="field-input" type="number" min="1" />
          </div>
          <div class="field-group">
            <label class="field-label">Seating preference</label>
            <select v-model="form.seating_preference" class="field-select">
              <option value="">No preference</option>
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
            <label class="field-label">Source</label>
            <select v-model="form.source" class="field-select">
              <option v-for="source in reservationSources" :key="source" :value="source">
                {{ source }}
              </option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Preferred language</label>
            <input v-model="form.preferred_language" class="field-input" type="text" />
          </div>
        </div>

        <div class="form-grid full" style="margin-top: 0.9rem">
          <div class="field-group">
            <label class="field-label">Special request</label>
            <textarea v-model="form.special_request" class="field-textarea"></textarea>
          </div>
        </div>

        <div class="actions-row" style="margin-top: 1rem">
          <button class="btn-primary" @click="submitReservation">
            {{ form.reservation_id ? "Save changes" : "Create reservation" }}
          </button>
          <button class="btn-secondary" @click="checkAvailability">
            Check availability
          </button>
          <button class="btn-secondary" @click="resetForm">Reset</button>
        </div>

        <div v-if="availability" style="margin-top: 1rem" class="stack-list">
          <div class="list-card">
            <strong>Availability result</strong>
            <div class="muted">{{ availability.explanation }}</div>
            <div v-if="availability.available" style="margin-top: 0.4rem">
              Matched area: {{ availability.matched_area }}. Table ID:
              {{ availability.matched_table_id }}.
            </div>
          </div>

          <div
            v-if="availability.alternative_areas?.length"
            class="list-card"
          >
            <strong>Alternative areas</strong>
            <div class="muted">{{ availability.alternative_areas.join(", ") }}</div>
          </div>

          <div
            v-if="availability.alternative_slots?.length"
            class="list-card"
          >
            <strong>Alternative slots</strong>
            <ul style="margin: 0.6rem 0 0; padding-left: 1.2rem">
              <li v-for="slot in availability.alternative_slots" :key="slot.reservation_time">
                {{ slot.reservation_time }} - {{ slot.end_time }} in
                {{ slot.matched_area }}
              </li>
            </ul>
          </div>
        </div>
      </SectionCard>
    </div>
  </div>
</template>
