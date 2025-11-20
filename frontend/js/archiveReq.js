// ✅ FIXED: Wrapped in DOMContentLoaded to avoid duplicate declarations
document.addEventListener("DOMContentLoaded", () => {
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
});

let archives = [];
let selectedRecordId = null;
let selectedRecord = null;

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
    console.error("❌ Failed to load records:", err);
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
  // ✅ FIXED: Check if element exists
  const tbody = document.getElementById("archiveTableBody");
  if (!tbody) {
    console.warn("archiveTableBody element not found");
    return;
  }

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

// === LOAD BRANCHES WITH SEARCH ===
async function loadBranches(preselectedBranch = "") {
  const select = document.getElementById("branchSelect");
  const searchInput = document.getElementById("archiveModalBranchSearch");
  const expiryInput = document.querySelector('input[name="expiryDate"]');
  const salaryInput = document.querySelector('input[name="salary"]');
  const shiftSelect = document.querySelector('select[name="shift"]');

  // ✅ CLEAR SEARCH INPUT WHEN LOADING
  if (searchInput) {
    searchInput.value = "";
  }

  // ✅ FIXED: Check if all elements exist
  if (!select || !expiryInput || !salaryInput || !shiftSelect) {
    console.warn("Some branch form elements not found");
    return;
  }

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

    // ✅ SEARCH FUNCTIONALITY INSIDE DROPDOWN (INTEGRATED SEARCH BAR)
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const options = select.querySelectorAll("option");
        
        options.forEach(option => {
          // Always show the first two options (Select Branch, To be set)
          if (option.value === "" || option.value === "toBeSet") {
            option.style.display = "";
            return;
          }
          
          // Filter other options based on search term
          if (option.textContent.toLowerCase().includes(searchTerm)) {
            option.style.display = "";
          } else {
            option.style.display = "none";
          }
        });
      });
    }

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
        expiryInput.placeholder = "";
        salaryInput.placeholder = "";
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
          expiryInput.placeholder = "";
        }

        // Set salary
        if (selectedBranchObj.salary !== undefined && selectedBranchObj.salary !== null) {
          salaryInput.value = selectedBranchObj.salary;
          salaryInput.placeholder = "";
        } else {
          salaryInput.value = "";
          salaryInput.placeholder = "";
        }

        // Handle guard shift
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

  const modalBody = document.getElementById("modalBody");
  if (modalBody) {
    modalBody.innerHTML = `
      <p><strong>Name:</strong> ${record.familyName ? `${record.familyName}, ${record.firstName || ""} ${record.middleName || ""}`.trim() : "N/A"}</p>
      <p><strong>Badge No:</strong> ${record.badgeNo || "N/A"}</p>
      <p><strong>Position:</strong> ${record.position || "N/A"}</p>
      <p><strong>Status:</strong> ${record.status || "Pending"}</p>
      <p><strong>Date Recorded:</strong> ${record.createdAt ? new Date(record.createdAt).toLocaleString() : "N/A"}</p>
      <div class="cred-list"><h3>Credentials</h3>${credList}</div>
    `;
  }
  openModal();
}

function openModal() { 
  const modal = document.getElementById("detailsModal");
  if (modal) modal.style.display = "block";
}

function closeModal() { 
  const modal = document.getElementById("detailsModal");
  if (modal) modal.style.display = "none";
}

