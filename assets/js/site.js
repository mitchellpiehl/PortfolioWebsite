// Small helpers used across the site: copy buttons, publication toggles,
// and the contact form. Everything here is optional; pages work without it.
(function () {
  "use strict";

  function copyText(text, button) {
    navigator.clipboard.writeText(text).then(function () {
      var label = button.textContent;
      button.textContent = "Copied";
      setTimeout(function () { button.textContent = label; }, 1500);
    });
  }

  if (navigator.clipboard) {
    document.querySelectorAll("[data-copy]").forEach(function (button) {
      button.hidden = false;
      button.addEventListener("click", function () {
        copyText(button.getAttribute("data-copy"), button);
      });
    });

    document.querySelectorAll(".bibtex").forEach(function (block) {
      var code = block.querySelector("code");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "chip copy-btn";
      button.textContent = "Copy";
      button.addEventListener("click", function () { copyText(code.textContent, button); });
      block.appendChild(button);
    });
  }

  // Abstract and BibTeX panels on the publications page
  document.querySelectorAll(".pub-toggle").forEach(function (button) {
    var panel = document.getElementById(button.getAttribute("aria-controls"));
    if (!panel) return;
    button.addEventListener("click", function () {
      var open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("is-open", open);
    });
  });

  // Contact form: send in the background so the visitor stays on the page.
  // Without JavaScript the form posts normally and Web3Forms redirects back to #sent.
  var form = document.getElementById("contact-form");
  var status = document.getElementById("form-status");
  if (form && status && window.fetch) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var data = Object.fromEntries(new FormData(form));
      delete data.redirect;
      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      status.className = "form-status";
      status.textContent = "Sending…";

      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (response) {
          return response.json().then(function (json) {
            if (!response.ok || !json.success) throw new Error(json.message || "Request failed");
          });
        })
        .then(function () {
          form.reset();
          status.className = "form-status is-ok";
          status.textContent = "Thanks, your message was sent.";
        })
        .catch(function () {
          status.className = "form-status is-error";
          status.textContent = "Sorry, that didn't go through. Please email me at mitchellpiehl@gmail.com instead.";
        })
        .then(function () { button.disabled = false; });
    });
  }

  var sent = document.getElementById("sent");
  if (sent && location.hash === "#sent") {
    sent.hidden = false;
    sent.focus();
  }
})();
