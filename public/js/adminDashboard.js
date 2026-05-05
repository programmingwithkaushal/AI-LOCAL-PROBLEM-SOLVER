// Admin Dashboard JavaScript
const API = '/api';

let adminData = null;

document.addEventListener('DOMContentLoaded', function() {
  // Check admin authentication
  const adminToken = localStorage.getItem('solvit_admin_token');
  const admin = localStorage.getItem('solvit_admin');
  
  if (!adminToken || !admin) {
    window.location.href = '/admin.html';
    return;
  }
  
  adminData = JSON.parse(admin);
  document.getElementById('adminName').textContent = adminData.name || 'Admin';
  
  // Load initial data
  loadOverviewData();
  loadUsers();
  loadProblems();
  loadComments();
  loadChatMessages();
});

// Section Navigation
function showAdminSection(section) {
  // Update nav buttons
  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Update sections
  document.querySelectorAll('.admin-section').forEach(sec => {
    sec.classList.remove('active');
  });
  document.getElementById(`admin-${section}`).classList.add('active');
  
  // Load data based on section
  switch(section) {
    case 'overview':
      loadOverviewData();
      break;
    case 'users':
      loadUsers();
      break;
    case 'problems':
      loadProblems();
      break;
    case 'comments':
      loadComments();
      break;
    case 'chat':
      loadChatMessages();
      break;
  }
}

// Load Overview Data
async function loadOverviewData() {
  try {
    const response = await fetch(`${API}/admin/overview`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load overview data');
    }
    
    const data = await response.json();
    
    document.getElementById('totalUsers').textContent = data.totalUsers || 0;
    document.getElementById('totalProblems').textContent = data.totalProblems || 0;
    document.getElementById('totalComments').textContent = data.totalComments || 0;
    document.getElementById('blockedUsers').textContent = data.blockedUsers || 0;
    
  } catch (error) {
    console.error('Error loading overview data:', error);
    showAlert('Error loading overview data', 'error');
  }
}

// Load Users
async function loadUsers() {
  try {
    const response = await fetch(`${API}/admin/users`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load users');
    }
    
    const users = await response.json();
    window.allUsers = users; // Store for filtering
    renderUsersTable(users);
    
  } catch (error) {
    console.error('Error loading users:', error);
    document.getElementById('usersTableBody').innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text2);">
          Error loading users
        </td>
      </tr>
    `;
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  
  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--text2);">
          No users found
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = users.map(user => `
    <tr onclick="showUserDetails('${user._id}')" style="cursor: pointer;">
      <td>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ${user.avatar ? `<img src="${user.avatar}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : (user.name ? user.name.charAt(0).toUpperCase() : 'U')}
          </div>
          <div>
            <div style="font-weight: 600;">${user.name || 'Unknown'}</div>
            <div style="color: var(--text2); font-size: 12px;">@${user.username || 'username'}</div>
          </div>
        </div>
      </td>
      <td style="font-family: monospace; font-size: 12px; color: var(--text2);">${user._id}</td>
      <td>${user.email || 'N/A'}</td>
      <td>
        <span class="user-status ${user.isBlocked ? 'blocked' : 'active'}">
          ${user.isBlocked ? 'Blocked' : 'Active'}
        </span>
      </td>
      <td>${user.problemsCount || 0}</td>
      <td>${user.commentsCount || 0}</td>
      <td onclick="event.stopPropagation()">
        ${user.isBlocked ? 
          `<button class="action-btn unblock" onclick="unblockUser('${user._id}')">✅ Unblock</button>` :
          `<button class="action-btn block" onclick="blockUser('${user._id}')">🚫 Block</button>`
        }
      </td>
    </tr>
  `).join('');
}

