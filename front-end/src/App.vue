<script setup>
import TheNavbar from "@/components/TheNavbar.vue";
import TheFooter from "@/components/TheFooter.vue";
</script>

<template>
  <div class="wrapper">
    <TheNavbar />
    <main>
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" :key="$route.name" />
        </Transition>
      </RouterView>
    </main>
    <TheFooter />
  </div>
</template>

<style scoped>
main {
  background:
    radial-gradient(circle at top, rgba(205, 161, 91, 0.18), transparent 26%),
    var(--canvas);
  margin-top: var(--top-spacing);
  min-height: calc(100vh - 85px);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease-out;
}
</style>
