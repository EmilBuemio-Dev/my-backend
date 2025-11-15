let archives = [];
let selectedRecordId = null;
let selectedRecord = null;

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const userRole = localStorage.getItem("role");
    localStorage.clear();
    if (userRole === "hr") {
      window.location.href = "loginSection.html";
    } else {
      window.location.href = "loginSection.html";
    }
  });
}

const allowedFields = [
  "approvedBadgeNo",
  "approveFamilyName",
  "approveFirstName",
  "approveMiddleName",
  "status",
  "shift",
  "branch",
  "salary",
  "expiryDate",
  "approveEmail"
];

// ===== FORMAT BADGE NUMBER =====
function formatBadgeNumber(value) {
  return value
    .replace(/[^0-9]/g, "")
    .replace(/(\d{2})(\d{1,7})(\d{0,1}).*/, function(_, p1, p2, p3) {
      return p3 ? `${p1}-${p2}-${p3}` : p2 ? `${p1}-${p2}` : p1;
    });
}

// Initialize badge formatting - works for existing and dynamically created inputs
function initBadgeFormatting() {
  // Use event delegation on document to catch all badge inputs (existing and future)
  document.addEventListener('input', function(e) {
    if (e.target.id === 'badgeNo' || e.target.name === 'badgeNo') {
      e.target.value = formatBadgeNumber(e.target.value);
    }
  }, true); // Use capture phase to ensure it fires
}


async function loadArchives() {
  try {
    const res = await fetch("https://www.mither3security.com/archive");
    archives = await res.json();

    // Pre-fetch branch data once
    const branchRes = await fetch("https://www.mither3security.com/api/branches");
    const branches = await branchRes.json();

    await Promise.all(
      archives.map(async (record) => {
        // Fetch registration email
        const register = await checkIfRegisteredAndReturnEmail(record);
        if (register) {
          record.status = "Registered";
          record.email = register.email;
        }

        // Fetch expiry date from matching branch
        if (record.branch) {
          const branchMatch = branches.find(
            (b) => b.branchData?.branch === record.branch
          );
          if (branchMatch?.expirationDate) {
            record.expiryDate = new Date(branchMatch.expirationDate)
              .toISOString()
              .split("T")[0];
          } else {
            record.expiryDate = "N/A";
          }
        } else {
          record.expiryDate = "N/A";
        }
      })
    );

    renderArchives();
  } catch (err) {
    console.error("❌ Failed to load archives:", err);
  }
}

async function checkIfRegisteredAndReturnEmail(record) {
  if (!record.familyName || !record.firstName || !record.badgeNo) return null;

  try {
    let url = `https://www.mither3security.com/api/registers/search?familyName=${encodeURIComponent(record.familyName)}&firstName=${encodeURIComponent(record.firstName)}&badgeNo=${encodeURIComponent(record.badgeNo)}`;
    if (record.middleName) url += `&middleName=${encodeURIComponent(record.middleName)}`;

    const res = await fetch(url);
    const data = await res.json();
    return data?.register || null;
  } catch (err) {
    console.error(err);
    return null;
  }
}


async function checkIfRegistered(record) {
  if (!record.familyName || !record.firstName || !record.badgeNo) return false;

  try {
    let url = `https://www.mither3security.com/api/registers/search?familyName=${encodeURIComponent(record.familyName)}&firstName=${encodeURIComponent(record.firstName)}&badgeNo=${encodeURIComponent(record.badgeNo)}`;
    if (record.middleName) url += `&middleName=${encodeURIComponent(record.middleName)}`;

    const res = await fetch(url);
    const data = await res.json();
    return res.status === 200 && data?.register;
  } catch (err) {
    console.error("❌ Error checking registration:", err);
    return false;
  }
}

