const API_URL = "https://www.mither3security.com/employees";

// Get token and employeeId from localStorage
const token = localStorage.getItem("token");
const employeeId = localStorage.getItem("employeeId");

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const userRole = localStorage.getItem("role");
    localStorage.clear();
    window.location.href = "loginSection.html";
  });
}

const employeePhoto = document.getElementById("employeePhoto");

// Basic info
const basicInfoFields = {
  pslNo: document.getElementById("pslNo"),
  sssNo: document.getElementById("sssNo"),
  tinNo: document.getElementById("tinNo"),
  cellNo: document.getElementById("cellNo"),
  shift: document.getElementById("shift"),
  status: document.getElementById("status"),
  expiryDate: document.getElementById("expiryDate"),
  badgeNo: document.getElementById("badgeNo"),
  branch: document.getElementById("branch"),
  salary: document.getElementById("salary"),
};

// Overview / personal data
const overviewFields = {
  name: document.getElementById("fullName"),
  email: document.getElementById("email"),
  dob: document.getElementById("dob"),
  presentAddress: document.getElementById("presentAddress"),
  placeOfBirth: document.getElementById("birthPlace"),
  prevAddress: document.getElementById("previousAddress"),
  citizenship: document.getElementById("citizenship"),
  weight: document.getElementById("weight"),
  languageSpoken: document.getElementById("language"),
  age: document.getElementById("age"),
  height: document.getElementById("height"),
  religion: document.getElementById("religion"),
  civilStatus: document.getElementById("civilStatus"),
  colorOfHair: document.getElementById("hairColor"),
  colorOfEyes: document.getElementById("eyeColor"),
};

// Credentials
const credentialsFields = {
  barangayClearance: document.getElementById("barangayClearance"),
  policeClearance: document.getElementById("policeClearance"),
  diClearance: document.getElementById("diClearance"),
  nbiClearance: document.getElementById("nbiClearance"),
  personalHistory: document.getElementById("personalHistory"),
  residenceHistory: document.getElementById("residenceHistory"),
  maritalStatus: document.getElementById("maritalStatus"),
  physicalData: document.getElementById("physicalData"),
  educationData: document.getElementById("educationData"),
  characterReference: document.getElementById("characterReference"),
  employmentHistory: document.getElementById("employmentHistory"),
  neighborhoodInvestigation: document.getElementById("neighborhoodInvestigation"),
  militaryRecord: document.getElementById("militaryRecord"),
  profileImage: document.getElementById("employeePhoto"),
};

