// Admin Login JavaScript
document.addEventListener('DOMContentLoaded', function() {
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  
  adminLoginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    
    if (!email || !password) {
      showAlert('Please fill in all fields', 'error');
      return;
    }
    
    // Show loading state
    adminLoginBtn.disabled = true;
    adminLoginBtn.textContent = '🔄 Logging in...';
    hideAlert();
    
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        adminLoginBtn.disabled = false;
        adminLoginBtn.textContent = '🔐 Login to Admin Panel';
        return showAlert(data.error || 'Login failed', 'error');
      }
      
      // Store admin token
      localStorage.setItem('solvit_admin_token', data.token);
      localStorage.setItem('solvit_admin', JSON.stringify(data.admin));
      
      showAlert('Login successful! Redirecting...', 'success');
      
      // Redirect to admin dashboard
      setTimeout(() => {
        window.location.href = '/adminDashboard.html';
      }, 1000);
      
    } catch (error) {
      console.error('Admin login error:', error);
      adminLoginBtn.disabled = false;
      adminLoginBtn.textContent = '🔐 Login to Admin Panel';
      showAlert('Cannot connect to server. Is it running?', 'error');
    }
  });
  
  // Check if already logged in
  if (localStorage.getItem('solvit_admin_token')) {
    window.location.href = '/adminDashboard.html';
  }
});

function showAlert(message, type) {
  const alertDiv = document.getElementById('alert');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  alertDiv.style.display = 'block';
  
  if (type === 'success') {
    alertDiv.style.background = '#d1fae5';
    alertDiv.style.color = '#065f46';
    alertDiv.style.border = '1px solid #a7f3d0';
  } else {
    alertDiv.style.background = '#fee2e2';
    alertDiv.style.color = '#991b1b';
    alertDiv.style.border = '1px solid #fca5a5';
  }
  
  alertDiv.style.padding = '12px 16px';
  alertDiv.style.borderRadius = '8px';
  alertDiv.style.marginBottom = '16px';
}

function hideAlert() {
  const alertDiv = document.getElementById('alert');
  alertDiv.style.display = 'none';
}
