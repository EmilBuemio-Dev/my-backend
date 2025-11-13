document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const modal = document.getElementById("loginModal");
  const closeModal = document.getElementById("closeModal");

  loginBtn.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  closeModal.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  const adminBtn = document.querySelector(".role-btn:nth-child(1)");
  const hrBtn = document.querySelector(".role-btn:nth-child(2)");
  const employeeBtn = document.querySelector(".role-btn:nth-child(3)");
  const clientBtn = document.querySelector(".role-btn:nth-child(4)");

  adminBtn.addEventListener("click", () => {
    window.location.href = "/admin";
  });

  hrBtn.addEventListener("click", () => {
    window.location.href = "/hr";
  });

  employeeBtn.addEventListener("click", () => {
    window.location.href = "/employee";
  });

  clientBtn.addEventListener("click", () => {
    window.location.href = "/client";
  });
});