// ✅ APPROVE MODAL - FIXED LOGIC
async function openApproveModal() {
  if (!selectedRecord) return;

  // Prevent approval if status is pending
  if ((selectedRecord.status || "Pending").toLowerCase() === "pending") {
    return alert("⚠️ Cannot proceed. Status is still pending.");
  }

  closeModal();

  const modal = document.getElementById("approveModal");
  if (!modal) return;
  modal.style.display = "flex";

  const setField = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = value?.trim() || "";
    }
  };

  // Fill name & badge fields FIRST
  setField("approveFamilyName", selectedRecord.familyName);
  setField("approveFirstName", selectedRecord.firstName);
  setField("approveMiddleName", selectedRecord.middleName || "");
  setField("approvedBadgeNo", selectedRecord.badgeNo);

  // ✅ IMMEDIATELY FETCH AND SET EMAIL BEFORE OTHER OPERATIONS
  await fetchAndSetEmail();

  // Fill status directly—no fallback
  const statusInput = document.querySelector('input[name="status"]');
  if (statusInput) {
    statusInput.value = selectedRecord.status || "Pending";
    statusInput.style.fontWeight = "bold";
  }

  // Load branches, preselect existing
  await loadBranches(selectedRecord.branch || "");

  // ✅ CLEAR BRANCH SEARCH INPUT EXPLICITLY
  const branchSearchInput = document.getElementById("archiveModalBranchSearch");
  if (branchSearchInput) {
    branchSearchInput.value = "";
  }

  // Fill other form fields with "N/A" if empty (except allowed fields and branch search)
  const formElements = document.getElementById("approveForm")?.elements;
  if (formElements) {
    for (let el of formElements) {
      const id = el.id || el.name || "";
      
      // ✅ Skip branch search input, email, and other allowed fields
      if (
        el.tagName.toLowerCase() === "button" ||
        el.type === "hidden" ||
        id === "archiveModalBranchSearch" ||
        id === "approveEmail" || // Don't override email
        allowedFields.includes(id)
      )
        continue;

      if (!el.value) {
        if (el.type === "file") {
          el.value = "";
        } else if (el.type === "date") {
          el.value = "";
        } else if (el.type === "number") {
          el.value = "";
        } else {
          el.value = "N/A";
        }
      }
    }
  }
}

// ✅ SEPARATE FUNCTION TO FETCH AND SET EMAIL
async function fetchAndSetEmail() {
  const familyName = document.getElementById("approveFamilyName")?.value.trim();
  const firstName = document.getElementById("approveFirstName")?.value.trim();
  const middleName = document.getElementById("approveMiddleName")?.value.trim();
  const badgeNo = document.getElementById("approvedBadgeNo")?.value.trim();

  console.log("🔍 Fetching email for:", { familyName, firstName, middleName, badgeNo });

  // ✅ FALLBACK TO SELECTED RECORD EMAIL IF API FAILS
  const emailInput = document.getElementById("approveEmail");
  if (!emailInput) {
    console.warn("⚠️ Email input not found");
    return;
  }

  // If we have email in selectedRecord, use it as default
  if (selectedRecord?.email) {
    console.log("✅ Using email from selectedRecord:", selectedRecord.email);
    emailInput.value = selectedRecord.email;
  }

  // If we don't have required fields for API call, stop here
  if (!familyName || !firstName || !badgeNo) {
    console.warn("⚠️ Missing required fields for email lookup");
    return;
  }

  // Try to fetch from API
  try {
    let url = `https://www.mither3security.com/api/registers/search?familyName=${encodeURIComponent(
      familyName
    )}&firstName=${encodeURIComponent(firstName)}&badgeNo=${encodeURIComponent(badgeNo)}`;

    if (middleName) url += `&middleName=${encodeURIComponent(middleName)}`;

    console.log("📡 Fetching email from API:", url);

    const res = await fetch(url);
    const data = await res.json();

    console.log("📦 API Response:", data);

    if (data?.register?.email) {
      console.log("✅ Email found from API:", data.register.email);
      emailInput.value = data.register.email;
    } else if (!emailInput.value && selectedRecord?.email) {
      // If API didn't return email but we have it in selectedRecord
      console.log("⚠️ API didn't return email, using selectedRecord:", selectedRecord.email);
      emailInput.value = selectedRecord.email;
    }
  } catch (err) {
    console.error("❌ Email fetch failed:", err);
    // Ensure fallback email is set
    if (!emailInput.value && selectedRecord?.email) {
      console.log("⚠️ Using fallback email:", selectedRecord.email);
      emailInput.value = selectedRecord.email;
    }
  }
}

