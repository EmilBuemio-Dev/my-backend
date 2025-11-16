document.addEventListener("DOMContentLoaded", async () => {
  const editBtn = document.getElementById("editBtn");
  const compareBtn = document.getElementById("compareBtn");
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get("id");
  let isEditing = false;
  let employeeDataCache = {};
  let fileInputs = {};
  let allBranches = []; // Store all branches for dropdown

  async function fetchEmployeeData() {
    try {
      if (!employeeId) return alert("No employee ID found in the URL.");
      const res = await fetch(`https://www.mither3security.com/employees/${employeeId}`);
      if (!res.ok) throw new Error("Failed to fetch employee data");
      const emp = await res.json();
      employeeDataCache = emp;
      populateProfile(emp);
    } catch (error) {
      console.error("Error fetching employee:", error);
      alert("Error loading employee data. Check console for details.");
    }
  }

  // ===== FETCH ALL BRANCHES =====
  async function fetchAllBranches() {
    try {
      const res = await fetch("https://www.mither3security.com/api/branches");
      if (!res.ok) throw new Error("Failed to fetch branches");
      allBranches = await res.json();
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  }

  function populateProfile(emp) {
    const employeeData = emp.employeeData || {};
    const basic = employeeData.basicInformation || {};
    const personal = employeeData.personalData || {};
    const education = employeeData.educationalBackground || [];
    const creds = employeeData.credentials || {};

    const photoElement = document.getElementById("employeePhoto");
    if (photoElement) {
      photoElement.src = creds.profileImage
        ? `https://www.mither3security.com${creds.profileImage}`
        : "../../image/profile.png";
    }

    const setText = (id, value, isDate = false) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (isDate && value) {
        const d = new Date(value);
        el.textContent = isNaN(d) ? "" : d.toLocaleDateString();
      } else {
        el.textContent = value ?? "";
      }
    };

    // Basic Info
    const basicKeyMap = {
      pslNo: "pslNo",
      sssNo: "sssNo",
      tinNo: "tinNo",
      cellNo: "celNo",
      shift: "shift",
      status: "status",
      expiryDate: "expiryDate",
      badgeNo: "badgeNo",
      branch: "branch",
      salary: "salary"
    };

    Object.keys(basicKeyMap).forEach(f => {
      const modelKey = basicKeyMap[f];
      setText(f, basic[modelKey], f === "expiryDate");
    });

    // Personal Information
    const personalKeyMap = {
      fullName: "name",
      email: "email",
      dob: "dateOfBirth",
      presentAddress: "presentAddress",
      birthPlace: "placeOfBirth",
      previousAddress: "prevAddress",
      citizenship: "citizenship",
      weight: "weight",
      language: "languageSpoken",
      age: "age",
      height: "height",
      religion: "religion",
      civilStatus: "civilStatus",
      hairColor: "colorOfHair",
      eyeColor: "colorOfEyes"
    };

    Object.keys(personalKeyMap).forEach(f => {
      const modelKey = personalKeyMap[f];
      setText(f, personal[modelKey]);
    });

    // Education
    const tbody = document.querySelector("#educationTable tbody");
    if (tbody) {
      tbody.innerHTML = "";
      if (!education.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No education records found</td></tr>`;
      } else {
        education.forEach(edu => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${edu.school || ""}</td>
            <td>${edu.inclusiveDate || ""}</td>
            <td>${edu.degree || ""}</td>
            <td>${edu.dateGraduated || ""}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    }

    // Credentials
    const credFields = [
      "barangayClearance","policeClearance","diClearance","nbiClearance",
      "personalHistory","residenceHistory","maritalStatus","physicalData",
      "educationData","characterReference","employmentHistory",
      "neighborhoodInvestigation","militaryRecord"
    ];

    credFields.forEach(f => {
      const span = document.getElementById(f);
      if (!span) return;
      const filePath = creds[f];
      const cleanedPath = filePath ? filePath.split("/").map(s => encodeURIComponent(s)).join("/") : null;
      const fileUrl = cleanedPath ? `https://www.mither3security.com/${cleanedPath}` : null;

      span.innerHTML = "";
      if (fileUrl) {
        const viewBtn = document.createElement("button");
        viewBtn.className = "view-btn";
        viewBtn.textContent = "View";
        viewBtn.onclick = () => window.open(fileUrl, "_blank");
        span.appendChild(viewBtn);
      } else {
        span.textContent = "No file";
      }

      if (isEditing) {
        const input = document.createElement("input");
        input.type = "file";
        input.style.marginLeft = "10px";
        input.onchange = e => { fileInputs[f] = e.target.files[0]; };
        span.appendChild(input);
      }
    });
  }

  // ===== HANDLE BRANCH CHANGE =====
  function handleBranchChange(selectedBranch) {
    const salaryEl = document.getElementById("salary");
    const expiryDateEl = document.getElementById("expiryDate");
    const statusEl = document.getElementById("status");
    const shiftEl = document.getElementById("shift");

    if (selectedBranch === "toBeSet" || selectedBranch === "") {
      // ✅ Reset to Pending state
      salaryEl.textContent = "N/A";
      expiryDateEl.textContent = "";
      statusEl.textContent = "Pending";
      
      // ✅ Reset shift to N/A or clear dropdown
      if (shiftEl.tagName === "SELECT") {
        shiftEl.value = "N/A";
      } else {
        shiftEl.textContent = "N/A";
      }
    } else {
      // ✅ Find the branch and auto-fill
      const foundBranch = allBranches.find(b => b.branchData?.branch === selectedBranch);
      
      if (foundBranch) {
        // Set salary
        salaryEl.textContent = foundBranch.salary || "N/A";
        
        // Set expiry date
        if (foundBranch.expirationDate) {
          const d = new Date(foundBranch.expirationDate);
          expiryDateEl.textContent = isNaN(d) ? "" : d.toLocaleDateString();
        } else {
          expiryDateEl.textContent = "";
        }
        
        // ✅ Set shift from guardShift (day or night)
        if (shiftEl.tagName === "SELECT") {
          const dayShift = foundBranch.guardShift?.day;
          const nightShift = foundBranch.guardShift?.night;
          
          // If both exist, default to day shift
          if (dayShift && dayShift !== "N/A") {
            shiftEl.value = "day";
          } else if (nightShift && nightShift !== "N/A") {
            shiftEl.value = "night";
          } else {
            shiftEl.value = "day";
          }
        }
        
        // Set status to Active
        statusEl.textContent = "Active";
      }
    }
  }

  async function saveEmployeeData() {
    const basicFields = ["pslNo","sssNo","tinNo","celNo","shift","expiryDate","badgeNo","branch","salary","status"];
    const personalFields = ["fullName","email","dob","presentAddress","birthPlace","previousAddress","citizenship","weight","language","age","height","religion","civilStatus","hairColor","eyeColor"];
    const credFields = [
      "barangayClearance","policeClearance","diClearance","nbiClearance",
      "personalHistory","residenceHistory","maritalStatus","physicalData",
      "educationData","characterReference","employmentHistory",
      "neighborhoodInvestigation","militaryRecord"
    ];

    const updated = { employeeData: {} };

    // ===== BASIC INFORMATION =====
    const basicOld = employeeDataCache.employeeData?.basicInformation || {};
    const basicUpdated = {};

    basicFields.forEach(f => {
      const el = document.getElementById(f);
      if (!el) return;

      let val = el.tagName === "SELECT" ? el.value : el.textContent.trim();

      // Handle branch from select dropdown
      if (f === "branch" && el.tagName === "SELECT") {
        val = el.value === "toBeSet" ? "" : el.value;
      }

      // Handle shift from select dropdown
      if (f === "shift" && el.tagName === "SELECT") {
        val = el.value === "N/A" ? "N/A" : el.value;
      }

      // Convert date strings to Date objects
      if (f === "expiryDate" && val) {
        if (val === "" || val === "N/A") {
          val = null;
        } else {
          const d = new Date(val);
          val = isNaN(d) ? null : d.toISOString();
        }
      }

      // Convert salary to null if N/A
      if (f === "salary" && val === "N/A") {
        val = null;
      }

      if (val !== null && val !== "" && val !== basicOld[f === "celNo" ? "celNo" : f]) {
        basicUpdated[f] = val;
      }
    });

    if (Object.keys(basicUpdated).length) updated.employeeData.basicInformation = basicUpdated;

    // ===== PERSONAL INFORMATION =====
    const personalOld = employeeDataCache.employeeData?.personalData || {};
    const personalUpdated = {};

    personalFields.forEach(f => {
      const el = document.getElementById(f);
      if (!el) return;

      const val = el.textContent.trim();
      const keyMap = {
        fullName: "name",
        dob: "dateOfBirth",
        previousAddress: "prevAddress",
        hairColor: "colorOfHair",
        eyeColor: "colorOfEyes",
        language: "languageSpoken"
      };
      const key = keyMap[f] || f;
      if (val !== null && val !== "" && val !== personalOld[key]) personalUpdated[key] = val;
    });

    if (Object.keys(personalUpdated).length) updated.employeeData.personalData = personalUpdated;

    // ===== CREDENTIALS + FILES =====
    const formData = new FormData();
    formData.append("employeeData", JSON.stringify(updated.employeeData || {}));
    credFields.forEach(f => {
      if (fileInputs[f]) formData.append(f, fileInputs[f]);
    });

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://www.mither3security.com/employees/${employeeId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error("Failed to save employee data");
      const saved = await res.json();
      alert("Employee data saved successfully!");
      employeeDataCache = saved.employee || saved.updatedEmployee;
      fileInputs = {};
      populateProfile(employeeDataCache);
    } catch (err) {
      console.error(err);
      alert("Error saving data. Check console for details.");
    }
  }

  editBtn.addEventListener("click", async () => {
    isEditing = !isEditing;

    if (isEditing) {
      // ===== ENTER EDIT MODE =====
      editBtn.textContent = "SAVE";

      // ✅ Convert BRANCH field to dropdown
      const branchEl = document.getElementById("branch");
      if (branchEl) {
        const currentBranch = branchEl.textContent.trim();
        const select = document.createElement("select");
        select.id = "branchSelect";
        select.style.padding = "0.6rem";
        select.style.borderRadius = "6px";
        select.style.border = "1px solid #ddd";
        select.style.fontSize = "0.9rem";
        select.style.backgroundColor = "#f0f8ff";
        select.style.cursor = "pointer";

        // Add "To Be Set" option
        const optionToBeSet = document.createElement("option");
        optionToBeSet.value = "toBeSet";
        optionToBeSet.textContent = "-- To Be Set --";
        select.appendChild(optionToBeSet);

        // Add all branches
        if (allBranches.length > 0) {
          allBranches.forEach(branch => {
            const option = document.createElement("option");
            option.value = branch.branchData?.branch || "N/A";
            option.textContent = branch.branchData?.branch || "N/A";
            select.appendChild(option);
          });
        }

        // Set current value
        select.value = currentBranch || "toBeSet";

        // ✅ Listen to branch change
        select.addEventListener("change", (e) => {
          handleBranchChange(e.target.value);
        });

        // Replace the text element with select
        branchEl.parentNode.replaceChild(select, branchEl);
        select.id = "branch"; // Restore the ID for saving
      }

      // ✅ Convert SHIFT field to dropdown
      const shiftEl = document.getElementById("shift");
      if (shiftEl) {
        const currentShift = shiftEl.textContent.trim();
        const shiftSelect = document.createElement("select");
        shiftSelect.id = "shiftSelect";
        shiftSelect.style.padding = "0.6rem";
        shiftSelect.style.borderRadius = "6px";
        shiftSelect.style.border = "1px solid #ddd";
        shiftSelect.style.fontSize = "0.9rem";
        shiftSelect.style.backgroundColor = "#f0f8ff";
        shiftSelect.style.cursor = "pointer";

        // Add shift options
        const shiftOptions = ["N/A", "day", "night"];
        shiftOptions.forEach(option => {
          const opt = document.createElement("option");
          opt.value = option;
          opt.textContent = option.charAt(0).toUpperCase() + option.slice(1);
          shiftSelect.appendChild(opt);
        });

        // Set current value
        shiftSelect.value = currentShift.toLowerCase() || "N/A";

        // Replace the text element with select
        shiftEl.parentNode.replaceChild(shiftSelect, shiftEl);
        shiftSelect.id = "shift"; // Restore the ID for saving
      }

      // Make other fields editable (except salary, expiryDate, status)
      document.querySelectorAll("[contenteditable=false]").forEach(f => {
        if (f.id !== "branch" && f.id !== "salary" && f.id !== "expiryDate" && f.id !== "status") {
          f.setAttribute("contenteditable", "true");
          f.style.backgroundColor = "#f0f8ff";
          f.style.cursor = "text";
        }
      });
    } else {
      // ===== SAVE AND EXIT EDIT MODE =====
      await saveEmployeeData();
      editBtn.textContent = "EDIT";
      isEditing = false;
      
      // Reload employee data to show fresh state
      await fetchEmployeeData();
    }
  });

  compareBtn.addEventListener("click", async () => {
    try {
      const modal = document.createElement("div");
      modal.className = "modal";
      modal.id = "compareModal";
      modal.innerHTML = `
        <div class="modal-content" style="max-width:1000px;">
          <span id="closeCompareModal" class="close">&times;</span>
          <h3>Select Employee to Compare</h3>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Badge No.</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="compareTableBody">
                <tr><td colspan="5" style="text-align:center;">Loading...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.style.display = "flex";

      document.getElementById("closeCompareModal").onclick = () => {
        if (modal && modal.parentNode) modal.remove();
      };

      const res = await fetch("https://www.mither3security.com/employees");
      if (!res.ok) throw new Error("Failed to fetch employees");
      const employees = await res.json();

      const tbody = document.getElementById("compareTableBody");
      tbody.innerHTML = "";

      employees.forEach(emp => {
        const profileImg = emp.employeeData?.credentials?.profileImage
          ? `https://www.mither3security.com/${emp.employeeData.credentials.profileImage.replace(/^\/?/, "")}`
          : "../../image/profile.png";
        const name = emp.employeeData?.personalData?.name || "N/A";
        const badgeNo = emp.employeeData?.basicInformation?.badgeNo || "N/A";
        const status = emp.employeeData?.basicInformation?.status || "Inactive";

        if (emp._id === employeeId) return;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><img src="${profileImg}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;"></td>
          <td>${name}</td>
          <td><span class="status ${status.toLowerCase()}">${status}</span></td>
          <td>${badgeNo}</td>
          <td><button class="compare-action" data-id="${emp._id}">Compare</button></td>
        `;
        tbody.appendChild(tr);
      });

      document.querySelectorAll(".compare-action").forEach(btn => {
        btn.addEventListener("click", async () => {
          const secondId = btn.dataset.id;
          modal.remove();
          await openCompareView(employeeId, secondId);
        });
      });

    } catch (err) {
      console.error("Error loading compare list:", err);
      alert("Failed to open compare modal.");
    }
  });

  async function openCompareView(firstId, secondId) {
    try {
      const [firstRes, secondRes, reqRes] = await Promise.all([
        fetch(`https://www.mither3security.com/employees/${firstId}`),
        fetch(`https://www.mither3security.com/employees/${secondId}`),
        fetch("https://www.mither3security.com/api/requirements")
      ]);

      if (!firstRes.ok || !secondRes.ok || !reqRes.ok)
        throw new Error("Failed to fetch comparison data");

      const [firstEmp, secondEmp, requirements] = await Promise.all([
        firstRes.json(),
        secondRes.json(),
        reqRes.json()
      ]);

      const compareContainer = document.createElement("div");
      compareContainer.className = "compare-view";
      compareContainer.innerHTML = `
        <div class="compare-header">
          <h3>Compare Employees</h3>
          <button id="closeCompareView" class="close-btn">×</button>
        </div>

        <div class="compare-content">
          <div class="compare-column">
            <div class="compare-top">
              <h4>${firstEmp.employeeData?.personalData?.name || "N/A"}</h4>
              <select id="reqSelect" class="req-select">
                <option value="">-- Select Requirement --</option>
                ${requirements.map(r => `<option value="${r._id}" data-height="${r.height}" data-weight="${r.weight}">
                  ${r.branch} (${r.clientName})
                </option>`).join("")}
              </select>
            </div>

            <img src="${
              firstEmp.employeeData?.credentials?.profileImage
                ? `https://www.mither3security.com/${firstEmp.employeeData.credentials.profileImage.replace(/^\/?/, "")}`
                : "../../image/profile.png"
            }" class="compare-photo">

            <p><strong>Branch:</strong> ${firstEmp.employeeData?.basicInformation?.branch || "N/A"}</p>
            <p><strong>Shift:</strong> ${firstEmp.employeeData?.basicInformation?.shift || "N/A"}</p>
            <p><strong>Badge No.:</strong> ${firstEmp.employeeData?.basicInformation?.badgeNo || "N/A"}</p>
            <p><strong>Status:</strong> ${firstEmp.employeeData?.basicInformation?.status || "N/A"}</p>
            <p><strong>Salary:</strong> ${firstEmp.employeeData?.basicInformation?.salary || "N/A"}</p>

            <p><strong>Height:</strong> 
              <span id="firstHeight">${firstEmp.employeeData?.personalData?.height || "N/A"}</span>
            </p>
            <p><strong>Weight:</strong> 
              <span id="firstWeight">${firstEmp.employeeData?.personalData?.weight || "N/A"}</span>
            </p>
            <p><strong>Address:</strong> ${firstEmp.employeeData?.personalData?.presentAddress || "N/A"}</p>

            <h4 style="margin-top: 1.5rem;">Educational Background</h4>
            <table class="compare-table">
              <thead>
                <tr><th>School</th><th>Inclusive Date</th><th>Degree</th><th>Date Graduated</th></tr>
              </thead>
              <tbody>
                ${(firstEmp.employeeData?.educationalBackground || [])
                  .map(edu => `
                    <tr>
                      <td>${edu.school || "N/A"}</td>
                      <td>${edu.inclusiveDate || "N/A"}</td>
                      <td>${edu.degree || "N/A"}</td>
                      <td>${edu.dateGraduated || "N/A"}</td>
                    </tr>
                  `)
                  .join("") || `<tr><td colspan="4">No data</td></tr>`}
              </tbody>
            </table>
          </div>

          <div class="compare-column">
            <h4>${secondEmp.employeeData?.personalData?.name || "N/A"}</h4>
            <img src="${
              secondEmp.employeeData?.credentials?.profileImage
                ? `https://www.mither3security.com/${secondEmp.employeeData.credentials.profileImage.replace(/^\/?/, "")}`
                : "../../image/profile.png"
            }" class="compare-photo">

            <p><strong>Branch:</strong> ${secondEmp.employeeData?.basicInformation?.branch || "N/A"}</p>
            <p><strong>Shift:</strong> ${secondEmp.employeeData?.basicInformation?.shift || "N/A"}</p>
            <p><strong>Badge No.:</strong> ${secondEmp.employeeData?.basicInformation?.badgeNo || "N/A"}</p>
            <p><strong>Status:</strong> ${secondEmp.employeeData?.basicInformation?.status || "N/A"}</p>
            <p><strong>Salary:</strong> ${secondEmp.employeeData?.basicInformation?.salary || "N/A"}</p>

            <p><strong>Height:</strong> 
              <span id="secondHeight">${secondEmp.employeeData?.personalData?.height || "N/A"}</span>
            </p>
            <p><strong>Weight:</strong> 
              <span id="secondWeight">${secondEmp.employeeData?.personalData?.weight || "N/A"}</span>
            </p>
            <p><strong>Address:</strong> ${secondEmp.employeeData?.personalData?.presentAddress || "N/A"}</p>

            <h4 style="margin-top: 1.5rem;">Educational Background</h4>
            <table class="compare-table">
              <thead>
                <tr><th>School</th><th>Inclusive Date</th><th>Degree</th><th>Date Graduated</th></tr>
              </thead>
              <tbody>
                ${(secondEmp.employeeData?.educationalBackground || [])
                  .map(edu => `
                    <tr>
                      <td>${edu.school || "N/A"}</td>
                      <td>${edu.inclusiveDate || "N/A"}</td>
                      <td>${edu.degree || "N/A"}</td>
                      <td>${edu.dateGraduated || "N/A"}</td>
                    </tr>
                  `)
                  .join("") || `<tr><td colspan="4">No data</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.body.appendChild(compareContainer);

      document.getElementById("closeCompareView").onclick = () => {
        if (compareContainer && compareContainer.parentNode) compareContainer.remove();
      };

      const reqSelect = compareContainer.querySelector("#reqSelect");
      const firstHeightEl = compareContainer.querySelector("#firstHeight");
      const firstWeightEl = compareContainer.querySelector("#firstWeight");
      const secondHeightEl = compareContainer.querySelector("#secondHeight");
      const secondWeightEl = compareContainer.querySelector("#secondWeight");

      reqSelect.addEventListener("change", e => {
        const selectedOption = e.target.selectedOptions[0];
        const reqHeight = parseFloat(selectedOption.dataset.height);
        const reqWeight = parseFloat(selectedOption.dataset.weight);

        const firstHeight = parseFloat(firstHeightEl.textContent) || 0;
        const firstWeight = parseFloat(firstWeightEl.textContent) || 0;
        const secondHeight = parseFloat(secondHeightEl.textContent) || 0;
        const secondWeight = parseFloat(secondWeightEl.textContent) || 0;

        firstHeightEl.style.color = firstHeight >= reqHeight ? "green" : "red";
        firstHeightEl.style.fontWeight = "bold";

        firstWeightEl.style.color = firstWeight >= reqWeight ? "green" : "red";
        firstWeightEl.style.fontWeight = "bold";

        secondHeightEl.style.color = secondHeight >= reqHeight ? "green" : "red";
        secondHeightEl.style.fontWeight = "bold";

        secondWeightEl.style.color = secondWeight >= reqWeight ? "green" : "red";
        secondWeightEl.style.fontWeight = "bold";
      });

    } catch (err) {
      console.error("Error comparing employees:", err);
      alert("Failed to compare employees.");
    }
  }

  // ===== TAB SWITCHING LOGIC =====
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(content => content.style.display = "none");

      tab.classList.add("active");
      const targetId = tab.getAttribute("data-target");
      document.getElementById(targetId).style.display = "block";
    });
  });

  // ===== ATTENDANCE SECTION =====
  const attendanceTableBody = document.querySelector("#attendanceTable tbody");
  const monthlyTableBody = document.querySelector("#monthlyAttendanceTable tbody");
  const attendancePercentage = document.getElementById("attendancePercentage");
  const attendanceChartCanvas = document.getElementById("attendanceChart");
  const monthlyReportModal = document.getElementById("monthlyReportModal");
  const closeMonthlyModal = document.getElementById("closeMonthlyModal");
  let attendanceChart;

  async function loadWeeklyAttendance() {
    try {
      if (!employeeId) throw new Error("Employee ID not found");

      const res = await fetch(`https://www.mither3security.com/attendance/${employeeId}/weekly`);
      if (!res.ok) throw new Error("Failed to fetch weekly attendance");

      const data = await res.json();
      attendanceTableBody.innerHTML = "";

      if (!data.length) {
        attendanceTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No records found.</td></tr>`;
        return;
      }

      data.forEach(record => {
        const row = document.createElement("tr");
        const date = new Date(record.checkinTime || record.createdAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        const shift = record.shift || "-";
        const checkin = record.checkinTime ? new Date(record.checkinTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
        const checkout = record.checkoutTime ? new Date(record.checkoutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
        const status = record.status || "Absent";
        const statusClass =
          status.includes("Absent") ? "absent" :
          status.toLowerCase().includes("late") ? "late" : "ontime";

        row.innerHTML = `
          <td>${date}</td>
          <td>${shift}</td>
          <td>${checkin}</td>
          <td>${checkout}</td>
          <td><span class="status-tag ${statusClass}">${status}</span></td>
        `;
        attendanceTableBody.appendChild(row);
      });

      updateAttendanceChart(data);
    } catch (err) {
      console.error("Error loading weekly attendance:", err);
      attendanceTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">Failed to load attendance</td></tr>`;
    }
  }

  function generateMonthlyTableHeader() {
    const thead = document.querySelector("#monthlyAttendanceTable thead");
    thead.innerHTML = `
      <tr>
        <th>Branch</th>
        <th>Period Covered</th>
        <th>Guard Name</th>
        ${Array.from({ length: 16 }, (_, i) => `<th>Day ${i + 1}</th>`).join("")}
        <th>Total Hours</th>
        <th>Total Days</th>
      </tr>
    `;
  }

  async function loadMonthlyAttendance() {
    try {
      if (!employeeId) throw new Error("Employee ID not found");

      const res = await fetch(`https://www.mither3security.com/attendance/${employeeId}/monthly-summary`);
      if (!res.ok) throw new Error("Failed to fetch monthly summary");

      const data = await res.json();
      const tbody = document.querySelector("#monthlyAttendanceTable tbody");
      tbody.innerHTML = "";

      const records = data.records || data;
      if (!records.length) {
        tbody.innerHTML = `<tr><td colspan="21" style="text-align:center;">No records found.</td></tr>`;
        return;
      }

      const branch = employeeDataCache.employeeData?.basicInformation?.branch || "N/A";
      const employeeName = employeeDataCache.employeeData?.personalData?.name || "N/A";

      const recordsPerRow = 16;
      const totalRows = 24;

      for (let row = 0; row < totalRows; row++) {
        const startIndex = row * recordsPerRow;
        const rowRecords = records.slice(startIndex, startIndex + recordsPerRow);

        let firstRecordDate;
        if (rowRecords.length > 0) {
          firstRecordDate = new Date(rowRecords[0].checkinTime || rowRecords[0].createdAt);
        } else {
          firstRecordDate = new Date();
          firstRecordDate.setDate(firstRecordDate.getDate() - (recordsPerRow * (totalRows - row - 1)));
        }

        const daysArray = rowRecords.map(record => {
          const status = record.status?.toLowerCase() || "absent";
          switch (status) {
            case "on-time": return "✅";
            case "late": return "⚠️";
            case "on-leave": return "🏖️";
            case "absent": return "❌";
            default: return "❌";
          }
        });

        while (daysArray.length < recordsPerRow) daysArray.push("");

        const periodStartStr = firstRecordDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const periodEndDate = new Date(firstRecordDate);
        periodEndDate.setDate(firstRecordDate.getDate() + recordsPerRow - 1);
        const periodEndStr = periodEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        const totalDays = daysArray.filter(d => d !== "❌" && d !== "").length;
        const totalHours = totalDays * 12;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${branch}</td>
          <td>${periodStartStr} – ${periodEndStr}</td>
          <td>${employeeName}</td>
          ${daysArray.map(d => `<td class="status-emoji">${d}</td>`).join("")}
          <td>${totalHours}</td>
          <td>${totalDays}</td>
        `;
        tbody.appendChild(tr);
      }

    } catch (err) {
      console.error("Error loading monthly attendance:", err);
      const tbody = document.querySelector("#monthlyAttendanceTable tbody");
      tbody.innerHTML = `<tr><td colspan="21" style="text-align:center;color:red;">Failed to load monthly data</td></tr>`;
    }
  }

  generateMonthlyTableHeader();

  attendanceChartCanvas.addEventListener("click", () => {
    monthlyReportModal.style.display = "flex";
    loadMonthlyAttendance();
  });

  closeMonthlyModal.addEventListener("click", () => monthlyReportModal.style.display = "none");
  window.addEventListener("click", e => {
    if (e.target === monthlyReportModal) monthlyReportModal.style.display = "none";
  });

  function downloadTableAsCSV(tableId, filename = "monthly_attendance.csv") {
    const table = document.getElementById(tableId);
    if (!table) return;

    let csvContent = "";

    const headers = table.querySelectorAll("thead tr th");
    const headerRow = Array.from(headers).map(th => `"${th.innerText}"`).join(",");
    csvContent += headerRow + "\r\n";

    const rows = table.querySelectorAll("tbody tr");
    rows.forEach(row => {
      const cells = row.querySelectorAll("td");
      const rowContent = Array.from(cells).map(td => `"${td.innerText}"`).join(",");
      csvContent += rowContent + "\r\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function updateAttendanceChart(data) {
    const ctx = attendanceChartCanvas.getContext("2d");

    const onTimeCount = data.filter(d => d.status?.toLowerCase() === "on-time").length;
    const lateCount = data.filter(d => d.status?.toLowerCase() === "late").length;
    const absentCount = data.filter(d => d.status?.toLowerCase().includes("absent")).length;

    const total = onTimeCount + lateCount + absentCount;
    const percentage = total > 0 ? ((onTimeCount / total) * 100).toFixed(1) : 0;
    attendancePercentage.textContent = `${percentage}%`;

    if (attendanceChart) attendanceChart.destroy();

    attendanceChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["On-Time", "Late", "Absent"],
        datasets: [{
          data: [onTimeCount, lateCount, absentCount],
          backgroundColor: ["#2ecc71", "#f39c12", "#e74c3c"],
          borderWidth: 2,
          borderColor: "#fff"
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#333", font: { size: 13 } }
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.raw} day(s)`
            }
          }
        },
        cutout: "65%"
      }
    });
  }

  // ===== Initialize on Page Load =====
  if (employeeId) {
    await fetchAllBranches(); // ✅ Fetch branches first
    await fetchEmployeeData();
    await loadWeeklyAttendance();
  }
});