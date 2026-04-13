<template>
  <footer>
    <div class="footer-wrapper">
      <div class="brand">Kaya Reservation System</div>
      <div class="line"></div>
      <div class="copyright">
        Internal staff dashboard for customers, reservations, closures, and
        Retell-ready operations.
      </div>
    </div>
  </footer>
</template>

<style scoped>
footer {
  background-color: #1f1715;
  font-family: "Montserrat-Normal";
}
.footer-wrapper {
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 2.6rem var(--x-spacing-mobile);
}

.line {
  height: 1px;
  width: min(720px, 100%);
  background-color: rgba(255, 240, 223, 0.12);
}

.brand {
  color: var(--text-on-dark);
  font-family: "Jost-Bold";
  font-size: 1.2rem;
}

.copyright {
  color: rgba(255, 244, 228, 0.72);
  font-size: 0.9rem;
  text-align: center;
  max-width: 720px;
}

@media screen and (min-width: 1024px) {
  .copyright {
    font-size: 14px;
  }
}
</style>
