document.addEventListener("DOMContentLoaded", async () => {
  const editBtn = document.getElementById("editBtn");
  const compareBtn = document.getElementById("compareBtn");
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get("id");
  let isEditing = false;
  let employeeDataCache = {};
  let fileInputs = {};
  let allBranches = [];
  let monthlyAttendanceData = [];

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
        : "../defaultProfile/Default_pfp.jpg";
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

  function handleBranchChange(selectedBranch) {
    const salaryEl = document.getElementById("salary");
    const expiryDateEl = document.getElementById("expiryDate");
    const statusEl = document.getElementById("status");
    const shiftEl = document.getElementById("shift");

    if (selectedBranch === "toBeSet" || selectedBranch === "") {
      salaryEl.textContent = "N/A";
      expiryDateEl.textContent = "";
      statusEl.textContent = "Pending";
      
      if (shiftEl.tagName === "SELECT") {
        shiftEl.innerHTML = "";
        const nAOpt = document.createElement("option");
        nAOpt.value = "N/A";
        nAOpt.textContent = "N/A";
        shiftEl.appendChild(nAOpt);
        shiftEl.value = "N/A";
      }
    } else {
      const foundBranch = allBranches.find(b => b.branchData?.branch === selectedBranch);
      
      if (foundBranch) {
        salaryEl.textContent = foundBranch.salary || "N/A";
        
        if (foundBranch.expirationDate) {
          const d = new Date(foundBranch.expirationDate);
          expiryDateEl.textContent = isNaN(d) ? "" : d.toLocaleDateString();
        } else {
          expiryDateEl.textContent = "";
        }
        
        if (shiftEl.tagName === "SELECT") {
          shiftEl.innerHTML = "";
          
          const dayShiftTime = foundBranch.guardShift?.day;
          const nightShiftTime = foundBranch.guardShift?.night;
          
          if (dayShiftTime && dayShiftTime !== "N/A") {
            const dayOpt = document.createElement("option");
            dayOpt.value = `day|${dayShiftTime}`;
            dayOpt.textContent = `Day, ${dayShiftTime}`;
            shiftEl.appendChild(dayOpt);
          }
          
          if (nightShiftTime && nightShiftTime !== "N/A") {
            const nightOpt = document.createElement("option");
            nightOpt.value = `night|${nightShiftTime}`;
            nightOpt.textContent = `Night, ${nightShiftTime}`;
            shiftEl.appendChild(nightOpt);
          }
          
          if ((!dayShiftTime || dayShiftTime === "N/A") && (!nightShiftTime || nightShiftTime === "N/A")) {
            const nAOpt = document.createElement("option");
            nAOpt.value = "N/A";
            nAOpt.textContent = "N/A";
            shiftEl.appendChild(nAOpt);
            shiftEl.value = "N/A";
          } else {
            shiftEl.selectedIndex = 0;
          }
        }
        
        statusEl.textContent = "Active";
      }
    }
  }

  async function saveEmployeeData() {
    const token = localStorage.getItem("token");
    if (!token) return alert("Not authorized");

    const formData = new FormData();

    const employeeData = {
      basicInformation: {},
      personalData: {},
      credentials: {},
      educationalBackground: employeeDataCache.employeeData?.educationalBackground || [],
      firearmsIssued: employeeDataCache.employeeData?.firearmsIssued || [],
      createdBy: employeeDataCache.employeeData?.createdBy
    };

    const basicFields = ["pslNo","sssNo","tinNo","celNo","shift","expiryDate","badgeNo","branch","salary","status"];

    basicFields.forEach(f => {
      const el = document.getElementById(f);
      if (!el) return;

      let val = el.tagName === "SELECT" ? el.value : el.textContent.trim();

      if (f === "branch" && el.tagName === "SELECT") {
        val = el.value === "toBeSet" ? "" : el.value;
      }

      if (f === "shift" && el.tagName === "SELECT") {
        const shiftValue = el.value;
        if (shiftValue.includes("|")) {
          val = shiftValue.split("|")[1];
        } else {
          val = shiftValue;
        }
      }

      if (f === "expiryDate" && val) {
        if (val === "" || val === "N/A") {
          val = null;
        } else {
          const d = new Date(val);
          val = isNaN(d) ? null : d;
        }
      }

      if (f === "salary" && val === "N/A") {
        val = null;
      }

      employeeData.basicInformation[f] = val;
    });

    const personalFields = ["fullName","email","dob","presentAddress","birthPlace","previousAddress","citizenship","weight","language","age","height","religion","civilStatus","hairColor","eyeColor"];

    personalFields.forEach(f => {
      const el = document.getElementById(f);
      if (!el) return;

      let val = el.textContent.trim();

      if (f === "dob" && val) {
        if (val === "" || val === "N/A") {
          val = null;
        } else {
          const d = new Date(val);
          val = isNaN(d) ? null : d;
        }
      }

      const keyMap = {
        fullName: "name",
        dob: "dateOfBirth",
        previousAddress: "prevAddress",
        hairColor: "colorOfHair",
        eyeColor: "colorOfEyes",
        language: "languageSpoken"
      };
      const key = keyMap[f] || f;
      
      employeeData.personalData[key] = val;
    });

    const credFields = [
      "barangayClearance","policeClearance","diClearance","nbiClearance",
      "personalHistory","residenceHistory","maritalStatus","physicalData",
      "educationData","characterReference","employmentHistory",
      "neighborhoodInvestigation","militaryRecord"
    ];

    credFields.forEach(f => {
      if (fileInputs[f]) formData.append(f, fileInputs[f]);
    });

    formData.append("employeeData", JSON.stringify(employeeData));

    try {
      const res = await fetch(`https://www.mither3security.com/employees/${employeeId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("❌ Update failed:", result);
        alert("Update failed. Check console.");
        return;
      }

      console.log("✅ Update successful:", result);
      alert("Employee updated successfully!");
      employeeDataCache = result.employee || result.updatedEmployee;
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
      editBtn.textContent = "SAVE";

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

        const optionToBeSet = document.createElement("option");
        optionToBeSet.value = "toBeSet";
        optionToBeSet.textContent = "-- To Be Set --";
        select.appendChild(optionToBeSet);

        if (allBranches.length > 0) {
          allBranches.forEach(branch => {
            const option = document.createElement("option");
            option.value = branch.branchData?.branch || "N/A";
            option.textContent = branch.branchData?.branch || "N/A";
            select.appendChild(option);
          });
        }

        select.value = currentBranch || "toBeSet";

        select.addEventListener("change", (e) => {
          handleBranchChange(e.target.value);
        });

        branchEl.parentNode.replaceChild(select, branchEl);
        select.id = "branch";
      }

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

        const placeholderOpt = document.createElement("option");
        placeholderOpt.value = "";
        placeholderOpt.textContent = "-- Select Branch First --";
        shiftSelect.appendChild(placeholderOpt);

        shiftSelect.value = currentShift || "";

        shiftEl.parentNode.replaceChild(shiftSelect, shiftEl);
        shiftSelect.id = "shift";
      }

      document.querySelectorAll("[contenteditable=false]").forEach(f => {
        if (f.id !== "branch" && f.id !== "salary" && f.id !== "expiryDate" && f.id !== "status") {
          f.setAttribute("contenteditable", "true");
          f.style.backgroundColor = "#f0f8ff";
          f.style.cursor = "text";
        }
      });
    } else {
      await saveEmployeeData();
      editBtn.textContent = "EDIT";
      isEditing = false;
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
          : "../defaultProfile/Default_pfp.jpg";
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
                : "../defaultProfile/Default_pfp.jpg"
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
                : "../defaultProfile/Default_pfp.jpg"
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
          status.toLowerCase().includes("absent") ? "absent" :
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
      monthlyAttendanceData = records;

      if (!records.length) {
        tbody.innerHTML = `<tr><td colspan="21" style="text-align:center;">No records found.</td></tr>`;
        return;
      }

      const branch = employeeDataCache.employeeData?.basicInformation?.branch || "N/A";
      const employeeName = employeeDataCache.employeeData?.personalData?.name || "N/A";

      const recordsPerRow = 16;
      const totalRows = Math.ceil(records.length / recordsPerRow);
      
      let grandTotalHours = 0;
      let grandTotalDays = 0;

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

        // ✅ FIX: Check status properly - count as successful if "On-Time" is in status
        const daysArray = rowRecords.map(record => {
          const status = record.status?.toLowerCase() || "absent";
          
          if (status.includes("on-time")) return "✅";
          if (status.includes("late")) return "⚠️";
          if (status.includes("on-leave")) return "🏖️";
          if (status.includes("absent")) return "❌";
          return "❌";
        });

        while (daysArray.length < recordsPerRow) daysArray.push("");

        const periodStartStr = firstRecordDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const periodEndDate = new Date(firstRecordDate);
        periodEndDate.setDate(firstRecordDate.getDate() + recordsPerRow - 1);
        const periodEndStr = periodEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        // ✅ FIX: Count only successful days (✅, ⚠️, 🏖️) excluding ❌
        const totalDays = daysArray.filter(d => d === "✅" || d === "⚠️" || d === "🏖️").length;
        const totalHours = totalDays * 12;

        grandTotalHours += totalHours;
        grandTotalDays += totalDays;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${branch}</td>
          <td>${periodStartStr} – ${periodEndStr}</td>
          <td>${employeeName}</td>
          ${daysArray.map(d => `<td class="status-emoji" style="text-align:center; padding:0.8rem; font-size:1.2rem;">${d}</td>`).join("")}
          <td style="font-weight:bold; text-align:center;">${totalHours}</td>
          <td style="font-weight:bold; text-align:center;">${totalDays}</td>
        `;
        tbody.appendChild(tr);
      }

      // ✅ ADD GRAND TOTAL ROW AT BOTTOM
      const totalRow = document.createElement("tr");
      totalRow.style.background = "#f0f8ff";
      totalRow.style.fontWeight = "bold";
      totalRow.style.borderTop = "3px solid #131315";
      totalRow.innerHTML = `
        <td colspan="3" style="text-align:right; padding:1rem; font-weight:bold;">GRAND TOTAL:</td>
        ${Array.from({ length: 16 }, () => `<td style="text-align:center; padding:0.8rem;"></td>`).join("")}
        <td style="text-align:center; padding:1rem; background:#e8f5e9;">${grandTotalHours}</td>
        <td style="text-align:center; padding:1rem; background:#e8f5e9;">${grandTotalDays}</td>
      `;
      tbody.appendChild(totalRow);

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

  function downloadTableAsCSV() {
    const table = document.getElementById("monthlyAttendanceTable");
    if (!table) return;

    let csvContent = "";

    // ===== GET HEADERS =====
    const headers = table.querySelectorAll("thead tr th");
    const headerRow = Array.from(headers).map(th => {
      const text = th.innerText.replace(/"/g, '""').trim();
      return `"${text}"`;
    }).join(",");
    csvContent += headerRow + "\r\n";

    // ===== GET DATA ROWS =====
    const rows = table.querySelectorAll("tbody tr");

    rows.forEach((row, index) => {
      const cells = row.querySelectorAll("td");
      
      const rowContent = Array.from(cells).map(td => {
        const text = td.innerText.replace(/"/g, '""').trim();
        return `"${text}"`;
      }).join(",");
      
      csvContent += rowContent + "\r\n";
    });

    // ===== DOWNLOAD =====
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    
    const employeeName = employeeDataCache.employeeData?.personalData?.name || "employee";
    const sanitizedName = employeeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `attendance_${sanitizedName}_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ===== DOWNLOAD BUTTON EVENT =====
  const downloadBtn = document.getElementById("downloadMonthlyAttendance");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      downloadTableAsCSV();
    });
  }

  function updateAttendanceChart(data) {
    const ctx = attendanceChartCanvas.getContext("2d");

    // ✅ FIX: Count "On-Time" properly (even if it has "Early Out" appended)
    const onTimeCount = data.filter(d => d.status?.toLowerCase().includes("on-time")).length;
    const lateCount = data.filter(d => d.status?.toLowerCase().includes("late")).length;
    const absentCount = data.filter(d => d.status?.toLowerCase().includes("absent")).length;

    const total = onTimeCount + lateCount + absentCount;
    const percentage = total > 0 ? ((onTimeCount / total) * 100).toFixed(1) : 0;
    attendancePercentage.textContent = `${percentage}%`;

    console.log(`📊 Attendance Chart Data - On-Time: ${onTimeCount}, Late: ${lateCount}, Absent: ${absentCount}, Total: ${total}, Percentage: ${percentage}%`);

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
    await fetchAllBranches();
    await fetchEmployeeData();
    await loadWeeklyAttendance();
  }
});