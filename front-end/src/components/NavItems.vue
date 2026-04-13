<script setup>
import NavItem from "@/components/NavItem.vue";
import CardListIcon from "~icons/bi/card-list";
import UserSquareIcon from "~icons/mdi/account-outline";
import TableIcon from "~icons/mdi/table-furniture";
import ClosureIcon from "~icons/mdi/calendar-remove-outline";
import SettingsIcon from "~icons/mdi/tune-variant";
</script>

<template>
  <div class="nav-items">
    <NavItem route-name="home" text="Dashboard">
      <template #icon>
        <CardListIcon />
      </template>
    </NavItem>
    <NavItem route-name="reservations" text="Reservations">
      <template #icon>
        <CardListIcon />
      </template>
    </NavItem>
    <NavItem route-name="customers" text="Customers">
      <template #icon>
        <UserSquareIcon />
      </template>
    </NavItem>
    <NavItem route-name="tables" text="Tables">
      <template #icon>
        <TableIcon />
      </template>
    </NavItem>
    <NavItem route-name="closures" text="Closures">
      <template #icon>
        <ClosureIcon />
      </template>
    </NavItem>
    <NavItem route-name="settings" text="Settings">
      <template #icon>
        <SettingsIcon />
      </template>
    </NavItem>
  </div>
</template>

<style scoped>
.nav-items {
  display: flex;
  font-family: "Montserrat-Medium";
  font-weight: normal;
  justify-content: flex-end;
  gap: 18px;
  align-items: center;
  flex-wrap: wrap;
}
@media screen and (min-width: 1024px) {
  .nav-items {
    gap: 24px;
  }
}
</style>