function renderArchives() {
  const tbody = document.getElementById("archiveTableBody");
  tbody.innerHTML = "";

  if (!archives.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No archiving records found</td></tr>`;
    return;
  }

  archives.forEach((record) => {
    const tr = document.createElement("tr");
    tr.id = `record-${record._id}`;
    const createdDate = record.createdAt
      ? new Date(record.createdAt).toLocaleDateString()
      : "N/A";

    const fullName = record.familyName
      ? `${record.familyName}, ${record.firstName || ""} ${record.middleName || ""}`.trim()
      : "N/A";

    const status = record.status || "Pending";
    const statusClass = status.toLowerCase() === "pending" ? "status-pending" : "status-registered";

    tr.innerHTML = `
      <td>${fullName}</td>
      <td>${record.position || "N/A"}</td>
      <td class="${statusClass}">${status}</td>
      <td>${createdDate}</td>
      <td><button class="view-btn" onclick="viewRecord('${record._id}')">View</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// === LOAD BRANCHES ===
async function loadBranches(preselectedBranch = "") {
  const select = document.getElementById("branchSelect");
  const expiryInput = document.querySelector('input[name="expiryDate"]');
  const salaryInput = document.querySelector('input[name="salary"]');
  const shiftSelect = document.querySelector('select[name="shift"]');

  if (!select || !expiryInput || !salaryInput || !shiftSelect) return;

  try {
    const res = await fetch("https://www.mither3security.com/api/branches");
    const branches = await res.json();

    // Reset branch select
    select.innerHTML = `<option value="">Select Branch</option>
                        <option value="toBeSet">To be set</option>`;

    branches.forEach(branch => {
      const branchName = branch?.branchData?.branch || "Unnamed Branch";
      const option = document.createElement("option");
      option.value = branchName;
      option.textContent = branchName;
      if (branchName === preselectedBranch) option.selected = true;
      select.appendChild(option);
    });

    // Handle branch change
    select.addEventListener("change", () => {
      const selectedValue = select.value;
      const selectedBranchObj = branches.find(
        b => (b.branchData?.branch || "Unnamed Branch") === selectedValue
      );

      // Reset values before setting
      shiftSelect.innerHTML = `<option value="">Choose time of shift</option>`;
      shiftSelect.disabled = false;
      expiryInput.value = "";
      salaryInput.value = "";

      if (!selectedValue || selectedValue === "toBeSet") {
        expiryInput.placeholder = selectedValue === "toBeSet" ? "N/A" : "";
        salaryInput.placeholder = selectedValue === "toBeSet" ? "N/A" : "";
        shiftSelect.disabled = selectedValue === "toBeSet";
        return;
      }

      if (selectedBranchObj) {
        // Set expiry date
        if (selectedBranchObj.expirationDate) {
          expiryInput.value = new Date(selectedBranchObj.expirationDate)
            .toISOString()
            .split("T")[0];
          expiryInput.placeholder = "";
        } else {
          expiryInput.value = "";
          expiryInput.placeholder = "N/A";
        }

        // Set salary
        if (selectedBranchObj.salary !== undefined && selectedBranchObj.salary !== null) {
          salaryInput.value = selectedBranchObj.salary;
          salaryInput.placeholder = "";
        } else {
          salaryInput.value = "";
          salaryInput.placeholder = "N/A";
        }

        // Handle guard shift (works for both array and object)
        shiftSelect.innerHTML = `<option value="">Choose time of shift</option>`;
        const guardShift = selectedBranchObj.guardShift;

        if (Array.isArray(guardShift) && guardShift.length) {
          guardShift.forEach(shiftObj => {
            if (shiftObj.day) {
              const dayOption = document.createElement("option");
              dayOption.value = `Day, ${shiftObj.day}`;
              dayOption.textContent = `Day (${shiftObj.day})`;
              shiftSelect.appendChild(dayOption);
            }
            if (shiftObj.night) {
              const nightOption = document.createElement("option");
              nightOption.value = `Night, ${shiftObj.night}`;
              nightOption.textContent = `Night (${shiftObj.night})`;
              shiftSelect.appendChild(nightOption);
            }
          });
        } 
        else if (guardShift && (guardShift.day || guardShift.night)) {
          if (guardShift.day) {
            const dayOption = document.createElement("option");
            dayOption.value = `Day, ${guardShift.day}`;
            dayOption.textContent = `Day (${guardShift.day})`;
            shiftSelect.appendChild(dayOption);
          }
          if (guardShift.night) {
            const nightOption = document.createElement("option");
            nightOption.value = `Night, ${guardShift.night}`;
            nightOption.textContent = `Night (${guardShift.night})`;
            shiftSelect.appendChild(nightOption);
          }
        } 
        else {
          const noShiftOption = document.createElement("option");
          noShiftOption.value = "No Shift Data";
          noShiftOption.textContent = "No shift data available";
          shiftSelect.appendChild(noShiftOption);
        }
      }
    });

    // Auto-trigger for preselected branch
    if (preselectedBranch) select.dispatchEvent(new Event("change"));
  } catch (err) {
    console.error("❌ Failed to load branches:", err);
  }
}


// === MODALS ===
function viewRecord(id) {
  const record = archives.find(r => String(r._id) === String(id));
  if (!record) return;

  selectedRecordId = id;
  selectedRecord = record;

  const creds = record.credentials || {};
  const requiredDocs = {
    barangayClearance: "Barangay Clearance",
    policeClearance: "Police Clearance",
    diClearance: "DI Clearance",
    nbiClearance: "NBI Clearance",
    personalHistory: "Personal & Family History",
    residenceHistory: "Residence History",
    maritalStatus: "Marital Status",
    physicalData: "Physical & Mental Data",
    educationData: "Educational Data",
    characterReference: "Character Reference",
    employmentHistory: "Employment History",
    neighborhoodInvestigation: "Neighborhood Investigation",
    militaryRecord: "Military Record",
  };

  let credList = "";
  for (const [key, label] of Object.entries(requiredDocs)) {
    credList += creds[key]
      ? `<div class="cred-item">✅ ${label}: <a href="https://www.mither3security.com/uploads/${encodeURIComponent(creds[key])}" target="_blank">View File</a></div>`
      : `<div class="cred-item">❌ ${label}: Not Submitted</div>`;
  }

  document.getElementById("modalBody").innerHTML = `
    <p><strong>Name:</strong> ${record.familyName ? `${record.familyName}, ${record.firstName || ""} ${record.middleName || ""}`.trim() : "N/A"}</p>
    <p><strong>Badge No:</strong> ${formatBadgeNumber(record.badgeNo) || "N/A"}</p>
    <p><strong>Position:</strong> ${record.position || "N/A"}</p>
    <p><strong>Status:</strong> ${record.status || "Pending"}</p>
    <p><strong>Date Archived:</strong> ${record.createdAt ? new Date(record.createdAt).toLocaleString() : "N/A"}</p>
    <div class="cred-list"><h3>Credentials</h3>${credList}</div>
  `;
  openModal();
}


function openModal() { document.getElementById("detailsModal").style.display = "block"; }
function closeModal() { document.getElementById("detailsModal").style.display = "none"; }

async function openApproveModal() {
  if (!selectedRecord) return;

  // Add check for pending status
  if ((selectedRecord.status || "Pending").toLowerCase() === "pending") {
    return alert("⚠️ Cannot approve employee. The status is still pending and cannot be proceeded.");
  }

  closeModal(); // close details modal
  const modal = document.getElementById("approveModal");
  if (!modal) return;
  modal.style.display = "flex";

  const allowedFields = [
    "approvedBadgeNo",
    "approveFamilyName",
    "approveFirstName",
    "approveMiddleName",
    "status",
    "shift",
    "branch",
    "salary",
    "expiryDate",
    "approveEmail"
  ];

  // Helper to set input value with fallback to archive or "N/A"
  const setValue = (elId, archiveKey) => {
    const el = document.getElementById(elId);
    if (!el) return;

    let val = selectedRecord[archiveKey];
    if (!val || val.trim() === "") val = "N/A";

    el.value = val;
  };

  // Fill main fields
  setValue("approveFamilyName", "familyName");
  setValue("approveFirstName", "firstName");
  setValue("approveMiddleName", "middleName");
  
  // Format badge number
  const badgeNoInput = document.getElementById("approvedBadgeNo");
  if (badgeNoInput) {
    badgeNoInput.value = formatBadgeNo(selectedRecord.badgeNo);
  }

  // Status
  const statusInput = document.querySelector('input[name="status"]');
  if (statusInput) {
    statusInput.value = selectedRecord.status ?? "Pending";
    statusInput.style.fontWeight = "bold";
  }

  const emailInput = document.getElementById("approveEmail");
  if (emailInput) {
    // 1. Use archive email if exists
    if (selectedRecord.email?.trim() && selectedRecord.email !== "N/A") {
      emailInput.value = selectedRecord.email.trim();
    } else {
      try {
        // 2. Fetch from Register
        let url = `https://www.mither3security.com/api/registers/search?familyName=${encodeURIComponent(selectedRecord.familyName)}&firstName=${encodeURIComponent(selectedRecord.firstName)}&badgeNo=${encodeURIComponent(selectedRecord.badgeNo)}`;
        if (selectedRecord.middleName) url += `&middleName=${encodeURIComponent(selectedRecord.middleName)}`;

        const res = await fetch(url);
        const data = await res.json();

        // 3. Assign email to selectedRecord so submit uses it
        const fetchedEmail = data?.register?.email?.trim() || "N/A";
        selectedRecord.email = fetchedEmail;
        emailInput.value = fetchedEmail;
      } catch (err) {
        console.error("❌ Failed to fetch registered email:", err);
        selectedRecord.email = "N/A";
        emailInput.value = "N/A";
      }
    }
  }

  // Load branches
  await loadBranches(selectedRecord.branch || "");

  // Fill remaining form inputs with archive or N/A
  const formElements = document.getElementById("approveForm")?.elements;
  if (formElements) {
    for (let el of formElements) {
      if (el.tagName.toLowerCase() === "button" || el.type === "hidden") continue;

      // Skip already set allowed fields
      if (allowedFields.includes(el.id) || allowedFields.includes(el.name)) continue;

      // Fill empty values with "N/A"
      if (!el.value || el.value.trim() === "") {
        if (el.type === "file") el.value = "";
        else if (el.type === "number") el.placeholder = "N/A";
        else el.value = "N/A";
      }
    }
  }

  // Fill education table empty inputs
  document.querySelectorAll("#educationTable tbody tr input").forEach(input => {
    if (input.type !== "file" && !input.value) input.value = "N/A";
  });

  // Fill firearms table empty inputs
  document.querySelectorAll("#firearmsTable tbody tr input").forEach(input => {
    if (input.type !== "file" && !input.value) input.value = "N/A";
  });
}




async function checkIfRegisteredAndFillForm() {
  const familyName = document.getElementById("approveFamilyName")?.value.trim();
  const firstName = document.getElementById("approveFirstName")?.value.trim();
  const middleName = document.getElementById("approveMiddleName")?.value.trim();
  const badgeNo = document.getElementById("approvedBadgeNo")?.value.trim();

  if (!familyName || !firstName || !badgeNo) return console.warn("Missing required fields.");

  try {
    let url = `https://www.mither3security.com/api/registers/search?familyName=${encodeURIComponent(familyName)}&firstName=${encodeURIComponent(firstName)}&badgeNo=${encodeURIComponent(badgeNo)}`;
    if (middleName) url += `&middleName=${encodeURIComponent(middleName)}`;

    const res = await fetch(url);
    const data = await res.json();

    const emailInput = document.getElementById("approveEmail");
    if (emailInput) {
      emailInput.value = (res.status === 200 && data?.register?.email) ? data.register.email : "N/A";
    }

    const formElements = document.getElementById("approveForm")?.elements;
    if (formElements) {
      for (let el of formElements) {
        if (el.type === "hidden" || el.tagName.toLowerCase() === "button") continue;
        if (el.closest("#firearmsTable")) continue;

        const allowedFields = [
          "approvedBadgeNo",
          "approveFamilyName",
          "approveFirstName",
          "approveMiddleName",
          "status",
          "shift",
          "branch",
          "salary",
          "expiryDate",
          "approveEmail"
        ];

        if (!el.value && !allowedFields.includes(el.id)) {
          if (el.type === "file") el.value = "";
          else if (el.type === "number") el.placeholder = "N/A";
          else el.value = "N/A";
        }
      }
    }

  } catch (err) {
    console.error("❌ Error checking registration:", err);
  }
}

function initEducationTable() {
  const addBtn = document.getElementById("addEducationBtn");
  const tableBody = document.querySelector("#educationTable tbody");
  if (!addBtn || !tableBody) return;

  const createRow = () => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" required></td>
      <td><input type="text" required></td>
      <td><input type="text" required></td>
      <td><input type="text" required></td>
      <td><button class="remove-row">Remove</button></td>
    `;
    return tr;
  };

  const updateRemoveButtons = () => {
    const rows = tableBody.querySelectorAll("tr");
    rows.forEach((row) => {
      const btn = row.querySelector(".remove-row");
      btn.style.display = rows.length === 1 ? "none" : "";
    });
  };

  updateRemoveButtons();

  addBtn.addEventListener("click", (e) => {
    e.preventDefault();
    tableBody.appendChild(createRow());
    updateRemoveButtons();
  });

  tableBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-row")) {
      const rows = tableBody.querySelectorAll("tr");
      if (rows.length <= 1) return;
      e.target.closest("tr").remove();
      updateRemoveButtons();
    }
  });
}

function initProfilePreview() {
  const input = document.getElementById("profileImageInput");
  const preview = document.getElementById("profilePreview");
  if (!input || !preview) return;

  input.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) {
      preview.innerHTML = "person";
      preview.classList.add("material-symbols-outlined");
      preview.style.backgroundImage = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      preview.classList.remove("material-symbols-outlined");
      preview.style.backgroundImage = `url(${e.target.result})`;
      preview.style.backgroundSize = "cover";
      preview.style.backgroundPosition = "center";
      preview.innerHTML = "";
    };
    reader.readAsDataURL(file);
  });
}


function initSubmitHandler() {
  const form = document.getElementById("approveForm");
  if (!form) return;

  const archiveFieldMap = {
    approveFamilyName: "familyName",
    approveFirstName: "firstName",
    approveMiddleName: "middleName",
    approvedBadgeNo: "badgeNo",
    approveEmail: "email"
  };

  const getInputValue = (selector, recordKey, type = "string") => {
    const el = form.querySelector(selector);
    let val = el?.value?.trim();

    if (recordKey === "approveEmail" && !val) val = null;

    if (val) return val;

    if (selectedRecord && recordKey && archiveFieldMap[recordKey]) {
      const fallback = selectedRecord[archiveFieldMap[recordKey]];
      if (recordKey === "approveEmail") return fallback || "N/A";
      return fallback ?? "";
    }

    if (type === "date") return null;
    if (type === "number") return 0;
    return "N/A";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectedRecordId) return alert("⚠️ No selected record!");

    // Basic info
    const basicInformation = {
      pslNo: getInputValue('input[name="pslNo"]'),
      sssNo: getInputValue('input[name="sssNo"]'),
      tinNo: getInputValue('input[name="tinNo"]'),
      celNo: getInputValue('input[name="celNo"]'),
      shift: getInputValue('select[name="shift"]'),
      status: getInputValue('input[name="status"]', "status"),
      expiryDate: getInputValue('input[name="expiryDate"]', "expiryDate"),
      badgeNo: formatBadgeNo(getInputValue('input[name="approvedBadgeNo"]', "approvedBadgeNo")),
      salary: getInputValue('input[name="salary"]', "salary"),
      branch: getInputValue('select[name="branch"]', "branch"),
      role: "employee",
    };

    // Personal data
    const personalData = {
      familyName: getInputValue('input[name="approveFamilyName"]', "approveFamilyName"),
      firstName: getInputValue('input[name="approveFirstName"]', "approveFirstName"),
      middleName: getInputValue('input[name="approveMiddleName"]', "approveMiddleName"),
      email: getInputValue('input[name="approveEmail"]', "approveEmail"),
      dateOfBirth: getInputValue('input[name="dateOfBirth"]', null, "date"),
      presentAddress: getInputValue('input[name="presentAddress"]'),
      placeOfBirth: getInputValue('input[name="placeOfBirth"]'),
      prevAddress: getInputValue('input[name="prevAddress"]'),
      citizenship: getInputValue('input[name="citizenship"]'),
      weight: getInputValue('input[name="weight"]'),
      languageSpoken: getInputValue('input[name="languageSpoken"]'),
      age: Number(getInputValue('input[name="age"]', 0, "number")),
      height: getInputValue('input[name="height"]'),
      religion: getInputValue('input[name="religion"]'),
      civilStatus: getInputValue('input[name="civilStatus"]'),
      colorOfHair: getInputValue('input[name="colorOfHair"]'),
      colorOfEyes: getInputValue('input[name="colorOfEyes"]'),
    };

    // Education
    const educationalBackground = Array.from(form.querySelectorAll("#educationTable tbody tr"))
      .map((row) => {
        const inputs = row.querySelectorAll("input");
        return {
          school: inputs[0].value || "N/A",
          inclusiveDate: inputs[1].value || "N/A",
          degree: inputs[2].value || "N/A",
          dateGraduated: inputs[3].value || "N/A",
        };
      });

    // Firearms
    const firearmsIssued = Array.from(form.querySelectorAll("#firearmsTable tbody tr"))
      .map((row) => {
        const inputs = row.querySelectorAll("input");
        return {
          kind: inputs[0].value || "N/A",
          make: inputs[1].value || "N/A",
          sn: inputs[2].value || "N/A",
        };
      });

    // FormData
    const formData = new FormData();
    formData.append("basicInformation", JSON.stringify(basicInformation));
    formData.append("personalData", JSON.stringify(personalData));
    formData.append("educationalBackground", JSON.stringify(educationalBackground));
    formData.append("firearmsIssued", JSON.stringify(firearmsIssued));
    formData.append("status", "Approved");

    const profileFile = form.querySelector('input[name="employeeProfile"]')?.files[0];
    if (profileFile) formData.append("employeeProfile", profileFile);

    try {
      const res = await fetch(`https://www.mither3security.com/accounts/approve/${selectedRecordId}`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Unknown error");

      alert("✅ Employee approved successfully!");
      closeApproveModal();
      document.getElementById(`record-${selectedRecordId}`)?.remove();
      archives = archives.filter((r) => String(r._id) !== String(selectedRecordId));
    } catch (err) {
      console.error("❌ Error approving employee:", err);
      alert("❌ Failed to approve employee. Check console for details.");
    }
  });
}


