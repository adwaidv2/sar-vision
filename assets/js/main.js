/**
 * Main Application Script for "AI-Based SAR Image Translation and Terrain Analysis"
 * Handles navigation, interactive tabs, plain-English explainer toggles,
 * workflow animation controls, and responsive UI components.
 */

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initPlainEnglishToggle();
  initWorkflowInteractiveDiagram();
  initComparisonTable();
  initScrollSpy();
});

// Mobile Navigation & Header Scroll effects
function initNavbar() {
  const navbar = document.querySelector(".navbar");
  const navToggle = document.getElementById("nav-toggle");
  const navLinks = document.getElementById("nav-links");

  // Sticky navbar shadow on scroll
  window.addEventListener("scroll", () => {
    if (window.scrollY > 30) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  // Mobile menu toggle
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
      const isExpanded = navLinks.classList.contains("open");
      navToggle.setAttribute("aria-expanded", isExpanded);
    });

    // Close mobile nav on link click
    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
      });
    });
  }
}

// Plain English vs Technical toggle in "About the Project"
function initPlainEnglishToggle() {
  const toggleBtn = document.getElementById("explain-mode-toggle");
  const techCards = document.querySelectorAll(".about-tech-view");
  const plainCards = document.querySelectorAll(".about-plain-view");
  const labelIndicator = document.getElementById("explain-mode-label");

  if (!toggleBtn) return;

  let isPlainMode = false;

  toggleBtn.addEventListener("click", () => {
    isPlainMode = !isPlainMode;
    toggleBtn.classList.toggle("active", isPlainMode);

    if (isPlainMode) {
      if (labelIndicator) labelIndicator.textContent = "Plain English Mode (For Non-Technical Users & Frontline Workers)";
      techCards.forEach(c => c.style.display = "none");
      plainCards.forEach(c => c.style.display = "block");
    } else {
      if (labelIndicator) labelIndicator.textContent = "Scientific & Technical Mode (For Researchers & Engineers)";
      plainCards.forEach(c => c.style.display = "none");
      techCards.forEach(c => c.style.display = "block");
    }
  });
}

// Interactive step-by-step workflow diagram selector
function initWorkflowInteractiveDiagram() {
  const steps = document.querySelectorAll(".workflow-step-node");
  const detailPanels = document.querySelectorAll(".workflow-step-detail");

  steps.forEach(node => {
    node.addEventListener("click", () => {
      const stepIdx = node.getAttribute("data-step");

      // Update active nodes
      steps.forEach(s => s.classList.remove("active"));
      node.classList.add("active");

      // Update detail panel
      detailPanels.forEach(panel => {
        if (panel.getAttribute("data-step") === stepIdx) {
          panel.classList.add("active");
        } else {
          panel.classList.remove("active");
        }
      });
    });
  });
}

// Comparison Table Interactive Highlights
function initComparisonTable() {
  const tableRows = document.querySelectorAll(".comparison-table tbody tr");
  tableRows.forEach(row => {
    row.addEventListener("mouseenter", () => row.classList.add("highlighted"));
    row.addEventListener("mouseleave", () => row.classList.remove("highlighted"));
  });
}

// Scroll Spy to highlight active section in navbar
function initScrollSpy() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-link");

  window.addEventListener("scroll", () => {
    let currentId = "";
    const scrollPos = window.scrollY + 120;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        currentId = section.getAttribute("id");
      }
    });

    navLinks.forEach(link => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${currentId}`) {
        link.classList.add("active");
      }
    });
  });
}

// Utility: Smooth scroll to element
function scrollToSection(id) {
  const target = document.getElementById(id);
  if (target) {
    const navHeight = 70;
    const targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
    window.scrollTo({
      top: targetPos,
      behavior: "smooth"
    });
  }
}
window.scrollToSection = scrollToSection;
