<template>
  <section class="section-card">
    <header v-if="$slots.header" class="section-header">
      <slot name="header"></slot>
    </header>
    <div class="section-body">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped>
.section-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: 0 14px 32px rgba(18, 16, 13, 0.06);
}

.section-header {
  padding: 1.2rem 1.3rem 0;
}

.section-body {
  padding: 1.3rem;
}
</style>
