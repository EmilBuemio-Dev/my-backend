document.addEventListener("DOMContentLoaded", () => {
  // ===== LOGOUT =====
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.clear();
      window.location.href = "loginSection.html";
    });
  }

  // ====== AUTO TIME - SET INITIAL VALUES ======
  const checkinTimeInput = document.getElementById("checkinTime");
  const checkoutTimeInput = document.getElementById("checkoutTime");
  
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  
  if (checkinTimeInput) checkinTimeInput.value = `${h}:${m}`;
  if (checkoutTimeInput) checkoutTimeInput.value = `${h}:${m}`;

  // ====== CHECK-IN SCRIPT ======
  const checkinForm = document.getElementById("checkinForm");
  const checkinResultDiv = document.getElementById("checkinResult");
  const capturedImageInput = document.getElementById("capturedImage");

  // ==== CAMERA MODAL ====
  const cameraModal = document.getElementById("cameraModal");
  const openCameraBtn = document.getElementById("openCameraBtn");
  const closeCameraBtn = document.getElementById("closeCameraModal");
  const video = document.querySelector("#cameraModal video");
  const canvas = document.querySelector("#cameraModal canvas");
  const captureBtn = document.getElementById("captureBtn");
  const retakeBtn = document.getElementById("retakeBtn");
  const uploadBtn = document.getElementById("usePhotoBtn");
  let stream;

  // ==== OPEN CAMERA ====
  openCameraBtn?.addEventListener("click", async () => {
    cameraModal.style.display = "block";
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
    } catch (err) {
      alert("Camera access denied: " + err.message);
    }
  });

  // ==== CLOSE CAMERA ====
  closeCameraBtn?.addEventListener("click", () => {
    cameraModal.style.display = "none";
    stopCamera();
    resetModalUI();
  });

  // ==== CAPTURE PHOTO ====
  captureBtn?.addEventListener("click", () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    capturedImageInput.value = canvas.toDataURL("image/png");

    video.style.display = "none";
    canvas.style.display = "block";
    captureBtn.style.display = "none";
    retakeBtn.style.display = "inline-block";
    uploadBtn.style.display = "inline-block";
  });

  retakeBtn?.addEventListener("click", resetModalUI);
  uploadBtn?.addEventListener("click", () => {
    if (!capturedImageInput.value) {
      alert("Please capture a photo first!");
      return;
    }
    cameraModal.style.display = "none";
    stopCamera();
  });

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  function resetModalUI() {
    video.style.display = "block";
    canvas.style.display = "none";
    captureBtn.style.display = "inline-block";
    retakeBtn.style.display = "none";
    uploadBtn.style.display = "none";
    capturedImageInput.value = "";
  }

  // ==== SUBMIT CHECK-IN ====
  checkinForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const imageData = capturedImageInput.value;
    if (!imageData) return alert("Please take a photo first!");

    const token = localStorage.getItem("token");
    const employeeId = localStorage.getItem("employeeId");

    if (!token || !employeeId) return alert("Missing token or employee ID.");

    try {
      const byteString = atob(imageData.split(",")[1]);
      const mimeString = imageData.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: mimeString });

      const formData = new FormData();
      formData.append("checkinImage", blob, "checkin.png");
      formData.append("employeeId", employeeId);

      const res = await fetch("https://www.mither3security.com/checkin", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to check-in");

      checkinResultDiv.innerHTML = `
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 4px;">
          <p style="margin: 0 0 10px 0;"><strong>✅ ${data.message}</strong></p>
          <p style="margin: 5px 0;"><strong>Employee:</strong> ${data.record.employeeName}</p>
          <p style="margin: 5px 0;"><strong>Check-in Time:</strong> ${new Date(data.record.checkinTime).toLocaleString()}</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #0c5460; background-color: #d1ecf1; padding: 8px; border-radius: 3px; border-left: 4px solid #0c5460;">
            ⚠️ <strong>Notice:</strong> You can only time-in once per day. Your next time-in will be available tomorrow.
          </p>
        </div>
      `;
      capturedImageInput.value = "";
      openCameraBtn.disabled = true;
      openCameraBtn.style.opacity = "0.5";
      openCameraBtn.style.cursor = "not-allowed";
    } catch (err) {
      console.error("❌ Check-in submission error:", err);
      alert(err.message);
    }
  });

  // ====== CHECK-OUT SCRIPT ======
  const checkoutForm = document.getElementById("checkoutForm");
  const checkoutResultDiv = document.getElementById("checkoutResult");

  checkoutForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const checkoutTime = checkoutTimeInput.value;
    const token = localStorage.getItem("token");
    const employeeId = localStorage.getItem("employeeId");
    if (!token || !employeeId) return alert("Missing token or employee ID.");

    try {
      const res = await fetch("https://www.mither3security.com/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ employeeId, checkoutTime }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to check-out");

      checkoutResultDiv.innerHTML = `
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 4px;">
          <p style="margin: 0 0 10px 0;"><strong>✅ ${data.message}</strong></p>
          <p style="margin: 5px 0;"><strong>Employee:</strong> ${data.record.employeeName}</p>
          <p style="margin: 5px 0;"><strong>Check-out Time:</strong> ${new Date(data.record.checkoutTime).toLocaleString()}</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #0c5460; background-color: #d1ecf1; padding: 8px; border-radius: 3px; border-left: 4px solid #0c5460;">
            ⚠️ <strong>Notice:</strong> Your duty has been recorded. You can time-out only once per day.
          </p>
        </div>
      `;
    } catch (err) {
      console.error("❌ Checkout submission error:", err);
      alert(err.message);
    }
  });

  // ==== CHECK IF ALREADY CHECKED IN TODAY ====
  async function checkTodayCheckin() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("https://www.mither3security.com/today-checkin", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.hasCheckedIn) {
          if (openCameraBtn) {
            openCameraBtn.disabled = true;
            openCameraBtn.style.opacity = "0.5";
            openCameraBtn.style.cursor = "not-allowed";
          }
          if (checkinResultDiv) {
            checkinResultDiv.innerHTML = `
              <div style="background-color: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 12px; border-radius: 4px;">
                <strong>ℹ️ Notice:</strong> You have already timed-in today. You can only time-in once per day.
              </div>
            `;
          }
        }
      }
    } catch (err) {
      console.error("Error checking today's check-in:", err);
    }
  }

  // Check on page load
  checkTodayCheckin();

  // ==== TICKET SUBMISSION UPDATE ====
  const ticketForm = document.getElementById('ticketForm');
  const subjectSelect = document.getElementById('subject');
  const concernInput = document.getElementById('concern');
  const leaveModal = document.getElementById('leaveModal');
  const closeLeaveModalBtn = document.getElementById('closeLeaveModal');
  const leaveForm = document.getElementById('leaveForm');

  subjectSelect?.addEventListener('change', async () => {
    if (subjectSelect.value === 'leave') {
      leaveModal.style.display = 'flex';

      const employeeId = localStorage.getItem("employeeId");
      const token = localStorage.getItem("token");
      if (!employeeId || !token) return alert("Missing token or employee ID.");

      try {
        const res = await fetch(`https://www.mither3security.com/employees/leave-requests/employee/${employeeId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "Failed to load employee info");

        document.getElementById('leaveName').value = data.name;
        document.getElementById('leaveContact').value = data.contactNumber;
        document.getElementById('leavePlace').value = data.branch;
      } catch (err) {
        console.error("❌ Failed to auto-fill leave form:", err);
        alert("Could not load your information. Please enter manually.");
      }
    }
  });

  closeLeaveModalBtn?.addEventListener('click', () => {
    leaveModal.style.display = 'none';
    subjectSelect.value = '';
  });

  ticketForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const employeeId = localStorage.getItem("employeeId");

    if (!token || !employeeId) return alert("Missing token or employee ID.");

    if (subjectSelect.value === 'concern') {
      const concern = concernInput.value.trim();
      if (!concern) return alert("Please describe your concern.");

      try {
        const res = await fetch('https://www.mither3security.com/tickets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ subject: 'Concern', concern }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to submit ticket");
        alert(`✅ ${data.message}`);
        ticketForm.reset();
        await loadMyTickets();
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    }
  });

  // ==== LEAVE REQUEST FORM SUBMISSION ====
  leaveForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const employeeId = localStorage.getItem("employeeId");

    const leaveData = {
      employeeId,
      name: document.getElementById('leaveName').value.trim(),
      placeOfDuty: document.getElementById('leavePlace').value.trim(),
      leaveType: document.getElementById('leaveType').value.trim(),
      dateOfEffectivity: document.getElementById('leaveDate').value,
      reason: document.getElementById('leaveReason').value.trim(),
      addressWhileOnLeave: document.getElementById('leaveAddress').value.trim(),
      contactNumber: document.getElementById('leaveContact').value.trim(),
    };

    try {
      const res = await fetch('https://www.mither3security.com/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(leaveData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit leave request");

      alert(`✅ ${data.message}`);
      leaveForm.reset();
      leaveModal.style.display = 'none';
      await loadMyTickets();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // ====== LOAD EMPLOYEE TICKETS ======
  async function loadMyTickets() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const tableBody = document.querySelector('#ticketsTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = "";

    try {
      const ticketsRes = await fetch('https://www.mither3security.com/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const tickets = await ticketsRes.json();

      const leaveRes = await fetch('https://www.mither3security.com/leave-requests', { 
        headers: { Authorization: `Bearer ${token}` }
      });
      const leaveRequests = await leaveRes.json();

      const allTickets = [...tickets, ...leaveRequests];

      if (allTickets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No tickets submitted yet.</td></tr>`;
        return;
      }

      allTickets.forEach(ticket => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${ticket.subject || 'Leave Request'}</td>
          <td>${ticket.status || ticket.approvalStatus || 'Pending'}</td>
          <td>${ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : ''}</td>
          <td><a href="#" class="view-record">View</a></td>
        `;
        tableBody.appendChild(row);
      });

    } catch (err) {
      console.error(err);
      alert("Failed to load tickets or leave requests.");
    }
  }

  // Load tickets on page load
  loadMyTickets();
});