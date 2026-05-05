// Profile JavaScript
const API = "/api";

// Get auth data
const TOKEN = localStorage.getItem("solvit_token");
const ME = JSON.parse(localStorage.getItem("solvit_user") || "null");

if (!TOKEN || !ME) {
  window.location.href = "/login.html";
  throw new Error("Not authenticated");
}

// Profile data
let profileData = null;
let originalData = null;

// Load profile data
async function loadProfile() {
  try {
    const response = await fetch(`${API}/auth/me`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        alert("Your account has been blocked. Please contact support.");
        logout();
        return;
      }
      throw new Error("Failed to load profile");
    }
    
    const data = await response.json();
    profileData = data.user;
    originalData = JSON.parse(JSON.stringify(data.user)); // Deep copy
    
    updateProfileDisplay();
    loadUserStats();
    
  } catch (error) {
    console.error('Error loading profile:', error);
    showAlert('Error loading profile', 'error');
  }
}

// Update profile display
function updateProfileDisplay() {
  if (!profileData) return;
  
  // Header info
  document.getElementById('profileName').textContent = profileData.name || 'Unknown';
  document.getElementById('profileUsername').textContent = '@' + (profileData.username || 'username');
  document.getElementById('profileEmail').textContent = profileData.email || 'email@example.com';
  
  // Avatar
  const avatarText = profileData.avatar || profileData.name ? profileData.name.charAt(0).toUpperCase() : '?';
  document.getElementById('avatarText').textContent = avatarText;
  
  // Basic info
  document.getElementById('name').value = profileData.name || '';
  document.getElementById('age').value = profileData.profile?.age || '';
  document.getElementById('gender').value = profileData.profile?.gender || 'prefer_not_to_say';
  document.getElementById('bio').value = profileData.profile?.bio || '';
  
  // Contact info
  document.getElementById('location').value = profileData.profile?.location || '';
  document.getElementById('phone').value = profileData.profile?.phone || '';
  
  // Social media
  document.getElementById('twitter').value = profileData.profile?.socialMedia?.twitter || '';
  document.getElementById('linkedin').value = profileData.profile?.socialMedia?.linkedin || '';
  document.getElementById('facebook').value = profileData.profile?.socialMedia?.facebook || '';
  document.getElementById('instagram').value = profileData.profile?.socialMedia?.instagram || '';
}

// Load user statistics
async function loadUserStats() {
  try {
    const response = await fetch(`${API}/problems`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });
    
    if (response.ok) {
      const problems = await response.json();
      
      // Calculate stats
      const userProblems = problems.filter(p => p.userId === ME.id);
      const problemsCount = userProblems.length;
      
      let commentsCount = 0;
      userProblems.forEach(problem => {
        if (problem.comments) {
          commentsCount += problem.comments.length;
        }
      });
      
      const votesCount = problems.filter(p => p.votedBy && p.votedBy.includes(ME.id)).length;
      
      // Update display
      document.getElementById('problemsCount').textContent = problemsCount;
      document.getElementById('commentsCount').textContent = commentsCount;
      document.getElementById('votesCount').textContent = votesCount;
    }
  } catch (error) {
    console.error('Error loading user stats:', error);
  }
}

// Save profile
async function saveProfile() {
  try {
    const formData = {
      name: document.getElementById('name').value.trim(),
      profile: {
        age: parseInt(document.getElementById('age').value) || null,
        gender: document.getElementById('gender').value,
        bio: document.getElementById('bio').value.trim(),
        location: document.getElementById('location').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        socialMedia: {
          twitter: document.getElementById('twitter').value.trim(),
          linkedin: document.getElementById('linkedin').value.trim(),
          facebook: document.getElementById('facebook').value.trim(),
          instagram: document.getElementById('instagram').value.trim()
        }
      }
    };
    
    const response = await fetch(`${API}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update profile');
    }
    
    const data = await response.json();
    profileData = data.user;
    
    // Update localStorage
    localStorage.setItem('solvit_user', JSON.stringify({
      id: profileData._id,
      name: profileData.name,
      email: profileData.email,
      username: profileData.username,
      avatar: profileData.avatar
    }));
    
    showAlert('Profile updated successfully!', 'success');
    originalData = JSON.parse(JSON.stringify(profileData)); // Update original data
    
  } catch (error) {
    console.error('Error saving profile:', error);
    showAlert(error.message || 'Error saving profile', 'error');
  }
}

// Reset forms
function resetForms() {
  if (originalData) {
    profileData = JSON.parse(JSON.stringify(originalData));
    updateProfileDisplay();
    showAlert('Changes reset', 'info');
  }
}

// Handle avatar upload
function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    showAlert('File size must be less than 5MB', 'error');
    return;
  }
  
  if (!file.type.startsWith('image/')) {
    showAlert('Please select an image file', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const avatarData = e.target.result;
    updateAvatar(avatarData);
  };
  reader.readAsDataURL(file);
}

// Update avatar
async function updateAvatar(avatarData) {
  try {
    const response = await fetch(`${API}/auth/avatar`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ avatar: avatarData })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update avatar');
    }
    
    const data = await response.json();
    profileData.avatar = data.user.avatar;
    
    // Update display
    document.getElementById('avatarText').textContent = data.user.avatar ? 
      `<img src="${data.user.avatar}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : 
      data.user.name.charAt(0).toUpperCase();
    
    // Update localStorage
    localStorage.setItem('solvit_user', JSON.stringify({
      id: profileData._id,
      name: profileData.name,
      email: profileData.email,
      username: profileData.username,
      avatar: profileData.avatar
    }));
    
    showAlert('Avatar updated successfully!', 'success');
    
  } catch (error) {
    console.error('Error updating avatar:', error);
    showAlert('Error updating avatar', 'error');
  }
}

// Show alert
function showAlert(message, type) {
  const alertDiv = document.getElementById('alert');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  alertDiv.style.display = 'block';
  alertDiv.style.position = 'fixed';
  alertDiv.style.top = '20px';
  alertDiv.style.right = '20px';
  alertDiv.style.zIndex = '1000';
  alertDiv.style.padding = '12px 16px';
  alertDiv.style.borderRadius = '8px';
  alertDiv.style.maxWidth = '300px';
  
  if (type === 'success') {
    alertDiv.style.background = '#d1fae5';
    alertDiv.style.color = '#065f46';
    alertDiv.style.border = '1px solid #a7f3d0';
  } else if (type === 'error') {
    alertDiv.style.background = '#fee2e2';
    alertDiv.style.color = '#991b1b';
    alertDiv.style.border = '1px solid #fca5a5';
  } else {
    alertDiv.style.background = '#dbeafe';
    alertDiv.style.color = '#1e40af';
    alertDiv.style.border = '1px solid #93c5fd';
  }
  
  // Auto hide after 3 seconds
  setTimeout(() => {
    alertDiv.style.display = 'none';
  }, 3000);
}

// Logout function
function logout() {
  localStorage.removeItem("solvit_token");
  localStorage.removeItem("solvit_user");
  window.location.href = "/login.html";
}

// Load profile on page load
document.addEventListener('DOMContentLoaded', loadProfile);
