document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Add helper to escape HTML in participant names
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // prevent cached responses so UI reflects the latest server state
      const response = await fetch("/activities", { cache: 'no-store' });
      const activities = await response.json();

      // Clear loading message and previous UI
      activitiesList.innerHTML = "";

      // Clear and reset activity select to avoid duplicates
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        // Normalize participants to an array and compute spots safely
        const participants = Array.isArray(details.participants) ? details.participants : [];
        const maxParticipants = typeof details.max_participants === "number" ? details.max_participants : 0;
        const spotsLeft = maxParticipants - participants.length;

        // Build participants section (support strings or objects)
        let participantsHTML = `<div class="participants"><h5>Participants</h5>`;
        if (participants.length > 0) {
          participantsHTML += `<ul>`;
          participantsHTML += participants
            .map((p) => {
              // normalize participant display and value
              let display = "";
              let value = "";
              if (p && typeof p === "object") {
                display = p.name || p.email || (p.id ? String(p.id) : JSON.stringify(p));
                value = p.email || p.id || display;
              } else {
                display = String(p);
                value = display;
              }

              // Each participant gets a delete button with a data-email attribute
              return `<li data-email="${escapeHtml(String(value))}"><span class="participant-name">${escapeHtml(display)}</span><button class="participant-delete" title="Remove participant">\u2716</button></li>`;
            })
            .join("");
          participantsHTML += `</ul>`;
        } else {
          participantsHTML += `<p class="empty">No participants yet</p>`;
        }
        participantsHTML += `</div>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Attach click handlers for delete buttons (event delegation)
        const participantList = activityCard.querySelector('.participants');
        if (participantList) {
          participantList.addEventListener('click', async (ev) => {
            const btn = ev.target.closest('.participant-delete');
            if (!btn) return;

            const li = btn.closest('li');
            if (!li) return;

            const email = li.getAttribute('data-email');
            if (!email) return;

            // Confirm deletion with the user
            const confirmMsg = `Unregister ${email} from ${name}?`;
            if (!confirm(confirmMsg)) return;

            try {
              const resp = await fetch(`/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
              if (resp.ok) {
                // Refresh the activities UI
                await fetchActivities();
              } else {
                const body = await resp.json().catch(() => ({}));
                alert(body.detail || 'Failed to remove participant');
              }
            } catch (err) {
              console.error('Error removing participant:', err);
              alert('Error removing participant. See console for details.');
            }
          });
        }

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

  // Refresh activities so the participants list updates immediately
  await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
