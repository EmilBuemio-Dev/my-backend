const API_URL = "http://localhost:5000/employees";

// Get token and employeeId from localStorage
const token = localStorage.getItem("token");
const employeeId = localStorage.getItem("employeeId");

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const userRole = localStorage.getItem("role");
    localStorage.clear();
    if (userRole === "employee") {
      window.location.href = "loginSection.html";
    } else {
      window.location.href = "loginSection.html";
    }
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
    basicInfoFields[key].textContent = basic.celNo || "N/A"; // ✅ map celNo → cellNo
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

    // Credentials
    const creds = data.credentials || {};
    Object.keys(credentialsFields).forEach(key => {
      if (key !== "profileImage") credentialsFields[key].textContent = creds[key] || "N/A";
    });

    if (creds.profileImage) employeePhoto.src = creds.profileImage;

    // Educational Background
    renderEducationTable(data.educationalBackground || []);
  } catch (err) {
    console.error("Error loading employee data:", err);
  }
}

// ===== Education Table =====
const eduTableBody = document.querySelector("#educationTable tbody");

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

// Add row button
const addRowBtn = document.createElement("button");
addRowBtn.textContent = "Add Row";
addRowBtn.style.marginTop = "10px";
addRowBtn.addEventListener("click", () => eduTableBody.appendChild(createEduRow()));
eduTableBody.parentElement.appendChild(addRowBtn);

// ===== Edit & Save =====
const editBtn = document.getElementById("editBtn");
let isEditing = false;

// ===== Edit & Save with file upload =====
// ===== Edit & Save with integrated file upload =====
editBtn.addEventListener("click", async () => {
  isEditing = !isEditing;

  // Make basic & overview fields editable
  Object.values(basicInfoFields).forEach(f => f.contentEditable = isEditing);
  Object.values(overviewFields).forEach(f => f.contentEditable = isEditing);

  // Handle credentials fields
  Object.keys(credentialsFields).forEach(key => {
    const span = credentialsFields[key];
    if (key === "profileImage") return; // skip profile image
    if (isEditing) {
      // Replace span with file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf";
      input.dataset.field = key;
      input.dataset.value = span.textContent; // keep old value
      span.replaceWith(input);
      credentialsFields[key] = input;
    }
  });

  editBtn.textContent = isEditing ? "SAVE" : "EDIT";

  if (!isEditing) {
    // Collect updated data
    const updatedData = {
      basicInformation: {},
      personalData: {},
      credentials: {},
      educationalBackground: []
    };

    // Basic info
    Object.keys(basicInfoFields).forEach(key => updatedData.basicInformation[key] = basicInfoFields[key].textContent.trim() || null);

    // Overview / personal
    Object.keys(overviewFields).forEach(key => {
      if (key === "dob") {
        const val = overviewFields.dob.textContent;
        updatedData.personalData.dateOfBirth = val && val !== "N/A" ? new Date(val) : null;
      } else updatedData.personalData[key] = overviewFields[key].textContent || null;
    });

    // Credentials: handle file uploads first
    const uploadPromises = [];
    Object.keys(credentialsFields).forEach(key => {
      const input = credentialsFields[key];
      if (input.files && input.files[0]) {
        const formData = new FormData();
        formData.append(key, input.files[0]);
        formData.append("name", updatedData.personalData.name || "unknown");

        // Upload file
        const p = fetch("http://localhost:5000/employees/upload-credentials", {
          method: "POST",
          body: formData,
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            const uploadedUrl = data.urls ? data.urls[key] : null;
            updatedData.credentials[key] = uploadedUrl || input.files[0].name;
            const span = document.createElement("span");
            span.id = key;
            span.textContent = uploadedUrl ? uploadedUrl.split("/").pop() : input.files[0].name;
            input.replaceWith(span);
            credentialsFields[key] = span;
          })

        .catch(err => {
          console.error("File upload error:", err);
          const span = document.createElement("span");
          span.id = key;
          span.textContent = input.dataset.value || "N/A";
          input.replaceWith(span);
          credentialsFields[key] = span;
        });

        uploadPromises.push(p);
      } else {
        // No file selected, just keep existing text
        updatedData.credentials[key] = input.dataset.value || "N/A";
        const span = document.createElement("span");
        span.id = key;
        span.textContent = input.dataset.value || "N/A";
        input.replaceWith(span);
        credentialsFields[key] = span;
      }
    });

    // Wait for all file uploads to finish
    if (uploadPromises.length === 0) {
  await saveProfileData(updatedData);
} else {
  Promise.all(uploadPromises).then(() => saveProfileData(updatedData));
}

async function saveProfileData(updatedData) {
  try {
    const res = await fetch(`${API_URL}/${employeeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ employeeData: updatedData }),
    });
    const result = await res.json();
    if (!res.ok) return alert(result.error || "Failed to update profile");
    alert("Profile updated successfully!");
    loadEmployeeData();
  } catch (err) {
    console.error("Error updating employee:", err);
    alert("Server error while saving");
  }
}

  }
});



// ===== Initialize =====
document.addEventListener("DOMContentLoaded", loadEmployeeData);

// ===== Tabs Logic =====
const tabs = document.querySelectorAll(".tab"); // Tab buttons
const contents = document.querySelectorAll(".tab-content"); // Tab content divs

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    // Remove active from all tabs
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    // Hide all content
    contents.forEach(c => c.style.display = "none");

    // Show the selected content
    const target = tab.dataset.target; // Example: <div class="tab" data-target="credentialsContent">
    document.getElementById(target).style.display = "block";
  });
});