// ===== Fetch Employee Data =====
async function loadEmployeeData() {
  if (!employeeId) return console.error("Employee ID missing");

  try {
    const res = await fetch(`${API_URL}/${employeeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch employee data");

    const employee = await res.json();
    const data = employee.employeeData || {};

    // Basic Info
    const basic = data.basicInformation || {};
    Object.keys(basicInfoFields).forEach(key => {
      if (key === "cellNo") {
        basicInfoFields[key].textContent = basic.celNo || "N/A";
      } else {
        basicInfoFields[key].textContent = basic[key] || "N/A";
      }
    });

    // Overview / personal
    const personal = data.personalData || {};
    Object.keys(overviewFields).forEach(key => {
      if (key === "dob") {
        overviewFields.dob.textContent = personal.dateOfBirth
          ? new Date(personal.dateOfBirth).toLocaleDateString()
          : "N/A";
      } else {
        overviewFields[key].textContent = personal[key] || "N/A";
      }
    });

    // Credentials - Display files with view buttons
    const creds = data.credentials || {};
    Object.keys(credentialsFields).forEach(key => {
  const span = credentialsFields[key];
  if (key === "profileImage") return;

  if (isEditing) {
    // Store current button if exists
    const hasFile = span.querySelector(".view-btn") !== null;

    // Clear and add file input
    span.innerHTML = "";
    
    // Show current file status
    if (hasFile) {
      const statusText = document.createElement("span");
      statusText.textContent = "Current: ";
      statusText.style.fontSize = "0.85rem";
      statusText.style.color = "#666";
      statusText.style.marginRight = "8px";
      span.appendChild(statusText);

      const fileLabel = document.createElement("span");
      fileLabel.textContent = "File exists";
      fileLabel.style.fontSize = "0.85rem";
      fileLabel.style.color = "#4CAF50";
      fileLabel.style.fontWeight = "600";
      fileLabel.style.marginRight = "10px";
      span.appendChild(fileLabel);
    } else {
      const noFileLabel = document.createElement("span");
      noFileLabel.textContent = "No file | ";
      noFileLabel.style.fontSize = "0.85rem";
      noFileLabel.style.color = "#999";
      noFileLabel.style.marginRight = "8px";
      span.appendChild(noFileLabel);
    }

    // Add file input
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.style.fontSize = "0.85rem";
    input.dataset.field = key;
    
    input.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        uploadedFiles[key] = e.target.files[0];
        
        // Show selected file name
        const fileNameSpan = span.querySelector(".selected-file");
        if (fileNameSpan) {
          fileNameSpan.textContent = e.target.files[0].name;
        } else {
          const newFileNameSpan = document.createElement("span");
          newFileNameSpan.className = "selected-file";
          newFileNameSpan.style.fontSize = "0.8rem";
          newFileNameSpan.style.color = "#2196F3";
          newFileNameSpan.style.marginLeft = "8px";
          newFileNameSpan.textContent = e.target.files[0].name;
          span.appendChild(newFileNameSpan);
        }
      }
    });

    span.appendChild(input);
  } else {
        span.textContent = "No file";
      }
    });

    // Educational Background
    renderEducationTable(data.educationalBackground || []);
  } catch (err) {
    console.error("Error loading employee data:", err);
  }
}

// ===== Education Table =====
const eduTableBody = document.querySelector("#educationTable tbody");
let addRowBtn = null;

function renderEducationTable(list) {
  eduTableBody.innerHTML = "";
  if (list.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" style="text-align:center;">N/A</td>`;
    eduTableBody.appendChild(tr);
  } else {
    list.forEach(edu => {
      eduTableBody.appendChild(createEduRow(edu));
    });
  }
}

function createEduRow(edu = {}) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td contenteditable="true">${edu.school || ""}</td>
    <td contenteditable="true">${edu.inclusiveDate || ""}</td>
    <td contenteditable="true">${edu.degree || ""}</td>
    <td contenteditable="true">${edu.dateGraduated || ""}</td>
    <td><button class="remove-row-btn">❌</button></td>
  `;
  tr.querySelector(".remove-row-btn").addEventListener("click", () => tr.remove());
  return tr;
}

// ===== Edit & Save =====
const editBtn = document.getElementById("editBtn");
let isEditing = false;
let uploadedFiles = {}; // Store files to upload

editBtn.addEventListener("click", async () => {
  isEditing = !isEditing;

  // Make basic & overview fields editable (but NOT shift)
  Object.keys(basicInfoFields).forEach(key => {
    if (key !== "shift") {
      basicInfoFields[key].contentEditable = isEditing;
    }
  });
  Object.values(overviewFields).forEach(f => f.contentEditable = isEditing);

  // Make education table rows editable
  const eduRows = document.querySelectorAll("#educationTable tbody tr td[contenteditable]");
  eduRows.forEach(cell => cell.contentEditable = isEditing);

  // Show/hide add row button based on edit mode
  if (isEditing) {
    if (!addRowBtn) {
      addRowBtn = document.createElement("button");
      addRowBtn.textContent = "Add Row";
      addRowBtn.style.marginTop = "10px";
      addRowBtn.style.padding = "0.6rem 1rem";
      addRowBtn.style.background = "var(--clr-primary)";
      addRowBtn.style.color = "white";
      addRowBtn.style.border = "none";
      addRowBtn.style.borderRadius = "6px";
      addRowBtn.style.cursor = "pointer";
      addRowBtn.style.fontWeight = "600";
      addRowBtn.addEventListener("click", () => eduTableBody.appendChild(createEduRow()));
      eduTableBody.parentElement.appendChild(addRowBtn);
    }
    addRowBtn.style.display = "block";
  } else {
    if (addRowBtn) addRowBtn.style.display = "none";
  }

  // Handle credentials fields - add file inputs in edit mode
  Object.keys(credentialsFields).forEach(key => {
    const span = credentialsFields[key];
    if (key === "profileImage") return;

    if (isEditing) {
      // Store current value
      const currentText = span.textContent;
      const hasFile = span.querySelector(".view-btn") !== null;

      // Clear and add file input
      span.innerHTML = "";
      
      // Show current file status
      if (hasFile) {
        const statusText = document.createElement("span");
        statusText.textContent = "File exists | ";
        statusText.style.fontSize = "0.85rem";
        statusText.style.color = "#4CAF50";
        span.appendChild(statusText);
      }

      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf";
      input.style.fontSize = "0.85rem";
      input.dataset.field = key;
      
      input.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          uploadedFiles[key] = e.target.files[0];
        }
      });

      span.appendChild(input);
      credentialsFields[key] = span;
    }
  });

  editBtn.textContent = isEditing ? "SAVE" : "EDIT";

  if (!isEditing) {
    await handleSave();
  }
});

async function handleSave() {
  try {
    // Use FormData to handle file uploads
    const formData = new FormData();

    // Collect basic info
    const basicInfo = {};
    Object.keys(basicInfoFields).forEach(key => {
      basicInfo[key] = basicInfoFields[key].textContent.trim() || null;
    });

    // Collect personal data
    const personalData = {};
    Object.keys(overviewFields).forEach(key => {
      if (key === "dob") {
        const val = overviewFields.dob.textContent;
        personalData.dateOfBirth = val && val !== "N/A" ? new Date(val) : null;
      } else {
        personalData[key] = overviewFields[key].textContent || null;
      }
    });

    // Collect education data
    const educationalBackground = [];
    const eduRows = document.querySelectorAll("#educationTable tbody tr");
    eduRows.forEach(row => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 4) {
        const edu = {
          school: cells[0].textContent.trim(),
          inclusiveDate: cells[1].textContent.trim(),
          degree: cells[2].textContent.trim(),
          dateGraduated: cells[3].textContent.trim()
        };
        educationalBackground.push(edu);
      }
    });

    // Build employeeData object
    const employeeData = {
      basicInformation: basicInfo,
      personalData: personalData,
      educationalBackground: educationalBackground,
      credentials: {} // Will be populated by backend after file upload
    };

    // Append employeeData as JSON string
    formData.append("employeeData", JSON.stringify(employeeData));

    // Append files if any were uploaded
    Object.keys(uploadedFiles).forEach(key => {
      formData.append(key, uploadedFiles[key]);
    });

    // Get employee name for folder creation
    const employeeName = personalData.name || "employee";
    formData.append("name", employeeName);

    // Send PATCH request with FormData
    const res = await fetch(`${API_URL}/${employeeId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type - let browser set it with boundary for multipart/form-data
      },
      body: formData
    });

    const result = await res.json();
    
    if (!res.ok) {
      console.error("Update failed:", result);
      return alert(result.error || "Failed to update profile");
    }

    alert("Profile updated successfully!");
    
    // Clear uploaded files
    uploadedFiles = {};
    
    // Reload employee data
    await loadEmployeeData();
  } catch (err) {
    console.error("Error updating employee:", err);
    alert("Server error while saving: " + err.message);
  }
}

