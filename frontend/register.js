const registerForm = document.getElementById('registerForm');
const errorMsg = document.getElementById('errorMsg');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    errorMsg.textContent = 'Passwords do not match';
    return;
  }

  try {
    const res = await fetch('http://localhost:5000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    alert('Registration successful!');
    window.location.href = 'loginpage.html'; // redirect to login
  } catch (err) {
    errorMsg.textContent = err.message;
  }
});