// ✅ REMOVE OLD checkIfRegisteredAndFillForm FUNCTION
// (It's replaced by fetchAndSetEmail above)

// ✅ UPDATED getValue HELPER IN SUBMIT HANDLER
function initSubmitHandler() {
  const form = document.getElementById("approveForm");
  if (!form) return;

  const mapArchiveField = {
    approveFamilyName: "familyName",
    approveFirstName: "firstName",
    approveMiddleName: "middleName",
    approvedBadgeNo: "badgeNo",
    approveEmail: "email"
  };

  const getValue = (selector, key, type = "string") => {
    const el = form.querySelector(selector);
    let val = el?.value?.trim();

    const critical = ["status", "branch", "shift", "salary", "expiryDate"];

    if (critical.includes(key)) {
      return val || "N/A";
    }

    // ✅ FOR EMAIL: Use form value, fallback to selectedRecord
    if (key === "approveEmail") {
      if (val) {
        console.log("✅ Using email from form:", val);
        return val;
      }
      if (selectedRecord?.email) {
        console.log("✅ Using email from selectedRecord:", selectedRecord.email);
        return selectedRecord.email;
      }
      console.warn("⚠️ No email found in form or selectedRecord");
      return "";
    }

    // ✅ Handle different field types
    if (type === "date") {
      return val || null;
    }
    if (type === "number") {
      return val ? Number(val) : 0;
    }

    // ✅ For middle name, return empty string if not provided
    if (key === "approveMiddleName") {
      return val || "";
    }

    return val || selectedRecord?.[mapArchiveField[key]] || "";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectedRecordId) return alert("⚠️ No selected record!");

    // ✅ GET BRANCH VALUE DIRECTLY (NO FALLBACK)
    const branchSelect = form.querySelector('select[name="branch"]');
    const branchValue = branchSelect?.value?.trim() || "";

    // ✅ DETERMINE STATUS BASED ON BRANCH
    let statusValue;
    if (isValidBranch(branchValue)) {
      statusValue = "Approved";
    } else {
      statusValue = "Pending";
    }

    console.log("📋 FORM SUBMISSION DEBUG:");
    console.log("   Branch selected:", branchValue);
    console.log("   Is valid branch:", isValidBranch(branchValue));
    console.log("   Final status:", statusValue);

    // ✅ COLLECT ALL FORM DATA
    const shift = form.querySelector('select[name="shift"]')?.value.trim() || "N/A";
    const salary = form.querySelector('input[name="salary"]')?.value.trim() || "N/A";
    let expiry = form.querySelector('input[name="expiryDate"]')?.value.trim() || null;

    const basicInformation = {
      pslNo: getValue('input[name="pslNo"]'),
      sssNo: getValue('input[name="sssNo"]'),
      tinNo: getValue('input[name="tinNo"]'),
      celNo: getValue('input[name="celNo"]'),
      shift,
      status: statusValue,
      expiryDate: expiry,
      badgeNo: getValue('input[name="approvedBadgeNo"]', "approvedBadgeNo"),
      salary,
      branch: branchValue,
      role: "employee"
    };

    // ✅ GET EMAIL USING getValue (with fallback logic)
    const emailValue = getValue('input[name="approveEmail"]', "approveEmail");
    console.log("📧 Final email value:", emailValue);

    const personalData = {
      familyName: getValue('input[name="approveFamilyName"]', "approveFamilyName"),
      firstName: getValue('input[name="approveFirstName"]', "approveFirstName"),
      middleName: getValue('input[name="approveMiddleName"]', "approveMiddleName"),
      email: emailValue,
      dateOfBirth: getValue('input[name="dateOfBirth"]', null, "date"),
      presentAddress: getValue('input[name="presentAddress"]'),
      placeOfBirth: getValue('input[name="placeOfBirth"]'),
      prevAddress: getValue('input[name="prevAddress"]'),
      citizenship: getValue('input[name="citizenship"]'),
      weight: getValue('input[name="weight"]'),
      languageSpoken: getValue('input[name="languageSpoken"]'),
      age: getValue('input[name="age"]', null, "number"),
      height: getValue('input[name="height"]'),
      religion: getValue('input[name="religion"]'),
      civilStatus: getValue('input[name="civilStatus"]'),
      colorOfHair: getValue('input[name="colorOfHair"]'),
      colorOfEyes: getValue('input[name="colorOfEyes"]'),
    };

    const educationalBackground = [
      ...form.querySelectorAll("#educationTable tbody tr")
    ].map((row) => {
      const inputs = [...row.querySelectorAll("input")];
      return {
        school: inputs[0].value.trim() || "N/A",
        degree: inputs[1].value.trim() || "N/A",
        yearFrom: inputs[2].value.trim() || "N/A",
        yearTo: inputs[3].value.trim() || "N/A"
      };
    });

    console.log("📤 FINAL PAYLOAD:", JSON.stringify({ basicInformation, personalData, educationalBackground }, null, 2));

    // ✅ SEND TO BACKEND
    const formData = new FormData();
    formData.append("basicInformation", JSON.stringify(basicInformation));
    formData.append("personalData", JSON.stringify(personalData));
    formData.append("educationalBackground", JSON.stringify(educationalBackground));
    formData.append("status", statusValue);

    const profileFile = form.querySelector('input[name="employeeProfile"]')?.files[0];
    if (profileFile) formData.append("employeeProfile", profileFile);

    try {
      const res = await fetch(`https://www.mither3security.com/accounts/approve/${selectedRecordId}`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Unknown error");

      alert(`✅ Employee created with status: ${statusValue}`);
      closeApproveModal();
      document.getElementById(`record-${selectedRecordId}`)?.remove();
      archives = archives.filter((r) => String(r._id) !== String(selectedRecordId));
    } catch (err) {
      console.error("❌ Error approving employee:", err);
      alert("❌ Failed to create employee. Check console for details.");
    }
  });
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