// Load Problems
async function loadProblems() {
  try {
    const response = await fetch(`${API}/admin/problems`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load problems');
    }
    
    const problems = await response.json();
    window.allProblems = problems; // Store for filtering
    renderProblemsTable(problems);
    
  } catch (error) {
    console.error('Error loading problems:', error);
    document.getElementById('problemsTableBody').innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text2);">
          Error loading problems
        </td>
      </tr>
    `;
  }
}

function renderProblemsTable(problems) {
  const tbody = document.getElementById('problemsTableBody');
  
  if (!problems || problems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text2);">
          No problems found
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = problems.map(problem => `
    <tr onclick="showProblemDetails('${problem._id}')" style="cursor: pointer;">
      <td style="font-family: monospace; font-size: 12px; color: var(--text2);">${problem.problemId || 'N/A'}</td>
      <td>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">${problem.title}</div>
          <div style="color: var(--text2); font-size: 12px;">ID: ${problem._id}</div>
        </div>
      </td>
      <td>${problem.category || 'N/A'}</td>
      <td>
        <span class="status-badge ${problem.status || 'open'}">${problem.status || 'Open'}</span>
      </td>
      <td>${problem.createdAt ? new Date(problem.createdAt).toLocaleDateString() : 'N/A'}</td>
      <td onclick="event.stopPropagation()">
        <button class="action-btn delete" onclick="deleteProblem('${problem._id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// Load Comments
async function loadComments() {
  try {
    const response = await fetch(`${API}/admin/comments`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load comments');
    }
    
    const comments = await response.json();
    window.allComments = comments; // Store for filtering
    renderCommentsTable(comments);
    
  } catch (error) {
    console.error('Error loading comments:', error);
    document.getElementById('commentsTableBody').innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text2);">
          Error loading comments
        </td>
      </tr>
    `;
  }
}

function renderCommentsTable(comments) {
  const tbody = document.getElementById('commentsTableBody');
  
  if (!comments || comments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text2);">
          No comments found
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = comments.map(comment => `
    <tr>
      <td>
        <div class="content-title">${comment.text}</div>
        <div class="content-meta">Comment ID: ${comment._id}</div>
      </td>
      <td>${comment.userName || 'Unknown'}</td>
      <td>
        <div class="content-title" onclick="viewProblem('${comment.problemId}')">
          ${comment.problemTitle || 'Unknown Problem'}
        </div>
      </td>
      <td>${new Date(comment.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="action-btn delete" onclick="deleteComment('${comment._id}')">🗑️ Delete</button>
      </td>
    </tr>
  `).join('');
}

// Load Chat Messages
async function loadChatMessages() {
  try {
    const response = await fetch(`${API}/admin/chat`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load chat messages');
    }
    
    const messages = await response.json();
    window.allChatMessages = messages; // Store for filtering
    renderChatTable(messages);
    
  } catch (error) {
    console.error('Error loading chat messages:', error);
    document.getElementById('chatTableBody').innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text2);">
          Error loading chat messages
        </td>
      </tr>
    `;
  }
}

function renderChatTable(messages) {
  const tbody = document.getElementById('chatTableBody');
  
  if (!messages || messages.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text2);">
          No chat messages found
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = messages.map(message => `
    <tr>
      <td>
        <div class="content-title">${message.text}</div>
        <div class="content-meta">Message ID: ${message._id}</div>
      </td>
      <td>${message.userName || 'Unknown'}</td>
      <td>${message.roomName || 'Unknown Room'}</td>
      <td>${new Date(message.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="action-btn delete" onclick="deleteChatMessage('${message._id}')">🗑️ Delete</button>
      </td>
    </tr>
  `).join('');
}

// Action Functions
async function blockUser(userId) {
  if (!confirm('Are you sure you want to block this user?')) return;
  
  try {
    const response = await fetch(`${API}/admin/users/${userId}/block`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to block user');
    }
    
    showAlert('User blocked successfully', 'success');
    loadUsers();
    loadOverviewData();
    
  } catch (error) {
    console.error('Error blocking user:', error);
    showAlert('Error blocking user', 'error');
  }
}

async function unblockUser(userId) {
  if (!confirm('Are you sure you want to unblock this user?')) return;
  
  try {
    const response = await fetch(`${API}/admin/users/${userId}/unblock`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to unblock user');
    }
    
    showAlert('User unblocked successfully', 'success');
    loadUsers();
    loadOverviewData();
    
  } catch (error) {
    console.error('Error unblocking user:', error);
    showAlert('Error unblocking user', 'error');
  }
}

async function deleteProblem(problemId) {
  if (!confirm('Are you sure you want to delete this problem? This action cannot be undone.')) return;
  
  try {
    const response = await fetch(`${API}/admin/problems/${problemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete problem');
    }
    
    showAlert('Problem deleted successfully', 'success');
    loadProblems();
    loadOverviewData();
    
  } catch (error) {
    console.error('Error deleting problem:', error);
    showAlert('Error deleting problem', 'error');
  }
}

async function deleteComment(commentId) {
  if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) return;
  
  try {
    const response = await fetch(`${API}/admin/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete comment');
    }
    
    showAlert('Comment deleted successfully', 'success');
    loadComments();
    loadOverviewData();
    
  } catch (error) {
    console.error('Error deleting comment:', error);
    showAlert('Error deleting comment', 'error');
  }
}

async function deleteChatMessage(messageId) {
  if (!confirm('Are you sure you want to delete this chat message? This action cannot be undone.')) return;
  
  try {
    const response = await fetch(`${API}/admin/chat/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete chat message');
    }
    
    showAlert('Chat message deleted successfully', 'success');
    loadChatMessages();
    loadOverviewData();
    
  } catch (error) {
    console.error('Error deleting chat message:', error);
    showAlert('Error deleting chat message', 'error');
  }
}

function viewProblem(problemId) {
  // Open problem in new tab
  window.open(`/userDashboard.html#problem-${problemId}`, '_blank');
}

async function showUserDetails(userId) {
  try {
    const response = await fetch(`${API}/admin/users/${userId}/admin-details`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load user details');
    }
    
    const userData = await response.json();
    renderUserDetailsModal(userData);
    
  } catch (error) {
    console.error('Error loading user details:', error);
    showAlert('Error loading user details', 'error');
  }
}

function renderUserDetailsModal(user) {
  const modalHtml = `
    <div style="max-width: 900px; margin: 0 auto; padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2>👤 User Details & Profile</h2>
        <button onclick="closeUserDetailsModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">✖</button>
      </div>
      
      <!-- User Info -->
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
          <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">
            ${user.avatar ? `<img src="${user.avatar}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : (user.name ? user.name.charAt(0).toUpperCase() : 'U')}
          </div>
          <div>
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 4px;">${user.name || 'Unknown'}</div>
            <div style="color: var(--text2); font-family: monospace;">@${user.username || 'username'}</div>
            <div style="color: var(--text2);">${user.email || 'N/A'}</div>
            <div style="color: var(--text2); font-size: 12px;">ID: ${user._id}</div>
            <div style="margin-top: 8px;">
              <span class="user-status ${user.isBlocked ? 'blocked' : 'active'}">
                ${user.isBlocked ? 'Blocked' : 'Active'}
              </span>
            </div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <div style="text-align: center; padding: 12px; background: var(--surf2); border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: var(--accent);">${user.statistics?.problemsCount || 0}</div>
            <div style="color: var(--text2); font-size: 12px;">Problems Posted</div>
          </div>
          <div style="text-align: center; padding: 12px; background: var(--surf2); border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: var(--accent);">${user.statistics?.commentsCount || 0}</div>
            <div style="color: var(--text2); font-size: 12px;">Comments Made</div>
          </div>
          <div style="text-align: center; padding: 12px; background: var(--surf2); border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: var(--accent);">${user.statistics?.votesCount || 0}</div>
            <div style="color: var(--text2); font-size: 12px;">Votes Cast</div>
          </div>
        </div>
      </div>
      
      <!-- User's Problems -->
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-bottom: 16px;">📋 User's Problems (${user.problems ? user.problems.length : 0})</h3>
        ${user.problems && user.problems.length > 0 ? `
          <div style="max-height: 300px; overflow-y: auto;">
            ${user.problems.map(problem => `
              <div style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div style="flex: 1; cursor: pointer;" onclick="showProblemDetails('${problem._id}')">
                    <div style="font-weight: 600; margin-bottom: 4px;">${problem.title}</div>
                    <div style="color: var(--text2); font-size: 12px; margin-bottom: 4px;">
                      ${problem.category} · ${problem.status} · ${new Date(problem.createdAt).toLocaleDateString()}
                    </div>
                    <div style="color: var(--text2); font-size: 12px;">
                      🗳️ ${problem.votes || 0} votes · 💬 ${problem.comments ? problem.comments.length : 0} comments
                    </div>
                  </div>
                  <button class="action-btn delete" onclick="deleteUserProblem('${problem._id}')" style="margin-left: 12px;">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<div style="color: var(--text2); text-align: center; padding: 20px;">No problems posted by this user</div>'}
      </div>
      
      <!-- User's Comments -->
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-bottom: 16px;">💬 User's Comments (${user.comments ? user.comments.length : 0})</h3>
        ${user.comments && user.comments.length > 0 ? `
          <div style="max-height: 300px; overflow-y: auto;">
            ${user.comments.map(comment => `
              <div style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div style="flex: 1;">
                    <div style="margin-bottom: 4px;">${comment.text}</div>
                    <div style="color: var(--text2); font-size: 12px;">
                      On: ${comment.problemTitle || 'Unknown Problem'} · ${new Date(comment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button class="action-btn delete" onclick="deleteUserComment('${comment._id}')" style="margin-left: 12px;">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<div style="color: var(--text2); text-align: center; padding: 20px;">No comments made by this user</div>'}
      </div>
      
      <!-- User's Votes -->
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-bottom: 16px;">🗳️ User's Votes (${user.votedProblems ? user.votedProblems.length : 0})</h3>
        ${user.votedProblems && user.votedProblems.length > 0 ? `
          <div style="max-height: 300px; overflow-y: auto;">
            ${user.votedProblems.map(vote => `
              <div style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 4px;">${vote.title}</div>
                    <div style="color: var(--text2); font-size: 12px;">
                      ${vote.category} · ${vote.status} · Voted on ${new Date(vote.votedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button class="action-btn delete" onclick="deleteUserVote('${user._id}', '${vote._id}')" style="margin-left: 12px;">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<div style="color: var(--text2); text-align: center; padding: 20px;">No votes cast by this user</div>'}
      </div>
      
      <!-- Profile Information -->
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-bottom: 16px;">📝 Profile Information</h3>
        <div style="display: grid; gap: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="display: block; margin-bottom: 4px; font-weight: 500; color: var(--text);">Name</label>
              <input type="text" id="adminUserName" value="${user.name || ''}" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--text);">
            </div>
            <div>
              <label style="display: block; margin-bottom: 4px; font-weight: 500; color: var(--text);">Age</label>
              <input type="number" id="adminUserAge" value="${user.profile?.age || ''}" min="13" max="120" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--text);">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="display: block; margin-bottom: 4px; font-weight: 500; color: var(--text);">Gender</label>
              <select id="adminUserGender" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--text);">
                <option value="prefer_not_to_say" ${user.profile?.gender === 'prefer_not_to_say' ? 'selected' : ''}>Prefer not to say</option>
                <option value="male" ${user.profile?.gender === 'male' ? 'selected' : ''}>Male</option>
                <option value="female" ${user.profile?.gender === 'female' ? 'selected' : ''}>Female</option>
                <option value="other" ${user.profile?.gender === 'other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div>
              <label style="display: block; margin-bottom: 4px; font-weight: 500; color: var(--text);">Location</label>
              <input type="text" id="adminUserLocation" value="${user.profile?.location || ''}" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--text);">
            </div>
          </div>
          <div>
            <label style="display: block; margin-bottom: 4px; font-weight: 500; color: var(--text);">Bio</label>
            <textarea id="adminUserBio" maxlength="500" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--text); min-height: 80px; resize: vertical;">${user.profile?.bio || ''}</textarea>
          </div>
          <div>
          <label style="display: block; margin-bottom: 4px; font-weight: 500; color: var(--text);">Phone</label>
          <input type="tel" id="adminUserPhone" value="${user.profile?.phone || ''}" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--text);">
        </div>
        </div>
        <div style="margin-top: 16px;">
          <button class="btn-sm" onclick="updateUserProfile('${user._id}')" style="padding: 8px 16px;">💾 Update Profile</button>
        </div>
      </div>

      <!-- Danger Zone -->
      <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: var(--r); padding: 20px;">
        <h3 style="color: #991b1b; margin-bottom: 16px;">⚠️ Danger Zone</h3>
        <div style="display: flex; gap: 12px;">
          <button class="action-btn delete" onclick="deleteAllUserContent('${user._id}')">
            🗑️ Delete All Content
          </button>
          <button class="action-btn delete" onclick="deleteUserAccount('${user._id}')" style="background: #dc2626; color: white;">
            🚫 Delete User Account
          </button>
        </div>
        <div style="color: #991b1b; font-size: 12px; margin-top: 8px;">
          ⚠️ These actions cannot be undone. Please be careful.
        </div>
      </div>
    </div>
  `;
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'userDetailsModal';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    overflow-y: auto;
  `;
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: var(--background);
    border-radius: var(--r);
    width: 90%;
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
  `;
  
  modalContent.innerHTML = modalHtml;
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // Close modal when clicking overlay
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeUserDetailsModal();
    }
  });
}

function closeUserDetailsModal() {
  const modal = document.getElementById('userDetailsModal');
  if (modal) {
    modal.remove();
  }
}

async function deleteUserProblem(problemId) {
  if (!confirm('Are you sure you want to delete this problem?')) return;
  
  try {
    const response = await fetch(`${API}/admin/problems/${problemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete problem');
    }
    
    showAlert('Problem deleted successfully', 'success');
    closeUserDetailsModal();
    loadUsers();
    loadOverviewData();
    
  } catch (error) {
    console.error('Error deleting problem:', error);
    showAlert('Error deleting problem', 'error');
  }
}

async function deleteUserComment(commentId) {
  if (!confirm('Are you sure you want to delete this comment?')) return;
  
  try {
    const response = await fetch(`${API}/admin/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete comment');
    }
    
    showAlert('Comment deleted successfully', 'success');
    closeUserDetailsModal();
    loadUsers();
    loadOverviewData();
    
  } catch (error) {
    console.error('Error deleting comment:', error);
    showAlert('Error deleting comment', 'error');
  }
}

async function deleteUserVote(userId, problemId) {
  if (!confirm('Are you sure you want to delete this vote?')) return;
  
  try {
    const response = await fetch(`${API}/admin/users/${userId}/votes/${problemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete vote');
    }
    
    showAlert('Vote deleted successfully', 'success');
    closeUserDetailsModal();
    loadUsers();
    loadOverviewData();
    
  } catch (error) {
    console.error('Error deleting vote:', error);
    showAlert('Error deleting vote', 'error');
  }
}

async function showProblemDetails(problemId) {
  try {
    const response = await fetch(`${API}/problems/${problemId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load problem details');
    }
    
    const problem = await response.json();
    renderProblemDetailsModal(problem);
    
  } catch (error) {
    console.error('Error loading problem details:', error);
    showAlert('Error loading problem details', 'error');
  }
}

function renderProblemDetailsModal(problem) {
  const modalHtml = `
    <div style="max-width: 800px; margin: 0 auto; padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2>📋 Problem Details</h2>
        <button onclick="closeProblemDetailsModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">✖</button>
      </div>
      
      <!-- Problem Image -->
      ${problem.image ? `
        <div style="margin-bottom: 20px;">
          <img src="${problem.image}" alt="Problem Image" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border);" />
        </div>
      ` : ''}
      
      <!-- Problem Info -->
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <span class="tag tag-cat">${getCategoryEmoji(problem.category)} ${problem.category || 'Unknown'}</span>
          <span class="tag tag-${problem.status ? problem.status.replace(' ', '-') : 'open'}">${problem.status || 'Open'}</span>
        </div>
        
        <h3 style="margin-bottom: 16px; font-size: 24px; font-weight: bold;">${problem.title}</h3>
        
        <div style="margin-bottom: 20px; line-height: 1.6;">
          ${problem.description || 'No description provided'}
        </div>
        
        <div style="display: flex; gap: 24px; margin-bottom: 16px;">
          <div>
            <div style="color: var(--text2); font-size: 12px;">Posted by</div>
            <div style="font-weight: 600;">${problem.userName || 'Unknown'}</div>
          </div>
          <div>
            <div style="color: var(--text2); font-size: 12px;">Created</div>
            <div>${new Date(problem.createdAt).toLocaleDateString()}</div>
          </div>
          <div>
            <div style="color: var(--text2); font-size: 12px;">Status</div>
            <div>${problem.status || 'Open'}</div>
          </div>
          <div>
            <div style="color: var(--text2); font-size: 12px;">Category</div>
            <div>${problem.category || 'Unknown'}</div>
          </div>
        </div>
        
        <div style="display: flex; gap: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🗳️</span>
            <span style="font-weight: 600;">${problem.votes || 0}</span>
            <span style="color: var(--text2);">votes</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">💬</span>
            <span style="font-weight: 600;">${problem.comments ? problem.comments.length : 0}</span>
            <span style="color: var(--text2);">comments</span>
          </div>
        </div>
      </div>
      
      <!-- Location Info -->
      ${problem.location ? `
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; margin-bottom: 20px;">
          <h4 style="margin-bottom: 12px;">📍 Location</h4>
          <div style="color: var(--text2);">
            ${problem.location.address || 'No address provided'}
            ${problem.location.pincode ? `· 📍 ${problem.location.pincode}` : ''}
          </div>
          ${problem.location.lat && problem.location.lng ? `
            <div style="margin-top: 8px; font-size: 12px; color: var(--text2);">
              Coordinates: ${problem.location.lat.toFixed(6)}, ${problem.location.lng.toFixed(6)}
            </div>
          ` : ''}
        </div>
      ` : ''}
      
      <!-- Status History -->
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; margin-bottom: 20px;">
        <h4 style="margin-bottom: 12px;">📊 Status History</h4>
        ${problem.statusHistory && problem.statusHistory.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${problem.statusHistory.map((history, index) => `
              <div style="display: flex; align-items: center; gap: 12px; padding: 8px; background: var(--surf2); border-radius: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="tag tag-${history.status.replace(' ', '-')}" style="font-size: 12px;">${history.status}</span>
                  ${index === 0 ? '<span style="font-size: 10px; color: var(--text2);">Initial</span>' : ''}
                </div>
                <div style="flex: 1; text-align: right; color: var(--text2); font-size: 12px;">
                  ${new Date(history.changedAt).toLocaleString()}
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<div style="color: var(--text2); text-align: center; padding: 12px;">No status history available</div>'}
      </div>
      
      <!-- Comments Section -->
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px;">
        <h4 style="margin-bottom: 16px;">💬 Comments (${problem.comments ? problem.comments.length : 0})</h4>
        ${problem.comments && problem.comments.length > 0 ? `
          <div style="max-height: 300px; overflow-y: auto;">
            ${problem.comments.map(comment => `
              <div style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                    ${comment.userName ? comment.userName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div style="font-weight: 600;">${comment.userName || 'Unknown'}</div>
                    <div style="color: var(--text2); font-size: 12px;">${new Date(comment.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div style="margin-bottom: 8px;">${comment.text}</div>
              </div>
            `).join('')}
          </div>
        ` : '<div style="color: var(--text2); text-align: center; padding: 20px;">No comments yet</div>'}
      </div>
      
      <!-- Admin Actions -->
      <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: var(--r); padding: 20px; margin-top: 20px;">
        <h4 style="color: #991b1b; margin-bottom: 16px;">⚠️ Admin Actions</h4>
        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
          <label style="color: #991b1b;">Update Status:</label>
          <select id="problemStatusSelect" style="padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text);">
            <option value="Open" ${problem.status === 'Open' ? 'selected' : ''}>Open</option>
            <option value="In Progress" ${problem.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Resolved" ${problem.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
          </select>
          <button class="btn-sm" onclick="updateProblemStatus('${problem._id}')" style="padding: 8px 16px;">
            🔄 Update Status
          </button>
        </div>
        <div style="display: flex; gap: 12px;">
          <button class="action-btn delete" onclick="deleteProblemFromModal('${problem._id}')">
            🗑️ Delete Problem
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'problemDetailsModal';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
    overflow-y: auto;
  `;
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: var(--background);
    border-radius: var(--r);
    width: 90%;
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
  `;
  
  modalContent.innerHTML = modalHtml;
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // Close modal when clicking overlay
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeProblemDetailsModal();
    }
  });
}

function closeProblemDetailsModal() {
  const modal = document.getElementById('problemDetailsModal');
  if (modal) {
    modal.remove();
  }
}

function getCategoryEmoji(category) {
  const emojis = {
    road: "🛣️",
    water: "💧", 
    electricity: "⚡",
    garbage: "🗑️",
    health: "🏥",
    pollution: "🌫️",
    education: "📚",
    flood: "🌊"
  };
  return emojis[category] || "🔎";
}

async function deleteProblemFromModal(problemId) {
  if (!confirm('Are you sure you want to delete this problem?')) return;
  
  try {
    const response = await fetch(`${API}/admin/problems/${problemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete problem');
    }
    
    showAlert('Problem deleted successfully', 'success');
    closeProblemDetailsModal();
    closeUserDetailsModal();
    loadUsers();
    loadOverviewData();
    
  } catch (error) {
    console.error('Error deleting problem:', error);
    showAlert('Error deleting problem', 'error');
  }
}

async function updateProblemStatus(problemId) {
  const statusSelect = document.getElementById('problemStatusSelect');
  const newStatus = statusSelect.value;
  
  try {
    const response = await fetch(`${API}/admin/problems/${problemId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update problem status');
    }
    
    const updatedProblem = await response.json();
    
    // Update the modal with new status
    const statusElement = document.querySelector('.tag-' + newStatus.replace(' ', '-'));
    if (statusElement) {
      statusElement.textContent = newStatus;
    }
    
    showAlert('Problem status updated successfully', 'success');
    
    // Refresh the tables to show updated status
    loadProblems();
    
  } catch (error) {
    console.error('Error updating problem status:', error);
    showAlert('Error updating problem status', 'error');
  }
}

async function deleteAllUserContent(userId) {
  if (!confirm('Are you sure you want to delete ALL content (problems, comments, votes) for this user? This action cannot be undone.')) return;
  
  try {
    const response = await fetch(`${API}/admin/users/${userId}/content`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete user content');
    }
    
    showAlert('All user content deleted successfully', 'success');
    closeUserDetailsModal();
    loadUsers();
    loadOverviewData();
    
  } catch (error) {
    console.error('Error deleting user content:', error);
    showAlert('Error deleting user content', 'error');
  }
}

async function deleteUserAccount(userId) {
  if (!confirm('Are you sure you want to delete this user account and ALL their content? This action cannot be undone.')) return;
  
  try {
    const response = await fetch(`${API}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete user account');
    }
    
    showAlert('User account deleted successfully', 'success');
    closeUserDetailsModal();
    loadUsers();
    loadOverviewData();
    
  } catch (error) {
    console.error('Error deleting user account:', error);
    showAlert('Error deleting user account', 'error');
  }
}

async function updateUserProfile(userId) {
  try {
    const profileData = {
      name: document.getElementById('adminUserName').value.trim(),
      profile: {
        age: parseInt(document.getElementById('adminUserAge').value) || null,
        gender: document.getElementById('adminUserGender').value,
        bio: document.getElementById('adminUserBio').value.trim(),
        location: document.getElementById('adminUserLocation').value.trim(),
        phone: document.getElementById('adminUserPhone').value.trim()
      }
    };
    
    const response = await fetch(`${API}/admin/users/${userId}/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user profile');
    }
    
    const data = await response.json();
    
    showAlert('User profile updated successfully', 'success');
    closeUserDetailsModal();
    loadUsers();
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    showAlert(error.message || 'Error updating user profile', 'error');
  }
}

function adminLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('solvit_admin_token');
    localStorage.removeItem('solvit_admin');
    window.location.href = '/admin.html';
  }
}

// Filter Functions
function filterUsers() {
  const searchTerm = document.getElementById('usersSearchInput').value.toLowerCase();
  const filteredUsers = window.allUsers.filter(user => {
    return (user.name && user.name.toLowerCase().includes(searchTerm)) ||
           (user.email && user.email.toLowerCase().includes(searchTerm)) ||
           (user.username && user.username.toLowerCase().includes(searchTerm)) ||
           (user._id && user._id.toString().toLowerCase().includes(searchTerm));
  });
  renderUsersTable(filteredUsers);
}

function filterProblems() {
  const searchTerm = document.getElementById('problemsSearchInput').value.toLowerCase();
  const filteredProblems = window.allProblems.filter(problem => {
    return (problem.title && problem.title.toLowerCase().includes(searchTerm)) ||
           (problem.category && problem.category.toLowerCase().includes(searchTerm)) ||
           (problem.status && problem.status.toLowerCase().includes(searchTerm)) ||
           (problem.userName && problem.userName.toLowerCase().includes(searchTerm)) ||
           (problem.problemId && problem.problemId.toLowerCase().includes(searchTerm));
  });
  renderProblemsTable(filteredProblems);
}

async function searchByProblemId() {
  const problemId = document.getElementById('problemIdSearchInput').value.trim();
  
  if (!problemId) {
    renderProblemsTable(window.allProblems);
    return;
  }
  
  try {
    const response = await fetch(`${API}/admin/problems/search/${encodeURIComponent(problemId)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('solvit_admin_token')}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        showAlert('Problem not found', 'error');
        renderProblemsTable([]);
      } else {
        throw new Error('Failed to search problem');
      }
      return;
    }
    
    const problem = await response.json();
    renderProblemsTable([problem]);
    showAlert('Problem found successfully', 'success');
    
  } catch (error) {
    console.error('Error searching problem by ID:', error);
    showAlert('Error searching problem', 'error');
  }
}

function filterComments() {
  const searchTerm = document.getElementById('commentsSearchInput').value.toLowerCase();
  const filteredComments = window.allComments.filter(comment => {
    return (comment.text && comment.text.toLowerCase().includes(searchTerm)) ||
           (comment.userName && comment.userName.toLowerCase().includes(searchTerm)) ||
           (comment.problemTitle && comment.problemTitle.toLowerCase().includes(searchTerm));
  });
  renderCommentsTable(filteredComments);
}

function filterChat() {
  const searchTerm = document.getElementById('chatSearchInput').value.toLowerCase();
  const filteredMessages = window.allChatMessages.filter(message => {
    return (message.text && message.text.toLowerCase().includes(searchTerm)) ||
           (message.userName && message.userName.toLowerCase().includes(searchTerm)) ||
           (message.roomName && message.roomName.toLowerCase().includes(searchTerm));
  });
  renderChatTable(filteredMessages);
}

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
  } else {
    alertDiv.style.background = '#fee2e2';
    alertDiv.style.color = '#991b1b';
    alertDiv.style.border = '1px solid #fca5a5';
  }
  
  // Auto hide after 3 seconds
  setTimeout(() => {
    alertDiv.style.display = 'none';
  }, 3000);
}
