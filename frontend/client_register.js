document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("clientRegisterForm");
  const branchSelect = document.getElementById("clientBranch");

  // Fetch all branches from backend
  async function loadBranches() {
    try {
      const res = await fetch("http://localhost:5000/api/branches-management");
      const branches = await res.json();
      branches.forEach(branch => {
        const option = document.createElement("option");
        option.value = branch.name;
        option.textContent = branch.name;
        branchSelect.appendChild(option);
      });
    } catch (err) {
      console.error("Failed to load branches:", err);
      alert("Failed to load branch list. Please try again later.");
    }
  }

  loadBranches();

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = document.getElementById("clientPassword").value.trim();
    const passwordConfirm = document.getElementById("clientPasswordConfirm").value.trim();

    if (password !== passwordConfirm) {
      alert("❌ Passwords do not match. Please try again.");
      return;
    }

    const formData = new FormData();
    formData.append("name", document.getElementById("clientName").value.trim());
    formData.append("email", document.getElementById("clientEmail").value.trim());
    formData.append("password", password); // validated password
    formData.append("branch", branchSelect.value);
    formData.append("role", "client");
    formData.append("status", "Pending");

    const contractFile = document.getElementById("contractFile").files[0];
    if (contractFile) formData.append("contract", contractFile);

    try {
      const res = await fetch("http://localhost:5000/accounts", {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Failed to create client request");

      alert("✅ Client request submitted. Waiting for admin approval.");
      form.reset();
    } catch (err) {
      console.error("❌ Error creating client:", err);
      alert("Server error: " + err.message);
    }
  });
});
