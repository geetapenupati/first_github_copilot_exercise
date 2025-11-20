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
        ? act.participants.map(p => `<li class="participant-item">${escapeHtml(p)}</li>`).join('')
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

  // Fetch activities on load
  fetch('/activities')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load activities');
      return res.json();
    })
    .then(data => renderActivities(data))
    .catch(err => {
      activitiesList.innerHTML = '<p class="error">Unable to load activities.</p>';
      console.error(err);
    });

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

        // Update UI: find card and participants list
        const card = document.querySelector(`.activity-card[data-activity-name="${CSS.escape(activity)}"]`)
                   || Array.from(document.querySelectorAll('.activity-card')).find(c => c.dataset.activityName === activity);
        if (card) {
          const ul = card.querySelector('.participants-list');
          // remove "no participants" placeholder if present
          const placeholder = ul.querySelector('.no-participants');
          if (placeholder) placeholder.remove();
          const li = document.createElement('li');
          li.className = 'participant-item';
          li.textContent = email;
          ul.appendChild(li);
          // update count badge
          const countSpan = card.querySelector('.participant-count');
          const current = parseInt(countSpan.textContent.replace(/[^\d]/g, ''), 10) || 0;
          countSpan.textContent = `(${current + 1})`;
        }

        // Update option in select to reflect new count
        const opt = Array.from(activitySelect.options).find(o => o.value === activity);
        if (opt) {
          // try parse counts from label, else just append +1 display
          const matches = opt.textContent.match(/\((\d+)\/(\d+)\)/);
          if (matches) {
            const newCount = parseInt(matches[1], 10) + 1;
            const max = matches[2];
            opt.textContent = `${activity} (${newCount}/${max})`;
          }
        }

        signupForm.reset();
      })
      .catch(err => {
        showMessage(err.message || 'Error signing up', 'error');
      });
  });
});
