<script setup>
import { computed } from "vue";
import { formatStatus } from "@/utils/formatters";

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
});

const toneClass = computed(() => {
  const status = props.status;
  if (status === "confirmed") return "confirmed";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  if (status === "no_show") return "no-show";
  return "neutral";
});
</script>

<template>
  <span class="status-pill" :class="toneClass">
    {{ formatStatus(props.status) }}
  </span>
</template>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.8rem;
  font-family: "Inter-Medium";
  text-transform: capitalize;
  border: 1px solid transparent;
}

.confirmed {
  background: rgba(165, 131, 67, 0.12);
  color: #7b5a1c;
  border-color: rgba(165, 131, 67, 0.25);
}

.completed {
  background: rgba(46, 125, 50, 0.12);
  color: #1b5e20;
  border-color: rgba(46, 125, 50, 0.25);
}

.cancelled,
.no-show {
  background: rgba(155, 46, 46, 0.12);
  color: #7f1d1d;
  border-color: rgba(155, 46, 46, 0.2);
}

.neutral {
  background: rgba(54, 69, 79, 0.1);
  color: #36454f;
  border-color: rgba(54, 69, 79, 0.2);
}
</style>
