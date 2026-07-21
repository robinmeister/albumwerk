/// <reference path="../../pb_data/types.d.ts" />
//
// Shared e-mail branding used by pb_hooks/email.pb.js (order confirmation) and
// pb_hooks/emails_auth.pb.js (verification / password reset / email change).
// JSVM handlers run isolated, so reusable logic lives here and is pulled in via
// require(__hooks + "/lib/emaillib.js").
//
// brandShell() wraps a plain HTML fragment in a responsive, inline-styled shell
// that carries the instance branding (logo, accent colour, business name,
// contact/website footer) read live from the `settings` singleton — so every
// customer's e-mails look like their own brand. Everything is string
// concatenation (no DOM in the JSVM) with inline CSS (mail clients strip
// <style>/external CSS).

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Pull the branding fields from the settings singleton with graceful fallbacks
// (mirrors the defensive access in email.pb.js).
function readBrand(app) {
  var s = null;
  try {
    s = app.findRecordById("settings", "appsettings0001");
  } catch (_) {
    // settings not seeded yet — neutral defaults below
  }
  var businessName = (s && s.getString("businessName")) || "Fotogalerie";
  var contactEmail = (s && s.getString("contactEmail")) || "";
  var websiteUrl = (s && s.getString("websiteUrl")) || "";
  var primaryColor = (s && s.getString("primaryColor")) || "#3d4a3d";
  var logo = (s && s.getString("logo")) || "";

  var appUrl = "";
  try {
    appUrl = app.settings().meta.appURL || "";
  } catch (_) { /* keep empty */ }
  appUrl = appUrl.replace(/\/+$/, "");

  // Most mail clients don't render SVG — only link raster logos, otherwise fall
  // back to the business name wordmark.
  var logoUrl = "";
  if (logo && appUrl && !logo.toLowerCase().endsWith(".svg")) {
    logoUrl = appUrl + "/api/files/settings/appsettings0001/" + logo;
  }
  return {
    businessName: businessName,
    contactEmail: contactEmail,
    websiteUrl: websiteUrl,
    primaryColor: primaryColor,
    logoUrl: logoUrl,
    appUrl: appUrl,
  };
}

// Wrap an HTML fragment in the branded shell.
function brandShell(app, innerHtml) {
  var b = readBrand(app);
  var name = escapeHtml(b.businessName);

  var header = b.logoUrl
    ? "<img src='" + b.logoUrl + "' alt='" + name + "' " +
      "style='max-height:48px;max-width:220px;display:block' />"
    : "<div style='font-size:20px;font-weight:600;color:#1a1a1a'>" + name + "</div>";

  var footerParts = [name];
  if (b.contactEmail) {
    footerParts.push(
      "<a href='mailto:" + escapeHtml(b.contactEmail) + "' style='color:#888;text-decoration:none'>" +
      escapeHtml(b.contactEmail) + "</a>"
    );
  }
  if (b.websiteUrl) {
    footerParts.push(
      "<a href='" + escapeHtml(b.websiteUrl) + "' style='color:#888;text-decoration:none'>" +
      escapeHtml(b.websiteUrl) + "</a>"
    );
  }

  return (
    "<div style='background:#f4f4f5;padding:24px 0;font-family:Helvetica,Arial,sans-serif'>" +
      "<div style='max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;" +
        "border:1px solid #e5e5e5'>" +
        "<div style='border-top:4px solid " + escapeHtml(b.primaryColor) + ";padding:24px 32px 8px'>" +
          header +
        "</div>" +
        "<div style='padding:8px 32px 24px;color:#1a1a1a;font-size:15px;line-height:1.55'>" +
          innerHtml +
        "</div>" +
        "<div style='padding:16px 32px;border-top:1px solid #eee;color:#888;font-size:12px'>" +
          footerParts.join(" &middot; ") +
        "</div>" +
      "</div>" +
    "</div>"
  );
}

// A styled call-to-action button (table-based for Outlook).
function button(label, url, color) {
  return (
    "<table role='presentation' cellspacing='0' cellpadding='0' style='margin:16px 0'>" +
      "<tr><td style='border-radius:6px;background:" + escapeHtml(color || "#3d4a3d") + "'>" +
        "<a href='" + escapeHtml(url) + "' " +
          "style='display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;" +
          "font-weight:600;font-size:15px'>" + escapeHtml(label) + "</a>" +
      "</td></tr>" +
    "</table>"
  );
}

// Join non-empty lines into a plain-text body (multipart fallback).
function plainText(lines) {
  return (Array.isArray(lines) ? lines : [lines])
    .filter(function (l) { return l != null && l !== ""; })
    .join("\n");
}

module.exports = {
  escapeHtml: escapeHtml,
  readBrand: readBrand,
  brandShell: brandShell,
  button: button,
  plainText: plainText,
};
