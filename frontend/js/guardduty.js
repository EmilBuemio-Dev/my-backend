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

  // ====== NOTIFICATION SYSTEM ======
  const notificationBell = document.getElementById("notificationBell");
  const notificationDot = document.getElementById("notificationDot");
  const remarksModal = document.getElementById("remarksModal");
  const closeRemarksBtn = document.getElementById("closeRemarksBtn");
  const remarksContainer = document.getElementById("remarksContainer");
  const token = localStorage.getItem("token");
  const employeeId = localStorage.getItem("employeeId");
  const badgeNo = localStorage.getItem("badgeNo");

  // ===== LOAD REMARKS =====
  async function loadRemarks() {
    if (!token || !employeeId) return;

    try {
      const res = await fetch(`https://www.mither3security.com/remarks/employee/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to load remarks");
      const data = await res.json();
      const remarks = data.remarks || [];

      if (remarks.length > 0) {
        notificationDot.style.display = "block";
      }

      window.employeeRemarks = remarks;
    } catch (err) {
      console.error("Error loading remarks:", err);
    }
  }

  // ===== DISPLAY REMARKS IN MODAL =====
  function displayRemarks() {
    const remarks = window.employeeRemarks || [];
    remarksContainer.innerHTML = "";

    if (remarks.length === 0) {
      remarksContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #7d8da1;">
          <p style="font-size: 1rem;">No remarks filed against you.</p>
        </div>
      `;
      return;
    }

    remarks.forEach((remark, index) => {
      const remarkCard = document.createElement("div");
      remarkCard.className = "remark-card";
      remarkCard.innerHTML = `
        <div class="remark-header">
          <span class="penalty-badge ${remark.penaltyLevel.toLowerCase().replace(" ", "-")}">${remark.penaltyLevel}</span>
          <span class="remark-date">${new Date(remark.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="remark-body">
          <p><strong>Due Process:</strong> ${remark.dueProcess}</p>
          <p><strong>Status:</strong> <span class="status-badge ${remark.status.toLowerCase()}">${remark.status}</span></p>
          <p><strong>HR Comment:</strong></p>
          <div class="comment-box">${remark.hrComment}</div>
          ${remark.ticketId ? `<button class="view-ticket-btn" onclick="viewTicketFromRemark('${remark.ticketId}')">📎 View Attached Ticket</button>` : ''}
        </div>
      `;
      remarksContainer.appendChild(remarkCard);
    });
  }

  // ===== NOTIFICATION BELL CLICK =====
  notificationBell?.addEventListener("click", () => {
    displayRemarks();
    remarksModal.classList.add("show");
  });

  // ===== CLOSE REMARKS MODAL =====
  closeRemarksBtn?.addEventListener("click", () => {
    remarksModal.classList.remove("show");
  });

  remarksModal?.addEventListener("click", (e) => {
    if (e.target === remarksModal) {
      remarksModal.classList.remove("show");
    }
  });

  // ===== VIEW FULL TICKET FROM REMARK =====
  window.viewTicketFromRemark = async function(ticketId) {
    try {
      const res = await fetch(`https://www.mither3security.com/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to load ticket");
      const ticket = await res.json();

      showTicketModal(ticket);
    } catch (err) {
      console.error("Error loading ticket:", err);
      alert("Failed to load ticket details");
    }
  };

  // ===== SHOW TICKET MODAL (WITH ATTACHMENT) =====
  function showTicketModal(ticket) {
    const ticketModal = document.getElementById("ticketDetailsModal");
    if (!ticketModal) return;

    document.getElementById("ticketModalName").innerText = ticket.creatorName || "Unknown";
    document.getElementById("ticketModalSubject").innerText = ticket.subject || "No subject";
    document.getElementById("ticketModalSource").innerText = ticket.creatorRole === "client" ? "Client" : "Employee";
    
    let displayStatus = ticket.status === "Completed" ? "Completed" : (ticket.creatorRole === "client" ? "Urgent" : ticket.status || "Pending");
    document.getElementById("ticketModalStatus").innerText = displayStatus;
    document.getElementById("ticketModalStatus").className = "status-badge " + displayStatus.toLowerCase();

    document.getElementById("ticketModalDate").innerText = ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "Unknown";
    document.getElementById("ticketModalConcern").innerText = ticket.concern || "No concern";

    const ticketAttachmentDiv = document.getElementById("ticketAttachmentDisplay");
    if (ticket.attachment) {
      const imageUrl = `https://www.mither3security.com${ticket.attachment}`;
      ticketAttachmentDiv.innerHTML = `
        <p style="margin-top: 1rem; margin-bottom: 0.5rem;"><strong>📎 Attached Image:</strong></p>
        <a href="${imageUrl}" target="_blank" style="display: inline-block; cursor: pointer;">
          <img src="${imageUrl}" 
               alt="ticket attachment" 
               style="max-width: 100%; max-height: 250px; border-radius: 8px; object-fit: contain; border: 2px solid #007bff; transition: transform 0.2s ease; cursor: pointer;"
               onmouseover="this.style.transform='scale(1.05)'"
               onmouseout="this.style.transform='scale(1)'"
          >
        </a>
        <p style="font-size: 0.85rem; color: #666; margin-top: 0.5rem;">Click image to view full size</p>
      `;
      ticketAttachmentDiv.style.display = "block";
    } else {
      ticketAttachmentDiv.style.display = "none";
    }

    ticketModal.classList.add("show");
  }

  // ===== CLOSE TICKET MODAL =====
  const closeTicketModalBtn = document.getElementById("closeTicketDetailsBtn");
  const ticketDetailsModal = document.getElementById("ticketDetailsModal");

  closeTicketModalBtn?.addEventListener("click", () => {
    ticketDetailsModal?.classList.remove("show");
  });

  ticketDetailsModal?.addEventListener("click", (e) => {
    if (e.target === ticketDetailsModal) {
      ticketDetailsModal.classList.remove("show");
    }
  });

  // Load remarks on page load and refresh every 30 seconds
  loadRemarks();
  setInterval(loadRemarks, 30000);

  // ====== CHECK-IN SCRIPT WITH FACE RECOGNITION ======
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

  // ===== IMAGE COMPRESSION FUNCTION =====
  function compressImage(imageData, maxWidth = 320, maxHeight = 240, quality = 0.6) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Compress and return
        const compressedData = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedData);
      };
      img.src = imageData;
    });
  }

  // ===== STATUS INDICATOR FOR FACE DETECTION =====
  let faceDetectionStatus = document.createElement("div");
  faceDetectionStatus.id = "faceDetectionStatus";
  faceDetectionStatus.style.cssText = `
    margin-top: 1rem;
    padding: 0.8rem;
    border-radius: 8px;
    text-align: center;
    font-weight: 600;
    display: none;
  `;

  // ==== OPEN CAMERA ====
  openCameraBtn?.addEventListener("click", async () => {
    cameraModal.style.display = "block";
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      console.log("✅ Camera opened");
    } catch (err) {
      alert("Camera access denied: " + err.message);
      cameraModal.style.display = "none";
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
    
    console.log("📸 Photo captured");
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

  // ==== SUBMIT CHECK-IN WITH FACE VERIFICATION ====
  checkinForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    let imageData = capturedImageInput.value;
    if (!imageData) return alert("Please take a photo first!");

    const token = localStorage.getItem("token");
    const employeeId = localStorage.getItem("employeeId");
    const badgeNo = localStorage.getItem("badgeNo");

    if (!token || !employeeId || !badgeNo) {
      return alert("Missing token, employee ID, or badge number.");
    }

    console.log("🔐 Starting face verification for check-in...");
    console.log("📷 Original image size:", (imageData.length / 1024).toFixed(2), "KB");

    try {
      // ===== SHOW PROCESSING STATE =====
      checkinResultDiv.style.display = "block";
      checkinResultDiv.innerHTML = `
        <div style="background-color: #e3f2fd; border: 1px solid #90caf9; color: #1565c0; padding: 15px; border-radius: 4px;">
          <p style="margin: 0;">⏳ Compressing image and processing face verification... Please wait.</p>
        </div>
      `;

      // ===== COMPRESS IMAGE BEFORE SENDING =====
      imageData = await compressImage(imageData, 320, 240, 0.5);
      console.log("📦 Compressed image size:", (imageData.length / 1024).toFixed(2), "KB");

      // ===== SUBMIT WITH FACE VERIFICATION =====
      const res = await fetch("https://www.mither3security.com/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId,
          badgeNo,
          imageBase64: imageData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("❌ Check-in failed:", data);

        // ===== HANDLE FACE VERIFICATION FAILURE =====
        if (data.requireRetake) {
          checkinResultDiv.innerHTML = `
            <div style="background-color: #ffebee; border: 1px solid #ef5350; color: #c62828; padding: 15px; border-radius: 4px;">
              <p style="margin: 0 0 10px 0;"><strong>❌ Face Verification Failed</strong></p>
              <p style="margin: 5px 0;">Reason: ${data.message || data.detail || "Face does not match enrolled face."}</p>
              ${data.distance ? `<p style="margin: 5px 0; font-size: 0.9rem;">Distance: ${data.distance.toFixed(2)}</p>` : ''}
              ${data.confidence ? `<p style="margin: 5px 0; font-size: 0.9rem;">Confidence: ${(data.confidence * 100).toFixed(1)}%</p>` : ''}
              <p style="margin: 10px 0 0 0; font-size: 0.9rem; font-weight: 600;">Please retake your photo and ensure:</p>
              <ul style="margin: 5px 0 0 0; font-size: 0.9rem;">
                <li>Your face is clearly visible</li>
                <li>Good lighting in the area</li>
                <li>Face is centered in camera</li>
                <li>Similar to enrolled face photo</li>
              </ul>
            </div>
          `;
        } else if (data.code === "NO_FACE_ENROLLED") {
          checkinResultDiv.innerHTML = `
            <div style="background-color: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 15px; border-radius: 4px;">
              <p style="margin: 0;"><strong>⚠️ ${data.message}</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 0.9rem;">Please contact HR to enroll your face.</p>
            </div>
          `;
        } else {
          checkinResultDiv.innerHTML = `
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 4px;">
              <p style="margin: 0;"><strong>❌ Error:</strong> ${data.message || "Check-in failed"}</p>
            </div>
          `;
        }

        capturedImageInput.value = "";
        return;
      }

      // ===== SUCCESS =====
      console.log("✅ Check-in successful with face verification!");
      checkinResultDiv.innerHTML = `
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 4px;">
          <p style="margin: 0 0 10px 0;"><strong>✅ ${data.message}</strong></p>
          <p style="margin: 5px 0;"><strong>Employee:</strong> ${data.record.employeeName}</p>
          <p style="margin: 5px 0;"><strong>Check-in Time:</strong> ${new Date(data.record.checkinTime).toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> ${data.record.status}</p>
          ${data.faceVerification ? `
            <p style="margin: 5px 0; font-size: 0.9rem; color: #0c5460;">
              ✓ Face Verified | Confidence: ${(data.faceVerification.confidence * 100).toFixed(1)}%
            </p>
          ` : ''}
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
      checkinResultDiv.innerHTML = `
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 4px;">
          <p style="margin: 0;"><strong>❌ Error:</strong> ${err.message}</p>
        </div>
      `;
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
      checkoutResultDiv.style.display = "block";
    } catch (err) {
      console.error("❌ Checkout submission error:", err);
      checkoutResultDiv.innerHTML = `
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 4px;">
          <p style="margin: 0;"><strong>❌ Error:</strong> ${err.message}</p>
        </div>
      `;
      checkoutResultDiv.style.display = "block";
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
            checkinResultDiv.style.display = "block";
          }
        }
      }
    } catch (err) {
      console.error("Error checking today's check-in:", err);
    }
  }

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
  loadMyTickets();
});