// ===== ATTENDANCE SECTION =====
async function loadAttendanceData() {
  try {
    const res = await fetch(
      `https://www.mither3security.com/attendance/${employeeId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      console.error("Failed to fetch attendance. Status:", res.status);
      const tbody = document.querySelector("#attendanceTable tbody");
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Failed to load attendance records</td></tr>`;
      return;
    }

    const data = await res.json();
    const records = data.records || [];

    renderAttendanceTable(records);
    calculateAttendanceRate(records);
  } catch (err) {
    console.error("Error loading attendance data:", err);
    const tbody = document.querySelector("#attendanceTable tbody");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Error loading attendance records</td></tr>`;
  }
}

function renderAttendanceTable(records) {
  const tbody = document.querySelector("#attendanceTable tbody");
  tbody.innerHTML = "";

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No attendance records found</td></tr>`;
    return;
  }

  records.forEach(record => {
    const row = document.createElement("tr");
    
    const checkinDate = new Date(record.checkinTime).toLocaleDateString();
    const checkinTime = new Date(record.checkinTime).toLocaleTimeString();
    const checkoutTime = record.checkoutTime 
      ? new Date(record.checkoutTime).toLocaleTimeString() 
      : "Not checked out";
    
    const statusTag = `<span class="status-tag ${record.status?.toLowerCase().replace(" ", "") || "absent"}">${record.status || "Absent"}</span>`;
    
    row.innerHTML = `
      <td>${checkinDate}</td>
      <td>${record.shift || "N/A"}</td>
      <td>${checkinTime}</td>
      <td>${checkoutTime}</td>
      <td>${statusTag}</td>
    `;
    
    tbody.appendChild(row);
  });
}

function calculateAttendanceRate(records) {
  if (records.length === 0) {
    document.getElementById("attendancePercentage").textContent = "0%";
    return;
  }

  let onTimeCount = 0;
  records.forEach(r => {
    if (r.status && r.status.toLowerCase().includes("on-time")) {
      onTimeCount++;
    }
  });

  const percentage = Math.round((onTimeCount / records.length) * 100);
  document.getElementById("attendancePercentage").textContent = `${percentage}%`;

  renderAttendanceChart(records);
}

function renderAttendanceChart(records) {
  let onTime = 0, late = 0, absent = 0;

  records.forEach(r => {
    const status = r.status ? r.status.toLowerCase() : "";
    if (status.includes("late")) late++;
    else if (status.includes("absent")) absent++;
    else if (status.includes("on-time")) onTime++;
  });

  const ctx = document.getElementById("attendanceChart").getContext("2d");
  
  if (window.attendanceChartInstance) {
    window.attendanceChartInstance.destroy();
  }

  window.attendanceChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["On-Time", "Late", "Absent"],
      datasets: [{
        data: [onTime, late, absent],
        backgroundColor: ["#1abc9c", "#f39c12", "#e74c3c"],
        borderColor: ["#fff", "#fff", "#fff"],
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 15,
            font: { size: 12 }
          }
        }
      }
    }
  });
}

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", () => {
  loadEmployeeData();
  loadAttendanceData();
});

// ===== Tabs Logic =====
const tabs = document.querySelectorAll(".tab");
const contents = document.querySelectorAll(".tab-content");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    contents.forEach(c => c.style.display = "none");

    const target = tab.dataset.target;
    document.getElementById(target).style.display = "block";
  });
});