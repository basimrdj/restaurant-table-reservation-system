import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/reservations",
      name: "reservations",
      component: () => import("../views/ReservationsView.vue"),
    },
    {
      path: "/customers",
      name: "customers",
      component: () => import("../views/CustomersView.vue"),
    },
    {
      path: "/tables",
      name: "tables",
      component: () => import("../views/TablesView.vue"),
    },
    {
      path: "/closures",
      name: "closures",
      component: () => import("../views/ClosuresView.vue"),
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("../views/SettingsView.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      name: "notFound",
      component: () => import("../views/NotFoundView.vue"),
    },
  ],
});

export default router;
