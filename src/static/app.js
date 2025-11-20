document.addEventListener('DOMContentLoaded', () => {
  const activitiesList = document.getElementById('activities-list');
  const activitySelect = document.getElementById('activity');
  const signupForm = document.getElementById('signup-form');
  const messageDiv = document.getElementById('message');

  function showMessage(text, type = 'info') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');
    if (type !== 'info') setTimeout(() => messageDiv.classList.add('hidden'), 4000);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderActivities(data) {
    activitiesList.innerHTML = '';
    // Clear select except placeholder
    activitySelect.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

    Object.keys(data).forEach(name => {
      const act = data[name];
      const card = document.createElement('div');
      card.className = 'activity-card';
      card.dataset.activityName = name;

      const participantsHtml = (act.participants && act.participants.length)
        ? act.participants.map(p => `<li class="participant-item" data-email="${escapeHtml(p)}">${escapeHtml(p)}<button class="remove-btn" title="Unregister" data-email="${escapeHtml(p)}">&times;</button></li>`).join('')
        : '<li class="no-participants">No participants yet</li>';

      card.innerHTML = `
        <h4>${escapeHtml(name)}</h4>
        <p>${escapeHtml(act.description)}</p>
        <p><strong>Schedule:</strong> ${escapeHtml(act.schedule)}</p>
        <p><strong>Max participants:</strong> ${act.max_participants}</p>

        <div class="participants">
          <h5>Participants <span class="participant-count">(${act.participants.length})</span></h5>
          <ul class="participants-list">
            ${participantsHtml}
          </ul>
        </div>
      `;

      activitiesList.appendChild(card);

      // Add option to select with counts
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${name} (${act.participants.length}/${act.max_participants})`;
      activitySelect.appendChild(opt);
    });
  }

  // Delegate click for remove/unregister buttons
  activitiesList.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-btn');
    if (!btn) return;

    const li = btn.closest('.participant-item');
    if (!li) return;

    const email = btn.dataset.email;
    // find activity card ancestor
    const card = li.closest('.activity-card');
    if (!card) return;

    const activity = card.dataset.activityName;
    if (!activity || !email) return;

    // Optimistic UI: disable button while request in progress
    btn.disabled = true;
    btn.textContent = '…';

    fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
      method: 'DELETE'
    })
      .then(async res => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || body.message || 'Failed to unregister');
        return body;
      })
      .then(json => {
        showMessage(json.message || 'Unregistered successfully', 'success');
        // re-fetch activities to keep UI consistent with server
        loadActivities();
      })
      .catch(err => {
        showMessage(err.message || 'Error unregistering', 'error');
        btn.disabled = false;
        btn.textContent = '×';
      });
  });

  // Helper to load activities and render
  function loadActivities() {
    return fetch('/activities')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load activities');
        return res.json();
      })
      .then(data => renderActivities(data))
      .catch(err => {
        activitiesList.innerHTML = '<p class="error">Unable to load activities.</p>';
        console.error(err);
      });
  }

  // Initial load
  loadActivities();

  // Handle signup
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const activity = activitySelect.value;
    if (!email || !activity) {
      showMessage('Please provide both an email and select an activity.', 'error');
      return;
    }

    showMessage('Signing up...', 'info');

    fetch(`/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`, {
      method: 'POST'
    })
      .then(async res => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || body.message || 'Signup failed');
        return body;
      })
      .then(json => {
        showMessage(json.message || 'Signed up successfully', 'success');
        // re-fetch activities to keep UI consistent with server
        loadActivities();
        signupForm.reset();
      })
      .catch(err => {
        showMessage(err.message || 'Error signing up', 'error');
      });
  });
});
