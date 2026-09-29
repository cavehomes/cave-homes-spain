(function () {
  "use strict";

  function setupOwnersAnalyticsDashboard() {
    const db = window.CHSOwnerDb;
    const homeActions = document.querySelector("#homeView .dashboard-actions");
    const addView = document.getElementById("addView");
    if (!db || !homeActions || !addView || document.getElementById("analyticsView")) return;

    const recordEvent = function (eventName, sectionName) {
      const row = {
        event_name: eventName,
        section_name: sectionName ? String(sectionName).slice(0, 80) : null,
      };
      db.from("owner_app_events").insert(row).then(function () {});
      if (typeof window.chsTrack === "function") {
        window.chsTrack(eventName, {
          app_name: "owners_app",
          section_name: row.section_name || undefined,
        });
      }
    };
    window.recordOwnerEvent = recordEvent;

    const analyticsButton = document.createElement("button");
    analyticsButton.className = "stat stat-button action-stat";
    analyticsButton.type = "button";
    analyticsButton.innerHTML = "<strong>▥</strong><span>Analytics</span>";
    analyticsButton.addEventListener("click", function () {
      window.switchView("analytics");
    });
    const rentalButton = Array.from(homeActions.querySelectorAll("button")).find(function (button) {
      return button.textContent.includes("Holiday rentals");
    });
    homeActions.insertBefore(analyticsButton, rentalButton || null);

    const analyticsView = document.createElement("section");
    analyticsView.id = "analyticsView";
    analyticsView.className = "card hidden";
    analyticsView.innerHTML =
      '<button class="section-home" type="button" id="analyticsBack">← Back to Home</button>' +
      "<h2>Owners App Analytics</h2>" +
      '<p class="form-intro">Private activity from this app. Names, messages and property details are never recorded.</p>' +
      '<div class="stats">' +
      '<div class="stat"><strong id="analyticsToday">0</strong><span>Opens today</span></div>' +
      '<div class="stat"><strong id="analyticsWeek">0</strong><span>Opens 7 days</span></div>' +
      '<div class="stat"><strong id="analyticsMonth">0</strong><span>Opens 30 days</span></div>' +
      '<div class="stat"><strong id="analyticsErrors">0</strong><span>Errors 30 days</span></div>' +
      "</div><h3>Most-used areas</h3>" +
      '<div id="analyticsSections" class="drafts"><div class="empty">Activity will appear here as you use the app.</div></div>';
    addView.insertAdjacentElement("beforebegin", analyticsView);
    document.getElementById("analyticsBack").addEventListener("click", function () {
      window.switchView("home");
    });

    async function loadAnalytics() {
      const sectionList = document.getElementById("analyticsSections");
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const result = await db
        .from("owner_app_events")
        .select("event_name,section_name,created_at")
        .gte("created_at", monthAgo)
        .order("created_at", { ascending: false });
      if (result.error) {
        sectionList.innerHTML = '<div class="empty">Analytics are temporarily unavailable.</div>';
        return;
      }
      const events = result.data || [];
      const now = Date.now();
      const opens = events.filter(function (item) {
        return item.event_name === "owners_app_open";
      });
      const countSince = function (days) {
        return opens.filter(function (item) {
          return now - new Date(item.created_at).getTime() < days * 86400000;
        }).length;
      };
      document.getElementById("analyticsToday").textContent = countSince(1);
      document.getElementById("analyticsWeek").textContent = countSince(7);
      document.getElementById("analyticsMonth").textContent = opens.length;
      document.getElementById("analyticsErrors").textContent = events.filter(function (item) {
        return item.event_name === "owners_app_error";
      }).length;

      const counts = {};
      events.forEach(function (item) {
        if (item.event_name === "owners_section_view" && item.section_name) {
          counts[item.section_name] = (counts[item.section_name] || 0) + 1;
        }
      });
      const rows = Object.entries(counts).sort(function (a, b) {
        return b[1] - a[1];
      });
      sectionList.textContent = "";
      if (!rows.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "Activity will appear here as you use the app.";
        sectionList.appendChild(empty);
        return;
      }
      rows.forEach(function (row) {
        const card = document.createElement("div");
        card.className = "home";
        const body = document.createElement("div");
        body.className = "home-body";
        const head = document.createElement("div");
        head.className = "home-head";
        const title = document.createElement("h3");
        title.textContent = row[0].charAt(0).toUpperCase() + row[0].slice(1);
        const count = document.createElement("span");
        count.className = "photo-badge";
        count.textContent = row[1] + " visits";
        head.append(title, count);
        body.appendChild(head);
        card.appendChild(body);
        sectionList.appendChild(card);
      });
    }

    const originalSwitchView = window.switchView;
    window.switchView = function (view) {
      originalSwitchView(view);
      analyticsView.classList.toggle("hidden", view !== "analytics");
      if (view === "analytics") loadAnalytics();
      if (view !== "home") recordEvent("owners_section_view", view);
    };

    db.auth.getSession().then(function (result) {
      if (result.data && result.data.session) recordEvent("owners_app_open");
    });
    document.addEventListener("submit", function (event) {
      if (event.target && event.target.id) {
        recordEvent("owners_form_submit", event.target.id);
      }
    });
  }

  try {
    setupOwnersAnalyticsDashboard();
  } catch (error) {
    console.warn("Owners analytics dashboard unavailable", error);
  }
})();