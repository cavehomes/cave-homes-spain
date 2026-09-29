(function () {
  "use strict";

  function setupWebsiteAnalyticsDashboard() {
    const db = window.CHSOwnerDb;
    const homeActions = document.querySelector("#homeView .dashboard-actions");
    const addView = document.getElementById("addView");
    if (!db || !homeActions || !addView || document.getElementById("analyticsView")) return;

    const analyticsButton = document.createElement("button");
    analyticsButton.className = "stat stat-button action-stat";
    analyticsButton.type = "button";
    analyticsButton.innerHTML = "<strong>▥</strong><span>Website Analytics</span>";
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
      "<h2>Website Analytics</h2>" +
      '<p class="form-intro">What visitors are viewing on the public Cave Homes Spain website. Your activity inside this Owners app is not counted here.</p>' +
      '<div class="stats">' +
      '<div class="stat"><strong id="websiteViewsToday">0</strong><span>Views today</span></div>' +
      '<div class="stat"><strong id="websiteVisitorsWeek">0</strong><span>Visitors 7 days</span></div>' +
      '<div class="stat"><strong id="websiteViewsMonth">0</strong><span>Views 30 days</span></div>' +
      '<div class="stat"><strong id="websiteEnquiriesMonth">0</strong><span>Enquiries 30 days</span></div>' +
      "</div><h3>Most-viewed pages</h3>" +
      '<div id="websiteTopPages" class="drafts"><div class="empty">Visitor activity will appear here.</div></div>' +
      '<h3 style="margin-top:22px">Devices</h3>' +
      '<div id="websiteDevices" class="drafts"><div class="empty">Device activity will appear here.</div></div>';
    addView.insertAdjacentElement("beforebegin", analyticsView);
    document.getElementById("analyticsBack").addEventListener("click", function () {
      window.switchView("home");
    });

    function renderRows(target, rows, emptyText) {
      target.textContent = "";
      if (!rows.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = emptyText;
        target.appendChild(empty);
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
        title.textContent = row[0];
        const count = document.createElement("span");
        count.className = "photo-badge";
        count.textContent = row[1] + (row[1] === 1 ? " view" : " views");
        head.append(title, count);
        body.appendChild(head);
        card.appendChild(body);
        target.appendChild(card);
      });
    }

    async function loadWebsiteAnalytics() {
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const results = await Promise.all([
        db
          .from("website_events")
          .select("session_id,page_path,page_title,device_type,created_at")
          .gte("created_at", monthAgo)
          .order("created_at", { ascending: false }),
        db
          .from("enquiries")
          .select("id,created_at")
          .gte("created_at", monthAgo),
      ]);
      const websiteResult = results[0];
      const enquiryResult = results[1];
      if (websiteResult.error) {
        document.getElementById("websiteTopPages").innerHTML =
          '<div class="empty">Website analytics are temporarily unavailable.</div>';
        return;
      }

      const events = websiteResult.data || [];
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      document.getElementById("websiteViewsToday").textContent = events.filter(function (item) {
        return new Date(item.created_at).getTime() >= todayStart.getTime();
      }).length;
      const weekSessions = new Set(
        events
          .filter(function (item) {
            return now - new Date(item.created_at).getTime() < 7 * 86400000;
          })
          .map(function (item) {
            return item.session_id;
          }),
      );
      document.getElementById("websiteVisitorsWeek").textContent = weekSessions.size;
      document.getElementById("websiteViewsMonth").textContent = events.length;
      document.getElementById("websiteEnquiriesMonth").textContent = enquiryResult.error
        ? "—"
        : (enquiryResult.data || []).length;

      const pageCounts = {};
      const pageLabels = {};
      events.forEach(function (item) {
        const path = item.page_path || "/";
        pageCounts[path] = (pageCounts[path] || 0) + 1;
        if (!pageLabels[path]) pageLabels[path] = item.page_title || path;
      });
      const topPages = Object.entries(pageCounts)
        .sort(function (a, b) {
          return b[1] - a[1];
        })
        .slice(0, 10)
        .map(function (row) {
          return [pageLabels[row[0]], row[1]];
        });
      renderRows(
        document.getElementById("websiteTopPages"),
        topPages,
        "Visitor activity will appear here as people use the website.",
      );

      const deviceCounts = {};
      events.forEach(function (item) {
        const device = item.device_type || "unknown";
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      });
      const devices = Object.entries(deviceCounts)
        .sort(function (a, b) {
          return b[1] - a[1];
        })
        .map(function (row) {
          return [row[0].charAt(0).toUpperCase() + row[0].slice(1), row[1]];
        });
      renderRows(
        document.getElementById("websiteDevices"),
        devices,
        "Device activity will appear here as people use the website.",
      );
    }

    const originalSwitchView = window.switchView;
    window.switchView = function (view) {
      originalSwitchView(view);
      analyticsView.classList.toggle("hidden", view !== "analytics");
      if (view === "analytics") loadWebsiteAnalytics();
    };
  }

  try {
    setupWebsiteAnalyticsDashboard();
  } catch (error) {
    console.warn("Website analytics dashboard unavailable", error);
  }
})();