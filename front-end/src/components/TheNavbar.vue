<script setup>
import NavItems from "@/components/NavItems.vue";
import ButtonHamburger from "@/components/ButtonHamburger.vue";

import { useRouter } from "vue-router";
import { ref, onMounted } from "vue";

const router = useRouter();

const isMobile = ref(null);
const mobileNav = ref(null);
const windowWidth = ref(null);

const toggleMobileNav = () => {
  mobileNav.value = !mobileNav.value;
};

const checkWindowWidth = () => {
  windowWidth.value = window.innerWidth;
  if (windowWidth.value <= 768) {
    isMobile.value = true;
    return;
  }
  isMobile.value = false;
  mobileNav.value = false;
  return;
};

onMounted(() => {
  window.addEventListener("resize", checkWindowWidth);
  checkWindowWidth();
});
</script>

<template>
  <header>
    <nav>
      <button class="brand" @click="router.push({ name: 'home' })">
        <span class="brand-mark">K</span>
        <span class="brand-copy">
          <strong>Kaya</strong>
          <small>Reservation System</small>
        </span>
      </button>
      <div v-show="!isMobile" class="nav-links">
        <NavItems />
      </div>
      <ButtonHamburger
        :mobile-nav="mobileNav"
        :is-mobile="isMobile"
        :toggle-mobile-nav="toggleMobileNav"
      />
      <Transition name="fade">
        <div class="overlay" v-show="mobileNav" @click.self="toggleMobileNav">
          <Transition name="mobile-nav">
            <div class="mobile-nav" v-show="mobileNav">
              <NavItems class="mobile-nav-items" />
            </div>
          </Transition>
        </div>
      </Transition>
    </nav>
  </header>
</template>

<style scoped>
header {
  background-color: rgba(32, 18, 18, 0.95);
  backdrop-filter: blur(18px);
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  z-index: 20;
}
nav {
  display: flex;
  padding: 0.8rem var(--x-spacing-mobile);
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: transparent;
  color: var(--text-on-dark);
  cursor: pointer;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 14px;
  background: linear-gradient(135deg, #cda15b, #7d5524);
  color: #fff7ea;
  font-family: "Jost-Bold";
  font-size: 1.25rem;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.05;
}

.brand-copy strong {
  font-family: "Jost-Bold";
  font-size: 1.2rem;
}

.brand-copy small {
  color: rgba(255, 244, 228, 0.78);
  font-size: 0.78rem;
}
.nav-links {
  font-size: 12px;
  color: var(--text-on-dark);
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: var(--darkened-color);
}

  .mobile-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  color: var(--primary-black);
  top: 0;
  left: 0;
  flex-direction: column;
  width: 100%;
  height: 100%;
  max-width: 250px;
  background-color: var(--surface);
}

.mobile-nav-items {
  display: flex;
  justify-content: space-between;
  gap: 30px;
  flex-direction: column;
  align-items: center;
}

.mobile-nav-enter-active,
.mobile-nav-leave-active {
  transition: 1s ease all;
}
.mobile-nav-enter-from,
.mobile-nav-leave-to {
  transform: translateX(-250px);
}
.mobile-nav-enter-to {
  transform: translateX(0);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease-out;
}

@media screen and (min-width: 1024px) {
  nav {
    padding: 0.8rem var(--x-spacing-desktop);
  }
  .nav-links {
    font-size: 14px;
  }
}
</style>