// Close Approve Modal
function closeApproveModal() {
  const modal = document.getElementById("approveModal");
  if (modal) modal.style.display = "none";
}

// Attach event listener
document.getElementById("closeApproveBtn")?.addEventListener("click", closeApproveModal);

// Optional: close modal when clicking outside content
window.addEventListener("click", (e) => {
  const modal = document.getElementById("approveModal");
  if (e.target === modal) closeApproveModal();
});

// ==== Archive Modal Controls ====
function openArchiveModal() {
  document.getElementById("archiveModal").style.display = "flex";
  showStep(0);
}

function closeArchiveModal() {
  document.getElementById("archiveModal").style.display = "none";
  document.getElementById("multiStepForm").reset();
  currentStep = 0;
  showStep(currentStep);
}

// ==== Multi-Step Form ====
let currentStep = 0;
const steps = document.querySelectorAll("#archiveModal .step");

function showStep(index) {
  steps.forEach((step, i) => step.classList.toggle("active", i === index));
}

function nextStep() {
  if (currentStep < steps.length - 1) {
    currentStep++;
    showStep(currentStep);
    if (currentStep === 2) previewFiles();
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    showStep(currentStep);
  }
}

// ==== Preview Uploaded Files ====
function previewFiles() {
  const filesToCheck = {
    "Barangay Clearance": "barangay",
    "Police Clearance": "police",
    "DI Clearance": "di",
    "NBI Clearance": "nbi",
    "Personal & Family History": "personal",
    "Residence History": "residence",
    "Marital Status": "marital",
    "Physical & Mental Data": "physical",
    "Educational Data": "education",
    "Character Reference": "reference",
    "Employment History": "employment",
    "Neighborhood Investigation": "neighborhood",
    "Military Record": "military"
  };

  const container = document.getElementById("verificationContainer");
  container.innerHTML = "";

  for (const [label, id] of Object.entries(filesToCheck)) {
    const fileInput = document.getElementById(id);
    const file = fileInput?.files[0];
    const div = document.createElement("div");
    div.classList.add("file-preview");
    div.innerHTML = file
      ? `✅ ${label}: <a href="${URL.createObjectURL(file)}" target="_blank">${file.name}</a>`
      : `❌ ${label}: Missing`;
    container.appendChild(div);
  }
}

// ==== Submit Archive Form ====
document.getElementById("multiStepForm").addEventListener("submit", async function(e){
  e.preventDefault();
  const formData = new FormData(this);

  try {
    const res = await fetch("https://www.mither3security.com/archive", {
      method: "POST",
      body: formData
    });

    const result = await res.json();
    document.getElementById("submissionStatus").innerText = res.ok
      ? "✅ Credentials archived successfully!"
      : "❌ Failed: " + result.message;

    if (res.ok) {
      closeArchiveModal();
      loadArchives();
    }
  } catch (err) {
    document.getElementById("submissionStatus").innerText = "⚠️ Error: " + err.message;
  }
});

// === INIT ===
document.addEventListener("DOMContentLoaded", () => {
  loadArchives();
  initEducationTable();
  initProfilePreview();
  initSubmitHandler();
  initBadgeFormatting();
});