function closeApproveModal() {
  const modal = document.getElementById("approveModal");
  if (modal) modal.style.display = "none";
}

document.getElementById("closeApproveBtn")?.addEventListener("click", closeApproveModal);

window.addEventListener("click", (e) => {
  const modal = document.getElementById("approveModal");
  if (e.target === modal) closeApproveModal();
});

// ==== Archive Modal Controls ====
function openArchiveModal() {
  const modal = document.getElementById("archiveModal");
  if (modal) {
    modal.style.display = "flex";
    showStep(0);
  }
}

function closeArchiveModal() {
  const modal = document.getElementById("archiveModal");
  const form = document.getElementById("multiStepForm");
  if (modal) modal.style.display = "none";
  if (form) form.reset();
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
  if (!container) return;

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
document.getElementById("multiStepForm")?.addEventListener("submit", async function(e){
  e.preventDefault();
  const formData = new FormData(this);

  try {
    const res = await fetch("https://www.mither3security.com/archive", {
      method: "POST",
      body: formData
    });

    const result = await res.json();
    const statusEl = document.getElementById("submissionStatus");
    if (statusEl) {
      statusEl.innerText = res.ok
        ? "✅ Credentials recorded successfully!"
        : "❌ Failed: " + result.message;
    }

    if (res.ok) {
      closeArchiveModal();
      loadArchives();
    }
  } catch (err) {
    const statusEl = document.getElementById("submissionStatus");
    if (statusEl) {
      statusEl.innerText = "⚠️ Error: " + err.message;
    }
  }
});

// === INIT ===
document.addEventListener("DOMContentLoaded", () => {
  loadArchives();
  initEducationTable();
  initProfilePreview();
  initSubmitHandler();
});