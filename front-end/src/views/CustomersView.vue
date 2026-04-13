<script setup>
import { onMounted, reactive, ref } from "vue";
import SectionCard from "@/components/SectionCard.vue";
import StatusPill from "@/components/StatusPill.vue";
import customerAPI from "@/services/customerAPI";
import { getApiErrorMessage } from "@/utils/http";

const customers = ref([]);
const selectedCustomer = ref(null);
const query = ref("");
const feedback = ref("");
const error = ref("");

const form = reactive({
  name: "",
  preferred_language: "",
  notes: "",
  vip_flag: false,
});

const syncForm = () => {
  if (!selectedCustomer.value) return;
  Object.assign(form, {
    name: selectedCustomer.value.name,
    preferred_language: selectedCustomer.value.preferred_language || "",
    notes: selectedCustomer.value.notes || "",
    vip_flag: Boolean(selectedCustomer.value.vip_flag),
  });
};

const loadCustomers = async () => {
  try {
    const response = await customerAPI.getCustomers(query.value);
    customers.value = response.data.collection;

    if (!selectedCustomer.value && customers.value.length > 0) {
      await selectCustomer(customers.value[0].id);
    }
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to load customers.");
  }
};

const selectCustomer = async (customerId) => {
  try {
    const response = await customerAPI.getCustomer(customerId);
    selectedCustomer.value = response.data.item;
    syncForm();
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to load customer detail.");
  }
};

const saveCustomer = async () => {
  if (!selectedCustomer.value) return;

  feedback.value = "";
  error.value = "";

  try {
    const response = await customerAPI.updateCustomer(selectedCustomer.value.id, form);
    selectedCustomer.value = response.data.item;
    syncForm();
    feedback.value = "Customer updated.";
    await loadCustomers();
  } catch (err) {
    error.value = getApiErrorMessage(err, "Unable to update customer.");
  }
};

onMounted(loadCustomers);
</script>

<template>
  <div class="page-shell">
    <div class="page-header">
      <h1>Customers</h1>
      <p>
        Search Kaya guests by phone or name, review visit history, and keep
        personalization fields current.
      </p>
    </div>

    <div v-if="error" class="feedback error" style="margin-bottom: 1rem">
      {{ error }}
    </div>
    <div v-if="feedback" class="feedback success" style="margin-bottom: 1rem">
      {{ feedback }}
    </div>

    <div class="toolbar" style="margin-bottom: 1rem">
      <div class="field-group">
        <label class="field-label">Search customers</label>
        <input v-model="query" class="field-input" type="search" />
      </div>
      <button class="btn-secondary" @click="loadCustomers">Search</button>
    </div>

    <div class="page-grid two-column">
      <SectionCard>
        <template #header>
          <div>
            <h2>Customer directory</h2>
            <p class="muted">{{ customers.length }} matching profiles.</p>
          </div>
        </template>

        <div v-if="customers.length === 0" class="empty-state">
          No customers found for this search.
        </div>

        <div v-else class="stack-list">
          <button
            v-for="customer in customers"
            :key="customer.id"
            class="list-card interactive"
            :style="
              selectedCustomer?.id === customer.id
                ? 'border-color: rgba(205, 161, 91, 0.45);'
                : ''
            "
            @click="selectCustomer(customer.id)"
          >
            <div style="display: flex; justify-content: space-between; gap: 1rem">
              <div>
                <strong>{{ customer.name }}</strong>
                <div class="muted">{{ customer.phone_e164 }}</div>
              </div>
              <div>{{ customer.vip_flag ? "VIP" : "" }}</div>
            </div>
            <div class="muted" style="margin-top: 0.4rem">
              {{
                customer.last_visit_at
                  ? `Last visit: ${customer.last_visit_at}`
                  : "No completed visits yet"
              }}
            </div>
          </button>
        </div>
      </SectionCard>

      <SectionCard>
        <template #header>
          <div>
            <h2>Customer detail</h2>
            <p class="muted">
              {{ selectedCustomer ? selectedCustomer.phone_e164 : "Select a customer" }}
            </p>
          </div>
        </template>

        <div v-if="!selectedCustomer" class="empty-state">
          Choose a customer to review notes and reservation history.
        </div>

        <template v-else>
          <div class="form-grid">
            <div class="field-group">
              <label class="field-label">Name</label>
              <input v-model="form.name" class="field-input" type="text" />
            </div>
            <div class="field-group">
              <label class="field-label">Preferred language</label>
              <input
                v-model="form.preferred_language"
                class="field-input"
                type="text"
              />
            </div>
          </div>

          <div class="form-grid full" style="margin-top: 0.9rem">
            <div class="field-group">
              <label class="field-label">Staff notes</label>
              <textarea v-model="form.notes" class="field-textarea"></textarea>
            </div>
          </div>

          <label style="display: flex; gap: 0.6rem; margin-top: 0.9rem">
            <input v-model="form.vip_flag" type="checkbox" />
            <span>VIP customer</span>
          </label>

          <div class="actions-row" style="margin-top: 1rem">
            <button class="btn-primary" @click="saveCustomer">Save customer</button>
          </div>

          <div class="stack-list" style="margin-top: 1rem">
            <div class="list-card">
              <strong>Behavior summary</strong>
              <div class="muted" style="margin-top: 0.4rem">
                {{
                  selectedCustomer.last_visit_summary ||
                  "No completed visit summary is available yet."
                }}
              </div>
              <div class="muted">
                Preferred seating area:
                {{ selectedCustomer.preferred_seating_area || "Not inferable yet" }}
              </div>
            </div>

            <div class="list-card">
              <strong>Reservation history</strong>
              <div
                v-if="selectedCustomer.reservation_history.length === 0"
                class="empty-state"
                style="margin-top: 0.8rem"
              >
                No reservation history on file.
              </div>
              <table v-else class="data-table" style="margin-top: 0.6rem">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Area</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="reservation in selectedCustomer.reservation_history"
                    :key="reservation.id"
                  >
                    <td>{{ reservation.reservation_date }}</td>
                    <td>{{ reservation.start_time }}</td>
                    <td>{{ reservation.seating_area || "No preference" }}</td>
                    <td><StatusPill :status="reservation.status" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </SectionCard>
    </div>
  </div>
</template>
