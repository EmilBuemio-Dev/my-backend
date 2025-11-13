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

      const res = await fetch("http://localhost:5000/checkin", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to check-in");

      checkinResultDiv.innerHTML = `
        <p><strong>${data.message}</strong></p>
        <p><strong>Employee:</strong> ${data.record.employeeName}</p>
        <p>Check-in Time: ${new Date(data.record.checkinTime).toLocaleString()}</p>
      `;
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
      const res = await fetch("http://localhost:5000/checkout", {
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
        <p><strong>${data.message}</strong></p>
        <p><strong>Employee:</strong> ${data.record.employeeName}</p>
        <p>Check-out Time: ${new Date(data.record.checkoutTime).toLocaleString()}</p>
      `;
    } catch (err) {
      console.error("❌ Checkout submission error:", err);
      alert(err.message);
    }
  });

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
        const res = await fetch(`http://localhost:5000/employees/leave-requests/employee/${employeeId}`, {
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
        const res = await fetch('http://localhost:5000/tickets', {
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
      const res = await fetch('http://localhost:5000/leave-requests', {
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
      const ticketsRes = await fetch('http://localhost:5000/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const tickets = await ticketsRes.json();

      const leaveRes = await fetch('http://localhost:5000/leave-requests', { 
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