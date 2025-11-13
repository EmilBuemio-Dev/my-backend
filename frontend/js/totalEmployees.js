document.addEventListener("DOMContentLoaded", async () => {
  await loadEmployees();
});

async function loadEmployees() {
  try {
    const res = await fetch("https://www.mither3security.com/employees");
    if (!res.ok) throw new Error("Failed to fetch employees");

    const employees = await res.json();
    const tbody = document.getElementById("applicant-table-body");
    tbody.innerHTML = "";

    employees.forEach(emp => {
  const tr = document.createElement("tr");

  const profileImg = emp.employeeData?.credentials?.profileImage
    ? `https://www.mither3security.com/${emp.employeeData.credentials.profileImage.replace(/^\/?/, "")}`
    : "../../image/profile.png";

  const name = emp.employeeData?.personalData?.name || "N/A";
  const badgeNo = emp.employeeData?.basicInformation?.badgeNo || "N/A";
  const status = emp.employeeData?.basicInformation?.status || "Inactive";

  tr.innerHTML = `
    <td><img src="${profileImg}" alt="profile" style="width:40px; height:40px; border-radius:50%; object-fit:cover;"></td>
    <td>${name}</td>
    <td><span class="status ${status.toLowerCase()}">${status}</span></td>
    <td>${badgeNo}</td>
    <td><button class="view-record-btn" onclick="viewDetails('${emp._id}')">View</button></td>
  `;

  tbody.appendChild(tr);
});


  } catch (err) {
    console.error("Error loading employees:", err);
  }
}

function viewDetails(id) {
  window.location.href = `profile.html?id=${id}`;
}
